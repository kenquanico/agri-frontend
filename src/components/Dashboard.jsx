import { useState, useEffect } from 'react'
import { PlayCircle, Upload, Bell, FileText, MapPin, TrendingUp, TrendingDown } from 'lucide-react'

function StatCard({ title, value, change, changeLabel, accent }) {
  const isPositive = change >= 0
  return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
        <p className="text-4xl font-bold text-gray-900 tracking-tight mb-3">{value}</p>
        {change !== undefined && (
            <div className="flex items-center gap-1.5">
              {isPositive
                  ? <TrendingUp size={13} className="text-green-500" />
                  : <TrendingDown size={13} className="text-red-500" />
              }
              <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {Math.abs(change)}% {changeLabel || 'from last week'}
          </span>
            </div>
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

export default function Dashboard() {
  const handleAction = action => console.log(action)

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
            <StatCard title="Total Detections" value="128" change={12} />
            <StatCard title="Total Fields" value="12" change={5} />
            <StatCard title="Active Alerts" value="3" change={-8} />
            <StatCard title="Healthy Crops" value="89%" change={3} />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <ActionCard icon={<PlayCircle size={24} />} title="Start Field Monitoring" onClick={() => handleAction('monitor')} />
              <ActionCard icon={<Upload size={24} />} title="Upload Image" onClick={() => handleAction('upload')} />
              <ActionCard icon={<Bell size={24} />} title="View Alarm Logs" onClick={() => handleAction('alarms')} />
              <ActionCard icon={<FileText size={24} />} title="Generate Report" onClick={() => handleAction('report')} />
              <ActionCard icon={<MapPin size={24} />} title="View Fields" onClick={() => handleAction('fields')} />
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-4">Recent Activity</h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-sm text-gray-300 font-medium">No recent activity</p>
            </div>
          </div>
        </main>
      </div>
  )
}