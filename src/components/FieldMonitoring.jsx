import { useState, useEffect, useRef } from 'react'
import api from '../api/api'


export default function FieldMonitoring() {
  const [cameraStarted, setCameraStarted] = useState(false);
  const [countingActive, setCountingActive] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [boxes, setBoxes] = useState([])
  const [detections, setDetections] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [detectionLog, setDetectionLog] = useState([]);

  const MOBILE_CAMERA_URL = 'http://192.168.1.15:8080/video'; 
  const imgRef = useRef(null)
  const intervalRef = useRef(null)
  const captureCanvasRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)


useEffect(() => {
  if (!cameraStarted || !countingActive) return

  console.log("interval started")

  intervalRef.current = setInterval(() => {
    uploadFrame()
  }, 1000)

  return () => {
    console.log("interval cleared")
    clearInterval(intervalRef.current)
  }
}, [cameraStarted, countingActive])


// Handle image load and resize
useEffect(() => {
  const img = imgRef.current
  if (!img) return

  const handleImageUpdate = () => {
    drawBoxes()
  }

  img.addEventListener('load', handleImageUpdate)
  window.addEventListener('resize', handleImageUpdate)

  return () => {
    img.removeEventListener('load', handleImageUpdate)
    window.removeEventListener('resize', handleImageUpdate)
  }
}, [cameraStarted])


// Draw boxes whenever boxes change
useEffect(() => {
  drawBoxes()
}, [boxes])


const drawBoxes = () => {
  const img = imgRef.current
  const canvas = canvasRef.current
  if (!img || !canvas) return
  if (!img.naturalWidth || !img.complete) return

  // Get the actual rendered size of the image
  const rect = img.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height

  // Calculate scale factors
  const scaleX = rect.width / img.naturalWidth
  const scaleY = rect.height / img.naturalHeight

  const ctx = canvas.getContext("2d")
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  boxes.forEach(d => {
    const [x1, y1, x2, y2, conf] = d.box

    const x = x1 * scaleX
    const y = y1 * scaleY
    const w = (x2 - x1) * scaleX
    const h = (y2 - y1) * scaleY

    // Draw semi-transparent background for label
    const label = `${d.class} ${Math.round(conf * 100)}%`
    ctx.font = "14px Inter, Arial, sans-serif"
    const textMetrics = ctx.measureText(label)
    const textWidth = textMetrics.width
    const textHeight = 20

    // Draw label background
    ctx.fillStyle = "rgba(34, 197, 94, 0.9)" // Green-500 with opacity
    ctx.fillRect(x, y - textHeight - 4, textWidth + 12, textHeight + 4)

    // Draw label text
    ctx.fillStyle = "white"
    ctx.fillText(label, x + 6, y - 8)

    // Draw bounding box with gradient effect
    ctx.strokeStyle = "rgb(34, 197, 94)" // Green-500
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, w, h)

    // Add inner glow effect
    ctx.strokeStyle = "rgba(34, 197, 94, 0.3)"
    ctx.lineWidth = 1
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4)

    // Add corner highlights
    const cornerLength = 20
    ctx.strokeStyle = "rgb(22, 163, 74)" // Green-600
    ctx.lineWidth = 4

    // Top-left corner
    ctx.beginPath()
    ctx.moveTo(x, y + cornerLength)
    ctx.lineTo(x, y)
    ctx.lineTo(x + cornerLength, y)
    ctx.stroke()

    // Top-right corner
    ctx.beginPath()
    ctx.moveTo(x + w - cornerLength, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + cornerLength)
    ctx.stroke()

    // Bottom-left corner
    ctx.beginPath()
    ctx.moveTo(x, y + h - cornerLength)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x + cornerLength, y + h)
    ctx.stroke()

    // Bottom-right corner
    ctx.beginPath()
    ctx.moveTo(x + w - cornerLength, y + h)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x + w, y + h - cornerLength)
    ctx.stroke()
  })
}


const handleMountCamera = () => {
  setCameraStarted(true)
  setStatus("Camera Ready")
}

