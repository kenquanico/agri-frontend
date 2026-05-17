import { useEffect, useRef, useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMonitoring, getClassColor } from './context/MonitoringContext'
import { X, Maximize2, Square, Play } from 'lucide-react'

export default function FloatingMonitor() {
    const location = useLocation()
    const navigate = useNavigate()
    const isOnMonitoringPage = location.pathname === '/field-monitoring'

    const {
        cameraStarted, countingActive, setCountingActive,
        boxes, setBoxes, classLegend, setClassLegend,
        detections, confidence,
        isPhoneDevice, phoneImgError, setPhoneImgError,
        streamUrl, connectionState,
        videoRef, phoneImgRef,
        isDetectionReady, isPhoneReady,
        handleDisconnect,
        pipVisible, setPipVisible,
        selectedDevice,
    } = useMonitoring()

    const canvasRef    = useRef(null)
    const boxesRef     = useRef([])
    const isPhoneRef   = useRef(isPhoneDevice)
    const [dragging, setDragging]   = useState(false)
    const [pos, setPos]             = useState({ x: null, y: null })
    const [minimized, setMinimized] = useState(false)
    const dragOffset = useRef({ x: 0, y: 0 })
    const pipRef     = useRef(null)

    useEffect(() => { boxesRef.current = boxes }, [boxes])
    useEffect(() => { isPhoneRef.current = isPhoneDevice }, [isPhoneDevice])

    // Show PiP only when camera is active AND we navigated away from the monitoring page
    useEffect(() => {
        if (cameraStarted && !isOnMonitoringPage) {
            setPipVisible(true)
        } else {
            setPipVisible(false)
        }
    }, [cameraStarted, isOnMonitoringPage, setPipVisible])

    // Default position: top-right corner
    useEffect(() => {
        if (pos.x === null) {
            setPos({ x: window.innerWidth - 340, y: 80 })
        }
    }, [pos.x])

    // ── drawBoxes (mini version, no labels to keep it clean) ─────────────────
    const drawBoxes = useCallback(() => {
        try {
            const canvas = canvasRef.current
            if (!canvas) return
            const sourceEl = isPhoneRef.current ? phoneImgRef.current : videoRef.current
            if (!sourceEl) return
            const nativeW = isPhoneRef.current ? sourceEl.naturalWidth  : sourceEl.videoWidth
            const nativeH = isPhoneRef.current ? sourceEl.naturalHeight : sourceEl.videoHeight
            if (!nativeW || !nativeH) return
            const rect = sourceEl.getBoundingClientRect()
            if (!rect.width || !rect.height) return

            // Map to pip canvas size
            const pipW = canvas.offsetWidth || 300
            const pipH = canvas.offsetHeight || 170
            canvas.width  = pipW
            canvas.height = pipH
            const scaleX = pipW / nativeW
            const scaleY = pipH / nativeH

            const ctx = canvas.getContext('2d')
            ctx.clearRect(0, 0, pipW, pipH)

            boxesRef.current.forEach((d) => {
                if (!d || !Array.isArray(d.box) || d.box.length < 4) return
                const [x1, y1, x2, y2] = d.box
                const cls   = d.class ?? 'Unknown'
                const color = getClassColor(cls)
                const x = x1 * scaleX, y = y1 * scaleY
                const w = (x2 - x1) * scaleX, h = (y2 - y1) * scaleY
                ctx.fillStyle   = color.fill;   ctx.fillRect(x, y, w, h)
                ctx.strokeStyle = color.stroke; ctx.lineWidth = 1.5
                ctx.strokeRect(x, y, w, h)
            })
        } catch (e) { /* silent */ }
    }, [videoRef, phoneImgRef])

    useEffect(() => { drawBoxes() }, [boxes, drawBoxes])

    // ── Drag logic ────────────────────────────────────────────────────────────
    const onMouseDown = useCallback((e) => {
        if (e.target.closest('button')) return
        setDragging(true)
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
        e.preventDefault()
    }, [pos])

    useEffect(() => {
        if (!dragging) return
        const onMove = (e) => {
            const x = Math.max(0, Math.min(window.innerWidth  - 320, e.clientX - dragOffset.current.x))
            const y = Math.max(0, Math.min(window.innerHeight - 180, e.clientY - dragOffset.current.y))
            setPos({ x, y })
        }
        const onUp = () => setDragging(false)
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup',   onUp)
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    }, [dragging])

    // Touch drag
    const onTouchStart = useCallback((e) => {
        if (e.target.closest('button')) return
        const t = e.touches[0]
        dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y }
    }, [pos])
    const onTouchMove = useCallback((e) => {
        const t = e.touches[0]
        const x = Math.max(0, Math.min(window.innerWidth  - 320, t.clientX - dragOffset.current.x))
        const y = Math.max(0, Math.min(window.innerHeight - 180, t.clientY - dragOffset.current.y))
        setPos({ x, y })
        e.preventDefault()
    }, [])

    if (!pipVisible || pos.x === null) return null

    const pipW = minimized ? 220 : 320

    return (
        <div
            ref={pipRef}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            style={{
                position:   'fixed',
                left:       Math.min(pos.x, window.innerWidth  - pipW - 8),
                top:        Math.min(pos.y, window.innerHeight - (minimized ? 48 : 220) - 8),
                width:      pipW,
                zIndex:     9999,
                cursor:     dragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                transition: dragging ? 'none' : 'width 0.25s ease',
            }}
        >
            {/* Card */}
            <div style={{
                background:   'rgba(10,12,16,0.96)',
                border:       '1px solid rgba(255,255,255,0.10)',
                borderRadius: 16,
                overflow:     'hidden',
                boxShadow:    '0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)',
                backdropFilter: 'blur(24px)',
            }}>

                {/* ── Header bar ── */}
                <div style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            8,
                    padding:        '8px 10px',
                    borderBottom:   minimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    background:     'rgba(255,255,255,0.03)',
                }}>
                    {/* Live dot + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        {countingActive ? (
                            <span style={{
                                display:      'inline-flex',
                                alignItems:   'center',
                                gap:          5,
                                background:   'rgba(239,68,68,0.18)',
                                border:       '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 99,
                                padding:      '2px 8px 2px 5px',
                                fontSize:     10,
                                fontWeight:   800,
                                color:        '#f87171',
                                letterSpacing: '0.05em',
                                flexShrink:   0,
                            }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pip-pulse 1s infinite' }} />
                LIVE
              </span>
                        ) : (
                            <span style={{
                                display:      'inline-flex',
                                alignItems:   'center',
                                gap:          4,
                                background:   'rgba(255,255,255,0.06)',
                                border:       '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 99,
                                padding:      '2px 8px',
                                fontSize:     10,
                                fontWeight:   700,
                                color:        'rgba(255,255,255,0.4)',
                                flexShrink:   0,
                            }}>
                PAUSED
              </span>
                        )}

                        <span style={{
                            fontSize:     11,
                            fontWeight:   600,
                            color:        'rgba(255,255,255,0.55)',
                            overflow:     'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace:   'nowrap',
                        }}>
              Field Monitoring
            </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {/* Minimize / restore */}
                        <button
                            onClick={() => setMinimized(v => !v)}
                            title={minimized ? 'Expand' : 'Minimize'}
                            style={btnStyle}
                        >
                            <Square size={11} />
                        </button>

                        {/* Go to full page */}
                        <button
                            onClick={() => navigate('/field-monitoring')}
                            title="Open Field Monitoring"
                            style={btnStyle}
                        >
                            <Maximize2 size={11} />
                        </button>

                        {/* Disconnect */}
                        <button
                            onClick={handleDisconnect}
                            title="Stop & disconnect"
                            style={{ ...btnStyle, color: 'rgba(239,68,68,0.8)' }}
                        >
                            <X size={11} />
                        </button>
                    </div>
                </div>

                {/* ── Video area ── */}
                {!minimized && (
                    <div style={{ position: 'relative', background: '#000', aspectRatio: '16/9' }}>

                        {/* Phone MJPEG stream */}
                        <img
                            ref={phoneImgRef}
                            src={cameraStarted && isPhoneDevice ? streamUrl : undefined}
                            crossOrigin="anonymous"
                            style={{
                                width:      '100%',
                                height:     '100%',
                                objectFit:  'contain',
                                display:    isPhoneDevice && cameraStarted && !phoneImgError ? 'block' : 'none',
                                pointerEvents: 'none',
                            }}
                            alt=""
                            onLoad={drawBoxes}
                            onError={() => { if (isPhoneDevice && cameraStarted) setPhoneImgError(true) }}
                        />

                        {/* Drone WebRTC video */}
                        <video
                            ref={videoRef}
                            autoPlay muted playsInline
                            style={{
                                width:      '100%',
                                height:     '100%',
                                objectFit:  'contain',
                                display:    !isPhoneDevice ? 'block' : 'none',
                                pointerEvents: 'none',
                            }}
                            onLoadedData={drawBoxes}
                        />

                        {/* Drone connecting overlay */}
                        {!isPhoneDevice && connectionState !== 'connected' && cameraStarted && (
                            <div style={{
                                position:       'absolute', inset: 0,
                                display:        'flex', flexDirection: 'column',
                                alignItems:     'center', justifyContent: 'center',
                                background:     'rgba(0,0,0,0.7)',
                                gap:            8,
                            }}>
                                {connectionState === 'connecting' || connectionState === 'idle' ? (
                                    <>
                                        <svg style={{ width: 20, height: 20, animation: 'pip-spin 1s linear infinite', color: '#22c55e' }} fill="none" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                            <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75" />
                                        </svg>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Connecting…</span>
                                    </>
                                ) : connectionState === 'failed' ? (
                                    <span style={{ fontSize: 11, color: '#f87171' }}>Connection failed</span>
                                ) : null}
                            </div>
                        )}

                        {/* Phone stream error */}
                        {phoneImgError && isPhoneDevice && (
                            <div style={{
                                position:   'absolute', inset: 0,
                                display:    'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(0,0,0,0.8)',
                            }}>
                                <span style={{ fontSize: 11, color: '#f87171' }}>Stream error</span>
                            </div>
                        )}

                        {/* Detection overlay canvas */}
                        <canvas ref={canvasRef} style={{
                            position:      'absolute', inset: 0,
                            width:         '100%', height: '100%',
                            pointerEvents: 'none',
                        }} />

                        {/* Detection count badge */}
                        {boxes.length > 0 && (
                            <div style={{
                                position:     'absolute', top: 8, right: 8,
                                background:   'rgba(0,0,0,0.65)',
                                backdropFilter: 'blur(8px)',
                                border:       '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 99,
                                padding:      '3px 9px',
                                fontSize:     10,
                                fontWeight:   800,
                                color:        'white',
                            }}>
                                {boxes.length} detected
                            </div>
                        )}

                        {/* Class color dots */}
                        {Object.values(classLegend).length > 0 && (
                            <div style={{
                                position: 'absolute', bottom: 6, left: 6,
                                display:  'flex', flexWrap: 'wrap', gap: 4,
                            }}>
                                {Object.values(classLegend).slice(0, 4).map(({ name, color }) => (
                                    <span key={name} style={{
                                        display:      'inline-flex',
                                        alignItems:   'center',
                                        gap:          4,
                                        background:   'rgba(0,0,0,0.65)',
                                        backdropFilter: 'blur(8px)',
                                        border:       `1px solid ${color.stroke}40`,
                                        borderRadius: 99,
                                        padding:      '2px 7px',
                                        fontSize:     9,
                                        fontWeight:   700,
                                        color:        color.stroke,
                                    }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color.stroke, flexShrink: 0 }} />
                                        {name}
                  </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Footer stats + controls ── */}
                {!minimized && (
                    <div style={{
                        display:       'flex',
                        alignItems:    'center',
                        justifyContent:'space-between',
                        padding:       '8px 12px',
                        gap:           8,
                    }}>
                        {/* Stats */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Detections</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{detections}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Confidence</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{confidence}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>%</span></div>
                            </div>
                        </div>

                        {/* Start / Stop detection */}
                        {!countingActive ? (
                            <button
                                onClick={() => setCountingActive(true)}
                                disabled={!isDetectionReady}
                                style={{
                                    display:      'flex',
                                    alignItems:   'center',
                                    gap:          5,
                                    background:   isDetectionReady ? '#16a34a' : 'rgba(255,255,255,0.08)',
                                    border:       'none',
                                    borderRadius: 10,
                                    padding:      '6px 12px',
                                    fontSize:     11,
                                    fontWeight:   700,
                                    color:        isDetectionReady ? 'white' : 'rgba(255,255,255,0.3)',
                                    cursor:       isDetectionReady ? 'pointer' : 'not-allowed',
                                    transition:   'background 0.2s',
                                }}
                            >
                                <Play size={11} />
                                Start
                            </button>
                        ) : (
                            <button
                                onClick={() => { setCountingActive(false); setBoxes([]); setClassLegend({}) }}
                                style={{
                                    display:      'flex',
                                    alignItems:   'center',
                                    gap:          5,
                                    background:   '#ea580c',
                                    border:       'none',
                                    borderRadius: 10,
                                    padding:      '6px 12px',
                                    fontSize:     11,
                                    fontWeight:   700,
                                    color:        'white',
                                    cursor:       'pointer',
                                }}
                            >
                                <Square size={10} />
                                Stop
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Keyframe styles */}
            <style>{`
        @keyframes pip-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @keyframes pip-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}

const btnStyle = {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          24,
    height:         24,
    background:     'rgba(255,255,255,0.07)',
    border:         '1px solid rgba(255,255,255,0.08)',
    borderRadius:   8,
    color:          'rgba(255,255,255,0.55)',
    cursor:         'pointer',
    transition:     'background 0.15s, color 0.15s',
    padding:        0,
}