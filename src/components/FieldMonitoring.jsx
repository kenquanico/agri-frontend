import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../api/api'
import { useDroneWebRTC } from '../api/useDroneWebRTC'
import { ChevronDown, MapPin, Layers, X, Wifi, Smartphone, Radio, Settings } from 'lucide-react'

// ─── Helpers ───────────────────────────────────────────────────────────────
const loadDevices = () => {
  try { return JSON.parse(localStorage.getItem('cameraDevices') || '[]') } catch { return [] }
}

const getDeviceStreamUrl = (device) => {
  if (!device) return ''
  if (device.type === 'drone') return device.ip
  return `http://${device.ip}${device.path || '/video'}`
}

const DEVICE_TYPE_STYLES = {
  phone:   { badge: 'bg-blue-50 text-blue-700 border-blue-100',    iconBg: 'bg-blue-100 text-blue-600'   },
  drone:   { badge: 'bg-green-50 text-green-700 border-green-100', iconBg: 'bg-green-100 text-green-600' },
  generic: { badge: 'bg-gray-50 text-gray-600 border-gray-200',    iconBg: 'bg-gray-100 text-gray-500'   },
}

const DeviceIcon = ({ type, size = 14 }) => {
  if (type === 'drone')  return <Radio size={size} />
  if (type === 'phone')  return <Smartphone size={size} />
  return <Wifi size={size} />
}

// ─── Per-class color palette ────────────────────────────────────────────────
// Each detected class gets a consistent, distinct color across boxes and log entries.
const CLASS_COLORS = {}
const COLOR_PALETTE = [
  { stroke: '#22c55e', fill: 'rgba(34,197,94,0.12)',   label: 'rgba(34,197,94,0.95)'   },  // green
  { stroke: '#ef4444', fill: 'rgba(239,68,68,0.12)',   label: 'rgba(239,68,68,0.95)'   },  // red
  { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.12)',  label: 'rgba(59,130,246,0.95)'  },  // blue
  { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.12)',  label: 'rgba(245,158,11,0.95)'  },  // amber
  { stroke: '#a855f7', fill: 'rgba(168,85,247,0.12)',  label: 'rgba(168,85,247,0.95)'  },  // purple
  { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.12)',   label: 'rgba(6,182,212,0.95)'   },  // cyan
  { stroke: '#f97316', fill: 'rgba(249,115,22,0.12)',  label: 'rgba(249,115,22,0.95)'  },  // orange
  { stroke: '#ec4899', fill: 'rgba(236,72,153,0.12)',  label: 'rgba(236,72,153,0.95)'  },  // pink
]
let _colorIndex = 0
const getClassColor = (className) => {
  const key = (className || 'Unknown').toLowerCase()
  if (!CLASS_COLORS[key]) {
    CLASS_COLORS[key] = COLOR_PALETTE[_colorIndex % COLOR_PALETTE.length]
    _colorIndex++
  }
  return CLASS_COLORS[key]
}

