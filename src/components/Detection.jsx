import { useState } from 'react';
import { Upload, FileImage, Trash2, Download } from 'lucide-react';

export default function Detection() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResults, setDetectionResults] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
      simulateAnalysis();
    };
    reader.readAsDataURL(file);
  };

  const simulateAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setDetectionResults({
        detected: true,
        pest: 'Aphids',
        confidence: 92,
        severity: 'Moderate',
        recommendations: [
          'Apply neem oil spray',
          'Introduce ladybugs as natural predators',
          'Remove heavily infested leaves'
        ]
      });
    }, 2000);
  };

  const handleClear = () => {
    setUploadedImage(null);
    setDetectionResults(null);
  };

  const handleDownload = () => {
    if (detectionResults) {
      const data = JSON.stringify(detectionResults, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'detection-results.json';
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Pests and Disease Detection
          </h1>
          <p className="text-gray-600">
            Upload an image to detect pests and diseases
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {uploadedImage && (
            <>
              <button
                onClick={handleClear}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 size={18} />
                Clear
              </button>
              
              {detectionResults && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download size={18} />
                  Download Results
                </button>
              )}
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Image Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Upload Image
            </h2>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="max-h-96 mx-auto rounded-lg"
                />
              ) : (
                <label className="cursor-pointer block">
                  <div className="py-12">
                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, up to 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Detection Results Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Detection Results
            </h2>
            
            <div className="bg-gray-900 rounded-lg p-8 min-h-96 flex items-center justify-center">
              {isAnalyzing ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-white">Analyzing image...</p>
                </div>
              ) : detectionResults ? (
                <div className="w-full text-white">
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-green-400 mb-2">
                      {detectionResults.pest} Detected
                    </h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="bg-green-500 px-3 py-1 rounded-full">
                        {detectionResults.confidence}% Confidence
                      </span>
                      <span className="bg-orange-500 px-3 py-1 rounded-full">
                        {detectionResults.severity} Severity
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3 text-lg">Recommendations:</h4>
                    <ul className="space-y-2">
                      {detectionResults.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-400 mt-1">•</span>
                          <span className="text-gray-300">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <FileImage className="mx-auto mb-4 text-gray-600" size={48} />
                  <p className="text-gray-400">No image uploaded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}