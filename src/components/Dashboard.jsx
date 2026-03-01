import { useState, useEffect, useRef, useCallback } from 'react'
import { PlayCircle, Upload, Bell, FileText, MapPin, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react'
import { activityStore } from '../store/activitystore'

const PAGE_SIZE = 10
const TIME_RANGES = ['This week', 'Last week', 'Last month', 'Other']

// ─── Pest / disease options ───────────────────────────────────────────────────
const PEST_OPTIONS = [
  'All Detections',
  'Brown Planthopper',
  'Rice Blast',
  'Leaf Folder',
  'Stem Borer',
  'Rice Tungro',
  'Bacterial Blight',
]

// ─── Graph raw data ───────────────────────────────────────────────────────────
const GRAPH_DATA = {
  'This week': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    sublabel: 'Day',
    series: {
      'All Detections':    [8, 14, 12, 22, 18, 28, 20],
      'Brown Planthopper': [2,  5,  3,  8,  6, 10,  7],
      'Rice Blast':        [1,  2,  4,  3,  5,  4,  6],
      'Leaf Folder':       [0,  1,  1,  2,  3,  2,  4],
      'Stem Borer':        [2,  3,  2,  5,  2,  7,  1],
      'Rice Tungro':       [1,  1,  0,  2,  1,  3,  1],
      'Bacterial Blight':  [2,  2,  2,  2,  1,  2,  1],
    },
  },
  'Last week': {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    sublabel: 'Day',
    series: {
      'All Detections':    [12,  8, 16,  6, 18, 14, 24],
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
      'All Detections':    [42, 58, 38, 52],
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
      'All Detections':    [28, 38, 24, 50, 34, 44],
      'Brown Planthopper': [10, 14,  9, 18, 12, 16],
      'Rice Blast':        [ 4,  6,  3,  8,  5,  9],
      'Leaf Folder':       [ 2,  3,  2,  4,  3,  5],
      'Stem Borer':        [ 7,  9,  6, 12,  8, 10],
      'Rice Tungro':       [ 3,  4,  2,  5,  4,  3],
      'Bacterial Blight':  [ 2,  2,  2,  3,  2,  1],
    },
  },
}

// ─── Severity config ──────────────────────────────────────────────────────────
const SEVERITY_CONFIG = [
  { key: 'Critical', color: '#ef4444', dashed: false },
  { key: 'High',     color: '#f97316', dashed: false },
  { key: 'Moderate', color: '#eab308', dashed: false },
  { key: 'Low',      color: '#22c55e', dashed: true  },
]

// Deterministic per-index ratios so each severity line looks distinct
const RATIO = {
  Critical: [0.12, 0.18, 0.10, 0.20, 0.15, 0.22, 0.08],
  High:     [0.25, 0.22, 0.30, 0.20, 0.28, 0.24, 0.26],
  Moderate: [0.38, 0.35, 0.40, 0.32, 0.36, 0.30, 0.40],
  Low:      [0.25, 0.25, 0.20, 0.28, 0.21, 0.24, 0.26],
}

function buildSeverityData(data, pest) {
  const vals = data.series[pest] ?? data.series['All Detections']
  const out = {}
  SEVERITY_CONFIG.forEach(s => {
    out[s.key] = vals.map((v, i) => Math.max(0, Math.round(v * RATIO[s.key][i % 7])))
  })
  return out
}

