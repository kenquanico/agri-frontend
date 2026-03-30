import { useState, useEffect, useRef, useCallback } from 'react'
import { PlayCircle, Upload, Bell, FileText, MapPin, TrendingUp, TrendingDown, ChevronDown, X, HelpCircle } from 'lucide-react'

const formatDateShort = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const formatMonthYear = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

const buildTimeRanges = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = today.getDay()
  const diffToMonday = (day + 6) % 7

  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - diffToMonday)
  const thisWeekEnd = new Date(thisWeekStart)
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1)

  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const sixMonthsStart = new Date(today.getFullYear(), today.getMonth() - 5, 1)
  const sixMonthsEnd = new Date(today.getFullYear(), today.getMonth(), 1)

  return [
    { label: 'This week', date: `${formatDateShort(thisWeekStart)} - ${formatDateShort(thisWeekEnd)}`, days: '7 days' },
    { label: 'Last week', date: `${formatDateShort(lastWeekStart)} - ${formatDateShort(lastWeekEnd)}`, days: '7 days' },
    { label: 'Last month', date: formatMonthYear(lastMonthDate), days: '1 month' },
    { label: 'Other', date: `${sixMonthsStart.toLocaleDateString('en-US', { month: 'short' })} - ${sixMonthsEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`, days: '6 months' },
  ]
}

const PEST_ONLY   = ['Brown Planthopper', 'Leaf Folder', 'Stem Borer']
const DISEASE_ONLY = ['Rice Blast', 'Rice Tungro', 'Bacterial Blight']
const ALL_LIST    = [...PEST_ONLY, ...DISEASE_ONLY]

const GRAPH_DATA = {
  'This week': {
    labels: ['March 1', 'March 2', 'March 3', 'March 4', 'March 5', 'March 6', 'March 7'],
    sublabel: 'Day',
    series: {
      'All':               [8, 14, 12, 22, 18, 28, 20],
      'Brown Planthopper': [2,  5,  3,  8,  6, 10,  7],
      'Rice Blast':        [1,  2,  4,  3,  5,  4,  6],
      'Leaf Folder':       [0,  1,  1,  2,  3,  2,  4],
      'Stem Borer':        [2,  3,  2,  5,  2,  7,  1],
      'Rice Tungro':       [1,  1,  0,  2,  1,  3,  1],
      'Bacterial Blight':  [2,  2,  2,  2,  1,  2,  1],
    },
  },
  'Last week': {
    labels: ['Feb 22', 'Feb 23', 'Feb 24', 'Feb 25', 'Feb 26', 'Feb 27', 'Feb 28'],
    sublabel: 'Day',
    series: {
      'All':               [12,  8, 16,  6, 18, 14, 24],
      'Brown Planthopper': [ 4,  3,  6,  2,  7,  5,  9],
      'Rice Blast':        [ 2,  1,  3,  1,  4,  3,  5],
      'Leaf Folder':       [ 1,  0,  2,  1,  2,  1,  3],
      'Stem Borer':        [ 3,  2,  3,  1,  3,  3,  5],
      'Rice Tungro':       [ 1,  1,  1,  0,  1,  1,  1],
      'Bacterial Blight':  [ 1,  1,  1,  1,  1,  1,  1],
    },
  },
  'Last month': {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    sublabel: 'Week',
    series: {
      'All':               [42, 58, 38, 52],
      'Brown Planthopper': [18, 24, 15, 20],
      'Rice Blast':        [ 8, 11,  6,  9],
      'Leaf Folder':       [ 3,  5,  4,  7],
      'Stem Borer':        [ 8, 10,  7,  9],
      'Rice Tungro':       [ 3,  4,  3,  4],
      'Bacterial Blight':  [ 2,  4,  3,  3],
    },
  },
  'Other': {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    sublabel: 'Month',
    series: {
      'All':               [28, 38, 24, 50, 34, 44],
      'Brown Planthopper': [10, 14,  9, 18, 12, 16],
      'Rice Blast':        [ 4,  6,  3,  8,  5,  9],
      'Leaf Folder':       [ 2,  3,  2,  4,  3,  5],
      'Stem Borer':        [ 7,  9,  6, 12,  8, 10],
      'Rice Tungro':       [ 3,  4,  2,  5,  4,  3],
      'Bacterial Blight':  [ 2,  2,  2,  3,  2,  1],
    },
  },
}

