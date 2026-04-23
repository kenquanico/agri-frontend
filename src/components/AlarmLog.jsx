import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, X, Leaf, Bug, MapPin, Clock, Activity, ChevronRight, Thermometer, Droplets, Wind } from 'lucide-react'
import api from '../api/api'

const SHARED_DETECTIONS_KEY = 'agriSharedDetections'

const severityConfig = {
  high:   { label: 'High',   classes: 'bg-gray-900 text-white border-gray-800' },
  medium: { label: 'Medium', classes: 'bg-gray-200 text-gray-700 border-gray-300' },
  low:    { label: 'Low',    classes: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const typeConfig = {
  Disease: { classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Pest:    { classes: 'bg-amber-50 text-amber-700 border-amber-200' },
}

const confidenceColor = c => c >= 90 ? 'text-gray-900' : c >= 75 ? 'text-gray-600' : 'text-gray-400'

const filterBtns = [
  { key: 'all', label: 'All' },
  { key: 'disease', label: 'Diseases' },
  { key: 'pest', label: 'Pests' },
]

const deriveSeverity = (item) => {
  if (item.severity) return item.severity
  if (item.confidence >= 0.9) return 'high'
  if (item.confidence >= 0.75) return 'medium'
  return 'low'
}

const PEST_KEYWORDS = ['aphid', 'whitefly', 'mite', 'beetle', 'caterpillar', 'thrip', 'weevil', 'locust', 'pest']
const deriveType = (item) => {
  if (item.type === 'Pest' || item.type === 'Disease') return item.type
  const name = (item.class ?? item.label ?? item.name ?? item.type ?? '').toLowerCase()
  return PEST_KEYWORDS.some(k => name.includes(k)) ? 'Pest' : 'Disease'
}

const normalizeType = (value) => {
  const t = String(value ?? '').toLowerCase()
  if (t === 'pest') return 'Pest'
  if (t === 'disease') return 'Disease'
  return deriveType({ type: value })
}

const normalizeRecord = (raw, index) => {
  const type = normalizeType(raw.type)
  const confidence = raw.confidence != null
      ? (raw.confidence <= 1 ? Math.round(raw.confidence * 100) : Math.round(raw.confidence))
      : 0
  const timestamp = raw.timestamp ?? raw.createdAt ?? raw.detected_at ?? raw.detectedAt ?? '—'

  return {
    id: raw.id ?? raw._id ?? `${timestamp}-${index}`,
    timestamp,
    type,
    name: raw.class ?? raw.label ?? raw.name ?? 'Unknown',
    confidence,
    location: raw.location ?? raw.field ?? raw.fieldName ?? (raw.fieldId ? `Field ${raw.fieldId}` : '—'),
    severity: deriveSeverity({ ...raw, confidence: raw.confidence ?? confidence / 100 }),
  }
}

const loadSharedDetections = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SHARED_DETECTIONS_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

// ─── Static enrichment data ────────────────────────────────────────────────

const staticDetails = {
  default: {
    description: 'A detected anomaly in crop health has been flagged by the monitoring system. Review confidence score and field location before taking action.',
    symptoms: ['Visible discoloration on leaf surfaces', 'Irregular growth patterns observed', 'Reduced canopy density in affected zones'],
    conditions: { temperature: '28–34°C', humidity: '70–85%', wind: 'Low to moderate' },
    affectedArea: '~0.4 ha',
    firstDetected: '3 days ago',
    spread: 'Localized',
  },
  'Leaf Blight': {
    description: 'Leaf blight is a fungal infection causing rapid browning and death of leaf tissue. It thrives in warm, humid conditions and spreads quickly through water splash.',
    symptoms: ['Brown water-soaked lesions on leaves', 'Yellow halos around lesion edges', 'Premature leaf drop in severe cases', 'Stunted new growth near infection site'],
    conditions: { temperature: '25–30°C', humidity: '>80%', wind: 'Low' },
    affectedArea: '~0.6 ha',
    firstDetected: '5 days ago',
    spread: 'Spreading',
  },
  'Powdery Mildew': {
    description: 'Powdery mildew is a widespread fungal disease recognized by its white powdery coating on leaf surfaces. It reduces photosynthesis and weakens plant immunity.',
    symptoms: ['White powdery patches on upper leaf surfaces', 'Leaves curl upward or become distorted', 'Yellowing beneath white patches', 'Premature leaf senescence'],
    conditions: { temperature: '18–28°C', humidity: '40–70%', wind: 'Moderate' },
    affectedArea: '~0.3 ha',
    firstDetected: '8 days ago',
    spread: 'Stable',
  },
  'Aphid Infestation': {
    description: 'Aphids are small sap-sucking insects that colonize stems and undersides of leaves. They excrete honeydew, promoting sooty mold and transmitting plant viruses.',
    symptoms: ['Clusters of small insects on new growth', 'Sticky honeydew residue on leaves', 'Curling or yellowing of young leaves', 'Presence of ants near affected plants'],
    conditions: { temperature: '20–25°C', humidity: '50–65%', wind: 'Calm' },
    affectedArea: '~0.2 ha',
    firstDetected: '2 days ago',
    spread: 'Expanding',
  },
}

const staticTreatments = {
  default: {
    urgency: 'medium',
    summary: 'Apply a broad-spectrum protective treatment and monitor the affected area closely over the next 7 days.',
    steps: [
      { phase: 'Immediate', icon: '01', actions: ['Isolate the affected zone from irrigation runoff', 'Document and photograph the affected area for records', 'Avoid mechanical disturbance of infected plants'] },
      { phase: 'Short-term', icon: '02', actions: ['Apply a recommended broad-spectrum fungicide or pesticide', 'Adjust irrigation schedule to reduce moisture on foliage', 'Remove and dispose of heavily infected plant material'] },
      { phase: 'Follow-up', icon: '03', actions: ['Re-inspect area after 5–7 days', 'Apply a second treatment if spread continues', 'Submit a field report through the monitoring dashboard'] },
    ],
    products: [
      { name: 'Broad-Spectrum Fungicide', dose: '2.5 ml/L water', timing: 'Every 10–14 days' },
      { name: 'Foliar Nutrient Booster', dose: '5 ml/L water', timing: 'Weekly during recovery' },
    ],
    precautions: 'Use protective gloves and eyewear when applying chemicals. Avoid application during peak heat hours (10 AM – 2 PM). Keep livestock away from treated areas for 48 hours.',
  },
  'Leaf Blight': {
    urgency: 'high',
    summary: 'Immediate fungicide application is required. This pathogen spreads rapidly under current field conditions.',
    steps: [
      { phase: 'Immediate', icon: '01', actions: ['Flag and quarantine the identified field section', 'Stop overhead irrigation in the affected area immediately', 'Notify field supervisor and log detection in the system'] },
      { phase: 'Treatment', icon: '02', actions: ['Apply copper-based fungicide at full label rate', 'Treat a 10-meter buffer zone around detected plants', 'Remove all visibly infected leaves and bury or burn off-site'] },
      { phase: 'Recovery', icon: '03', actions: ['Monitor daily for 14 days post-treatment', 'Apply a second round of fungicide after 7 days', 'Restore balanced fertilization once spread is contained'] },
    ],
    products: [
      { name: 'Copper Oxychloride 50WP', dose: '3 g/L water', timing: 'Every 7 days × 3 applications' },
      { name: 'Mancozeb 75WP', dose: '2.5 g/L water', timing: 'Alternate with copper treatment' },
      { name: 'Potassium Phosphonate', dose: '4 ml/L water', timing: 'Bi-weekly as a systemic booster' },
    ],
    precautions: 'Do not apply copper-based products during flowering — risk of phytotoxicity. Wear full PPE. Observe a 7-day pre-harvest interval for all listed products.',
  },
  'Powdery Mildew': {
    urgency: 'medium',
    summary: 'Targeted sulfur-based or systemic fungicide treatment. Improve air circulation and reduce canopy density.',
    steps: [
      { phase: 'Cultural', icon: '01', actions: ['Prune dense canopy areas to improve airflow', 'Reduce nitrogen fertilization temporarily', 'Switch to drip irrigation to keep foliage dry'] },
      { phase: 'Chemical', icon: '02', actions: ['Apply wettable sulfur or systemic triazole fungicide', 'Cover both upper and lower leaf surfaces thoroughly', 'Repeat application after 10 days if conditions persist'] },
      { phase: 'Prevention', icon: '03', actions: ['Plant resistant varieties in future seasons', 'Maintain 30–40 cm plant spacing', 'Track humidity levels with field sensors'] },
    ],
    products: [
      { name: 'Wettable Sulfur 80WP', dose: '2 g/L water', timing: 'Every 10 days until clear' },
      { name: 'Myclobutanil (systemic)', dose: '1 ml/L water', timing: 'Once, at first sign of spread' },
    ],
    precautions: 'Do not apply sulfur when temperatures exceed 32°C — severe crop burn risk. Allow 14 days between sulfur and oil-based spray applications.',
  },
  'Aphid Infestation': {
    urgency: 'low',
    summary: 'Targeted insecticidal soap or neem oil spray. Encourage natural predators and monitor weekly.',
    steps: [
      { phase: 'Biological', icon: '01', actions: ['Introduce or preserve ladybird beetles and lacewings', 'Avoid broad-spectrum pesticides that kill natural enemies', 'Plant companion crops like dill or fennel nearby'] },
      { phase: 'Spray', icon: '02', actions: ['Apply insecticidal soap solution to infested areas', 'Target undersides of leaves where colonies cluster', 'Repeat every 3–5 days for 2–3 cycles'] },
      { phase: 'Monitoring', icon: '03', actions: ['Set yellow sticky traps for population tracking', 'Check new growth tips daily during peak season', 'Log population density weekly in the monitoring system'] },
    ],
    products: [
      { name: 'Insecticidal Soap Concentrate', dose: '5 ml/L water', timing: 'Every 3–5 days × 3 cycles' },
      { name: 'Neem Oil 3%', dose: '4 ml/L water', timing: 'Weekly as a deterrent spray' },
    ],
    precautions: 'Apply early morning or evening to avoid leaf scorch. Do not spray on water-stressed plants. Insecticidal soap has no residual activity — timing and coverage are critical.',
  },
}

const getDetails = (name) => staticDetails[name] ?? staticDetails.default
const getTreatment = (name) => staticTreatments[name] ?? staticTreatments.default

const urgencyStyles = {
  high:   { label: 'Urgent', pill: 'bg-red-50 text-red-700 border border-red-200' },
  medium: { label: 'Moderate', pill: 'bg-amber-50 text-amber-700 border border-amber-200' },
  low:    { label: 'Low priority', pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
}

// ─── Details Modal ─────────────────────────────────────────────────────────

function DetailsModal({ detection, onClose, onTreatment }) {
  const details = getDetails(detection.name)
  const TypeIcon = detection.type === 'Pest' ? Bug : Leaf

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-10 pt-8 pb-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${detection.type === 'Pest' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                  <TypeIcon size={22} className={detection.type === 'Pest' ? 'text-amber-600' : 'text-emerald-600'} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{detection.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Detection #{String(detection.id).slice(-6).toUpperCase()}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors mt-0.5 flex-shrink-0">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${(typeConfig[detection.type] ?? typeConfig.Disease).classes}`}>
              <TypeIcon size={11} />
              {detection.type}
            </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${(severityConfig[detection.severity] ?? severityConfig.low).classes}`}>
              {(severityConfig[detection.severity] ?? severityConfig.low).label} severity
            </span>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  detection.confidence >= 90
                      ? 'bg-gray-900 text-white border-gray-800'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}>
              {detection.confidence}% confidence
            </span>
            </div>
          </div>

          {/* Body — two-column */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 divide-x divide-gray-100">

              {/* Left column */}
              <div className="px-10 py-8 space-y-8">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Overview</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{details.description}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Observed symptoms</p>
                  <ul className="space-y-3">
                    {details.symptoms.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{s}</span>
                        </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right column */}
              <div className="px-10 py-8 space-y-8">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Field info</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MapPin size={12} className="text-gray-400" />
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{detection.location}</p>
                      <p className="text-xs text-gray-400 mt-1">{details.affectedArea} affected</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Clock size={12} className="text-gray-400" />
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timeline</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{details.firstDetected}</p>
                      <p className="text-xs text-gray-400 mt-1">Spread: {details.spread}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Favorable conditions</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Thermometer, label: 'Temp', value: details.conditions.temperature },
                      { icon: Droplets,    label: 'Humidity', value: details.conditions.humidity },
                      { icon: Wind,        label: 'Wind', value: details.conditions.wind },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-2xl p-4 text-center">
                          <Icon size={16} className="text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-400 mb-1">{label}</p>
                          <p className="text-xs font-semibold text-gray-700">{value}</p>
                        </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Detection details</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Timestamp', value: detection.timestamp },
                      { label: 'Confidence', value: `${detection.confidence}%` },
                      { label: 'Severity', value: (severityConfig[detection.severity] ?? severityConfig.low).label },
                      { label: 'Type', value: detection.type },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <span className="text-xs text-gray-400">{label}</span>
                          <span className="text-xs font-semibold text-gray-700">{value}</span>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-6 border-t border-gray-100 flex gap-3 flex-shrink-0">
            <button onClick={onClose} className="flex-1 text-sm font-semibold px-4 py-3 rounded-2xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              Close
            </button>
            <button
                onClick={() => { onClose(); onTreatment(detection) }}
                className="flex-1 text-sm font-semibold px-4 py-3 rounded-2xl bg-gray-900 text-white hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              View Treatment
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
  )
}

// ─── Treatment Modal ───────────────────────────────────────────────────────

function TreatmentModal({ detection, onClose }) {
  const treatment = getTreatment(detection.name)
  const urgency = urgencyStyles[treatment.urgency] ?? urgencyStyles.medium

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-10 pt-8 pb-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Treatment Plan</p>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{detection.name}</h2>
              </div>
              <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors mt-0.5 flex-shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex items-start gap-4 bg-gray-50 rounded-2xl p-5">
              <Activity size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-gray-700">Action summary</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${urgency.pill}`}>
                  {urgency.label}
                </span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{treatment.summary}</p>
              </div>
            </div>
          </div>

          {/* Body — two-column */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 divide-x divide-gray-100">

              {/* Left — Steps */}
              <div className="px-10 py-8">
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-6">Action steps</p>
                <div className="space-y-6">
                  {treatment.steps.map((step, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          {i < treatment.steps.length - 1 && (
                              <div className="w-px flex-1 bg-gray-100 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <p className="text-sm font-semibold text-gray-800 mb-3">{step.phase}</p>
                          <ul className="space-y-2">
                            {step.actions.map((action, j) => (
                                <li key={j} className="flex items-start gap-2.5">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                  <span className="text-sm text-gray-500 leading-relaxed">{action}</span>
                                </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                  ))}
                </div>
              </div>

              {/* Right — Products + Precautions */}
              <div className="px-10 py-8 space-y-8">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-4">Recommended products</p>
                  <div className="space-y-3">
                    {treatment.products.map((p, i) => (
                        <div key={i} className="p-5 bg-gray-50 rounded-2xl">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                            <span className="text-xs font-semibold text-gray-600 bg-white border border-gray-200 px-2.5 py-1 rounded-xl flex-shrink-0">
                          {p.dose}
                        </span>
                          </div>
                          <p className="text-xs text-gray-400">{p.timing}</p>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700 mb-2">Precautions</p>
                    <p className="text-sm text-amber-600 leading-relaxed">{treatment.precautions}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-10 py-6 border-t border-gray-100 flex-shrink-0">
            <button onClick={onClose} className="w-full text-sm font-semibold px-4 py-3 rounded-2xl bg-gray-900 text-white hover:bg-gray-800 transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AlarmLog() {
  const [detectionLog, setDetectionLog] = useState([])
  const [filter, setFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all_time')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [detailsTarget, setDetailsTarget] = useState(null)
  const [treatmentTarget, setTreatmentTarget] = useState(null)

  const fetchAlarms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const shared = loadSharedDetections().map((item, idx) => normalizeRecord(item, idx))

      let apiRows = []
      try {
        const res = await api.get('/api/alarms')
        const raw = res.data?.data ?? res.data ?? []
        apiRows = Array.isArray(raw) ? raw.map(normalizeRecord) : []
      } catch (err) {
        console.error('Alarm fetch failed:', err.response?.status, err.response?.data ?? err.message)
        try {
          const res = await api.get('/api/detections')
          const raw = res.data?.data ?? res.data ?? []
          apiRows = Array.isArray(raw) ? raw.map(normalizeRecord) : []
        } catch (err2) {
          console.error('Detections fetch also failed:', err2.response?.status, err2.response?.data ?? err2.message)
        }
      }

      const merged = [...shared, ...apiRows]
      const deduped = Array.from(new Map(merged.map(r => [String(r.id), r])).values())
      deduped.sort((a, b) => {
        const ta = new Date(a.timestamp).getTime() || 0
        const tb = new Date(b.timestamp).getTime() || 0
        return tb - ta
      })

      setDetectionLog(deduped)
      if (deduped.length === 0) {
        setError('Could not load detection records. Make sure the API server is running.')
      }
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAlarms() }, [fetchAlarms])

  useEffect(() => {
    const interval = setInterval(fetchAlarms, 5000)
    const onStorage = (e) => { if (e.key === SHARED_DETECTIONS_KEY) fetchAlarms() }
    window.addEventListener('storage', onStorage)
    return () => { clearInterval(interval); window.removeEventListener('storage', onStorage) }
  }, [fetchAlarms])

  const parseTimestamp = (value) => {
    if (!value || value === '—') return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const getDateRange = (key) => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (key === 'today') return { start: startOfToday, end: now }
    if (key === 'last_7_days') { const s = new Date(startOfToday); s.setDate(s.getDate() - 6); return { start: s, end: now } }
    if (key === 'last_30_days') { const s = new Date(startOfToday); s.setDate(s.getDate() - 29); return { start: s, end: now } }
    if (key === 'this_month') return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    if (key === 'last_month') return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) }
    return null
  }

  const typeFilteredLog = filter === 'all' ? detectionLog : detectionLog.filter(item => item.type.toLowerCase() === filter)
  const filteredLog = dateFilter === 'all_time'
      ? typeFilteredLog
      : typeFilteredLog.filter(item => {
        const ts = parseTimestamp(item.timestamp)
        if (!ts) return false
        const range = getDateRange(dateFilter)
        if (!range) return true
        return ts >= range.start && ts <= range.end
      })

  const dateFilterOptions = [
    { key: 'all_time', label: 'All time' },
    { key: 'today', label: 'Today' },
    { key: 'last_7_days', label: 'Last 7 days' },
    { key: 'last_30_days', label: 'Last 30 days' },
    { key: 'this_month', label: 'This month' },
    { key: 'last_month', label: 'Last month' },
  ]

  const stats = [
    { label: 'Total',         value: filteredLog.length },
    { label: 'Diseases',      value: filteredLog.filter(d => d.type === 'Disease').length },
    { label: 'Pests',         value: filteredLog.filter(d => d.type === 'Pest').length },
    { label: 'High Severity', value: filteredLog.filter(d => d.severity === 'high').length },
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
              {lastUpdated && <p className="text-xs text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</p>}
              <button
                  onClick={fetchAlarms}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Error */}
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

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
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
            <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-white text-gray-600 border border-gray-100 hover:border-gray-200"
            >
              {dateFilterOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <button
                onClick={() => { setFilter('all'); setDateFilter('all_time') }}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-white text-gray-500 border border-gray-100 hover:text-gray-800 hover:border-gray-200"
            >
              Reset filters
            </button>
          </div>

          {/* Skeleton */}
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
                        <div className="flex justify-between py-2"><span className="text-gray-400">Location</span><span className="text-gray-700 font-medium">{d.location}</span></div>
                        <div className="flex justify-between py-2"><span className="text-gray-400">Confidence</span><span className={`font-bold ${confidenceColor(d.confidence)}`}>{d.confidence}%</span></div>
                        <div className="flex justify-between py-2"><span className="text-gray-400">Time</span><span className="text-gray-600">{d.timestamp}</span></div>
                      </div>
                      <div className="flex gap-2">
                        <button
                            onClick={() => setDetailsTarget(d)}
                            className="flex-1 text-xs font-semibold px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors"
                        >
                          View Details
                        </button>
                        <button
                            onClick={() => setTreatmentTarget(d)}
                            className="flex-1 text-xs font-semibold px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-colors"
                        >
                          Treatment
                        </button>
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
                        <th key={i} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{col}</th>
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
                            <button
                                onClick={() => setDetailsTarget(d)}
                                className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                            >
                              Details
                            </button>
                            <button
                                onClick={() => setTreatmentTarget(d)}
                                className="text-xs font-semibold text-green-600 hover:text-green-800"
                            >
                              Treatment
                            </button>
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

        {/* Modals */}
        {detailsTarget && (
            <DetailsModal
                detection={detailsTarget}
                onClose={() => setDetailsTarget(null)}
                onTreatment={(d) => setTreatmentTarget(d)}
            />
        )}
        {treatmentTarget && (
            <TreatmentModal
                detection={treatmentTarget}
                onClose={() => setTreatmentTarget(null)}
            />
        )}
      </div>
  )
}