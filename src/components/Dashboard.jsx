import React, { useState, useEffect } from 'react'
import { PlayCircle, Upload, Bell, FileText, MapPin } from 'lucide-react'

function DashboardCard({ icon, title, value, change, changeLabel }) {
  const isPositive = change >= 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      {icon && <div className="mb-3">{icon}</div>}

      <p className="text-xs sm:text-sm text-[#333333] mb-2">{title}</p>

      <h2 className="text-3xl sm:text-4xl font-bold text-[#333333] mb-3">
        {value}
      </h2>

      {change !== undefined && (
        <div className="flex items-center gap-1">
          <svg
            className={`w-4 h-4 ${isPositive ? 'text-green-600' : 'text-red-600'} ${
              !isPositive ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span
            className={`text-xs sm:text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
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
      className="bg-white rounded-xl border-dashed border-2 border-[#CFCFCF] p-4 sm:p-6 hover:border-green-600 hover:bg-gray-50 transition-all w-full text-left"
    >
      {icon && <div className="mb-3 text-green-600">{icon}</div>}
      <h2 className="text-sm sm:text-lg font-semibold text-[#333333]">
        {title}
      </h2>
    </button>
  )
}

function WeatherIndicator() {
  const [weather, setWeather] = useState({
    temp: '28°C',
    condition: 'Sunny'
  })

  useEffect(() => {}, [])

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-100">
      <div className="flex flex-col">
        <span className="text-xs sm:text-sm font-medium">
          {weather.temp}
        </span>
        <span className="text-[10px] sm:text-xs text-[#333333]">
          {weather.condition}
        </span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const handleAction = action => {
    console.log(action)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-7 sm:h-8 bg-green-600 rounded-full" />
              <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
                AgriVision
              </h1>
            </div>

            <WeatherIndicator />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
            Dashboard
          </h1>
          <h2 className="text-sm sm:text-base text-[#9E9E9E]">
            Overview of your field monitoring system
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <DashboardCard title="Total Detections" value="128" change={12} />
          <DashboardCard title="Total Fields" value="12" change={5} />
          <DashboardCard title="Active Alerts" value="3" change={-8} />
          <DashboardCard title="Healthy Crops" value="89%" change={3} />
        </div>

        <div className="mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333] mb-4">
            Quick Actions
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            <ActionCard
              icon={<PlayCircle size={28} />}
              title="Start Field Monitoring"
              onClick={() => handleAction('monitor')}
            />
            <ActionCard
              icon={<Upload size={28} />}
              title="Upload Image"
              onClick={() => handleAction('upload')}
            />
            <ActionCard
              icon={<Bell size={28} />}
              title="View Alarm Logs"
              onClick={() => handleAction('alarms')}
            />
            <ActionCard
              icon={<FileText size={28} />}
              title="Generate Report"
              onClick={() => handleAction('report')}
            />
            <ActionCard
              icon={<MapPin size={28} />}
              title="View Fields"
              onClick={() => handleAction('fields')}
            />
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333] mb-4">
            Recent Activities
          </h1>
          <div className="bg-white border border-[#CFCFCF] p-4 sm:p-6 rounded-xl">
            <h2 className="text-[#D6D0D0] text-center text-sm sm:text-base">
              List is empty
            </h2>
          </div>
        </div>
      </main>
    </div>
  )
}