const SEVERITY_CONFIG = [
  { key: 'Critical', color: '#ef4444', dashed: false },
  { key: 'High',     color: '#f97316', dashed: false },
  { key: 'Moderate', color: '#eab308', dashed: false },
  { key: 'Low',      color: '#22c55e', dashed: true  },
]

const RATIO = {
  Critical: [0.12, 0.18, 0.10, 0.20, 0.15, 0.22, 0.08],
  High:     [0.25, 0.22, 0.30, 0.20, 0.28, 0.24, 0.26],
  Moderate: [0.38, 0.35, 0.40, 0.32, 0.36, 0.30, 0.40],
  Low:      [0.25, 0.25, 0.20, 0.28, 0.21, 0.24, 0.26],
}

const METRICS_HELP = [
  {
    group: 'Detection Overview',
    items: [
      { name: 'Detections',    desc: 'Total number of pest or disease instances identified across all monitored fields in the selected period.' },
      { name: 'Active Alerts', desc: 'Alerts currently flagged as unresolved that require immediate attention or field inspection.' },
    ],
  },
  {
    group: 'Crop Health',
    items: [
      { name: 'Crop Loss',     desc: 'Estimated percentage of yield affected by confirmed pest and disease detections, based on severity and field area.' },
      { name: 'Healthy Crops', desc: 'Proportion of monitored crop area with no active detections or alerts — your baseline field health score.' },
    ],
  },
  {
    group: 'Severity Levels',
    items: [
      { name: 'Critical', desc: 'Immediate intervention required. Spread is rapid and yield loss is imminent without treatment.' },
      { name: 'High',     desc: 'Significant infestation detected. Schedule treatment within 24–48 hours to prevent escalation.' },
      { name: 'Moderate', desc: 'Manageable levels present. Monitor closely and prepare treatment plan as a precaution.' },
      { name: 'Low',      desc: 'Early signs detected. Continue routine monitoring; no immediate action required.' },
    ],
  },
  {
    group: 'Trend Indicators',
    items: [
      { name: '% Change', desc: 'Comparison against the equivalent prior period. Increases in detections or crop loss are shown in red.' },
    ],
  },
]

/* ─── Help Modal ─── */
function MetricsHelpModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
           style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)' }}
           onClick={onClose}>
        <div onClick={e => e.stopPropagation()}
             style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.16)', width: '100%', maxWidth: 520, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Modal header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 18px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Key Metrics Guide</p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 3 }}>What each indicator means for your fields</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <X size={15} />
            </button>
          </div>

          {/* Modal body */}
          <div style={{ overflowY: 'auto', padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 24, scrollbarWidth: 'none' }}>
            {METRICS_HELP.map(group => (
                <div key={group.group}>
                  <p style={{ margin: 0, marginBottom: 12, fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{group.group}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {group.items.map(item => (
                        <div key={item.name}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{item.name}</p>
                          <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{item.desc}</p>
                        </div>
                    ))}
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
  )
}

/* ─── Graph helpers ─── */
function buildSeverityData(data, pest) {
  const key = data.series[pest] ? pest : 'All'
  const vals = data.series[key]
  const out = {}
  SEVERITY_CONFIG.forEach(s => {
    out[s.key] = vals.map((v, i) => Math.max(0, Math.round(v * RATIO[s.key][i % 7])))
  })
  return out
}

function measurePathLength(d) {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
    document.body.appendChild(svg)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
    const len = path.getTotalLength()
    document.body.removeChild(svg)
    return len
  } catch { return 1000 }
}

function AnimatedLine({ d, color, dashed, delay = 0, animKey }) {
  const [len, setLen] = useState(null)
  const [animating, setAnimating] = useState(false)
  useEffect(() => {
    const measured = measurePathLength(d)
    setLen(measured)
    setAnimating(false)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
    return () => cancelAnimationFrame(raf)
  }, [animKey])
  if (len === null) return null
  return (
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={dashed ? undefined : `${len} ${len}`}
            strokeDashoffset={dashed ? undefined : (animating ? 0 : len)}
            opacity="0.95"
            style={dashed
                ? { strokeDasharray: '5 4', strokeDashoffset: animating ? 0 : len, transition: animating ? `stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}s` : 'none' }
                : { transition: animating ? `stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}s` : 'none' }
            }
      />
  )
}

function AnimatedFill({ d, pts, color, H, PY, delay = 0, animKey }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), delay * 1000 + 200)
    return () => clearTimeout(t)
  }, [animKey, delay])
  const fill = `${d} L ${pts[pts.length - 1][0]} ${H - PY} L ${pts[0][0]} ${H - PY} Z`
  return <path d={fill} fill={`url(#g-${color.replace('#', '')})`} style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease' }} />
}

