import { useState } from 'react';

export default function FieldMonitoring() {
  const [cameraStarted, setCameraStarted] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [detections, setDetections] = useState(0);
  const [confidence, setConfidence] = useState(0);

  const handleMountCamera = () => {
    setCameraStarted(true);
    setStatus('Active');




    
    // Here you would initialize your camera feed



  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Section - Camera Feed */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Camera Feed</h2>
          
          
          {/* Camera Display */}
          <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center relative">
            {!cameraStarted ? (
              <div className="text-center">
                <p className="text-gray-400 mb-4">Camera not started</p>
                <button
                  onClick={handleMountCamera}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Mount Camera
                </button>
              </div>
            ) : (
              <div className="text-gray-400">Camera feed would display here</div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Status</p>
              <p className="text-3xl font-bold text-gray-900">{status}</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Detections</p>
              <p className="text-3xl font-bold text-gray-900">{detections}</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
              <p className="text-sm text-gray-500 mb-2">Confidence</p>
              <p className="text-3xl font-bold text-gray-900">{confidence}%</p>
            </div>
          </div>
        </div>


        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">Detection Log</h2>
          <div className="bg-white rounded-lg border border-gray-200 h-[calc(100vh-12rem)] overflow-y-auto p-4">
            <p className="text-gray-400 text-center mt-8">No detections yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}