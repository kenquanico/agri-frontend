import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import api from '../api/api'
import {
  SHARED_DETECTIONS_KEY,
  SHARED_DETECTIONS_EVENT,
  loadSharedDetections,
} from '../store/monitoringStore'

const severityConfig = {
  high:   { label: 'High',   classes: 'bg-gray-900 text-white border-gray-800' },
  medium: { label: 'Medium', classes: 'bg-gray-200 text-gray-700 border-gray-300' },
  low:    { label: 'Low',    classes: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const typeConfig = {
  Disease: { classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  Pest:    { classes: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const confidenceColor = c => c >= 90 ? 'text-gray-900' : c >= 75 ? 'text-gray-600' : 'text-gray-400'

// Derive severity from confidence if the API doesn't provide it
const deriveSeverity = (item) => {
  if (item.severity) return item.severity
  if (item.confidence >= 0.9) return 'high'
  if (item.confidence >= 0.75) return 'medium'
  return 'low'
}

// Derive type from class/label if the API doesn't provide it
const PEST_KEYWORDS = ['aphid', 'whitefly', 'mite', 'beetle', 'caterpillar', 'thrip', 'weevil', 'locust', 'pest']
const deriveType = (item) => {
  if (item.type) return item.type
  const name = (item.class ?? item.label ?? item.name ?? '').toLowerCase()
  return PEST_KEYWORDS.some(k => name.includes(k)) ? 'Pest' : 'Disease'
}

// Normalize a raw API record into the shape this component expects
const normalizeRecord = (raw, index) => {
  const type       = deriveType(raw)
  const confidence = raw.confidence != null
      ? (raw.confidence <= 1 ? Math.round(raw.confidence * 100) : Math.round(raw.confidence))
      : 0
  return {
    id:         raw.id        ?? raw._id         ?? index,
    timestamp:  raw.timestamp ?? raw.createdAt   ?? raw.detected_at ?? '—',
    type,
    name:       raw.class     ?? raw.label        ?? raw.name        ?? 'Unknown',
    confidence,
    location:   raw.location  ?? raw.field        ?? (raw.fieldId ? `Field ${raw.fieldId}` : '—'),
    severity:   deriveSeverity({ ...raw, confidence: raw.confidence ?? confidence / 100 }),
  }
}

export default function AlarmLog() {
  const [detectionLog, setDetectionLog] = useState([])
  const [filter,       setFilter]       = useState('all')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [lastUpdated,  setLastUpdated]  = useState(null)

  const fetchAlarms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Load locally-stored detections from FieldMonitoring
      const shared = loadSharedDetections().map(normalizeRecord)

      let apiRows = []
      try {
        // Try the dedicated alarms/detections history endpoint first
        const res = await api.get('/api/alarms')
        const raw = res.data?.data ?? res.data ?? []
        apiRows = Array.isArray(raw) ? raw.map(normalizeRecord) : []
      } catch {
        // Fallback: try the general detections endpoint
        try {
          const res = await api.get('/api/detections')
          const raw = res.data?.data ?? res.data ?? []
          apiRows = Array.isArray(raw) ? raw.map(normalizeRecord) : []
        } catch (fallbackErr) {
          console.error('Failed to fetch alarm log:', fallbackErr)
          if (shared.length === 0) {
            setError('Could not load detection records. Make sure the API server is running.')
          }
        }
      }

      // Merge, deduplicate by id, sort newest first
      const merged = [...shared, ...apiRows]
      const deduped = Array.from(
        new Map(merged.map(r => [String(r.id), r])).values()
      )
      deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setDetectionLog(deduped)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => { fetchAlarms() }, [fetchAlarms])

  // Auto-refresh: poll every 5 s, react to same-tab writes, and cross-tab storage changes
  useEffect(() => {
    const interval = setInterval(fetchAlarms, 30_000)

    // Same-tab: FieldMonitoring dispatches this after writing to localStorage
    const onCustomEvent = () => fetchAlarms()
    window.addEventListener(SHARED_DETECTIONS_EVENT, onCustomEvent)

    // Cross-tab: browser fires 'storage' when another tab modifies localStorage
    const onStorage = (e) => {
      if (e.key === SHARED_DETECTIONS_KEY) fetchAlarms()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(interval)
      window.removeEventListener(SHARED_DETECTIONS_EVENT, onCustomEvent)
      window.removeEventListener('storage', onStorage)
    }
  }, [fetchAlarms])

  const filteredLog = filter === 'all'
      ? detectionLog
      : detectionLog.filter(item => item.type.toLowerCase() === filter)

  const filterBtns = [
    { key: 'all',     label: 'All' },
    { key: 'disease', label: 'Diseases' },
    { key: 'pest',    label: 'Pests' },
  ]

  const stats = [
    { label: 'Total',         value: detectionLog.length },
    { label: 'Diseases',      value: detectionLog.filter(d => d.type === 'Disease').length },
    { label: 'Pests',         value: detectionLog.filter(d => d.type === 'Pest').length },
    { label: 'High Severity', value: detectionLog.filter(d => d.severity === 'high').length },
  ]

  return (
      <div className="min-h-screen bg-gray-50/60 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Monitoring</p>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Alarm Log</h1>
              <p className="text-sm text-gray-400 mt-0.5">Detected pests and diseases from field monitoring</p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </p>
              )}
              <button
                  onClick={fetchAlarms}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <svg
                    className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Failed to load data</p>
                  <p className="text-xs text-red-500 mt-0.5">{error}</p>
                </div>
              </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map(({ label, value }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                  {loading ? (
                      <div className="h-10 w-12 bg-gray-100 rounded-lg animate-pulse" />
                  ) : (
                      <p className="text-4xl font-bold tracking-tight text-gray-900">{value}</p>
                  )}
                </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            {filterBtns.map(({ key, label }) => (
                <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        filter === key
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-white text-gray-500 border border-gray-100 hover:text-gray-800 hover:border-gray-200'
                    }`}
                >
                  {label}
                </button>
            ))}
          </div>

          {/* Loading skeleton */}
          {loading && detectionLog.length === 0 && (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-gray-100 rounded" />
                          <div className="h-3 w-20 bg-gray-100 rounded" />
                        </div>
                        <div className="h-6 w-16 bg-gray-100 rounded-xl" />
                      </div>
                    </div>
                ))}
              </div>
          )}

          {/* Mobile Cards */}
          {!loading && (
              <div className="space-y-3 lg:hidden">
                {filteredLog.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
                      <AlertTriangle size={28} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-400">No detections match this filter</p>
                    </div>
                ) : filteredLog.map(d => (
                    <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{d.name}</h3>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${(typeConfig[d.type] ?? typeConfig.Disease).classes}`}>
                      {d.type}
                    </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${(severityConfig[d.severity] ?? severityConfig.low).classes}`}>
                    {(severityConfig[d.severity] ?? severityConfig.low).label}
                  </span>
                      </div>
                      <div className="divide-y divide-gray-100 text-sm mb-4">
                        <div className="flex justify-between py-2">
                          <span className="text-gray-400">Location</span>
                          <span className="text-gray-700 font-medium">{d.location}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-400">Confidence</span>
                          <span className={`font-bold ${confidenceColor(d.confidence)}`}>{d.confidence}%</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-gray-400">Time</span>
                          <span className="text-gray-600">{d.timestamp}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 text-xs font-semibold px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors">View Details</button>
                        <button className="flex-1 text-xs font-semibold px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-colors">Treatment</button>
                      </div>
                    </div>
                ))}
              </div>
          )}

          {/* Desktop Table */}
          {!loading && (
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">Detection Records</h2>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                {filteredLog.length} record{filteredLog.length !== 1 ? 's' : ''}
              </span>
                </div>
                <table className="w-full">
                  <thead>
                  <tr>
                    {['Timestamp', 'Type', 'Detection', 'Location', 'Confidence', 'Severity', ''].map((col, i) => (
                        <th key={i} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {col}
                        </th>
                    ))}
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                  {filteredLog.map(d => (
                      <tr key={d.id} className="group hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{d.timestamp}</td>
                        <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${(typeConfig[d.type] ?? typeConfig.Disease).classes}`}>
                        {d.type}
                      </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{d.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{d.location}</td>
                        <td className="px-6 py-4 text-sm font-bold whitespace-nowrap">
                          <span className={confidenceColor(d.confidence)}>{d.confidence}%</span>
                        </td>
                        <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold border ${(severityConfig[d.severity] ?? severityConfig.low).classes}`}>
                        {(severityConfig[d.severity] ?? severityConfig.low).label}
                      </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-xs font-semibold text-gray-500 hover:text-gray-800">Details</button>
                            <button className="text-xs font-semibold text-green-600 hover:text-green-800">Treatment</button>
                          </div>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>

                {filteredLog.length === 0 && !loading && (
                    <div className="py-16 text-center">
                      <AlertTriangle size={28} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-400">
                        {error ? 'Failed to load detections' : 'No detections match this filter'}
                      </p>
                    </div>
                )}
              </div>
          )}

        </div>
      </div>
  )
}