function FloatingTooltip({ hoverPos, data, hoverIdx, severityData, activeKeys, growthRate }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(null)
  const targetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (hoverPos.idx === null) { setVisible(false); return }
    setVisible(true)
    targetRef.current = { x: hoverPos.x, y: hoverPos.y }
    const loop = () => {
      setPos(prev => {
        const dx = targetRef.current.x - prev.x
        const dy = targetRef.current.y - prev.y
        if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) return targetRef.current
        return { x: prev.x + dx * 0.18, y: prev.y + dy * 0.18 }
      })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [hoverPos.idx, hoverPos.x, hoverPos.y])

  if (!visible || hoverIdx === null) return null
  const flipLeft = pos.x > window.innerWidth * 0.62
  const label = data.labels[hoverIdx]

  return (
      <div className="fixed pointer-events-none z-50" style={{ left: pos.x, top: pos.y, transform: `translateY(-50%) ${flipLeft ? 'translateX(calc(-100% - 20px))' : 'translateX(20px)'}`, opacity: visible ? 1 : 0, transition: 'opacity 0.18s ease' }}>
        <div style={{ background: 'rgba(248,250,252,0.78)', backdropFilter: 'blur(36px) saturate(220%)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', padding: '14px 16px', minWidth: 180 }}>
          <div style={{ marginBottom: 10, paddingBottom: 9, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{label}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SEVERITY_CONFIG.map(s => {
              if (!activeKeys.has(s.key)) return null
              const val  = severityData[s.key][hoverIdx]
              const rate = growthRate(severityData[s.key], hoverIdx)
              const isUp = rate !== null && Number(rate) >= 0
              return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'block' }} />
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{s.key}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                      {rate !== null && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 100, color: isUp ? '#dc2626' : '#16a34a' }}>
                      {isUp ? '↑' : '↓'}{Math.abs(rate)}%
                    </span>
                      )}
                    </div>
                  </div>
              )
            })}
          </div>
          {hoverIdx > 0 && (
              <p style={{ fontSize: 9, color: 'rgba(148,163,184,0.65)', marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(0,0,0,0.05)', marginBottom: 0, fontWeight: 500 }}>
                % change vs previous {data.sublabel.toLowerCase()}
              </p>
          )}
        </div>
      </div>
  )
}

/* ─── Ghost Dropdown ─── */
function GhostDropdown({ label, options, value, onChange, open, onToggle, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  return (
      <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
        <button
            onClick={onToggle}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 8, transition: 'background 0.15s ease', color: '#334155' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
          <ChevronDown size={12} style={{ color: '#94a3b8', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </button>
        {open && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #f1f5f9', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '6px', minWidth: 180 }}>
              {options.map(opt => (
                  <button key={opt}
                          onClick={() => { onChange(opt); onClose() }}
                          style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', borderRadius: 10, background: value === opt ? '#f0fdf4' : 'transparent', color: value === opt ? '#15803d' : '#475569', transition: 'background 0.12s ease', display: 'block' }}
                          onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = 'transparent' }}
                  >{opt}</button>
              ))}
            </div>
        )}
      </div>
  )
}