// ─── Doodle SVG Graph ─────────────────────────────────────────────────────────
function DoodleGraph({ range, pest }) {
  const data = GRAPH_DATA[range]
  const W = 880, H = 210, PX = 30, PY = 18

  const [hoverIdx, setHoverIdx]     = useState(null)
  const [activeKeys, setActiveKeys] = useState(() => new Set(SEVERITY_CONFIG.map(s => s.key)))
  const svgRef = useRef(null)

  const severityData = buildSeverityData(data, pest)
  const allVals      = SEVERITY_CONFIG.flatMap(s => activeKeys.has(s.key) ? severityData[s.key] : [])
  const globalMax    = Math.max(...allVals, 1)

  function buildPts(key) {
    return severityData[key].map((v, i) => [
      PX + (i / (severityData[key].length - 1)) * (W - PX * 2),
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
  const colW       = (W - PX * 2) / Math.max(labelCount - 1, 1)

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width * W
    setHoverIdx(Math.max(0, Math.min(labelCount - 1, Math.round((relX - PX) / colW))))
  }, [colW, labelCount])

  const tooltipX = hoverIdx !== null
      ? PX + (hoverIdx / (labelCount - 1)) * (W - PX * 2)
      : null

  const toggleSeries = (key) => {
    setActiveKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size === 1) return prev; next.delete(key) }
      else next.add(key)
      return next
    })
  }

  return (
      <div className="w-full select-none">
        {/* Severity toggles — minimal line+label style */}
        <div className="flex items-center gap-5 px-1 mb-5 flex-wrap">
          <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">Severity</span>
          {SEVERITY_CONFIG.map(s => {
            const active = activeKeys.has(s.key)
            return (
                <button key={s.key} onClick={() => toggleSeries(s.key)}
                        className="flex items-center gap-1.5 transition-opacity"
                        style={{ opacity: active ? 1 : 0.25 }}
                >
                  <svg width="18" height="6">
                    <line x1="0" y1="3" x2="18" y2="3"
                          stroke={s.color} strokeWidth="1.75"
                          strokeDasharray={s.dashed ? '4 3' : undefined}
                          strokeLinecap="round" />
                  </svg>
                  <span className="text-[11px] font-semibold text-gray-500">{s.key}</span>
                </button>
            )
          })}
        </div>

        {/* SVG canvas */}
        <div className="relative">
          <svg ref={svgRef}
               viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
               className="w-full cursor-crosshair" style={{ height: 240 }}
               onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}
          >
            <defs>
              <filter id="doodle">
                <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="1" result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              {SEVERITY_CONFIG.map(s => (
                  <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity={activeKeys.has(s.key) ? '0.06' : '0'} />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
              ))}
            </defs>

            {/* Grid lines + Y labels */}
            {[0, 0.25, 0.5, 0.75, 1].map(t => {
              const y   = PY + t * (H - PY * 2)
              const val = Math.round(globalMax * (1 - t))
              return (
                  <g key={t}>
                    <line x1={PX} x2={W - PX} y1={y} y2={y}
                          stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 6" />
                    <text x={PX - 7} y={y + 3.5} textAnchor="end"
                          fontSize="8" fill="#d1d5db" fontFamily="monospace">{val}</text>
                  </g>
              )
            })}

            {/* X-axis labels */}
            {data.labels.map((l, i) => (
                <text key={l}
                      x={PX + (i / (labelCount - 1)) * (W - PX * 2)} y={H - 2}
                      textAnchor="middle" fontSize="9" fill="#9ca3af"
                      fontFamily="monospace" fontWeight="500"
                >{l}</text>
            ))}

            {/* Hover crosshair */}
            {hoverIdx !== null && (
                <line x1={tooltipX} x2={tooltipX} y1={PY} y2={H - PY}
                      stroke="#e5e7eb" strokeWidth="1.5" />
            )}

            {/* Series lines */}
            {SEVERITY_CONFIG.map(s => {
              if (!activeKeys.has(s.key)) return null
              const pts  = buildPts(s.key)
              const pd   = smoothD(pts)
              const fill = `${pd} L ${pts[pts.length - 1][0]} ${H - PY} L ${pts[0][0]} ${H - PY} Z`
              return (
                  <g key={s.key} style={{ filter: 'url(#doodle)' }}>
                    <path d={fill} fill={`url(#g-${s.key})`} />
                    <path d={pd} fill="none" stroke={s.color} strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                          strokeDasharray={s.dashed ? '5 4' : undefined} opacity="0.9"
                    />
                    {hoverIdx !== null && pts[hoverIdx] && (
                        <>
                          <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="4"
                                  fill="white" stroke={s.color} strokeWidth="1.5" />
                          <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="1.8"
                                  fill={s.color} />
                        </>
                    )}
                  </g>
              )
            })}
          </svg>

          {/* Tooltip — white card, fully light */}
          {hoverIdx !== null && (() => {
            const label = data.labels[hoverIdx]
            return (
                <div className="absolute top-2 pointer-events-none z-30"
                     style={{
                       left: `${(tooltipX / W) * 100}%`,
                       transform: hoverIdx > labelCount * 0.6 ? 'translateX(-108%)' : 'translateX(10px)',
                     }}
                >
                  <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-3.5 py-3 min-w-[170px]">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {label} · {data.sublabel}
                    </p>
                    {SEVERITY_CONFIG.map(s => {
                      if (!activeKeys.has(s.key)) return null
                      const val  = severityData[s.key][hoverIdx]
                      const rate = growthRate(severityData[s.key], hoverIdx)
                      const isUp = rate !== null && Number(rate) >= 0
                      return (
                          <div key={s.key} className="flex items-center justify-between gap-3 mb-1.5 last:mb-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                              <span className="text-[11px] text-gray-500">{s.key}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] font-bold text-gray-800 tabular-nums">{val}</span>
                              {rate !== null && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                        style={{
                                          color:      isUp ? '#ef4444' : '#16a34a',
                                          background: isUp ? '#fef2f2' : '#f0fdf4',
                                        }}
                                  >
                            {isUp ? '↑' : '↓'}{Math.abs(rate)}%
                          </span>
                              )}
                            </div>
                          </div>
                      )
                    })}
                    {hoverIdx > 0 && (
                        <p className="text-[9px] text-gray-300 mt-2 pt-2 border-t border-gray-50">
                          % change vs previous {data.sublabel.toLowerCase()}
                        </p>
                    )}
                  </div>
                </div>
            )
          })()}
        </div>
      </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, change, changeLabel }) {
  const hasChange  = change !== null && change !== undefined
  const isPositive = hasChange && change >= 0
  return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">{title}</p>
        <div className="flex items-end gap-2 mb-6">
          <p className="text-5xl font-bold text-gray-900 tracking-tight leading-none">{value}</p>
          {hasChange && (
              <div className={`flex items-center gap-1 mb-0.5 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span className="text-b font-semibold">{isPositive ? '+' : ''}{change}%</span>
              </div>
          )}
        </div>
        {hasChange
            ? <p className="text-base text-gray-300">{changeLabel || 'from last week'}</p>
            : <p className="text-base text-gray-300">No previous data yet</p>
        }
      </div>
  )
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({ icon, title, onClick }) {
  return (
      <button onClick={onClick}
              className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 hover:border-green-400 hover:bg-green-50/30 transition-all w-full text-left group"
      >
        <div className="mb-3 text-green-600 opacity-70 group-hover:opacity-100 transition-opacity">{icon}</div>
        <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors leading-snug">{title}</p>
      </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(epochMs) {
  const diffMs  = Date.now() - epochMs
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr  = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  if (diffMin < 1)   return 'Just now'
  if (diffMin < 60)  return `${diffMin}m ago`
  if (diffHr  < 24)  return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  return `${diffDay} days ago`
}

function groupByDay(entries) {
  const groups = {}
  entries.forEach(e => {
    const d         = new Date(e.epochMs)
    const now       = new Date()
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
    const label =
        d.toDateString() === now.toDateString()       ? 'Today'     :
            d.toDateString() === yesterday.toDateString() ? 'Yesterday' :
                d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    if (!groups[label]) groups[label] = []
    groups[label].push(e)
  })
  return groups
}

function confBadge(conf) {
  const pct = Math.round(conf * 100)
  if (pct >= 80) return { bg: 'bg-green-50 border-green-100', text: 'text-green-600' }
  if (pct >= 60) return { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-600' }
  return { bg: 'bg-red-50 border-red-100', text: 'text-red-500' }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [recentActivity, setRecentActivity] = useState([])
  const [visibleCount, setVisibleCount]     = useState(PAGE_SIZE)
  const [stats, setStats] = useState({
    totalDetections: 0, totalChange: null,
    activeAlerts:    0, alertsChange: null,
  })

  const [range, setRange]         = useState('This week')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [pest, setPest]           = useState('All Detections')
  const [pestOpen, setPestOpen]   = useState(false)

  useEffect(() => {
    const refresh = () => {
      setRecentActivity(activityStore.getRecent(7))
      setStats(activityStore.getStats())
    }
    refresh()
    const unsub = activityStore.subscribe(refresh)
    return unsub
  }, [])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [recentActivity.length === 0])

  const handleAction = action => console.log(action)

  const visibleEntries = recentActivity.slice(0, visibleCount)
  const grouped        = groupByDay(visibleEntries)
  const dayLabels      = Object.keys(grouped)
  const hasMore        = visibleCount < recentActivity.length

  return (
      <div className="min-h-screen bg-gray-50/60"
           onClick={() => { setRangeOpen(false); setPestOpen(false) }}
      >
        <main className="px-6 py-8 max-w-7xl mx-auto space-y-8">

          {/* ── Detection Trends ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
            

              {/* Controls */}
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>

                {/* Pest/disease dropdown */}
                <div className="relative">
                  <button
                      onClick={() => { setPestOpen(o => !o); setRangeOpen(false) }}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-600 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm hover:border-gray-200 transition-colors"
                  ><span className="max-w-[130px] truncate">{pest}</span>
                    <ChevronDown size={12} className={`text-gray-400 flex-shrink-0 transition-transform ${pestOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {pestOpen && (
                      <div className="absolute left-0 top-9 z-20 bg-white border border-gray-100 rounded-xl shadow-md py-1 w-52">
                        {PEST_OPTIONS.map(p => (
                            <button key={p}
                                    onClick={() => { setPest(p); setPestOpen(false) }}
                                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors flex items-center gap-2 ${
                                        p === pest ? 'text-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                              {p}
                            </button>
                        ))}
                      </div>
                  )}
                </div>

                {/* Time range dropdown */}
                <div className="relative">
                  <button
                      onClick={() => { setRangeOpen(o => !o); setPestOpen(false) }}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm hover:border-gray-200 transition-colors"
                  >
                    {range}
                    <ChevronDown size={12} className={`text-gray-400 transition-transform ${rangeOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {rangeOpen && (
                      <div className="absolute right-0 top-9 z-20 bg-white border border-gray-100 rounded-xl shadow-md py-1 w-36">
                        {TIME_RANGES.map(r => (
                            <button key={r}
                                    onClick={() => { setRange(r); setRangeOpen(false) }}
                                    className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                                        r === range ? 'text-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >{r}</button>
                        ))}
                      </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 pt-5 pb-3">
              <DoodleGraph range={range} pest={pest} />
            </div>
          </div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Detections" value={stats.totalDetections} change={stats.totalChange}  changeLabel="from last week" />
            <StatCard title="Total Crop Loss"  value="12"                    change={5} />
            <StatCard title="Active Alerts"    value={stats.activeAlerts}    change={stats.alertsChange} changeLabel="vs previous 24h" />
            <StatCard title="Healthy Crops"    value="89%"                   change={3} />
          </div>

          {/* ── Quick Actions ── */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <ActionCard icon={<PlayCircle size={24} />} title="Start Field Monitoring" onClick={() => handleAction('monitor')} />
              <ActionCard icon={<Upload size={24} />}     title="Upload Image"           onClick={() => handleAction('upload')}  />
              <ActionCard icon={<Bell size={24} />}       title="View Alarm Logs"        onClick={() => handleAction('alarms')} />
              <ActionCard icon={<FileText size={24} />}   title="Generate Report"        onClick={() => handleAction('report')} />
              <ActionCard icon={<MapPin size={24} />}     title="View Fields"            onClick={() => handleAction('fields')} />
            </div>
          </div>

          {/* ── Recent Activity ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800">Recent Activity</h2>
                <p className="text-xs text-gray-400 mt-0.5">Detections from the past 7 days</p>
              </div>
              {recentActivity.length > 0 && (
                  <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {recentActivity.length} event{recentActivity.length !== 1 ? 's' : ''}
                </span>
                    <button
                        onClick={() => {
                          activityStore.clear()
                          setRecentActivity([])
                          setVisibleCount(PAGE_SIZE)
                          setStats({ totalDetections: 0, totalChange: null, activeAlerts: 0, alertsChange: null })
                        }}
                        className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors px-2.5 py-1 rounded-full hover:bg-red-50"
                    >
                      Clear
                    </button>
                  </div>
              )}
            </div>

            {recentActivity.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-400">No recent activity</p>
                  <p className="text-xs text-gray-300 mt-1">Detections from Field Monitoring will appear here</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {dayLabels.map((dayLabel, di) => (
                      <div key={dayLabel}>
                        <div className={`px-5 py-2.5 flex items-center gap-3 bg-gray-50/70 ${di > 0 ? 'border-t border-gray-100' : ''}`}>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{dayLabel}</span>
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {grouped[dayLabel].length}
                    </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {grouped[dayLabel].map(entry => {
                            const { bg, text } = confBadge(entry.confidence)
                            return (
                                <div key={entry.id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-semibold text-gray-900 truncate">{entry.class}</p>
                                      <span className="text-xs text-gray-400">detected via Field Monitoring</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">{entry.timestamp} · {relativeTime(entry.epochMs)}</p>
                                  </div>
                                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${bg} ${text}`}>
                            {Math.round(entry.confidence * 100)}%
                          </span>
                                </div>
                            )
                          })}
                        </div>
                      </div>
                  ))}

                  {(hasMore || visibleCount > PAGE_SIZE) && (
                      <div className="border-t border-gray-100 px-5 py-3.5 flex items-center justify-between bg-gray-50/50">
                        {hasMore ? (
                            <>
                              <span className="text-xs text-gray-400">Showing {visibleCount} of {recentActivity.length} events</span>
                              <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                                      className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
                              >
                                Show more
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </>
                        ) : (
                            <>
                              <span className="text-xs text-gray-400">Showing all {recentActivity.length} events</span>
                              <button onClick={() => setVisibleCount(PAGE_SIZE)}
                                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                Show less
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                            </>
                        )}
                      </div>
                  )}
                </div>
            )}
          </div>
        </main>
      </div>
  )
}