import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import api from '../../api/api'
import { useDroneWebRTC } from '../../api/useDroneWebRTC'

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
export const getClassColor = (cls) => {
    const key = (cls || 'Unknown').toLowerCase()
    if (!CLASS_COLORS[key]) { CLASS_COLORS[key] = COLOR_PALETTE[_colorIdx++ % COLOR_PALETTE.length] }
    return CLASS_COLORS[key]
}

function useGPS() {
    const [gps, setGps] = useState(null)
    const watchRef = useRef(null)

    useEffect(() => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
        watchRef.current = navigator.geolocation.watchPosition(
            pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, maximumAge: 30000 }
        )
        return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current) }
    }, [])

    return gps
}

const MonitoringContext = createContext(null)

export function MonitoringProvider({ children }) {
    const [devices, setDevices] = useState(loadDevices)
    const [selectedDevice, setSelectedDevice] = useState(null)
    const gps = useGPS()

    useEffect(() => {
        const refresh = () => setDevices(loadDevices())
        window.addEventListener('focus', refresh)
        return () => window.removeEventListener('focus', refresh)
    }, [])

    const streamUrl     = selectedDevice ? getDeviceStreamUrl(selectedDevice) : ''
    const whepUrl       = selectedDevice?.type === 'drone' ? getDroneApiUrl(selectedDevice) : ''
    const isPhoneDevice = selectedDevice?.type !== 'drone'

    const { remoteStream, connectionState, error: webrtcError, connect: connectDrone, disconnect: disconnectDrone }
        = useDroneWebRTC({ whepUrl })

    const [selectedField, setSelectedField]   = useState(null)
    const [cameraStarted, setCameraStarted]   = useState(false)
    const [countingActive, setCountingActive] = useState(false)
    const [boxes, setBoxes]                   = useState([])
    const [detections, setDetections]         = useState(0)
    const [confidence, setConfidence]         = useState(0)
    const [detectionLog, setDetectionLog]     = useState([])
    const [phoneImgError, setPhoneImgError]   = useState(false)
    const [classLegend, setClassLegend]       = useState({})
    const [pipVisible, setPipVisible]         = useState(false)

    const [globalThreshold, setGlobalThreshold] = useState(() => {
        const saved = parseFloat(localStorage.getItem('detectionThreshold'))
        return isNaN(saved) ? 0 : saved
    })
    useEffect(() => {
        const sync = () => {
            const v = parseFloat(localStorage.getItem('detectionThreshold'))
            if (!isNaN(v)) setGlobalThreshold(v)
        }
        window.addEventListener('storage', sync)
        return () => window.removeEventListener('storage', sync)
    }, [])

    const videoRef         = useRef(null)
    const phoneImgRef      = useRef(null)
    const captureCanvasRef = useRef(null)

    const selectedFieldRef = useRef(null)
    const isPhoneRef       = useRef(false)
    const countingRef      = useRef(false)
    const boxesRef         = useRef([])
    const intervalRef      = useRef(null)
    const gpsRef           = useRef(null)

    useEffect(() => { selectedFieldRef.current = selectedField }, [selectedField])
    useEffect(() => { isPhoneRef.current = isPhoneDevice },       [isPhoneDevice])
    useEffect(() => { countingRef.current = countingActive },     [countingActive])
    useEffect(() => { boxesRef.current = boxes },                 [boxes])
    useEffect(() => { gpsRef.current = gps },                     [gps])

    useEffect(() => {
        if (videoRef.current && remoteStream) videoRef.current.srcObject = remoteStream
    }, [remoteStream])

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

    const uploadFrame = useCallback(async () => {
        if (!countingRef.current) return
        try {
            const frameData = captureFrame()
            if (!frameData) return

            const field = selectedFieldRef.current
            const currentGps = gpsRef.current

            const payload = {
                image:        frameData.split(',')[1],
                fieldId:      field?.id           ?? null,
                location:     field?.name         ?? null,
                latitude:     currentGps?.lat     ?? null,
                longitude:    currentGps?.lng     ?? null,
                municipality: field?.municipality ?? null,
                province:     field?.province     ?? null,
                device_type:  selectedDevice?.type ?? 'unknown',
                source:       'field-monitoring',
            }

            const response = await api.post('/api/detect', payload)

            // Backend returns saved detections under response.data.saved
            // and raw YOLO detections under response.data.data.detections
            const raw  = response.data?.data?.detections
            const dets = Array.isArray(raw) ? raw : []

            const normalized = dets.map(d => ({
                ...d,
                confidence: d.confidence ?? d.box?.[4] ?? 0,
                class:      d.class ?? d.label ?? 'Unknown',
            }))

            const threshold = parseFloat(localStorage.getItem('detectionThreshold')) || 0
            const filtered  = threshold > 0
                ? normalized.filter(d => d.confidence >= threshold)
                : normalized

            setBoxes(filtered)

            if (filtered.length > 0) {
                setClassLegend(prev => {
                    const next = { ...prev }
                    filtered.forEach(d => {
                        const k = (d.class || 'Unknown').toLowerCase()
                        next[k] = { name: d.class || 'Unknown', color: getClassColor(d.class) }
                    })
                    return next
                })
                setDetections(p => p + filtered.length)
                setConfidence(Math.round(
                    filtered.reduce((s, d) => s + d.confidence, 0) / filtered.length * 100
                ))
                setDetectionLog(p => [
                    ...filtered.map(d => ({
                        ...d,
                        timestamp: new Date().toLocaleTimeString(),
                        id: `${Date.now()}-${Math.random()}`,
                    })),
                    ...p,
                ].slice(0, 50))
            }
        } catch (e) {
            console.error('uploadFrame error:', e)
        }
    }, [captureFrame, selectedDevice])

    useEffect(() => {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        if (cameraStarted && countingActive) {
            intervalRef.current = setInterval(uploadFrame, 1000)
        }
        return () => { clearInterval(intervalRef.current); intervalRef.current = null }
    }, [cameraStarted, countingActive, uploadFrame])

    const handleSelectDevice = useCallback((device) => {
        clearInterval(intervalRef.current); intervalRef.current = null
        countingRef.current = false
        setCountingActive(false)
        setBoxes([]); setClassLegend({}); setPhoneImgError(false)
        setSelectedDevice(device)
        setCameraStarted(true)
        if (device.type === 'drone') setTimeout(connectDrone, 100)
    }, [connectDrone])

    const handleDisconnect = useCallback(() => {
        clearInterval(intervalRef.current); intervalRef.current = null
        countingRef.current = false
        setCountingActive(false); setCameraStarted(false); setSelectedDevice(null)
        setBoxes([]); setClassLegend({}); setPhoneImgError(false)
        setPipVisible(false)
        if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = '' }
        disconnectDrone()
    }, [disconnectDrone])

    const isPhoneReady     = isPhoneDevice && cameraStarted && !phoneImgError
    const isDetectionReady = isPhoneReady || connectionState === 'connected'

    const value = {
        devices, selectedDevice,
        streamUrl, whepUrl, isPhoneDevice,
        remoteStream, connectionState, webrtcError,
        selectedField, setSelectedField,
        cameraStarted, setCameraStarted,
        countingActive, setCountingActive,
        boxes, setBoxes,
        detections, confidence,
        detectionLog,
        phoneImgError, setPhoneImgError,
        classLegend, setClassLegend,
        globalThreshold,
        pipVisible, setPipVisible,
        isPhoneReady, isDetectionReady,
        videoRef, phoneImgRef, captureCanvasRef,
        handleSelectDevice,
        handleDisconnect,
        connectDrone, disconnectDrone,
        gps,
    }

    return (
        <MonitoringContext.Provider value={value}>
            {children}
            <canvas ref={captureCanvasRef} className="hidden" />
        </MonitoringContext.Provider>
    )
}

export function useMonitoring() {
    const ctx = useContext(MonitoringContext)
    if (!ctx) throw new Error('useMonitoring must be used inside <MonitoringProvider>')
    return ctx
}