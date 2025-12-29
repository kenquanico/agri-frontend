    import { useState } from 'react';

    export default function AlarmLog() {
      const [detectionLog, setDetectionLog] = useState([
        {
          id: 1,
          timestamp: '2024-12-29 14:23:15',
          type: 'Disease',
          name: 'Late Blight',
          confidence: 92,
          location: 'Field A - Row 5',
          severity: 'high',
          image: null
        },
        {
          id: 2,
          timestamp: '2024-12-29 13:45:32',
          type: 'Pest',
          name: 'Aphids',
          confidence: 87,
          location: 'Field B - Row 12',
          severity: 'medium',
          image: null
        },
        {
          id: 3,
          timestamp: '2024-12-29 12:10:08',
          type: 'Disease',
          name: 'Powdery Mildew',
          confidence: 78,
          location: 'Field A - Row 8',
          severity: 'medium',
          image: null
        },
        {
          id: 4,
          timestamp: '2024-12-29 11:30:45',
          type: 'Pest',
          name: 'Whiteflies',
          confidence: 95,
          location: 'Field C - Row 3',
          severity: 'high',
          image: null
        },
        {
          id: 5,
          timestamp: '2024-12-29 10:15:22',
          type: 'Disease',
          name: 'Leaf Spot',
          confidence: 83,
          location: 'Field B - Row 7',
          severity: 'low',
          image: null
        }
      ]);

      const [filter, setFilter] = useState('all');

      const filteredLog = filter === 'all' 
        ? detectionLog 
        : detectionLog.filter(item => item.type.toLowerCase() === filter);

      return (
        <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Alarm Log</h1>
              <p className="text-sm sm:text-base text-gray-600">Monitor detected diseases and pests from field monitoring</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Total Detections</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{detectionLog.length}</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Diseases</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {detectionLog.filter(d => d.type === 'Disease').length}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">Pests</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {detectionLog.filter(d => d.type === 'Pest').length}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
                <p className="text-xs sm:text-sm text-gray-500 mb-1">High Severity</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600">
                  {detectionLog.filter(d => d.severity === 'high').length}
                </p>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('disease')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    filter === 'disease'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Diseases
                </button>
                <button
                  onClick={() => setFilter('pest')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                    filter === 'pest'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pests
                </button>
              </div>
            </div>

            {/* Detection Log - Mobile Cards / Desktop Table */}
            
            {/* Mobile View - Cards */}
            <div className="block lg:hidden space-y-4">
              {filteredLog.map((detection) => (
                <div key={detection.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{detection.name}</h3>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        detection.type === 'Disease'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {detection.type}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      detection.severity === 'high' 
                        ? 'bg-red-100 text-red-800 border-red-200' :
                      detection.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}>
                      {detection.severity.charAt(0).toUpperCase() + detection.severity.slice(1)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="text-gray-900 font-medium">{detection.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Confidence:</span>
                      <span className={`font-semibold ${
                        detection.confidence >= 90 ? 'text-green-600' :
                        detection.confidence >= 75 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {detection.confidence}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time:</span>
                      <span className="text-gray-900">{detection.timestamp}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium text-sm transition-colors">
                      View Details
                    </button>
                    <button className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg font-medium text-sm transition-colors">
                      Treatment
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detection
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLog.map((detection) => (
                      <tr key={detection.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {detection.timestamp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            detection.type === 'Disease'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {detection.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {detection.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {detection.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${
                            detection.confidence >= 90 ? 'text-green-600' :
                            detection.confidence >= 75 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {detection.confidence}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                            detection.severity === 'high' 
                              ? 'bg-red-100 text-red-800 border-red-200' :
                            detection.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}>
                            {detection.severity.charAt(0).toUpperCase() + detection.severity.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button className="text-blue-600 hover:text-blue-800 font-medium mr-3">
                            View Details
                          </button>
                          <button className="text-green-600 hover:text-green-800 font-medium">
                            Treatment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredLog.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-base sm:text-lg">No detections found for this filter</p>
              </div>
            )}
          </div>
        </div>
      );
    }