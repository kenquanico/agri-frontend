import { useState } from 'react'
import { AlertTriangle, Bug, Sprout } from 'lucide-react'

const DETECTIONS = [
  { id: 1, timestamp: '2024-12-29 14:23:15', type: 'Disease', name: 'Late Blight', confidence: 92, location: 'Field A — Row 5', severity: 'high' },
  { id: 2, timestamp: '2024-12-29 13:45:32', type: 'Pest', name: 'Aphids', confidence: 87, location: 'Field B — Row 12', severity: 'medium' },
  { id: 3, timestamp: '2024-12-29 12:10:08', type: 'Disease', name: 'Powdery Mildew', confidence: 78, location: 'Field A — Row 8', severity: 'medium' },
  { id: 4, timestamp: '2024-12-29 11:30:45', type: 'Pest', name: 'Whiteflies', confidence: 95, location: 'Field C — Row 3', severity: 'high' },
  { id: 5, timestamp: '2024-12-29 10:15:22', type: 'Disease', name: 'Leaf Spot', confidence: 83, location: 'Field B — Row 7', severity: 'low' },
]

const severityConfig = {
  high:   { label: 'High',   classes: 'bg-red-50 text-red-600 border-red-100' },
  medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-600 border-amber-100' },
  low:    { label: 'Low',    classes: 'bg-blue-50 text-blue-600 border-blue-100' },
}

const typeConfig = {
  Disease: { classes: 'bg-purple-50 text-purple-600 border-purple-100' },
  Pest:    { classes: 'bg-orange-50 text-orange-600 border-orange-100' },
}

const confidenceColor = c => c >= 90 ? 'text-green-600' : c >= 75 ? 'text-amber-500' : 'text-red-500'

export default function AlarmLog() {
  const [detectionLog] = useState(DETECTIONS)
  const [filter, setFilter] = useState('all')

  const filteredLog = filter === 'all'
      ? detectionLog
      : detectionLog.filter(item => item.type.toLowerCase() === filter)

  const filterBtns = [
    { key: 'all',     label: 'All' },
    { key: 'disease', label: 'Diseases' },
    { key: 'pest',    label: 'Pests' },
  ]

  return (
      <div className="min-h-screen bg-gray-50/60 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Monitoring</p>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Alarm Log</h1>
            <p className="text-sm text-gray-400 mt-0.5">Detected pests and diseases from field monitoring</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: detectionLog.length, color: 'text-gray-900' },
              { label: 'Diseases', value: detectionLog.filter(d => d.type === 'Disease').length, color: 'text-purple-600' },
              { label: 'Pests', value: detectionLog.filter(d => d.type === 'Pest').length, color: 'text-orange-600' },
              { label: 'High Severity', value: detectionLog.filter(d => d.severity === 'high').length, color: 'text-red-600' },
            ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                  <p className={`text-4xl font-bold tracking-tight ${color}`}>{value}</p>
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

          {/* Mobile Cards */}
          <div className="space-y-3 lg:hidden">
            {filteredLog.map(d => (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{d.name}</h3>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeConfig[d.type].classes}`}>
                    {d.type}
                  </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold border ${severityConfig[d.severity].classes}`}>
                  {severityConfig[d.severity].label}
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

          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Detection Records</h2>
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
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${typeConfig[d.type].classes}`}>
                      {d.type}
                    </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{d.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{d.location}</td>
                    <td className="px-6 py-4 text-sm font-bold whitespace-nowrap">
                      <span className={confidenceColor(d.confidence)}>{d.confidence}%</span>
                    </td>
                    <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-semibold border ${severityConfig[d.severity].classes}`}>
                      {severityConfig[d.severity].label}
                    </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-800">Details</button>
                        <button className="text-xs font-semibold text-green-600 hover:text-green-800">Treatment</button>
                      </div>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>

            {filteredLog.length === 0 && (
                <div className="py-16 text-center">
                  <AlertTriangle size={28} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-400">No detections match this filter</p>
                </div>
            )}
          </div>

        </div>
      </div>
  )
}