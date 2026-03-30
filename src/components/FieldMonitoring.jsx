import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../api/api'
import { useDroneWebRTC } from '../api/useDroneWebRTC'
import { ChevronDown, MapPin, Layers, X, Wifi, Smartphone, Radio, Settings } from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────
const loadDevices = () => {
  try { return JSON.parse(localStorage.getItem('cameraDevices') || '[]') } catch { return [] }
}
const getDeviceStreamUrl = (device) => {
  if (!device) return ''
  if (device.type === 'drone') return ''
  return `http://${device.ip}${device.path || '/video'}`
}

const getDroneApiUrl = (device) => {
  if (!device || device.type !== 'drone') return ''
  const raw = String(device.ip || '').trim()
  if (!raw) return ''
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
}
const DEVICE_TYPE_STYLES = {
  phone:   { badge: 'bg-blue-50 text-blue-700 border-blue-100'   },
  drone:   { badge: 'bg-green-50 text-green-700 border-green-100' },
  generic: { badge: 'bg-gray-50 text-gray-600 border-gray-200'   },
}
const DeviceIcon = ({ type, size = 14 }) => {
  if (type === 'drone') return <Radio size={size} />
  if (type === 'phone') return <Smartphone size={size} />
  return <Wifi size={size} />
}

// ─── Shared detections (bridge to AlarmLog) ──────────────────────────────────
const SHARED_DETECTIONS_KEY = 'agriSharedDetections'

const PEST_KEYWORDS = ['aphid', 'whitefly', 'mite', 'beetle', 'caterpillar', 'thrip', 'weevil', 'locust', 'pest']

/**
 * Classifies a detection class name as either 'Pest' or 'Disease'.
 * Used when writing records that AlarmLog will read.
 */
const classifyDetectionType = (className) => {
  const lower = (className || '').toLowerCase()
  return PEST_KEYWORDS.some(k => lower.includes(k)) ? 'Pest' : 'Disease'
}

/**
 * Appends new detection records to localStorage so AlarmLog can pick them up.
 * Keeps the list bounded to the last 500 entries to avoid storage bloat.
 */
const appendSharedDetections = (newRecords) => {
  if (!Array.isArray(newRecords) || newRecords.length === 0) return
  try {
    const existing = JSON.parse(localStorage.getItem(SHARED_DETECTIONS_KEY) || '[]')
    const merged = [...newRecords, ...(Array.isArray(existing) ? existing : [])]
    // Cap at 500 most-recent entries
    const capped = merged.slice(0, 500)
    localStorage.setItem(SHARED_DETECTIONS_KEY, JSON.stringify(capped))
    // Notify other tabs/windows (AlarmLog listens to the 'storage' event)
    window.dispatchEvent(new StorageEvent('storage', {
      key: SHARED_DETECTIONS_KEY,
      newValue: JSON.stringify(capped),
    }))
  } catch (e) {
    console.warn('appendSharedDetections error:', e)
  }
}

// ─── Color palette ───────────────────────────────────────────────────────────
const CLASS_COLORS = {}
const COLOR_PALETTE = [
  { stroke: '#22c55e', fill: 'rgba(34,197,94,0.12)',  label: 'rgba(34,197,94,0.95)'  },
  { stroke: '#ef4444', fill: 'rgba(239,68,68,0.12)',  label: 'rgba(239,68,68,0.95)'  },
  { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.12)', label: 'rgba(59,130,246,0.95)' },
  { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.12)', label: 'rgba(245,158,11,0.95)' },
  { stroke: '#a855f7', fill: 'rgba(168,85,247,0.12)', label: 'rgba(168,85,247,0.95)' },
  { stroke: '#06b6d4', fill: 'rgba(6,182,212,0.12)',  label: 'rgba(6,182,212,0.95)'  },
  { stroke: '#f97316', fill: 'rgba(249,115,22,0.12)', label: 'rgba(249,115,22,0.95)' },
  { stroke: '#ec4899', fill: 'rgba(236,72,153,0.12)', label: 'rgba(236,72,153,0.95)' },
]
let _colorIdx = 0
const getClassColor = (cls) => {
  const key = (cls || 'Unknown').toLowerCase()
  if (!CLASS_COLORS[key]) { CLASS_COLORS[key] = COLOR_PALETTE[_colorIdx++ % COLOR_PALETTE.length] }
  return CLASS_COLORS[key]
}