export default function FieldMonitoring () {
  // ── Device list (from Settings) ────────────────────────────────────────
  const [devices, setDevices] = useState(loadDevices)
  const [selectedDevice, setSelectedDevice] = useState(null)

  useEffect(() => {
    const refresh = () => setDevices(loadDevices())
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const streamUrl = selectedDevice ? getDeviceStreamUrl(selectedDevice) : ''
  const whepUrl   = selectedDevice?.type === 'drone' ? streamUrl : ''

  const {
    remoteStream,
    connectionState,
    error: webrtcError,
    connect:    connectDrone,
    disconnect: disconnectDrone,
  } = useDroneWebRTC({ whepUrl })

  // ── Field state ────────────────────────────────────────────────────────
  const [fields,            setFields]            = useState([])
  const [selectedField,     setSelectedField]     = useState(null)
  const [showFieldDropdown, setShowFieldDropdown] = useState(false)
  const [fieldsLoading,     setFieldsLoading]     = useState(false)
  const fieldDropdownRef                          = useRef(null)

  // ── UI state ───────────────────────────────────────────────────────────
  const [showSourceModal,  setShowSourceModal]  = useState(false)
  const [cameraStarted,    setCameraStarted]    = useState(false)
  const [countingActive,   setCountingActive]   = useState(false)
  const [boxes,            setBoxes]            = useState([])
  const [detections,       setDetections]       = useState(0)
  const [confidence,       setConfidence]       = useState(0)
  const [detectionLog,     setDetectionLog]     = useState([])
  const [isFullscreen,     setIsFullscreen]     = useState(false)
  const [showLog,          setShowLog]          = useState(false)
  const [controlsVisible,  setControlsVisible]  = useState(true)
  const [phoneImgError,    setPhoneImgError]    = useState(false)
  // Tracks unique classes seen for the color legend
  const [classLegend,      setClassLegend]      = useState({})

  const videoRef         = useRef(null)
  const phoneImgRef      = useRef(null)
  const intervalRef      = useRef(null)
  const captureCanvasRef = useRef(null)
  const canvasRef        = useRef(null)
  const containerRef     = useRef(null)
  const fullscreenRef    = useRef(null)
  const hideTimerRef     = useRef(null)

  const isPhoneDevice = selectedDevice?.type !== 'drone'

  // ── Fetch fields on mount ───────────────────────────────────────────────
  useEffect(() => {
    const fetchFields = async () => {
      setFieldsLoading(true)
      try {
        const res = await api.get('/api/fields')
        setFields(res.data.data || [])
      } catch (err) {
        console.error('Failed to fetch fields', err)
      } finally {
        setFieldsLoading(false)
      }
    }
    fetchFields()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(e.target)) {
        setShowFieldDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const handleConnectDevice = () => {
    if (devices.length === 0) return
    setShowSourceModal(true)
  }

  const handleSelectDevice = (device) => {
    setShowSourceModal(false)
    setSelectedDevice(device)
    setCameraStarted(true)
    setPhoneImgError(false)
    if (device.type === 'drone') {
      setTimeout(() => connectDrone(), 50)
    }
  }

  const handleDisconnect = () => {
    setCameraStarted(false)
    setCountingActive(false)
    setSelectedDevice(null)
    setBoxes([])
    setClassLegend({})
    setPhoneImgError(false)
    disconnectDrone()
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = ''
    }
  }

  useEffect(() => {
    if (!cameraStarted || !countingActive) return
    intervalRef.current = setInterval(uploadFrame, 1000)
    return () => clearInterval(intervalRef.current)
  }, [cameraStarted, countingActive])

  useEffect(() => {
    const el = isPhoneDevice ? phoneImgRef.current : videoRef.current
    if (!el) return
    const redraw = () => drawBoxes()
    el.addEventListener('resize', redraw)
    window.addEventListener('resize', redraw)
    return () => { el.removeEventListener('resize', redraw); window.removeEventListener('resize', redraw) }
  }, [cameraStarted, isPhoneDevice])

  useEffect(() => { drawBoxes() }, [boxes])

  useEffect(() => {
    const onChange = () => {
      const active = !!document.fullscreenElement
      setIsFullscreen(active)
      if (!active) { setShowLog(false); setControlsVisible(true) }
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const wakeControls = useCallback(() => {
    setControlsVisible(true)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3500)
  }, [])

  // ─── Enhanced drawBoxes: per-class colors, index badges, styled label pills ──
  const drawBoxes = () => {
    const sourceEl = isPhoneDevice ? phoneImgRef.current : videoRef.current
    const canvas   = canvasRef.current
    if (!sourceEl || !canvas) return

    const nativeW = isPhoneDevice ? (sourceEl.naturalWidth || sourceEl.width || 0) : (sourceEl.videoWidth || 0)
    const nativeH = isPhoneDevice ? (sourceEl.naturalHeight || sourceEl.height || 0) : (sourceEl.videoHeight || 0)
    if (!nativeW || !nativeH) return

    const rect    = sourceEl.getBoundingClientRect()
    canvas.width  = rect.width
    canvas.height = rect.height
    const scaleX  = rect.width  / nativeW
    const scaleY  = rect.height / nativeH
    const ctx     = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!Array.isArray(boxes)) return

    boxes.forEach((d, idx) => {
      if (!d || !Array.isArray(d.box) || d.box.length < 4) return

      const [x1, y1, x2, y2] = d.box
      const conf  = d.confidence ?? d.box[4] ?? 0
      const cls   = d.class ?? 'Unknown'
      const color = getClassColor(cls)

      const x = x1 * scaleX
      const y = y1 * scaleY
      const w = (x2 - x1) * scaleX
      const h = (y2 - y1) * scaleY

      // ── Semi-transparent fill inside the box ─────────────────────────
      ctx.fillStyle = color.fill
      ctx.fillRect(x, y, w, h)

      // ── Main bounding box stroke ─────────────────────────────────────
      ctx.strokeStyle = color.stroke
      ctx.lineWidth   = 2
      ctx.setLineDash([])
      ctx.strokeRect(x, y, w, h)

      // ── Corner accent brackets ────────────────────────────────────────
      const cl = Math.min(18, w * 0.18, h * 0.18)
      ctx.strokeStyle = color.stroke
      ctx.lineWidth   = 3.5
      ctx.lineCap     = 'round'
      const corners = [
        [x,     y,     x + cl, y,      x,      y + cl],
        [x + w, y,     x+w-cl, y,      x + w,  y + cl],
        [x,     y + h, x + cl, y + h,  x,      y+h-cl],
        [x + w, y + h, x+w-cl, y + h,  x + w,  y+h-cl],
      ]
      corners.forEach(([mx, my, lx1, ly1, lx2, ly2]) => {
        ctx.beginPath(); ctx.moveTo(lx1, ly1); ctx.lineTo(mx, my); ctx.lineTo(lx2, ly2); ctx.stroke()
      })

      // ── Detection index badge (small circle, top-left corner) ────────
      const badgeR = 9
      const bx     = x + badgeR + 3
      const by     = y + badgeR + 3
      ctx.beginPath()
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2)
      ctx.fillStyle = color.stroke
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px system-ui,sans-serif'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(idx + 1, bx, by)
      ctx.textAlign    = 'left'
      ctx.textBaseline = 'alphabetic'

      // ── Label pill above the box ─────────────────────────────────────
      const confPct = Math.round(conf * 100)
      const mainLabel = cls
      const confLabel = `${confPct}%`

      ctx.font = 'bold 12px system-ui,sans-serif'
      const mainW = ctx.measureText(mainLabel).width
      ctx.font = '11px system-ui,sans-serif'
      const confW = ctx.measureText(confLabel).width

      // Measure separator
      ctx.font = '11px system-ui,sans-serif'
      const sepW = ctx.measureText(' · ').width

      const pillPad = 8
      const pillW   = pillPad + mainW + sepW + confW + pillPad
      const pillH   = 22
      const pillX   = x
      // Prefer above the box; clamp to top of canvas if needed
      const pillY   = (y - pillH - 4) >= 0 ? y - pillH - 4 : y + 4

      // Rounded rect helper (works without roundRect API)
      const roundRect = (rx, ry, rw, rh, r) => {
        ctx.beginPath()
        ctx.moveTo(rx + r, ry)
        ctx.lineTo(rx + rw - r, ry)
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r)
        ctx.lineTo(rx + rw, ry + rh - r)
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh)
        ctx.lineTo(rx + r, ry + rh)
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r)
        ctx.lineTo(rx, ry + r)
        ctx.quadraticCurveTo(rx, ry, rx + r, ry)
        ctx.closePath()
      }

      roundRect(pillX, pillY, pillW, pillH, 5)
      ctx.fillStyle = color.label
      ctx.fill()

      // Class name (bold white)
      let tx = pillX + pillPad
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px system-ui,sans-serif'
      ctx.fillText(mainLabel, tx, pillY + 15)
      tx += mainW

      // Separator
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = '11px system-ui,sans-serif'
      ctx.fillText(' · ', tx, pillY + 15)
      tx += sepW

      // Confidence (lighter)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = '11px system-ui,sans-serif'
      ctx.fillText(confLabel, tx, pillY + 15)
    })
  }

  const captureFrame = () => {
    const canvas = captureCanvasRef.current
    if (!canvas) return null
    if (isPhoneDevice) {
      const img = phoneImgRef.current
      if (!img || !img.naturalWidth) return null
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      try { canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height) }
      catch { console.error('Canvas tainted'); return null }
    } else {
      const video = videoRef.current
      if (!video || !video.videoWidth) return null
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    }
    return canvas.toDataURL('image/jpeg')
  }

  const uploadFrame = async () => {
    const frameData = captureFrame()
    if (!frameData) return
    try {
      const payload = {
        image: frameData.split(',')[1],
        ...(selectedField ? { fieldId: selectedField.id } : {}),
      }
      const response   = await api.post('/api/detection', payload)
      const raw        = response.data.data?.detections
      const dets       = Array.isArray(raw) ? raw : []
      const normalized = dets.map(d => ({
        ...d,
        confidence: d.confidence ?? d.box?.[4] ?? 0,
        class: d.class ?? d.label ?? 'Unknown',
      }))
      setBoxes(normalized)

      // Build class legend from all seen classes
      if (normalized.length > 0) {
        setClassLegend(prev => {
          const next = { ...prev }
          normalized.forEach(d => {
            const key = (d.class || 'Unknown').toLowerCase()
            next[key] = { name: d.class || 'Unknown', color: getClassColor(d.class) }
          })
          return next
        })
        setDetections(p => p + normalized.length)
        setConfidence(Math.round(normalized.reduce((s, d) => s + d.confidence, 0) / normalized.length * 100))
        setDetectionLog(p => [
          ...normalized.map(d => ({ ...d, timestamp: new Date().toLocaleTimeString(), id: Date.now() + Math.random() })),
          ...p,
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

  const isPhoneReady     = isPhoneDevice && cameraStarted && !phoneImgError
  const isDetectionReady = isPhoneReady || connectionState === 'connected'

  const status = (() => {
    if (!cameraStarted)                     return 'Idle'
    if (countingActive)                     return 'Active — Counting'
    if (phoneImgError)                      return 'Stream Error'
    if (isPhoneReady)                       return 'Camera Ready'
    if (connectionState === 'connected')    return 'Camera Ready'
    if (connectionState === 'connecting')   return 'Connecting…'
    if (connectionState === 'disconnected') return 'Disconnected'
    if (connectionState === 'failed')       return 'Connection Failed'
    return 'Waiting for drone…'
  })()

  const statusStyle = countingActive
      ? 'bg-green-50 text-green-700 border-green-100'
      : phoneImgError
          ? 'bg-red-50 text-red-600 border-red-100'
          : (isPhoneReady || connectionState === 'connected')
              ? 'bg-blue-50 text-blue-700 border-blue-100'
              : connectionState === 'failed'
                  ? 'bg-red-50 text-red-600 border-red-100'
                  : connectionState === 'connecting'
                      ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                      : 'bg-gray-50 text-gray-500 border-gray-100'

  const statusDot = countingActive
      ? 'bg-green-500 animate-pulse'
      : phoneImgError
          ? 'bg-red-400'
          : (isPhoneReady || connectionState === 'connected') ? 'bg-blue-400'
              : connectionState === 'failed'     ? 'bg-red-400'
                  : connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse'
                      : 'bg-gray-300'

  // ── Class color legend pill row ────────────────────────────────────────
  const ClassLegend = ({ dark = false }) => {
    const entries = Object.values(classLegend)
    if (entries.length === 0) return null
    return (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(({ name, color }) => (
              <span
                  key={name}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border"
                  style={{
                    background:   `${color.stroke}18`,
                    borderColor:  `${color.stroke}40`,
                    color:         color.stroke,
                  }}
              >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color.stroke }} />
                {name}
          </span>
          ))}
        </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  FIELD SELECTOR
  // ═══════════════════════════════════════════════════════════════════════
  const FieldSelector = ({ dark = false }) => (
      <div className="relative" ref={fieldDropdownRef}>
        <button
            onClick={() => setShowFieldDropdown(v => !v)}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-all
          ${dark
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:border-green-400 hover:bg-green-50 shadow-sm'
            }`}
        >
          <MapPin size={14} className={dark ? 'text-green-400' : 'text-green-600'} />
          <span className="max-w-[160px] truncate">
          {selectedField ? selectedField.fieldName : 'Select Field'}
        </span>
          <ChevronDown
              size={14}
              className={`transition-transform ${showFieldDropdown ? 'rotate-180' : ''} ${dark ? 'text-gray-400' : 'text-gray-400'}`}
          />
        </button>

        {showFieldDropdown && (
            <div className={`absolute z-50 mt-2 w-72 rounded-2xl shadow-2xl border overflow-hidden right-0
  ${dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-100'}`}
                 style={{ maxHeight: 'min(420px, calc(100vh - 80px))' }}
            >
              <div className={`px-4 py-3 border-b flex items-center justify-between
            ${dark ? 'border-white/10' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <Layers size={13} className={dark ? 'text-green-400' : 'text-green-600'} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                Available Fields
              </span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
              ${dark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {fields.length} total
            </span>
              </div>

              <button
                  onClick={() => { setSelectedField(null); setShowFieldDropdown(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
              ${!selectedField
                      ? dark ? 'bg-green-500/15' : 'bg-green-50'
                      : dark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                  }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
              ${!selectedField
                    ? 'bg-green-500/20 border border-green-500/30'
                    : dark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'
                }`}>
                  <X size={13} className={!selectedField ? 'text-green-400' : dark ? 'text-gray-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${!selectedField
                      ? dark ? 'text-green-400' : 'text-green-700'
                      : dark ? 'text-gray-300' : 'text-gray-600'}`}>
                    No specific field
                  </p>
                  <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Monitor without field context</p>
                </div>
                {!selectedField && (
                    <span className="ml-auto text-green-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
                )}
              </button>

              <div className={`mx-4 border-t ${dark ? 'border-white/[0.06]' : 'border-gray-100'}`} />

              <div className="overflow-y-auto py-1" style={{ maxHeight: 'min(224px, calc(100vh - 220px))' }}>
                {fieldsLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <svg className="w-4 h-4 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Loading fields…</span>
                    </div>
                ) : fields.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <MapPin size={20} className={`mx-auto mb-2 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
                      <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No fields registered</p>
                    </div>
                ) : (
                    fields.map(field => {
                      const isActive = selectedField?.id === field.id
                      return (
                          <button
                              key={field.id}
                              onClick={() => { setSelectedField(field); setShowFieldDropdown(false) }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${isActive
                                  ? dark ? 'bg-green-500/15' : 'bg-green-50'
                                  : dark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                              }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm
                      ${isActive
                                ? 'bg-green-500 text-white shadow-sm shadow-green-500/30'
                                : dark ? 'bg-white/8 border border-white/10 text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-500'
                            }`}>
                              {field.fieldName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate
                        ${isActive
                                  ? dark ? 'text-green-400' : 'text-green-700'
                                  : dark ? 'text-gray-200' : 'text-gray-800'
                              }`}>
                                {field.fieldName}
                              </p>
                              <p className={`text-xs truncate ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                                {field.area} {field.measurementUnit} · {field.crops} crops
                                {field.farmers?.length > 0 && ` · ${field.farmers.length} farmer${field.farmers.length !== 1 ? 's' : ''}`}
                              </p>
                            </div>
                            {isActive && (
                                <span className="text-green-500 flex-shrink-0">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                            )}
                          </button>
                      )
                    })
                )}
              </div>
            </div>
        )}
      </div>
  )

  const FieldBadge = ({ dark = false }) => {
    if (!selectedField) return null
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border
        ${dark
            ? 'bg-green-500/15 border-green-500/25 text-green-300'
            : 'bg-green-50 border-green-100 text-green-700'
        }`}>
          <MapPin size={11} />
          <span className="max-w-[120px] truncate">{selectedField.fieldName}</span>
          <span className={`${dark ? 'text-green-500/60' : 'text-green-400'}`}>·</span>
          <span className={`${dark ? 'text-green-400/70' : 'text-green-500/80'}`}>
          {selectedField.area} {selectedField.measurementUnit}
        </span>
        </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  VIDEO AREA
  // ═══════════════════════════════════════════════════════════════════════
  const VideoArea = () => (
      <div ref={containerRef} className="relative w-full h-full">
        {isPhoneDevice ? (
            <>
              {phoneImgError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <p className="text-sm font-medium text-red-400">Could not load stream from <span className="font-mono text-xs">{streamUrl}</span></p>
                    <p className="text-xs text-gray-400 text-center px-6">Make sure the device is reachable and the app is running.</p>
                    <button onClick={() => setPhoneImgError(false)} className="mt-1 text-xs bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg transition-colors">Retry</button>
                  </div>
              ) : (
                  <img
                      ref={phoneImgRef}
                      src={streamUrl}
                      crossOrigin="anonymous"
                      className="w-full h-full object-contain bg-black"
                      alt="Camera stream"
                      onLoad={() => setPhoneImgError(false)}
                      onError={() => setPhoneImgError(true)}
                  />
              )}
            </>
        ) : (
            <>
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain bg-black" />
              {connectionState !== 'connected' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-3">
                    {connectionState === 'connecting' || connectionState === 'idle' ? (
                        <>
                          <svg className="w-8 h-8 animate-spin text-green-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          <p className="text-sm font-medium text-gray-300">Waiting for drone to connect…</p>
                          <p className="text-xs text-gray-500">WHEP: <span className="text-gray-400 font-mono text-[10px]">{whepUrl}</span></p>
                        </>
                    ) : connectionState === 'failed' ? (
                        <>
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          </svg>
                          <p className="text-sm font-medium text-red-400">{webrtcError || 'Connection failed'}</p>
                          <button onClick={() => { disconnectDrone(); connectDrone() }} className="mt-1 text-xs bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg transition-colors">Retry</button>
                        </>
                    ) : null}
                  </div>
              )}
            </>
        )}

        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        <canvas ref={captureCanvasRef} className="hidden" />

        {/* Class legend overlay — bottom-left of video */}
        {!isFullscreen && Object.values(classLegend).length > 0 && (
            <div className="absolute bottom-3 left-3">
              <ClassLegend dark />
            </div>
        )}

        {!isFullscreen && boxes.length > 0 && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10">
              {boxes.length} detected
            </div>
        )}

        {isFullscreen && <FullscreenUI />}
      </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  //  FULLSCREEN OVERLAY UI
  // ═══════════════════════════════════════════════════════════════════════
  const FullscreenUI = () => (
      <>
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black/65 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/65 to-transparent" />
        </div>

        <div className="absolute inset-0 z-20 pointer-events-none"
             style={{ opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}>

          <div className="absolute top-0 left-0 right-0 px-6 pt-5 pb-2 flex items-start justify-between pointer-events-auto">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-green-400 uppercase">Live Monitoring</p>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">Field Monitoring</h1>
              {selectedField && <div className="mt-1"><FieldBadge dark /></div>}
              {/* Class legend in fullscreen */}
              {Object.values(classLegend).length > 0 && (
                  <div className="mt-2"><ClassLegend dark /></div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <FieldSelector dark />

              {selectedDevice && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm ${
                      isPhoneDevice
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : connectionState === 'connected'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              : 'bg-white/10 text-gray-400 border-white/20'}`}>
                  <DeviceIcon type={selectedDevice.type} size={12} />
                    {selectedDevice.name}
                </span>
              )}

              {countingActive && (
                  <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
              </span>
              )}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${statusStyle}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />{status}
              </div>
              {boxes.length > 0 && (
                  <div className="bg-black/50 backdrop-blur-sm border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {boxes.length} detected
                  </div>
              )}
              <button onClick={() => setShowLog(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all backdrop-blur-sm
                    ${showLog ? 'bg-green-500 border-green-400 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Log {detectionLog.length > 0 && <span className="bg-white/25 text-[10px] font-black px-1.5 py-0.5 rounded-full">{detectionLog.length}</span>}
              </button>
              <button onClick={toggleFullscreen}
                      className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full transition-colors backdrop-blur-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
                </svg>
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-4 flex items-end justify-between pointer-events-auto">
            <div className="flex gap-2">
              {!countingActive ? (
                  <button onClick={() => setCountingActive(true)}
                          disabled={!isDetectionReady}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Start Detection
                  </button>
              ) : (
                  <button onClick={() => { setCountingActive(false); setBoxes([]); setClassLegend({}) }}
                          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    Stop Detection
                  </button>
              )}
              <button onClick={handleDisconnect}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-xl transition-colors backdrop-blur-sm">
                Disconnect
              </button>
            </div>
            <div className="flex gap-3">
              <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Detections</p>
                <p className="text-xl font-bold text-white mt-0.5">{detections}</p>
              </div>
              <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 text-center min-w-[80px]">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Confidence</p>
                <p className="text-xl font-bold text-white mt-0.5">{confidence}<span className="text-sm text-gray-400">%</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Detection log sidebar */}
        <div className="absolute top-0 right-0 bottom-0 z-30 flex flex-col"
             style={{
               width: '300px',
               transform: showLog ? 'translateX(0)' : 'translateX(100%)',
               transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
               background: 'rgba(8,12,18,0.90)',
               backdropFilter: 'blur(24px)',
               borderLeft: '1px solid rgba(255,255,255,0.07)',
             }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="text-sm font-semibold text-white">Detection Log</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 bg-white/[0.06] px-2 py-0.5 rounded-full">{detectionLog.length}/50</span>
              <button onClick={() => setShowLog(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {detectionLog.length > 0 ? (
                <div className="divide-y divide-white/[0.05]">
                  {detectionLog.map(d => {
                    const color = getClassColor(d.class)
                    return (
                        <div key={d.id} className="px-5 py-3.5 hover:bg-white/[0.04] transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color.stroke }} />
                              <div>
                                <p className="text-sm font-semibold text-white">{d.class}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{d.timestamp}</p>
                              </div>
                            </div>
                            <span
                                className="text-xs font-bold px-2.5 py-1 rounded-full border"
                                style={{ background: `${color.stroke}20`, borderColor: `${color.stroke}40`, color: color.stroke }}
                            >
                            {Math.round(d.confidence * 100)}%
                          </span>
                          </div>
                        </div>
                    )
                  })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500">No detections yet</p>
                  <p className="text-xs text-gray-600 mt-1">Start detection to begin logging</p>
                </div>
            )}
          </div>
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
  //  DEVICE SOURCE MODAL
  // ═══════════════════════════════════════════════════════════════════════
  const SourceModal = () => (
      <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowSourceModal(false)}
      >
        <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
        >
          <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.88) translateY(12px); }
            to   { opacity: 1; transform: scale(1)    translateY(0);    }
          }
        `}</style>

          <div className="px-7 pt-7 pb-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Select Camera Device</h2>
              <button
                  onClick={() => setShowSourceModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            {selectedField && <div className="mt-3"><FieldBadge /></div>}
          </div>

          <div className="mx-7 border-t border-gray-100" />

          <div className="px-7 py-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            {devices.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Wifi size={20} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">No devices configured</p>
                  <p className="text-xs text-gray-400 mb-4">Go to Settings → Camera Devices to add your camera or drone</p>
                  <a href="/settings"
                     className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-100 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors">
                    <Settings size={12} />
                    Open Settings
                  </a>
                </div>
            ) : (
                devices.map(device => {
                  const typeInfo = { phone: { label: 'IP Stream', color: 'blue' }, drone: { label: 'WebRTC', color: 'green' }, generic: { label: 'Stream', color: 'gray' } }[device.type] || { label: 'Stream', color: 'gray' }
                  const styles = DEVICE_TYPE_STYLES[device.type] || DEVICE_TYPE_STYLES.generic
                  const url = getDeviceStreamUrl(device)

                  return (
                      <button
                          key={device.id}
                          onClick={() => handleSelectDevice(device)}
                          className={`group relative w-full text-left rounded-2xl border-2 border-gray-100 bg-gray-50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
                      ${device.type === 'drone' ? 'hover:border-green-400 hover:bg-green-50 hover:shadow-green-100' : 'hover:border-blue-400 hover:bg-blue-50 hover:shadow-blue-100'}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-shadow
                        ${device.type === 'drone'
                              ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-200 group-hover:shadow-green-300'
                              : device.type === 'phone'
                                  ? 'bg-gradient-to-br from-blue-400 to-indigo-600 shadow-blue-200 group-hover:shadow-blue-300'
                                  : 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-200'}`}>
                            <DeviceIcon type={device.type} size={22} />
                            <span className="text-white sr-only">{device.type}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-bold text-gray-900">{device.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>
                            {typeInfo.label}
                          </span>
                            </div>
                            {device.notes && <p className="text-xs text-gray-500 mb-1.5 leading-relaxed">{device.notes}</p>}
                            <div className={`mt-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border
                          ${device.type === 'drone' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                              <Wifi size={10} className={device.type === 'drone' ? 'text-green-400' : 'text-blue-400'} />
                              <span className={`text-[10px] font-mono font-semibold truncate ${device.type === 'drone' ? 'text-green-600' : 'text-blue-600'}`}>{url}</span>
                            </div>
                          </div>
                          <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-colors text-gray-300 ${device.type === 'drone' ? 'group-hover:text-green-400' : 'group-hover:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                  )
                })
            )}
          </div>

          {devices.length > 0 && (
              <div className="mx-7 mb-6 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Make sure your device is powered on and reachable on the local network.
                  Manage devices in <span className="font-semibold">Settings → Camera Devices</span>.
                </p>
              </div>
          )}
        </div>
      </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
      <div className="min-h-screen bg-gray-50/60 p-6 md:p-8">
        {showSourceModal && <SourceModal />}
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Live</p>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Field Monitoring</h1>
            </div>
            <FieldSelector />
          </div>

          {/* ── Selected field info strip ── */}
          {selectedField && (
              <div className="bg-white rounded-2xl border border-green-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm shadow-green-300">
                  {selectedField.fieldName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{selectedField.fieldName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedField.area} {selectedField.measurementUnit}
                    {selectedField.crops != null && ` · ${selectedField.crops} crops`}
                    {selectedField.farmers?.length > 0 && ` · ${selectedField.farmers.length} farmer${selectedField.farmers.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                <MapPin size={11} />
                Monitoring this field
              </span>
                  <button
                      onClick={() => setSelectedField(null)}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <X size={11} />
                    Clear
                  </button>
                </div>
              </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Camera Panel */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-gray-700 flex-shrink-0">Camera Feed</h2>
                    {selectedDevice && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                            DEVICE_TYPE_STYLES[selectedDevice.type]?.badge || DEVICE_TYPE_STYLES.generic.badge}`}>
                          <DeviceIcon type={selectedDevice.type} size={10} />
                          {selectedDevice.name}
                        </span>
                    )}
                    {/* Class legend appears in the header once classes are seen */}
                    {Object.values(classLegend).length > 0 && <ClassLegend />}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {countingActive && (
                        <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE
                    </span>
                    )}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusStyle}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />{status}
                    </div>
                    {cameraStarted && (
                        <button onClick={toggleFullscreen} title="Fullscreen"
                                className="p-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
                          </svg>
                        </button>
                    )}
                  </div>
                </div>

                {/* Video area */}
                <div ref={fullscreenRef}
                     onMouseMove={isFullscreen ? wakeControls : undefined}
                     onClick={isFullscreen ? wakeControls : undefined}
                     className={`relative bg-gray-950 overflow-hidden flex items-center justify-center
                   ${isFullscreen ? 'w-screen h-screen' : 'aspect-video'}`}
                     style={isFullscreen ? { cursor: controlsVisible ? 'default' : 'none' } : {}}>
                  {!cameraStarted ? (
                      <div className="text-center px-6">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                          </svg>
                        </div>
                        {devices.length === 0 ? (
                            <>
                              <p className="text-gray-400 text-sm mb-1">No devices configured</p>
                              <p className="text-gray-500 text-xs mb-5">
                                Add camera devices in <span className="text-gray-300 font-semibold">Settings → Camera Devices</span> first
                              </p>
                              <a href="/settings"
                                 className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                                <Settings size={14} />
                                Go to Settings
                              </a>
                            </>
                        ) : (
                            <>
                              {selectedField ? (
                                  <>
                                    <p className="text-gray-300 text-sm mb-0.5">Ready to monitor</p>
                                    <p className="text-green-400 text-xs font-semibold mb-1">{selectedField.fieldName}</p>
                                    <p className="text-gray-600 text-xs mb-5">{selectedField.area} {selectedField.measurementUnit} · {selectedField.crops} crops</p>
                                  </>
                              ) : (
                                  <>
                                    <p className="text-gray-500 text-sm mb-1">No camera connected</p>
                                    <p className="text-gray-600 text-xs mb-5">{devices.length} device{devices.length !== 1 ? 's' : ''} available</p>
                                  </>
                              )}
                              <button onClick={handleConnectDevice}
                                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors active:scale-95">
                                Connect Camera
                              </button>
                            </>
                        )}
                      </div>
                  ) : (
                      <VideoArea />
                  )}
                </div>

                {cameraStarted && !isFullscreen && (
                    <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                      {!countingActive ? (
                          <button onClick={() => setCountingActive(true)}
                                  disabled={!isDetectionReady}
                                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Start Detection
                          </button>
                      ) : (
                          <button onClick={() => { setCountingActive(false); setBoxes([]); setClassLegend({}) }}
                                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                            Stop Detection
                          </button>
                      )}
                      <button onClick={handleDisconnect}
                              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors">
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

            {/* Detection Log */}
            <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                 style={{ maxHeight: 'calc(100vh - 10rem)' }}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-700">Detection Log</h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {detectionLog.length} / 50
              </span>
              </div>
              <div className="overflow-y-auto flex-1">
                {detectionLog.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {detectionLog.map(d => {
                        const color = getClassColor(d.class)
                        return (
                            <div key={d.id} className="px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {/* Per-class color indicator dot */}
                                  <span
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ background: color.stroke }}
                                  />
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">{d.class}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{d.timestamp}</p>
                                  </div>
                                </div>
                                <span
                                    className="text-xs font-bold px-2.5 py-1 rounded-full border"
                                    style={{
                                      background:  `${color.stroke}15`,
                                      borderColor: `${color.stroke}30`,
                                      color:        color.stroke,
                                    }}
                                >
                                {Math.round(d.confidence * 100)}%
                              </span>
                              </div>
                            </div>
                        )
                      })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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