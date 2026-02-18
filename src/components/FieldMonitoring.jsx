import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../api/api'

export default function FieldMonitoring() {
  const [cameraStarted, setCameraStarted]   = useState(false)
  const [countingActive, setCountingActive] = useState(false)
  const [status, setStatus]                 = useState('Idle')
  const [boxes, setBoxes]                   = useState([])
  const [detections, setDetections]         = useState(0)
  const [confidence, setConfidence]         = useState(0)
  const [detectionLog, setDetectionLog]     = useState([])
  const [isFullscreen, setIsFullscreen]     = useState(false)
  const [showLog, setShowLog]               = useState(false)   // sidebar in fullscreen
  const [controlsVisible, setControlsVisible] = useState(true)

  // const MOBILE_CAMERA_URL = 'http://192.168.1.169:8080/video'
  const MOBILE_CAMERA_URL = 'http://10.253.40.84:8080/video'

  const imgRef           = useRef(null)
  const intervalRef      = useRef(null)
  const captureCanvasRef = useRef(null)
  const canvasRef        = useRef(null)
  const containerRef     = useRef(null)
  const fullscreenRef    = useRef(null)
  const hideTimerRef     = useRef(null)

  // ── Detection interval ──────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraStarted || !countingActive) return
    intervalRef.current = setInterval(uploadFrame, 1000)
    return () => clearInterval(intervalRef.current)
  }, [cameraStarted, countingActive])

  // ── Box drawing triggers ────────────────────────────────────────────────
  useEffect(() => {
    const img = imgRef.current
    if (!img) return
    const redraw = () => drawBoxes()
    img.addEventListener('load', redraw)
    window.addEventListener('resize', redraw)
    return () => { img.removeEventListener('load', redraw); window.removeEventListener('resize', redraw) }
  }, [cameraStarted])

  useEffect(() => { drawBoxes() }, [boxes])

  // ── Fullscreen change listener ──────────────────────────────────────────
  useEffect(() => {
    const onChange = () => {
      const active = !!document.fullscreenElement
      setIsFullscreen(active)
      if (!active) { setShowLog(false); setControlsVisible(true) }
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Auto-hide controls on mouse idle ───────────────────────────────────
  const wakeControls = useCallback(() => {
    setControlsVisible(true)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3500)
  }, [])

  // ── Draw bounding boxes ─────────────────────────────────────────────────
  const drawBoxes = () => {
    const img    = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas || !img.naturalWidth || !img.complete) return
    const rect    = img.getBoundingClientRect()
    canvas.width  = rect.width
    canvas.height = rect.height
    const scaleX  = rect.width  / img.naturalWidth
    const scaleY  = rect.height / img.naturalHeight
    const ctx     = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!Array.isArray(boxes)) return
    boxes.forEach(d => {
      if (!d || !Array.isArray(d.box) || d.box.length < 4) return
      const [x1, y1, x2, y2] = d.box
      const conf = d.confidence ?? d.box[4] ?? 0
      const x = x1 * scaleX, y = y1 * scaleY
      const w = (x2 - x1) * scaleX, h = (y2 - y1) * scaleY
      const label = `${d.class ?? 'Unknown'} ${Math.round(conf * 100)}%`
      ctx.font = '13px system-ui, sans-serif'
      const tw = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(34,197,94,0.92)'
      ctx.fillRect(x, y - 24, tw + 14, 24)
      ctx.fillStyle = 'white'
      ctx.fillText(label, x + 7, y - 7)
      ctx.strokeStyle = 'rgb(34,197,94)'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)
      // Corner marks
      const cl = 16
      ctx.strokeStyle = 'rgb(22,163,74)'
      ctx.lineWidth = 3
      const corners = [
        [x,     y,     x + cl, y,      x,      y + cl],
        [x + w, y,     x+w-cl, y,      x + w,  y + cl],
        [x,     y + h, x + cl, y + h,  x,      y+h-cl],
        [x + w, y + h, x+w-cl, y + h,  x + w,  y+h-cl],
      ]
      corners.forEach(([mx, my, lx1, ly1, lx2, ly2]) => {
        ctx.beginPath()
        ctx.moveTo(lx1, ly1)
        ctx.lineTo(mx, my)
        ctx.lineTo(lx2, ly2)
        ctx.stroke()
      })
    })
  }

  const captureFrame = () => {
    const img = imgRef.current, canvas = captureCanvasRef.current
    if (!img || !canvas || !img.complete || img.naturalWidth === 0) return null
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg')
  }

  const uploadFrame = async () => {
    const frameData = captureFrame()
    if (!frameData) return
    try {
      const response = await api.post('/api/detection', { image: frameData.split(',')[1] })
      const raw = response.data.data?.detections
      const dets = Array.isArray(raw) ? raw : []
      // Normalize: confidence may live at d.confidence or d.box[4]
      const normalized = dets.map(d => ({
        ...d,
        confidence: d.confidence ?? d.box?.[4] ?? 0,
        class: d.class ?? d.label ?? 'Unknown',
      }))
      setBoxes(normalized)
      if (normalized.length > 0) {
        setDetections(p => p + normalized.length)
        setConfidence(Math.round(normalized.reduce((s, d) => s + d.confidence, 0) / normalized.length * 100))
        setDetectionLog(p => [
          ...normalized.map(d => ({ ...d, timestamp: new Date().toLocaleTimeString(), id: Date.now() + Math.random() })),
          ...p
        ].slice(0, 50))
      }
    } catch (err) { console.error('Upload failed', err) }
  }

  const toggleFullscreen = async () => {
    if (!fullscreenRef.current) return
    if (!document.fullscreenElement) {
      await fullscreenRef.current.requestFullscreen()
      wakeControls()
    } else {
      await document.exitFullscreen()
    }
  }

  // ── Status colours ──────────────────────────────────────────────────────
  const statusStyle = countingActive
      ? 'bg-green-50 text-green-700 border-green-100'
      : status === 'Camera Ready'
          ? 'bg-blue-50 text-blue-700 border-blue-100'
          : 'bg-gray-50 text-gray-500 border-gray-100'
  const statusDot = countingActive
      ? 'bg-green-500 animate-pulse'
      : status === 'Camera Ready' ? 'bg-blue-400' : 'bg-gray-300'

  // ═══════════════════════════════════════════════════════════════════════
  //  FULLSCREEN UI (overlays + sidebar)
  // ═══════════════════════════════════════════════════════════════════════
  const FullscreenUI = () => (
      <>
        {/* Always-on vignette gradients */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black/65 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/65 to-transparent" />
        </div>

        {/* Fading controls layer */}
        <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}
        >
          {/* ── TOP BAR ────────────────────────────────────────────────── */}
          <div className="absolute top-0 left-0 right-0 px-6 pt-5 pb-2 flex items-start justify-between pointer-events-auto">
            {/* Title */}
            <div>
              <p className="text-[10px] font-bold tracking-widest text-green-400 uppercase">Live Monitoring</p>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Field Monitoring</h1>
            </div>

            {/* Badges + action buttons */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {countingActive && (
                  <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
              )}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${statusStyle}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                {status}
              </div>
              {boxes.length > 0 && (
                  <div className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                    {boxes.length} detected
                  </div>
              )}

              {/* Log toggle button */}
              <button
                  onClick={() => setShowLog(v => !v)}
                  title={showLog ? 'Hide detection log' : 'Show detection log'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all backdrop-blur-sm
                ${showLog
                      ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-900/30'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Log
                {detectionLog.length > 0 && (
                    <span className="bg-white/25 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                  {detectionLog.length}
                </span>
                )}
              </button>

              {/* Exit fullscreen */}
              <button
                  onClick={toggleFullscreen}
                  title="Exit fullscreen"
                  className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── BOTTOM CONTROLS ────────────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-4 flex items-end justify-between pointer-events-auto">
            {/* Camera controls */}
            <div className="flex gap-2">
              {!countingActive ? (
                  <button
                      onClick={() => { setCountingActive(true); setStatus('Active — Counting') }}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Start Detection
                  </button>
              ) : (
                  <button
                      onClick={() => { setCountingActive(false); setStatus('Camera Ready'); setBoxes([]) }}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    Stop Detection
                  </button>
              )}
              <button
                  onClick={() => { setCameraStarted(false); setCountingActive(false); setStatus('Idle'); setBoxes([]) }}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-xl transition-colors backdrop-blur-sm"
              >
                Disconnect
              </button>
            </div>

            {/* Stats pills */}
            <div className="flex gap-3">
              <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Detections</p>
                <p className="text-xl font-bold text-white mt-0.5">{detections}</p>
              </div>
              <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Confidence</p>
                <p className="text-xl font-bold text-white mt-0.5">
                  {confidence}<span className="text-sm text-gray-400">%</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── DETECTION LOG SIDEBAR ─────────────────────────────────────── */}
        {/* Slides in from the right over the video, z-index above controls */}
        <div
            className="absolute top-0 right-0 bottom-0 z-30 flex flex-col"
            style={{
              width: '300px',
              transform: showLog ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              background: 'rgba(8, 12, 18, 0.90)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.07)',
            }}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0 mt-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-sm font-semibold text-white">Detection Log</h2>
            </div>
            <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 bg-white/[0.06] px-2 py-0.5 rounded-full">
              {detectionLog.length} / 50
            </span>
              <button
                  onClick={() => setShowLog(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Log entries */}
          <div className="overflow-y-auto flex-1">
            {detectionLog.length > 0 ? (
                <div className="divide-y divide-white/[0.05]">
                  {detectionLog.map(d => (
                      <div key={d.id} className="px-5 py-3.5 hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white">{d.class}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{d.timestamp}</p>
                          </div>
                          <span className="text-xs font-bold text-green-400 bg-green-500/15 border border-green-500/25 px-2.5 py-1 rounded-full">
                      {Math.round(d.confidence * 100)}%
                    </span>
                        </div>
                      </div>
                  ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">No detections yet</p>
                  <p className="text-xs text-gray-600 mt-1">Start detection to begin logging</p>
                </div>
            )}
          </div>

          {/* Live pulse footer */}
          {countingActive && (
              <div className="px-5 py-3 border-t border-white/[0.07] flex items-center gap-2 flex-shrink-0">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500">Updating every second</span>
              </div>
          )}
        </div>
      </>
  )

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
      <div className="min-h-screen bg-gray-50/60 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Page header */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Live</p>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Field Monitoring</h1>
            <p className="text-sm text-gray-400 mt-0.5">Real-time pest detection from camera feed</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Camera Panel ─────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">Camera Feed</h2>
                  <div className="flex items-center gap-2">
                    {countingActive && (
                        <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </span>
                    )}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusStyle}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                      {status}
                    </div>
                    {cameraStarted && (
                        <button
                            onClick={toggleFullscreen}
                            title="Fullscreen"
                            className="p-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                  d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
                          </svg>
                        </button>
                    )}
                  </div>
                </div>

                {/* Video area — this becomes the fullscreen root */}
                <div
                    ref={fullscreenRef}
                    onMouseMove={isFullscreen ? wakeControls : undefined}
                    onClick={isFullscreen ? wakeControls : undefined}
                    className={`relative bg-gray-950 overflow-hidden flex items-center justify-center
                  ${isFullscreen ? 'w-screen h-screen' : 'aspect-video'}`}
                    style={isFullscreen ? { cursor: controlsVisible ? 'default' : 'none' } : {}}
                >
                  {!cameraStarted ? (
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                  d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-sm mb-5">Camera not connected</p>
                        <button
                            onClick={() => { setCameraStarted(true); setStatus('Camera Ready') }}
                            className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors active:scale-95"
                        >
                          Mount Camera
                        </button>
                      </div>
                  ) : (
                      <div ref={containerRef} className="relative w-full h-full">
                        <img
                            ref={imgRef}
                            src={MOBILE_CAMERA_URL}
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain"
                            alt="Camera feed"
                        />
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                        <canvas ref={captureCanvasRef} className="hidden" />

                        {/* Normal-mode badge */}
                        {!isFullscreen && boxes.length > 0 && (
                            <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                              {boxes.length} detected
                            </div>
                        )}

                        {/* Fullscreen UI layer */}
                        {isFullscreen && <FullscreenUI />}
                      </div>
                  )}
                </div>

                {/* Camera controls (normal mode only) */}
                {cameraStarted && !isFullscreen && (
                    <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                      {!countingActive ? (
                          <button
                              onClick={() => { setCountingActive(true); setStatus('Active — Counting') }}
                              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Start Detection
                          </button>
                      ) : (
                          <button
                              onClick={() => { setCountingActive(false); setStatus('Camera Ready'); setBoxes([]) }}
                              className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                            Stop Detection
                          </button>
                      )}
                      <button
                          onClick={() => { setCameraStarted(false); setCountingActive(false); setStatus('Idle'); setBoxes([]) }}
                          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Detections</p>
                  <p className="text-4xl font-bold text-gray-900 tracking-tight">{detections}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Avg. Confidence</p>
                  <p className="text-4xl font-bold text-gray-900 tracking-tight">
                    {confidence}<span className="text-2xl text-gray-400">%</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Detection Log (normal mode) ──────────────────────────── */}
            <div
                className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                style={{ maxHeight: 'calc(100vh - 10rem)' }}
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-700">Detection Log</h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {detectionLog.length} / 50
              </span>
              </div>
              <div className="overflow-y-auto flex-1">
                {detectionLog.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {detectionLog.map(d => (
                          <div key={d.id} className="px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{d.class}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{d.timestamp}</p>
                              </div>
                              <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                          {Math.round(d.confidence * 100)}%
                        </span>
                            </div>
                          </div>
                      ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-400">No detections yet</p>
                      <p className="text-xs text-gray-300 mt-1">Start detection to begin logging</p>
                    </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
  )
}