/* ─── Date Range Dropdown ─── */
function DateRangeDropdown({ range, onChange, open, onToggle, onClose }) {
  const ranges = buildTimeRanges()
  const current = ranges.find(r => r.label === range) || ranges[0]
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  return (
      <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
        <button
            onClick={onToggle}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 8, transition: 'background 0.15s ease' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{current.date}</p>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, marginTop: 2, fontWeight: 500, lineHeight: 1 }}>{current.days}</p>
          </div>
          <ChevronDown size={12} style={{ color: '#94a3b8', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </button>
        {open && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #f1f5f9', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '6px', minWidth: 200 }}>
              {ranges.map(r => (
                  <button key={r.label}
                          onClick={() => { onChange(r.label); onClose() }}
                          style={{ width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 13, cursor: 'pointer', border: 'none', borderRadius: 10, background: range === r.label ? '#f0fdf4' : 'transparent', color: range === r.label ? '#15803d' : '#475569', transition: 'background 0.12s ease', display: 'flex', flexDirection: 'column', gap: 2 }}
                          onMouseEnter={e => { if (range !== r.label) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (range !== r.label) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{r.label}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{r.date}</span>
                  </button>
              ))}
            </div>
        )}
      </div>
  )
}

/* ─── Graph ─── */
function DoodleGraph({ range, pest, activeView, setActiveView, pestValue, diseaseValue, setPestValue, setDiseaseValue }) {
  const data = GRAPH_DATA[range]
  const W = 900, H = 270, PX_L = 12, PX_R = 42, PY = 20

  const [hoverPos, setHoverPos] = useState({ idx: null, x: 0, y: 0 })
  const [activeKeys, setActiveKeys] = useState(() => new Set(SEVERITY_CONFIG.map(s => s.key)))
  const [pestOpen, setPestOpen]     = useState(false)
  const [diseaseOpen, setDiseaseOpen] = useState(false)
  const svgRef = useRef(null)

  const animKey = `${range}__${pest}`
  const severityData = buildSeverityData(data, pest)
  const allVals = SEVERITY_CONFIG.flatMap(s => activeKeys.has(s.key) ? severityData[s.key] : [])
  const globalMax = Math.max(...allVals, 1)
  const plotW = W - PX_L - PX_R

  function buildPts(key) {
    return severityData[key].map((v, i) => [
      PX_L + (i / (severityData[key].length - 1)) * plotW,
      PY + (1 - v / globalMax) * (H - PY * 2),
    ])
  }

  function smoothD(pts) {
    return pts.reduce((acc, [x, y], i) => {
      if (i === 0) return `M ${x} ${y}`
      const [px, py] = pts[i - 1]
      const cx = px + (x - px) * 0.5
      return `${acc} C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`
    }, '')
  }

  function growthRate(vals, idx) {
    if (idx === 0 || vals[idx - 1] === 0) return null
    return (((vals[idx] - vals[idx - 1]) / vals[idx - 1]) * 100).toFixed(0)
  }

  const labelCount = data.labels.length
  const colW = plotW / Math.max(labelCount - 1, 1)

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width * W
    const idx  = Math.max(0, Math.min(labelCount - 1, Math.round((relX - PX_L) / colW)))
    setHoverPos({ idx, x: e.clientX, y: e.clientY })
  }, [colW, labelCount])

  const hoverIdx = hoverPos.idx
  const tooltipX = hoverIdx !== null ? PX_L + (hoverIdx / (labelCount - 1)) * plotW : null

  const toggleSeries = (key) => {
    setActiveKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size === 1) return prev; next.delete(key) }
      else next.add(key)
      return next
    })
  }

  return (
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top controls */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            {/* All */}
            <button
                onClick={e => { e.stopPropagation(); setActiveView('All') }}
                style={{ padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'All' ? '#f1f5f9' : 'transparent', color: activeView === 'All' ? '#1e293b' : '#94a3b8' }}
                onMouseEnter={e => { if (activeView !== 'All') e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (activeView !== 'All') e.currentTarget.style.background = 'transparent' }}
            >All</button>

            {/* Pests dropdown */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                  onClick={() => { setActiveView('Pests'); setPestOpen(o => !o); setDiseaseOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'Pests' ? '#f1f5f9' : 'transparent', color: activeView === 'Pests' ? '#1e293b' : '#94a3b8' }}
                  onMouseEnter={e => { if (activeView !== 'Pests') e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (activeView !== 'Pests') e.currentTarget.style.background = 'transparent' }}
              >
                Pests
                {pestValue && activeView === 'Pests' && <span style={{ fontSize: 9, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 4, marginLeft: 2, fontWeight: 700 }}>{pestValue.split(' ').slice(-1)[0]}</span>}
                <ChevronDown size={10} style={{ color: '#94a3b8', transform: pestOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {pestOpen && (
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #f1f5f9', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '6px', minWidth: 170 }}>
                    <button onClick={() => { setPestValue(null); setPestOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: !pestValue ? '#f0fdf4' : 'transparent', color: !pestValue ? '#15803d' : '#64748b', fontWeight: 600 }}>All Pests</button>
                    {PEST_ONLY.map(p => (
                        <button key={p} onClick={() => { setPestValue(p); setPestOpen(false) }}
                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: pestValue === p ? '#f0fdf4' : 'transparent', color: pestValue === p ? '#15803d' : '#475569', fontWeight: 500 }}
                                onMouseEnter={e => { if (pestValue !== p) e.currentTarget.style.background = '#f8fafc' }}
                                onMouseLeave={e => { if (pestValue !== p) e.currentTarget.style.background = 'transparent' }}
                        >{p}</button>
                    ))}
                  </div>
              )}
            </div>

            {/* Diseases dropdown */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                  onClick={() => { setActiveView('Diseases'); setDiseaseOpen(o => !o); setPestOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'Diseases' ? '#f1f5f9' : 'transparent', color: activeView === 'Diseases' ? '#1e293b' : '#94a3b8' }}
                  onMouseEnter={e => { if (activeView !== 'Diseases') e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (activeView !== 'Diseases') e.currentTarget.style.background = 'transparent' }}
              >
                Diseases
                {diseaseValue && activeView === 'Diseases' && <span style={{ fontSize: 9, background: '#fef9c3', color: '#a16207', padding: '1px 5px', borderRadius: 4, marginLeft: 2, fontWeight: 700 }}>{diseaseValue.split(' ').slice(-1)[0]}</span>}
                <ChevronDown size={10} style={{ color: '#94a3b8', transform: diseaseOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {diseaseOpen && (
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #f1f5f9', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '6px', minWidth: 170 }}>
                    <button onClick={() => { setDiseaseValue(null); setDiseaseOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: !diseaseValue ? '#f0fdf4' : 'transparent', color: !diseaseValue ? '#15803d' : '#64748b', fontWeight: 600 }}>All Diseases</button>
                    {DISEASE_ONLY.map(d => (
                        <button key={d} onClick={() => { setDiseaseValue(d); setDiseaseOpen(false) }}
                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: diseaseValue === d ? '#f0fdf4' : 'transparent', color: diseaseValue === d ? '#15803d' : '#475569', fontWeight: 500 }}
                                onMouseEnter={e => { if (diseaseValue !== d) e.currentTarget.style.background = '#f8fafc' }}
                                onMouseLeave={e => { if (diseaseValue !== d) e.currentTarget.style.background = 'transparent' }}
                        >{d}</button>
                    ))}
                  </div>
              )}
            </div>
          </div>

          {/* Severity legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {SEVERITY_CONFIG.map(s => {
              const active = activeKeys.has(s.key)
              return (
                  <button key={s.key} onClick={() => toggleSeries(s.key)}
                          className="flex items-center gap-1.5 bg-transparent border-0 cursor-pointer p-0"
                          style={{ opacity: active ? 1 : 0.28, transition: 'opacity 0.2s ease' }}>
                    <svg width="14" height="6">
                      <line x1="0" y1="3" x2="14" y2="3" stroke={s.color} strokeWidth="2"
                            strokeDasharray={s.dashed ? '4 2' : undefined} strokeLinecap="round" />
                    </svg>
                    <span className="text-[10px] font-semibold text-slate-500">{s.key}</span>
                  </button>
              )
            })}
          </div>
        </div>

        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
             style={{ width: '100%', height: 280, display: 'block', cursor: 'crosshair' }}
             onMouseMove={handleMouseMove}
             onMouseLeave={() => setHoverPos({ idx: null, x: 0, y: 0 })}>

          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y   = PY + t * (H - PY * 2)
            const val = (globalMax * (1 - t)).toFixed(1)
            return (
                <g key={t}>
                  <line x1={PX_L} x2={W - PX_R} y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 7" />
                  <text x={W - PX_R + 10} y={y + 4} textAnchor="start" fontSize="10" fill="#94a3b8" fontFamily="monospace" fontWeight="600">{val}</text>
                </g>
            )
          })}

          {data.labels.map((l, i) => (
              <text key={l} x={PX_L + (i / (labelCount - 1)) * plotW} y={H - 4}
                    textAnchor={i === 0 ? 'start' : i === labelCount - 1 ? 'end' : 'middle'}
                    fontSize="11" fill="#94a3b8" fontFamily="monospace" fontWeight="600">{l}</text>
          ))}

          {hoverIdx !== null && (
              <line x1={tooltipX} x2={tooltipX} y1={PY} y2={H - PY} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 4" />
          )}

          {SEVERITY_CONFIG.map((s, si) => {
            if (!activeKeys.has(s.key)) return null
            const pts = buildPts(s.key)
            const pd  = smoothD(pts)
            return (
                <g key={s.key} style={{ filter: 'url(#doodle)' }}>
                  <AnimatedFill d={pd} pts={pts} color={s.color} H={H} PY={PY} delay={si * 0.12} animKey={animKey} />
                  <AnimatedLine d={pd} color={s.color} dashed={s.dashed} delay={si * 0.12} animKey={animKey} />
                  {hoverIdx !== null && pts[hoverIdx] && (
                      <>
                        <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="6.5" fill="white" stroke={s.color} strokeWidth="2" />
                        <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="2.8" fill={s.color} />
                      </>
                  )}
                </g>
            )
          })}
        </svg>

        <FloatingTooltip hoverPos={hoverPos} data={data} hoverIdx={hoverIdx}
                         severityData={severityData} activeKeys={activeKeys} growthRate={growthRate} />
      </div>
  )
}

/* ─── Stat Cards ─── */
function MiniStatCard({ title, value, change, changeLabel, accent }) {
  const hasChange  = change !== null && change !== undefined
  const isPositive = hasChange && change >= 0
  return (
      <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: 16 }}
           className="p-5 flex flex-col justify-between w-40 h-40">
        <p style={{ color: '#94a3b8' }} className="text-[10px] font-bold tracking-[0.14em] uppercase leading-none m-0">
          {title}
        </p>
        <div className="flex flex-col gap-2">
          <p style={{ color: '#0f172a' }} className="text-3xl font-black leading-none m-0 tabular-nums">
            {value}
          </p>
          {hasChange && (
              <div className={`flex items-center gap-1 text-[11px] font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                <span>{isPositive ? '+' : ''}{change}%</span>
              </div>
          )}
        </div>
        <p style={{ color: '#cbd5e1', borderTopColor: '#f1f5f9' }} className="text-[10px] m-0 font-semibold leading-none border-t pt-3">
          {hasChange ? (changeLabel || 'vs. last week') : 'No data yet'}
        </p>
      </div>
  )
}

function ActionCard({ icon, title, onClick }) {
  return (
      <button onClick={onClick}
              className="bg-white rounded-2xl border border-dashed border-slate-200 px-5 py-5 w-full text-left cursor-pointer flex flex-col gap-3 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:-translate-y-0.5 hover:shadow-sm">
        <span className="text-emerald-600 opacity-80 flex">{icon}</span>
        <span className="text-sm font-semibold text-slate-600 leading-snug">{title}</span>
      </button>
  )
}

/* ─── Dashboard ─── */
export default function Dashboard() {
  const [range, setRange]           = useState('This week')
  const [rangeOpen, setRangeOpen]   = useState(false)
  const [activeView, setActiveView] = useState('All')
  const [pestValue, setPestValue]   = useState(null)
  const [diseaseValue, setDiseaseValue] = useState(null)
  const [helpOpen, setHelpOpen]     = useState(false)

  const pest = activeView === 'Pests' && pestValue
      ? pestValue
      : activeView === 'Diseases' && diseaseValue
          ? diseaseValue
          : 'All'

  return (
      <div className="min-h-screen bg-slate-50"
           onClick={() => setRangeOpen(false)}>
        <MetricsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

        <main className="max-w-screen-2xl mx-auto px-4 sm:px-4 lg:px-8 xl:px-12 py-6 lg:py-10 flex flex-col gap-8">

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 px-8 lg:px-10 pt-8 pb-7 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0 leading-none whitespace-nowrap">
                  Key Metrics
                </h2>
                <button
                    onClick={e => { e.stopPropagation(); setHelpOpen(true) }}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.15s ease', flexShrink: 0, padding: 0 }}

                >
                  <span style={{ fontSize: 11, fontWeight: 800, lineHeight: 1, userSelect: 'none' }}>?</span>
                </button>
              </div>

              <div onClick={e => e.stopPropagation()}>
                <DateRangeDropdown
                    range={range}
                    onChange={setRange}
                    open={rangeOpen}
                    onToggle={() => setRangeOpen(o => !o)}
                    onClose={() => setRangeOpen(false)}
                />
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col lg:flex-row items-stretch">
              <div className="lg:w-[296px] flex-shrink-0 grid grid-cols-2 auto-rows-fr gap-4 p-6 border-b lg:border-b-0 lg:border-r border-slate-50">
                <MiniStatCard title="Detections"    value={24}   change={12} changeLabel="vs last week" accent="#3b82f6" />
                <MiniStatCard title="Crop Loss"     value="12%"  change={5}  changeLabel="vs last week" accent="#f43f5e" />
                <MiniStatCard title="Active Alerts" value={3}    change={-8} changeLabel="vs 24h prior" accent="#f59e0b" />
                <MiniStatCard title="Healthy Crops" value="89%"  change={3}  changeLabel="vs last week" accent="#22c55e" />
              </div>

              <div className="flex-1 min-w-0 px-5 lg:px-7 py-6">
                <DoodleGraph
                    range={range} pest={pest}
                    activeView={activeView} setActiveView={setActiveView}
                    pestValue={pestValue} diseaseValue={diseaseValue}
                    setPestValue={setPestValue} setDiseaseValue={setDiseaseValue}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="mb-5">
              <p className="text-lg font-bold text-slate-900 m-0 mb-1 tracking-tight">Quick Actions</p>
              <p className="text-sm text-slate-400 m-0">Jump to common tasks</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <ActionCard icon={<PlayCircle size={22} />} title="Start Field Monitoring" onClick={() => {}} />
              <ActionCard icon={<Upload size={22} />}     title="Upload Image"           onClick={() => {}} />
              <ActionCard icon={<Bell size={22} />}       title="View Alarm Logs"        onClick={() => {}} />
              <ActionCard icon={<FileText size={22} />}   title="Generate Report"        onClick={() => {}} />
              <ActionCard icon={<MapPin size={22} />}     title="View Fields"            onClick={() => {}} />
            </div>
          </div>

        </main>
      </div>
  )
}