const handleStopCamera = () => {
  setCameraStarted(false)
  setCountingActive(false)
  setStatus("Idle")
  setBoxes([])
}

const handleStartCounting = () => {
  setCountingActive(true)
  setStatus("Active - Counting")
}

const handleStopCounting = () => {
  setCountingActive(false)
  setStatus("Camera Ready")
  setBoxes([])
}


const captureFrame = () => {
  const img = imgRef.current
  const canvas = captureCanvasRef.current
  if (!img || !canvas) {
    console.log("No img or canvas")
    return null
  }
  if (!img.complete || img.naturalWidth === 0) {
    console.log("Image not ready")
    return null
  }

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight

  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL("image/jpeg")
}


const uploadFrame = async () => {
  console.log("uploadFrame tick")
  const frameData = captureFrame()
  if (!frameData) return

  const base64 = frameData.split(",")[1]

  try {
    const response = await api.post("/api/detection", { image: base64 })
    console.log(response)
    const dets = response.data.data?.detections || []
    setBoxes(dets)

    if (dets.length > 0) {
      setDetections(prev => prev + dets.length)
      const avgConf = dets.reduce((sum, d) => sum + d.confidence, 0) / dets.length
      setConfidence(Math.round(avgConf * 100))

      // Append new detections to log with timestamp
      const newLogEntries = dets.map(det => ({
        ...det,
        timestamp: new Date().toLocaleTimeString(),
        id: Date.now() + Math.random()
      }))

      setDetectionLog(prev => {
        const updated = [...newLogEntries, ...prev]
        // Keep only the latest 50 detections
        return updated.slice(0, 50)
      })
    }
  } catch (err) {
    console.error("Upload failed", err)
  }
}


  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Camera Feed</h2>
              <div className="flex items-center gap-3">
                {countingActive && (
                  <div className="group relative">
                    <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      LIVE
                    </div>
                    <button
                      onClick={handleStopCamera}
                      className="absolute top-0 left-0 w-full h-full bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <rect x="6" y="4" width="8" height="12" rx="1"/>
                      </svg>
                      STOP
                    </button>
                  </div>
                )}
                <div className="bg-white rounded-lg px-3 py-1.5 border border-gray-200 shadow-sm flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${countingActive ? 'bg-green-500 animate-pulse' : status === 'Camera Ready' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm font-medium text-gray-900">{status}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
            {!cameraStarted ? (
              <div className="text-center">
                <p className="text-gray-400 mb-4">Camera not started</p>
                <button
                  onClick={handleMountCamera}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
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
                  className="w-full h-full object-contain rounded-lg"
                  alt="Camera feed"
                />

                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ imageRendering: 'crisp-edges' }}
                />

                <canvas
                  ref={captureCanvasRef}
                  className="hidden"
                />

                {/* Detection count badge */}
                {boxes.length > 0 && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                    {boxes.length} detected
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Control Buttons */}
          {cameraStarted && (
            <div className="mt-6">
              {!countingActive ? (
                <button
                  onClick={handleStartCounting}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Start Counting
                </button>
              ) : (
                <button
                  onClick={handleStopCounting}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Stop Counting
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-2">Total Detections</p>
              <p className="text-3xl font-bold text-gray-900">{detections}</p>
            </div>

            <div className="bg-white rounded-lg p-6 text-center border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-2">Avg Confidence</p>
              <p className="text-3xl font-bold text-gray-900">{confidence}%</p>
            </div>
          </div>
        </div>

        {/* Detection Log */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Detection Log</h2>
            <span className="text-sm text-gray-500">
              {detectionLog.length} / 50
            </span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-[calc(100vh-12rem)] overflow-y-auto">
            {detectionLog.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {detectionLog.map((detection) => (
                  <div key={detection.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{detection.class}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {Math.round(detection.confidence * 100)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {detection.timestamp}
                        </div>
                      </div>
                      <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 text-center">No detections yet</p>
              </div>
            )}
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}