import { useState, useEffect } from 'react'
import { PlayCircle, Upload, Bell, FileText, MapPin, TrendingUp, TrendingDown } from 'lucide-react'
import { activityStore } from '../store/activitystore'

const PAGE_SIZE = 10

function StatCard({ title, value, change, changeLabel }) {
  const hasChange  = change !== null && change !== undefined
  const isPositive = hasChange && change >= 0
  return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
        <p className="text-4xl font-bold text-gray-900 tracking-tight mb-3">{value}</p>
        {hasChange ? (
            <div className="flex items-center gap-1.5">
              {isPositive
                  ? <TrendingUp size={13} className="text-green-500" />
                  : <TrendingDown size={13} className="text-red-500" />
              }
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}{change}% {changeLabel || 'from last week'}
              </span>
            </div>
        ) : (
            <p className="text-xs text-gray-300">No previous data yet</p>
        )}
      </div>
  )
}

function ActionCard({ icon, title, onClick }) {
  return (
      <button
          onClick={onClick}
          className="bg-white rounded-2xl border border-dashed border-gray-200 p-5 hover:border-green-400 hover:bg-green-50/30 transition-all w-full text-left group"
      >
        <div className="mb-3 text-green-600 opacity-70 group-hover:opacity-100 transition-opacity">{icon}</div>
        <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors leading-snug">{title}</p>
      </button>
  )
}

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
    const d   = new Date(e.epochMs)
    const now = new Date()
    let label
    if (d.toDateString() === now.toDateString()) {
      label = 'Today'
    } else {
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
      label = d.toDateString() === yesterday.toDateString()
          ? 'Yesterday'
          : d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    }
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

export default function Dashboard() {
  const [recentActivity, setRecentActivity] = useState([])
  const [visibleCount, setVisibleCount]     = useState(PAGE_SIZE)
  const [stats, setStats] = useState({
    totalDetections: 0,
    totalChange:     null,
    activeAlerts:    0,
    alertsChange:    null,
  })

  useEffect(() => {
    const refresh = () => {
      setRecentActivity(activityStore.getRecent(7))
      setStats(activityStore.getStats())
    }
    refresh()
    const unsub = activityStore.subscribe(refresh)
    return unsub
  }, [])

  // Reset visible count when activity reloads (e.g. after clear)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [recentActivity.length === 0])

  const handleAction = action => console.log(action)

  // Slice to however many we're showing, then group
  const visibleEntries = recentActivity.slice(0, visibleCount)
  const grouped        = groupByDay(visibleEntries)
  const dayLabels      = Object.keys(grouped)
  const hasMore        = visibleCount < recentActivity.length
  const remaining      = recentActivity.length - visibleCount

  return (
      <div className="min-h-screen bg-gray-50/60">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-10 h-16 flex items-center px-6">
          <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-0.5 h-6 bg-green-500 rounded-full" />
              <span className="text-lg font-bold text-gray-900 tracking-tight">AgriVision</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-sm font-semibold text-gray-700">28°C</span>
              <span className="text-xs text-gray-400">Sunny</span>
            </div>
          </div>
        </header>

        <main className="px-6 py-8 max-w-7xl mx-auto space-y-8">
          {/* Page Header */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Overview</p>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Field monitoring system at a glance</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Total Detections"
                value={stats.totalDetections}
                change={stats.totalChange}
                changeLabel="from last week"
            />
            <StatCard title="Total Crop Loss" value="12" change={5} />
            <StatCard
                title="Active Alerts"
                value={stats.activeAlerts}
                change={stats.alertsChange}
                changeLabel="vs previous 24h"
            />
            <StatCard title="Healthy Crops" value="89%" change={3} />
          </div>

          {/* Quick Actions */}
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

          {/* Recent Activity */}
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
                /* Empty state */
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
                  {/* Grouped entries */}
                  {dayLabels.map((dayLabel, di) => (
                      <div key={dayLabel}>
                        {/* Day header */}
                        <div className={`px-5 py-2.5 flex items-center gap-3 bg-gray-50/70 ${di > 0 ? 'border-t border-gray-100' : ''}`}>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                            {dayLabel}
                          </span>
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {grouped[dayLabel].length}
                          </span>
                        </div>

                        {/* Entries */}
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
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {entry.timestamp} · {relativeTime(entry.epochMs)}
                                    </p>
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

                  {/* Show More / Show Less footer */}
                  {(hasMore || visibleCount > PAGE_SIZE) && (
                      <div className="border-t border-gray-100 px-5 py-3.5 flex items-center justify-between bg-gray-50/50">
                        {hasMore ? (
                            <>
                              <span className="text-xs text-gray-400">
                                Showing {visibleCount} of {recentActivity.length} events
                              </span>
                              <button
                                  onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
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
                              <span className="text-xs text-gray-400">
                                Showing all {recentActivity.length} events
                              </span>
                              <button
                                  onClick={() => setVisibleCount(PAGE_SIZE)}
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