// ─── Sub-components defined OUTSIDE main component ───────────────────────────
// CRITICAL: Never define components inside the render body of another component.
// Doing so causes React to see a new component type every render → unmount/remount
// → video and img refs get destroyed → black screen after first state change.

const ClassLegendPills = ({ legend }) => {
  const entries = Object.values(legend)
  if (!entries.length) return null
  return (
      <div className="flex flex-wrap gap-1.5">
        {entries.map(({ name, color }) => (
            <span key={name} className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border"
                  style={{ background: `${color.stroke}18`, borderColor: `${color.stroke}40`, color: color.stroke }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color.stroke }} />
              {name}
        </span>
        ))}
      </div>
  )
}

const FieldBadgePill = ({ field, dark }) => {
  if (!field) return null
  return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border
      ${dark ? 'bg-green-500/15 border-green-500/25 text-green-300' : 'bg-green-50 border-green-100 text-green-700'}`}>
        <MapPin size={11} />
        <span className="max-w-[120px] truncate">{field.fieldName}</span>
        <span className={dark ? 'text-green-500/60' : 'text-green-400'}>·</span>
        <span className={dark ? 'text-green-400/70' : 'text-green-500/80'}>{field.area} {field.measurementUnit}</span>
      </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function FieldMonitoring() {
  const [devices, setDevices] = useState(loadDevices)
  const [selectedDevice, setSelectedDevice] = useState(null)
  useEffect(() => {
    const refresh = () => setDevices(loadDevices())
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  const streamUrl = selectedDevice ? getDeviceStreamUrl(selectedDevice) : ''
  const whepUrl   = selectedDevice?.type === 'drone' ? getDroneApiUrl(selectedDevice) : ''
  const isPhoneDevice = selectedDevice?.type !== 'drone'

  const { remoteStream, connectionState, error: webrtcError, connect: connectDrone, disconnect: disconnectDrone }
      = useDroneWebRTC({ whepUrl })

  const [fields, setFields]                       = useState([])
  const [selectedField, setSelectedField]         = useState(null)
  const [showFieldDropdown, setShowFieldDropdown] = useState(false)
  const [fieldsLoading, setFieldsLoading]         = useState(false)
  const fieldDropdownRef                          = useRef(null)

  const [showSourceModal, setShowSourceModal]   = useState(false)
  const [cameraStarted, setCameraStarted]       = useState(false)
  const [countingActive, setCountingActive]     = useState(false)
  const [boxes, setBoxes]                       = useState([])
  const [detections, setDetections]             = useState(0)
  const [confidence, setConfidence]             = useState(0)
  const [detectionLog, setDetectionLog]         = useState([])
  const [isFullscreen, setIsFullscreen]         = useState(false)
  const [showLog, setShowLog]                   = useState(false)
  const [controlsVisible, setControlsVisible]   = useState(true)
  const [phoneImgError, setPhoneImgError]       = useState(false)
  const [classLegend, setClassLegend]           = useState({})

  // DOM refs
  const videoRef         = useRef(null)
  const phoneImgRef      = useRef(null)
  const intervalRef      = useRef(null)
  const captureCanvasRef = useRef(null)
  const canvasRef        = useRef(null)
  const fullscreenRef    = useRef(null)
  const hideTimerRef     = useRef(null)

  // Stable value refs — prevent stale closures in interval callbacks
  const selectedFieldRef = useRef(null)
  const isPhoneRef       = useRef(false)
  const countingRef      = useRef(false)
  const boxesRef         = useRef([])

  useEffect(() => { selectedFieldRef.current = selectedField }, [selectedField])
  useEffect(() => { isPhoneRef.current = isPhoneDevice },       [isPhoneDevice])
  useEffect(() => { countingRef.current = countingActive },     [countingActive])
  useEffect(() => { boxesRef.current = boxes },                 [boxes])

  // Fetch fields
  useEffect(() => {
    const go = async () => {
      setFieldsLoading(true)
      try { const r = await api.get('/api/fields'); setFields(r.data.data || []) }
      catch (e) { console.error('fields fetch', e) }
      finally { setFieldsLoading(false) }
    }
    go()
  }, [])

  // Close field dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (fieldDropdownRef.current && !fieldDropdownRef.current.contains(e.target))
        setShowFieldDropdown(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Attach remote stream to video element
  useEffect(() => {
    if (videoRef.current && remoteStream) videoRef.current.srcObject = remoteStream
  }, [remoteStream])

  // Fullscreen change listener
  useEffect(() => {
    const h = () => {
      const active = !!document.fullscreenElement
      setIsFullscreen(active)
      if (!active) { setShowLog(false); setControlsVisible(true) }
    }
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  // ── drawBoxes ───────────────────────────────────────────────────────────────
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
      canvas.width  = rect.width
      canvas.height = rect.height

      const scaleX = rect.width  / nativeW
      const scaleY = rect.height / nativeH
      const ctx    = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const currentBoxes = boxesRef.current
      if (!Array.isArray(currentBoxes)) return

      currentBoxes.forEach((d, idx) => {
        if (!d || !Array.isArray(d.box) || d.box.length < 4) return
        const [x1, y1, x2, y2] = d.box
        const conf  = d.confidence ?? 0
        const cls   = d.class ?? 'Unknown'
        const color = getClassColor(cls)

        const x = x1 * scaleX, y = y1 * scaleY
        const w = (x2 - x1) * scaleX, h = (y2 - y1) * scaleY

        ctx.fillStyle = color.fill; ctx.fillRect(x, y, w, h)
        ctx.strokeStyle = color.stroke; ctx.lineWidth = 2; ctx.setLineDash([])
        ctx.strokeRect(x, y, w, h)

        const cl = Math.min(18, w * 0.18, h * 0.18)
        ctx.lineWidth = 3.5; ctx.lineCap = 'round'
        ;[[x,y,x+cl,y,x,y+cl],[x+w,y,x+w-cl,y,x+w,y+cl],
          [x,y+h,x+cl,y+h,x,y+h-cl],[x+w,y+h,x+w-cl,y+h,x+w,y+h-cl]
        ].forEach(([mx,my,lx1,ly1,lx2,ly2]) => {
          ctx.beginPath(); ctx.moveTo(lx1,ly1); ctx.lineTo(mx,my); ctx.lineTo(lx2,ly2); ctx.stroke()
        })

        const br = 9, bx = x+br+3, by = y+br+3
        ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2)
        ctx.fillStyle = color.stroke; ctx.fill()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui,sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(idx+1, bx, by)
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'

        const confPct = Math.round(conf * 100)
        ctx.font = 'bold 12px system-ui,sans-serif'
        const mw = ctx.measureText(cls).width
        ctx.font = '11px system-ui,sans-serif'
        const cw = ctx.measureText(`${confPct}%`).width
        const sw = ctx.measureText(' · ').width
        const pH = 22, pW = 8 + mw + sw + cw + 8
        const pY = (y - pH - 4) >= 0 ? y - pH - 4 : y + 4

        ctx.beginPath()
        const r=5
        ctx.moveTo(x+r,pY); ctx.lineTo(x+pW-r,pY); ctx.quadraticCurveTo(x+pW,pY,x+pW,pY+r)
        ctx.lineTo(x+pW,pY+pH-r); ctx.quadraticCurveTo(x+pW,pY+pH,x+pW-r,pY+pH)
        ctx.lineTo(x+r,pY+pH); ctx.quadraticCurveTo(x,pY+pH,x,pY+pH-r)
        ctx.lineTo(x,pY+r); ctx.quadraticCurveTo(x,pY,x+r,pY); ctx.closePath()
        ctx.fillStyle = color.label; ctx.fill()

        let tx = x + 8
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui,sans-serif'
        ctx.fillText(cls, tx, pY+15); tx += mw
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '11px system-ui,sans-serif'
        ctx.fillText(' · ', tx, pY+15); tx += sw
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fillText(`${confPct}%`, tx, pY+15)
      })
    } catch (e) {
      console.warn('drawBoxes error:', e)
    }
  }, [])

  useEffect(() => { drawBoxes() }, [boxes, drawBoxes])
  useEffect(() => {
    window.addEventListener('resize', drawBoxes)
    return () => window.removeEventListener('resize', drawBoxes)
  }, [drawBoxes])

  // ── captureFrame ────────────────────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    try {
      const canvas = captureCanvasRef.current
      if (!canvas) return null
      if (isPhoneRef.current) {
        const img = phoneImgRef.current
        if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return null
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
      } else {
        const video = videoRef.current
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null
        canvas.width = video.videoWidth; canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
      }
      return canvas.toDataURL('image/jpeg', 0.85)
    } catch (e) {
      console.warn('captureFrame error:', e)
      return null
    }
  }, [])

  // ── uploadFrame ─────────────────────────────────────────────────────────────
  const uploadFrame = useCallback(async () => {
    if (!countingRef.current) return
    try {
      const frameData = captureFrame()
      if (!frameData) return
      const payload = { image: frameData.split(',')[1] }
      if (selectedFieldRef.current) payload.fieldId = selectedFieldRef.current.id

      const response   = await api.post('/api/detection', payload)
      const raw        = response.data?.data?.detections
      const dets       = Array.isArray(raw) ? raw : []
      const normalized = dets.map(d => ({
        ...d,
        confidence: d.confidence ?? d.box?.[4] ?? 0,
        class: d.class ?? d.label ?? 'Unknown',
      }))

      setBoxes(normalized)
      if (normalized.length > 0) {
        setClassLegend(prev => {
          const next = { ...prev }
          normalized.forEach(d => {
            const k = (d.class || 'Unknown').toLowerCase()
            next[k] = { name: d.class || 'Unknown', color: getClassColor(d.class) }
          })
          return next
        })
        setDetections(p => p + normalized.length)
        setConfidence(Math.round(
            normalized.reduce((s, d) => s + d.confidence, 0) / normalized.length * 100
        ))
        setDetectionLog(p => [
          ...normalized.map(d => ({ ...d, timestamp: new Date().toLocaleTimeString(), id: `${Date.now()}-${Math.random()}` })),
          ...p,
        ].slice(0, 50))

        // ── Write to shared localStorage so AlarmLog picks it up ──────────────
        const nowIso = new Date().toISOString()
        appendSharedDetections(
            normalized.map((d, idx) => ({
              id: `${Date.now()}-${idx}-${Math.random()}`,
              timestamp: nowIso,
              type: classifyDetectionType(d.class ?? d.label ?? d.name ?? 'Unknown'),
              class: d.class ?? d.label ?? d.name ?? 'Unknown',
              name: d.class ?? d.label ?? d.name ?? 'Unknown',
              confidence: d.confidence ?? 0,
              location: selectedFieldRef.current?.fieldName ?? 'Unassigned field',
              fieldId: selectedFieldRef.current?.id ?? null,
              source: 'field-monitoring',
            }))
        )
      }
    } catch (e) {
      console.error('uploadFrame error:', e)
    }
  }, [captureFrame])

  // ── Detection interval ──────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    if (cameraStarted && countingActive) {
      intervalRef.current = setInterval(uploadFrame, 1000)
    }
    return () => { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [cameraStarted, countingActive, uploadFrame])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleConnectDevice = () => { if (devices.length > 0) setShowSourceModal(true) }

  const handleSelectDevice = (device) => {
    setShowSourceModal(false)
    // Reset everything before connecting a new device
    clearInterval(intervalRef.current); intervalRef.current = null
    countingRef.current = false
    setCountingActive(false)
    setBoxes([]); setClassLegend({}); setPhoneImgError(false)
    // Clear canvas
    if (canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setSelectedDevice(device)
    setCameraStarted(true)
    if (device.type === 'drone') setTimeout(connectDrone, 100)
  }

  const handleDisconnect = useCallback(() => {
    // Stop interval immediately
    clearInterval(intervalRef.current); intervalRef.current = null
    countingRef.current = false
    // Reset all state
    setCountingActive(false); setCameraStarted(false); setSelectedDevice(null)
    setBoxes([]); setClassLegend({}); setPhoneImgError(false)
    // Clear video element
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = '' }
    // Clear canvas
    if (canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    // Disconnect WebRTC
    disconnectDrone()
  }, [disconnectDrone])

  const wakeControls = useCallback(() => {
    setControlsVisible(true)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3500)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!fullscreenRef.current) return
    if (!document.fullscreenElement) { await fullscreenRef.current.requestFullscreen(); wakeControls() }
    else await document.exitFullscreen()
  }, [wakeControls])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isPhoneReady     = isPhoneDevice && cameraStarted && !phoneImgError
  const isDetectionReady = isPhoneReady || connectionState === 'connected'

  const status = !cameraStarted ? 'Idle'
      : countingActive             ? 'Active — Counting'
          : phoneImgError              ? 'Stream Error'
              : isPhoneReady               ? 'Camera Ready'
                  : connectionState === 'connected'    ? 'Camera Ready'
                      : connectionState === 'connecting'   ? 'Connecting…'
                          : connectionState === 'disconnected' ? 'Disconnected'
                              : connectionState === 'failed'       ? 'Connection Failed'
                                  : 'Waiting…'

  const statusStyle = countingActive ? 'bg-green-50 text-green-700 border-green-100'
      : phoneImgError ? 'bg-red-50 text-red-600 border-red-100'
          : (isPhoneReady || connectionState === 'connected') ? 'bg-blue-50 text-blue-700 border-blue-100'
              : connectionState === 'failed'     ? 'bg-red-50 text-red-600 border-red-100'
                  : connectionState === 'connecting' ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                      : 'bg-gray-50 text-gray-500 border-gray-100'

  const statusDot = countingActive ? 'bg-green-500 animate-pulse'
      : phoneImgError ? 'bg-red-400'
          : (isPhoneReady || connectionState === 'connected') ? 'bg-blue-400'
              : connectionState === 'failed'     ? 'bg-red-400'
                  : connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse'
                      : 'bg-gray-300'

  // ── Field selector ──────────────────────────────────────────────────────────
  const FieldSelector = ({ dark = false }) => (
      <div className="relative" ref={fieldDropdownRef}>
        <button onClick={() => setShowFieldDropdown(v => !v)}
                className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-all
          ${dark ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-green-400 hover:bg-green-50 shadow-sm'}`}>
          <MapPin size={14} className={dark ? 'text-green-400' : 'text-green-600'} />
          <span className="max-w-[160px] truncate">{selectedField ? selectedField.fieldName : 'Select Field'}</span>
          <ChevronDown size={14} className={`transition-transform ${showFieldDropdown ? 'rotate-180' : ''} text-gray-400`} />
        </button>
        {showFieldDropdown && (
            <div className={`absolute z-50 mt-2 w-72 rounded-2xl shadow-2xl border overflow-hidden right-0
          ${dark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-100'}`}
                 style={{ maxHeight: 'min(420px, calc(100vh - 80px))' }}>
              <div className={`px-4 py-3 border-b flex items-center justify-between ${dark ? 'border-white/10' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <Layers size={13} className={dark ? 'text-green-400' : 'text-green-600'} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Available Fields</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{fields.length} total</span>
              </div>
              <button onClick={() => { setSelectedField(null); setShowFieldDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
              ${!selectedField ? (dark ? 'bg-green-500/15' : 'bg-green-50') : (dark ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
              ${!selectedField ? 'bg-green-500/20 border border-green-500/30' : (dark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200')}`}>
                  <X size={13} className={!selectedField ? 'text-green-400' : (dark ? 'text-gray-600' : 'text-gray-400')} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${!selectedField ? (dark ? 'text-green-400' : 'text-green-700') : (dark ? 'text-gray-300' : 'text-gray-600')}`}>No specific field</p>
                  <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>Monitor without field context</p>
                </div>
                {!selectedField && <span className="ml-auto text-green-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></span>}
              </button>
              <div className={`mx-4 border-t ${dark ? 'border-white/[0.06]' : 'border-gray-100'}`} />
              <div className="overflow-y-auto py-1" style={{ maxHeight: 'min(224px, calc(100vh - 220px))' }}>
                {fieldsLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2">
                      <svg className="w-4 h-4 animate-spin text-green-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                      <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Loading fields…</span>
                    </div>
                ) : fields.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <MapPin size={20} className={`mx-auto mb-2 ${dark ? 'text-gray-700' : 'text-gray-300'}`} />
                      <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No fields registered</p>
                    </div>
                ) : fields.map(field => {
                  const isActive = selectedField?.id === field.id
                  return (
                      <button key={field.id} onClick={() => { setSelectedField(field); setShowFieldDropdown(false) }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                    ${isActive ? (dark ? 'bg-green-500/15' : 'bg-green-50') : (dark ? 'hover:bg-white/5' : 'hover:bg-gray-50')}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm
                    ${isActive ? 'bg-green-500 text-white shadow-sm shadow-green-500/30' : (dark ? 'bg-white/8 border border-white/10 text-gray-400' : 'bg-gray-100 border border-gray-200 text-gray-500')}`}>
                          {field.fieldName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isActive ? (dark ? 'text-green-400' : 'text-green-700') : (dark ? 'text-gray-200' : 'text-gray-800')}`}>{field.fieldName}</p>
                          <p className={`text-xs truncate ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{field.area} {field.measurementUnit} · {field.crops} crops{field.farmers?.length > 0 && ` · ${field.farmers.length} farmer${field.farmers.length !== 1 ? 's' : ''}`}</p>
                        </div>
                        {isActive && <span className="text-green-500 flex-shrink-0"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></span>}
                      </button>
                  )
                })}
              </div>
            </div>
        )}
      </div>
  )

  // ── Source modal ────────────────────────────────────────────────────────────
  const SourceModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
           style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
           onClick={() => setShowSourceModal(false)}>
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
             onClick={e => e.stopPropagation()}
             style={{ animation: 'modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
          <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.88) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
          <div className="px-7 pt-7 pb-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Select Camera Device</h2>
              <button onClick={() => setShowSourceModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 transition-colors"><X size={14} /></button>
            </div>
            {selectedField && <div className="mt-3"><FieldBadgePill field={selectedField} /></div>}
          </div>
          <div className="mx-7 border-t border-gray-100" />
          <div className="px-7 py-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            {devices.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3"><Wifi size={20} className="text-gray-300" /></div>
                  <p className="text-sm font-medium text-gray-500 mb-1">No devices configured</p>
                  <p className="text-xs text-gray-400 mb-4">Go to Settings → Camera Devices to add your camera or drone</p>
                  <a href="/settings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-100 px-4 py-2 rounded-xl hover:bg-green-100 transition-colors"><Settings size={12} />Open Settings</a>
                </div>
            ) : devices.map(device => {
              const typeInfo = ({ phone: { label: 'IP Stream' }, drone: { label: 'WebRTC' }, generic: { label: 'Stream' } })[device.type] || { label: 'Stream' }
              const styles = DEVICE_TYPE_STYLES[device.type] || DEVICE_TYPE_STYLES.generic
              const url = getDeviceStreamUrl(device)
              return (
                  <button key={device.id} onClick={() => handleSelectDevice(device)}
                          className={`group relative w-full text-left rounded-2xl border-2 border-gray-100 bg-gray-50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
                  ${device.type === 'drone' ? 'hover:border-green-400 hover:bg-green-50 hover:shadow-green-100' : 'hover:border-blue-300 hover:bg-blue-50 hover:shadow-blue-100'}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-gray-900">{device.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>{typeInfo.label}</span>
                        </div>
                        {device.notes && <p className="text-xs text-gray-500 mb-1.5">{device.notes}</p>}
                        <div className={`mt-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border ${device.type === 'drone' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                          <Wifi size={10} className={device.type === 'drone' ? 'text-green-400' : 'text-blue-400'} />
                          <span className={`text-[10px] font-mono font-semibold truncate ${device.type === 'drone' ? 'text-green-600' : 'text-blue-600'}`}>{url}</span>
                        </div>
                      </div>
                      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-colors text-gray-300 ${device.type === 'drone' ? 'group-hover:text-green-400' : 'group-hover:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
              )
            })}
          </div>
        </div>
      </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
      <div className="min-h-screen bg-gray-50/60 p-6 md:p-8">
        {showSourceModal && <SourceModal />}
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Live</p>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Field Monitoring</h1>
            </div>
            <FieldSelector />
          </div>

          {selectedField && (
              <div className="bg-white rounded-2xl border border-green-100 shadow-sm px-5 py-4 flex flex-wrap items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm shadow-green-300">
                  {selectedField.fieldName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{selectedField.fieldName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedField.area} {selectedField.measurementUnit}{selectedField.crops != null && ` · ${selectedField.crops} crops`}{selectedField.farmers?.length > 0 && ` · ${selectedField.farmers.length} farmer${selectedField.farmers.length !== 1 ? 's' : ''}`}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full"><MapPin size={11} />Monitoring this field</span>
                  <button onClick={() => setSelectedField(null)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"><X size={11} />Clear</button>
                </div>
              </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Panel header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-gray-700 flex-shrink-0">Camera Feed</h2>
                    {selectedDevice && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${DEVICE_TYPE_STYLES[selectedDevice.type]?.badge || DEVICE_TYPE_STYLES.generic.badge}`}>
                      <DeviceIcon type={selectedDevice.type} size={10} />{selectedDevice.name}
                    </span>
                    )}
                    <ClassLegendPills legend={classLegend} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {countingActive && <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE</span>}
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusStyle}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />{status}
                    </div>
                    {cameraStarted && (
                        <button onClick={toggleFullscreen} title="Fullscreen" className="p-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" /></svg>
                        </button>
                    )}
                  </div>
                </div>

                {/* Video container */}
                <div ref={fullscreenRef}
                     onMouseMove={isFullscreen ? wakeControls : undefined}
                     onClick={isFullscreen ? wakeControls : undefined}
                     className={`relative bg-gray-950 overflow-hidden flex items-center justify-center ${isFullscreen ? 'w-screen h-screen' : 'aspect-video'}`}
                     style={isFullscreen ? { cursor: controlsVisible ? 'default' : 'none' } : {}}>

                  {/* Idle placeholder — shown only when not started */}
                  {!cameraStarted && (
                      <div className="text-center px-6 z-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                        </div>
                        {devices.length === 0 ? (
                            <>
                              <p className="text-gray-400 text-sm mb-1">No devices configured</p>
                              <p className="text-gray-500 text-xs mb-5">Add camera devices in <span className="text-gray-300 font-semibold">Settings → Camera Devices</span> first</p>
                              <a href="/settings" className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"><Settings size={14} />Go to Settings</a>
                            </>
                        ) : (
                            <>
                              {selectedField
                                  ? <><p className="text-gray-300 text-sm mb-0.5">Ready to monitor</p><p className="text-green-400 text-xs font-semibold mb-1">{selectedField.fieldName}</p><p className="text-gray-600 text-xs mb-5">{selectedField.area} {selectedField.measurementUnit}</p></>
                                  : <><p className="text-gray-500 text-sm mb-1">No camera connected</p><p className="text-gray-600 text-xs mb-5">{devices.length} device{devices.length !== 1 ? 's' : ''} available</p></>
                              }
                              <button onClick={handleConnectDevice} className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors active:scale-95">Connect Camera</button>
                            </>
                        )}
                      </div>
                  )}

                  {/*
                  CRITICAL: The video and img elements are ALWAYS in the DOM.
                  We only toggle visibility via CSS — never conditionally render them.
                  Conditional rendering would unmount the element, destroying the ref,
                  causing a blank screen when re-mounting after any state change.
                */}
                  <div className={`absolute inset-0 ${cameraStarted ? 'block' : 'hidden'}`}>

                    {/* Phone MJPEG img */}
                    {phoneImgError && isPhoneDevice && cameraStarted ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3 z-10">
                          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                          <p className="text-sm font-medium text-red-400">Could not load stream</p>
                          <p className="text-xs text-gray-400 font-mono">{streamUrl}</p>
                          <button onClick={() => setPhoneImgError(false)} className="mt-1 text-xs bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg transition-colors">Retry</button>
                        </div>
                    ) : null}
                    <img
                        ref={phoneImgRef}
                        src={cameraStarted && isPhoneDevice ? streamUrl : undefined}
                        crossOrigin="anonymous"
                        className={`w-full h-full object-contain bg-black ${isPhoneDevice && cameraStarted && !phoneImgError ? 'block' : 'hidden'}`}
                        alt="Camera stream"
                        onLoad={() => { setPhoneImgError(false); drawBoxes() }}
                        onError={() => { if (isPhoneDevice && cameraStarted) setPhoneImgError(true) }}
                    />

                    {/* Drone WebRTC video */}
                    <video
                        ref={videoRef}
                        autoPlay muted playsInline
                        className={`w-full h-full object-contain bg-black ${!isPhoneDevice ? 'block' : 'hidden'}`}
                        onLoadedData={drawBoxes}
                    />
                    {!isPhoneDevice && connectionState !== 'connected' && cameraStarted && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-3 z-10">
                          {(connectionState === 'connecting' || connectionState === 'idle') ? (
                              <><svg className="w-8 h-8 animate-spin text-green-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg><p className="text-sm font-medium text-gray-300">Connecting to drone…</p></>
                          ) : connectionState === 'failed' ? (
                              <><svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg><p className="text-sm font-medium text-red-400">{webrtcError || 'Connection failed'}</p><button onClick={() => { disconnectDrone(); connectDrone() }} className="mt-1 text-xs bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg transition-colors">Retry</button></>
                          ) : null}
                        </div>
                    )}

                    {/* Canvas overlays */}
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                    <canvas ref={captureCanvasRef} className="hidden" />

                    {/* Detection badge */}
                    {!isFullscreen && boxes.length > 0 && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 z-10">
                          {boxes.length} detected
                        </div>
                    )}

                    {/* Class legend overlay */}
                    {!isFullscreen && Object.values(classLegend).length > 0 && (
                        <div className="absolute bottom-3 left-3 z-10"><ClassLegendPills legend={classLegend} /></div>
                    )}

                    {/* Fullscreen overlay */}
                    {isFullscreen && (
                        <>
                          <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="absolute top-0 left-0 right-0 h-36 bg-gradient-to-b from-black/65 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/65 to-transparent" />
                          </div>
                          <div className="absolute inset-0 z-20 pointer-events-none" style={{ opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
                            <div className="absolute top-0 left-0 right-0 px-6 pt-5 pb-2 flex items-start justify-between pointer-events-auto">
                              <div>
                                <p className="text-[10px] font-bold tracking-widest text-green-400 uppercase">Live Monitoring</p>
                                <h1 className="text-lg font-bold text-white tracking-tight">Field Monitoring</h1>
                                {selectedField && <div className="mt-1"><FieldBadgePill field={selectedField} dark /></div>}
                                {Object.values(classLegend).length > 0 && <div className="mt-2"><ClassLegendPills legend={classLegend} /></div>}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                <FieldSelector dark />
                                {selectedDevice && (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm ${isPhoneDevice ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : connectionState === 'connected' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-white/10 text-gray-400 border-white/20'}`}>
                                <DeviceIcon type={selectedDevice.type} size={12} />{selectedDevice.name}
                              </span>
                                )}
                                {countingActive && <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />LIVE</span>}
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${statusStyle}`}><span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />{status}</div>
                                {boxes.length > 0 && <div className="bg-black/50 backdrop-blur-sm border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full">{boxes.length} detected</div>}
                                <button onClick={() => setShowLog(v => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all backdrop-blur-sm ${showLog ? 'bg-green-500 border-green-400 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                  Log {detectionLog.length > 0 && <span className="bg-white/25 text-[10px] font-black px-1.5 py-0.5 rounded-full">{detectionLog.length}</span>}
                                </button>
                                <button onClick={toggleFullscreen} className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full transition-colors backdrop-blur-sm">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" /></svg>
                                </button>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-4 flex items-end justify-between pointer-events-auto">
                              <div className="flex gap-2">
                                {!countingActive
                                    ? <button onClick={() => setCountingActive(true)} disabled={!isDetectionReady} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>Start Detection</button>
                                    : <button onClick={() => { setCountingActive(false); setBoxes([]); setClassLegend({}) }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>Stop Detection</button>
                                }
                                <button onClick={handleDisconnect} className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-xl transition-colors backdrop-blur-sm">Disconnect</button>
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
                               style={{ width: 300, transform: showLog ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)', background: 'rgba(8,12,18,0.90)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                <h2 className="text-sm font-semibold text-white">Detection Log</h2>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 bg-white/[0.06] px-2 py-0.5 rounded-full">{detectionLog.length}/50</span>
                                <button onClick={() => setShowLog(false)} className="p-1 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
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
                                                <div><p className="text-sm font-semibold text-white">{d.class}</p><p className="text-xs text-gray-600 mt-0.5">{d.timestamp}</p></div>
                                              </div>
                                              <span className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{ background: `${color.stroke}20`, borderColor: `${color.stroke}40`, color: color.stroke }}>{Math.round(d.confidence * 100)}%</span>
                                            </div>
                                          </div>
                                      )
                                    })}
                                  </div>
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                                    <p className="text-sm font-medium text-gray-500">No detections yet</p>
                                    <p className="text-xs text-gray-300 mt-1">Start detection to begin logging</p>
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
                    )}
                  </div>
                </div>

                {/* Controls below video */}
                {cameraStarted && !isFullscreen && (
                    <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
                      {!countingActive
                          ? <button onClick={() => setCountingActive(true)} disabled={!isDetectionReady} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>Start Detection</button>
                          : <button onClick={() => { setCountingActive(false); setBoxes([]); setClassLegend({}) }} className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg>Stop Detection</button>
                      }
                      <button onClick={handleDisconnect} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors">Disconnect</button>
                    </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Detections</p>
                  <p className="text-4xl font-bold text-gray-900 tracking-tight">{detections}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Avg. Confidence</p>
                  <p className="text-4xl font-bold text-gray-900 tracking-tight">{confidence}<span className="text-2xl text-gray-400">%</span></p>
                </div>
              </div>
            </div>

            {/* Detection log panel */}
            <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-semibold text-gray-700">Detection Log</h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{detectionLog.length} / 50</span>
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
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color.stroke }} />
                                  <div><p className="text-sm font-semibold text-gray-900">{d.class}</p><p className="text-xs text-gray-400 mt-0.5">{d.timestamp}</p></div>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{ background: `${color.stroke}15`, borderColor: `${color.stroke}30`, color: color.stroke }}>{Math.round(d.confidence * 100)}%</span>
                              </div>
                            </div>
                        )
                      })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
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

