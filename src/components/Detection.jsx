import { useState } from 'react'
import { Upload, FileImage, Trash2, Download, CheckCircle } from 'lucide-react'

export default function Detection() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detectionResults, setDetectionResults] = useState(null)

  const handleDragOver = e => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = e => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleImageUpload(file)
  }

  const handleFileSelect = e => {
    if (e.target.files[0]) handleImageUpload(e.target.files[0])
  }

  const handleImageUpload = file => {
    const reader = new FileReader()
    reader.onload = e => {
      setUploadedImage(e.target.result)
      simulateAnalysis()
    }
    reader.readAsDataURL(file)
  }

  const simulateAnalysis = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
      setDetectionResults({
        detected: true,
        pest: 'Aphids',
        confidence: 92,
        severity: 'Moderate',
        recommendations: [
          'Apply neem oil spray',
          'Introduce ladybugs as natural predators',
          'Remove heavily infested leaves',
        ]
      })
    }, 2000)
  }

  const handleClear = () => { setUploadedImage(null); setDetectionResults(null) }

  const handleDownload = () => {
    if (!detectionResults) return
    const blob = new Blob([JSON.stringify(detectionResults, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'detection-results.json'
    a.click()
  }

  return (
      <div className="min-h-screen bg-gray-50/60 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">AI Analysis</p>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Detection</h1>
              <p className="text-sm text-gray-400 mt-0.5">Upload an image to detect pests and diseases</p>
            </div>

            {uploadedImage && (
                <div className="flex gap-2">
                  <button
                      onClick={handleClear}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-sm font-semibold text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                  {detectionResults && (
                      <button
                          onClick={handleDownload}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 active:scale-95 transition-all shadow-sm"
                      >
                        <Download size={14} />
                        Download
                      </button>
                  )}
                </div>
            )}
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Upload */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Upload Image</h2>
              </div>
              <div className="p-6">
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl transition-all ${
                        isDragging ? 'border-green-400 bg-green-50/50' : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
                    }`}
                >
                  {uploadedImage ? (
                      <img
                          src={uploadedImage}
                          alt="Uploaded"
                          className="w-full max-h-80 object-contain rounded-xl"
                      />
                  ) : (
                      <label className="cursor-pointer block py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                          <Upload size={20} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">Drop image here or click to upload</p>
                        <p className="text-xs text-gray-400">PNG or JPG up to 10MB</p>
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                      </label>
                  )}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Detection Results</h2>
              </div>
              <div className="p-6">
                <div className="bg-gray-950 rounded-2xl min-h-64 flex items-center justify-center p-6">
                  {isAnalyzing ? (
                      <div className="text-center">
                        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">Analyzing image…</p>
                      </div>
                  ) : detectionResults ? (
                      <div className="w-full text-white space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                          <h3 className="text-xl font-bold text-green-400">{detectionResults.pest} Detected</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold rounded-full">
                        {detectionResults.confidence}% Confidence
                      </span>
                          <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold rounded-full">
                        {detectionResults.severity} Severity
                      </span>
                        </div>
                        <div className="pt-2 border-t border-white/10">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommendations</p>
                          <ul className="space-y-2">
                            {detectionResults.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                                  <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0 mt-2" />
                                  {rec}
                                </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                  ) : (
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                          <FileImage size={20} className="text-gray-600" />
                        </div>
                        <p className="text-gray-500 text-sm">Upload an image to see results</p>
                      </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
  )
}