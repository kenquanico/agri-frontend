    import React, { useState, useRef, useEffect } from "react";
    import { Check, Info, Plus, Save, RotateCcw, AlertTriangle, Trash2, Edit2, X } from "lucide-react";
    import api from "../api/api";

    console.log("Settings component loaded");

    // Predefined pest and disease types with default configurations


    export default function Settings() {
      console.log("Settings component rendering");

      const [classifications, setClassifications] = useState([]);
        const [error, setError] = useState(null);


      const [editingId, setEditingId] = useState(null);
      const [editForm, setEditForm] = useState({});
        const [loading, setLoading] = useState(true);
      const [showAddModal, setShowAddModal] = useState(false);
      const [uploadSuccess, setUploadSuccess] = useState(false);
      const [systemClasses, setSystemClasses] = useState({})
      const [selectedClassIds, setSelectedClassIds] = useState([]);

      const [extractedClasses, setExtractedClasses] = useState([]);
    const [newClassification, setNewClassification] = useState({
      name: "",
      type: "pest",
      severity: "medium",
      detectionThreshold: 0.70,
      percentageThreshold: 10,
      description: ""
    });



        


      const fileInputRef = useRef(null);

      const [showUploadModal, setShowUploadModal] = useState(false);
      const [uploadForm, setUploadForm] = useState({
        file: null,
        name: "",
        description: ""
      });
      const [uploadedClasses, setUploadedClasses] = useState([]);
      const [isUploading, setIsUploading] = useState(false);
      const [uploadError, setUploadError] = useState("");


      const [models, setModels] = useState([]);
      const [modelsLoading, setModelsLoading] = useState(true);
      const [modelsError, setModelsError] = useState(null);

      const [settings, setSettings] = useState({
        detection: {
          enabled: true,
          scanInterval: 5,
          autoRefresh: true,
          alertSound: true,
        },
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
        general: {
          totalCrops: 128,
          alertCooldown: 300,
          showConfidenceScore: true,
        }
      });


    //   [
    //     'name' => 'My Detection Model',
    //     'model' => /* UploadedFile instance from request */,
    //     'description' => 'This is a sample detection model',
    //     'classes' => [
    //         [
    //             'model_class_name' => 1, // integer as per your rules
    //             'system_class_id' => 101 // integer
    //         ],
    //         [
    //             'model_class_name' => 2,
    //             'system_class_id' => 102
    //         ],
    //         // more class items...
    //     ],
    // ];

      const [hasChanges, setHasChanges] = useState(false);
      const [saveSuccess, setSaveSuccess] = useState(false);
      const [filterType, setFilterType] = useState("all");
      const [filterSeverity, setFilterSeverity] = useState("all");


   const handleChange = (e) => {
  const value = e.target.value;
  if (value) {
    const id = parseInt(value, 10);
    setSelectedClassIds([id]); // single select
    console.log("Selected system_class_id:", id);
  } else {
    setSelectedClassIds([]);
  }
};


      useEffect(() => {
      const fetchModels = async () => {
        try {
          const response = await api.get("/api/models");
          setModels(Array.isArray(response.data) ? response.data : response.data.data || []);
        } catch (err) {
          console.error(err);
          setModelsError("Failed to fetch models");
        } finally {
          setModelsLoading(false);
        }
      };
      fetchModels();
    }, []);



    useEffect(() => {
      const fetchClassifications = async () => {
        try {
          const response = await api.get("/api/classification");
          console.log("API response:", response.data);
          setClassifications(Array.isArray(response.data) ? response.data : response.data.data || []);
        } catch (err) {
          console.error(err);
          setError("Failed to fetch classifications");
        } finally {
          setLoading(false); // important
        }
      };
      fetchClassifications();
    }, []);



      if (loading) return <p>Loading...</p>;
      if (error) return <p>Error: {error}</p>;

      const getSeverityColor = (severity) => {
        const colors = {
          critical: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
          high: { bg: "#fed7aa", border: "#f97316", text: "#9a3412" },
          medium: { bg: "#fef3c7", border: "#eab308", text: "#854d0e" },
          low: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
        };
        return colors[severity] || colors.medium;
      };

    const handleFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file || !file.name.endsWith('.pt')) {
    setUploadError('Please select a valid .pt file');
    return;
  }

  setUploadForm({ ...uploadForm, file });
  setIsUploading(true);
  setUploadError('');
  setUploadSuccess(false);

  try {
    const formData = new FormData();
    formData.append('model', file);

    const response = await api.post('/api/models/classification-checker', formData);
const classesFromBackend = response.data.classes || [];

    // Map extracted classes to objects with IDs
    const classesWithIds = classesFromBackend.map((cls, index) => ({
      name: cls,       // class name string
      id: index + 1,   // default system_class_id
      selectedId: null // will store user-selected ID from dropdown
    }));

setExtractedClasses(classesWithIds);


    setExtractedClasses(classesWithIds);
    setUploadSuccess(true);
  } catch (error) {
    console.error(error.response?.data || error.message);
    setUploadError(error.response?.data?.message || 'Upload failed to extract classes');
  } finally {
    setIsUploading(false);
  }
};


      const handleClassificationToggle = (id) => {
        setClassifications(prev =>
          prev.map(item =>
            item.id.id === id.id ? { ...item, enabled: !item.enabled } : item
          )
        );
        setHasChanges(true);
      };

      const handleEditStart = (classification) => {
        setEditingId(classification.id);
        setEditForm({ ...classification });
      };

      const handleEditCancel = () => {
        setEditingId(null);
        setEditForm({});
      };

      const handleEditSave = () => {
        setClassifications(prev =>
          prev.map(item =>
            item.id.id  === editingId ? { ...editForm } : item
          )
        );
        setEditingId(null);
        setEditForm({});
        setHasChanges(true);
      };

    const handleDelete = async (id) => {
      if (window.confirm("Are you sure you want to delete this classification?")) {
        try {
          await api.delete(`/api/classification/${id}`);
          setClassifications(prev => prev.filter(item => item.id.id !== id.id));
          console.log(`Classification ${id} deleted successfully`);
        } catch (err) {
          console.error("Failed to delete classification:", err);
          alert("Failed to delete classification. Please try again.");
        }
      }
    };


      const handleAddNew = async () => {
      if (!newClassification.name.trim()) {
        return;
      }

      const payload = {
        name: newClassification.name,
        type: newClassification.type,
        severity: newClassification.severity,
        detectionThreshold: parseFloat(newClassification.detectionThreshold),
        percentageThreshold: parseFloat(newClassification.percentageThreshold),
        description: newClassification.description
      };

      try {
        const res = await api.post("/api/classification", payload);
        
        
        setClassifications(prev => [...prev, res.data]);

        setShowAddModal(false);
        setNewClassification({
          name: "",
          type: "pest",
          severity: "medium",
          detectionThreshold: 0.0,
          percentageThreshold: 0.0,
          description: ""
        });
      } catch (err) {
        console.error("Failed to add classification:", err);
        alert("Failed to add classification. Please try again.");
      }
    };

 // Place this outside your component or at the top of your file
let nextSystemClassId = 1; // start from 1


const handleModelUpload = async () => {
  if (!uploadForm.file) return setUploadError("Please select a model file to upload");
  if (!uploadForm.name.trim()) return setUploadError("Please enter a model name");
  if (!uploadSuccess || extractedClasses.length === 0) return setUploadError("Please wait for class extraction to complete");

  setIsUploading(true);
  setUploadError("");

  try {
    const formData = new FormData();
    formData.append("model", uploadForm.file);
    formData.append("name", uploadForm.name);
    formData.append("description", uploadForm.description || "");

    extractedClasses.forEach((cls, index) => {
      formData.append(`classes[${index}][model_class_name]`, cls.name);
      formData.append(`classes[${index}][system_class_id]`, cls.selectedId || cls.id);
    });

    const response = await api.post("/api/models/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    console.log("Upload success:", response.data);

    // Update uploadedClasses for selection dropdown
    setUploadedClasses(prev => [...prev, ...extractedClasses]);

    // ALSO add to main classifications list so the UI updates
    setClassifications(prev => [
      ...prev,
      ...extractedClasses.map(cls => ({
        id: cls.selectedId ?? cls.id, // ensure unique ID
        name: cls.name,
        type: cls.type || "pest",
        severity: cls.severity || "medium",
        description: cls.description || "",
        detectionThreshold: 0.7,
        percentageThreshold: 10,
        enabled: true
      }))
    ]);

    setShowUploadModal(false);
    setUploadForm({ file: null, name: "", description: "" });
    setExtractedClasses([]);
    setUploadSuccess(false);

    if (fileInputRef.current) fileInputRef.current.value = "";

    alert("Model uploaded successfully! Classes are now available in Add Classification.");
  } catch (err) {
    console.error(err.response?.data || err.message);
    setUploadError(err.response?.data?.message || "Failed to upload model");
  } finally {
    setIsUploading(false);
  }
};



      const handleSettingsChange = (category, field, value) => {
        setSettings(prev => ({
          ...prev,
          [category]: {
            ...prev[category],
            [field]: value
          }
        }));
        setHasChanges(true);
      };

      const handleSave = () => {
        try {
          localStorage.setItem("appSettings", JSON.stringify(settings));
          localStorage.setItem("classifications", JSON.stringify(classifications));
          setHasChanges(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
          console.error("Error saving settings:", error);
          alert("Failed to save settings");
        }
      };

    const handleReset = () => {
      if (window.confirm("Are you sure you want to reset all settings to default?")) {
        // Optionally fetch default classifications from API or just clear
        setClassifications([]);
        setSettings({
          detection: {
            enabled: true,
            scanInterval: 5,
            autoRefresh: true,
            alertSound: true,
          },
          notifications: {
            email: true,
            push: false,
            sms: false,
          },
          general: {
            totalCrops: 128,
            alertCooldown: 300,
            showConfidenceScore: true,
          }
        });
        setHasChanges(true);
      }
    };

    const filteredClassifications = Array.isArray(classifications)
      ? classifications.filter(item => {
          const typeMatch = filterType === "all" || item.type === filterType;
          const severityMatch = filterSeverity === "all" || item.severity === filterSeverity;
          return typeMatch && severityMatch;
        })
      : [];
    console.log(filteredClassifications);



      const getAlarmInfo = (classification) => {


        const percentage = classification.percentageThreshold > 1 
        ? classification.percentageThreshold 
        : classification.percentageThreshold * 100;

          const affected = Math.ceil((percentage / 100) * settings.general.totalCrops);

        return {
          percentage: percentage,
        affected: affected,
        total: settings.general.totalCrops
        };
      };

      try {
        return (
          <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-600 mt-2">
                  Configure pest & disease classifications, detection thresholds, and alarm conditions
                </p>
              </div>

              {/* Success Message */}
              {saveSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                  <Info className="h-5 w-5 text-green-600" />
                  <span className="text-green-800">Settings saved successfully!</span>
                </div>
              )}

              {/* General Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#479B6D] rounded-full"></span>
                    General Settings
                  </h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Crops in Field
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.general.totalCrops}
                      onChange={(e) => handleSettingsChange("general", "totalCrops", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used for percentage calculations</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Cooldown (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={settings.general.alertCooldown}
                      onChange={(e) => handleSettingsChange("general", "alertCooldown", parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Time between duplicate alerts</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Show Confidence Score
                      </label>
                      <p className="text-xs text-gray-500">Display AI confidence %</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.general.showConfidenceScore}
                        onChange={(e) => handleSettingsChange("general", "showConfidenceScore", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#C8E6C9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#479B6D]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Upload Model Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-blue-600" />
                        Upload Custom Model
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Upload your trained AI model to automatically extract classification classes
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-600 rounded-lg p-3">
                          <Info className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">How Model Upload Works</h3>
                          <ol className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start gap-2">
                              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
                              <span>Upload your trained model file (.pt)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
                              <span>Our API analyzes the model and extracts all classification classes</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
                              <span>Classes appear in the "Add Classification" dropdown for easy selection</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">4</span>
                              <span>Configure thresholds and settings for each detected class</span>
                            </li>
                          </ol>
                        </div>
                      </div>

                      {uploadedClasses.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-blue-300">
                          <div className="flex items-center gap-2 mb-2">
                            <Check className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-gray-900">
                              {uploadedClasses.length} Classes Available
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {uploadedClasses.map((className, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-white border border-blue-300 rounded-full text-sm text-gray-700"
                              >
                                {className}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors">
                      <div className="bg-blue-100 rounded-full p-4 mb-4">
                        <Plus className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Upload New Model</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Extract classes from your trained model
                      </p>
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                      >
                        <Plus className="h-5 w-5" />
                        Upload Model
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Models List Table */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-2 h-2 bg-[#479B6D] rounded-full"></span>
          Uploaded Models
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          List of all models uploaded to the system
        </p>
      </div>

      <div className="p-6">
        {modelsLoading ? (
          <p className="text-center text-gray-500 py-8">Loading models...</p>
        ) : modelsError ? (
          <p className="text-center text-red-500 py-8">{modelsError}</p>
        ) : models.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No models uploaded yet.</p>
            <p className="text-sm mt-1">Upload your first model to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Model Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Updated Date</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{model.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {model.description || <span className="text-gray-400 italic">No description</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(model.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(model.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

              {/* Pest & Disease Classifications */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-[#479B6D]" />
                        Pest & Disease Classifications
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Configure detection thresholds and alarm conditions for each classification
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#479B6D] text-white rounded-lg hover:bg-[#3a7d58] transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Classification
                    </button>
                  </div>
                </div>

                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
                      <div className="flex gap-2">
                        {["all", "pest", "disease"].map(type => (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              filterType === type
                                ? "bg-[#479B6D] text-white"
                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Severity</label>
                      <div className="flex gap-2">
                        {["all", "critical", "high", "medium", "low"].map(severity => (
                          <button
                            key={severity}
                            onClick={() => setFilterSeverity(severity)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              filterSeverity === severity
                                ? "bg-[#479B6D] text-white"
                                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {severity.charAt(0).toUpperCase() + severity.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                          {/* display */}
                <div className="p-6">
                  <div className="space-y-4">
                  {filteredClassifications.map((classification) => {
  const isEditing = editingId === classification.id;
  const current = isEditing ? editForm : classification;

  const colors = getSeverityColor(current.severity);  
  const alarmInfo = getAlarmInfo(current);

  return (
    <div key={classification.id} className="space-y-4">
      <div className="border-2 rounded-lg p-5 transition-all bg-white border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-1">
              {isEditing ? (
                            <input
                type="text"
                value={current.id}  // use the inner id property
                onChange={(e) =>
                  setEditForm({ ...current, id: parseInt(e.target.value, 10) })
      }
      className="text-lg font-semibold text-gray-900 border-b-2 border-[#479B6D] focus:outline-none mb-2 w-full"
    />
  ) : (
               <h3 className="text-lg font-semibold text-gray-900">{current.name}</h3>

              )}

              <div className="flex items-center gap-3 mt-1">
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  {current.severity}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  current.type === "pest" 
                    ? "bg-purple-100 text-purple-700 border border-purple-300"
                    : "bg-amber-100 text-amber-700 border border-amber-300"
                }`}>
                  {current.type}
                </span>
              </div>

              {isEditing ? (
                <textarea
                  value={current.description}
                  onChange={(e) => setEditForm({ ...current, description: e.target.value })}
                  className="text-sm text-gray-600 mt-2 w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
                  rows="2"
                />
              ) : (
                <p className="text-sm text-gray-600 mt-2">{current.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleEditSave}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Save"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={handleEditCancel}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleEditStart(classification)}
                  className="p-2 text-[#479B6D] hover:bg-[#C8E6C9] rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(classification.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Detection Threshold: {(current.detectionThreshold ?? 0).toFixed(2)}
            </label>
           <input
  type="range"
  min="0"
  max="1"
  step="0.05"
  value={current.detectionThreshold ?? 0}
  onChange={(e) => {
    const value = parseFloat(e.target.value);
    if (isEditing) {
      setEditForm({ ...current, detectionThreshold: value });
    } else {
      setClassifications(prev =>
        prev.map(item =>
          item.id === classification.id ? { ...item, detectionThreshold: value } : item
        )
      );
      setHasChanges(true);
    }
  }}
  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#479B6D]"
/>

            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0.0</span>
              <span>1.0</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">AI confidence required to detect</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Percentage Threshold: {(current.percentageThreshold ?? 0)}%
            </label>
           <input
  type="range"
  min="1"
  max="100"
  step="1"
  value={current.percentageThreshold > 1 ? current.percentageThreshold : current.percentageThreshold * 100}
  onChange={(e) => {
    const value = parseInt(e.target.value);
    if (isEditing) {
      setEditForm({ ...current, percentageThreshold: value });
    } else {
      setClassifications(prev =>
        prev.map(item =>
          item.id === classification.id ? { ...item, percentageThreshold: value } : item
        )
      );
      setHasChanges(true);
    }
  }}
  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#479B6D]"
/>

            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1%</span>
              <span>100%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">% of crops affected before alarm</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Severity Level
            </label>
            <select
              value={current.severity}
              onChange={(e) => {
                if (isEditing) {
                  setEditForm({ ...current, severity: e.target.value });
                } else {
                  setClassifications(prev =>
                    prev.map(item =>
                      item.id.id === classification.id? { ...item, severity: e.target.value } : item
                    )
                  );
                  setHasChanges(true);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent text-sm"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Alert priority level</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-900">Alarm Trigger:</span>
            <span className="text-amber-800">
              When <span className="font-bold">{alarmInfo.affected} or more crops</span> ({alarmInfo.percentage}% of {alarmInfo.total}) are detected with {current.name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
})}


                    {filteredClassifications.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No classifications found matching the selected filters.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detection Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#479B6D] rounded-full"></span>
                    Detection Settings
                  </h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Enable Detection</label>
                      <p className="text-sm text-gray-500">Turn on/off automatic detection</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.detection.enabled}
                        onChange={(e) => handleSettingsChange("detection", "enabled", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#C8E6C9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#479B6D]"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scan Interval (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.detection.scanInterval}
                      onChange={(e) => handleSettingsChange("detection", "scanInterval", parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Auto Refresh</label>
                      <p className="text-sm text-gray-500">Automatically refresh detection data</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.detection.autoRefresh}
                        onChange={(e) => handleSettingsChange("detection", "autoRefresh", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#C8E6C9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#479B6D]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Alert Sound</label>
                      <p className="text-sm text-gray-500">Play sound when alert is triggered</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.detection.alertSound}
                        onChange={(e) => handleSettingsChange("detection", "alertSound", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#C8E6C9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#479B6D]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#479B6D] rounded-full"></span>
                    Notifications
                  </h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                      <p className="text-sm text-gray-500">Receive alerts via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.email}
                        onChange={(e) => handleSettingsChange("notifications", "email", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#C8E6C9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#479B6D]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Push Notifications</label>
                      <p className="text-sm text-gray-500">Browser push notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.push}
                        onChange={(e) => handleSettingsChange("notifications", "push", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#C8E6C9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#479B6D]"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">SMS Notifications</label>
                      <p className="text-sm text-gray-500">Receive alerts via text</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.sms}
                        onChange={(e) => handleSettingsChange("notifications", "sms", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#C8E6C9] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#479B6D]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                >
                  <RotateCcw className="h-5 w-5" />
                  Reset to Default
                </button>

                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex items-center gap-2 px-6 py-3 bg-[#479B6D] text-white rounded-lg hover:bg-[#3a7d58] transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-5 w-5" />
                  Save Changes
                </button>
              </div>
            </div>

            {/* Add Classification Modal */}
            {showAddModal && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-x-hidden">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-3xl md:max-w-2xl lg:max-w-xl max-h-[90vh] overflow-y-auto">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Classification</h3>
      </div>
      <div className="p-4 sm:p-6 space-y-4">
        {uploadedClasses.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select from Uploaded Model Classes
            </label>
            <select
              onChange={(e) => {
                const selectedClass = e.target.value;
                if (selectedClass) {
                  setNewClassification({ 
                    ...newClassification, 
                    name: selectedClass,
                    description: `Class detected from uploaded model: ${selectedClass}`
                  });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
              defaultValue=""
            >
              <option value="">-- Select a class --</option>
              {uploadedClasses.map((className, index) => (
                <option key={index} value={className}>{className}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{uploadedClasses.length} classes detected from your model</p>
            <div className="my-4 border-t border-gray-300 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-sm text-gray-500">
                OR enter manually
              </span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
          <input
            type="text"
            value={newClassification.name}
            onChange={(e) => setNewClassification({ ...newClassification, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
            placeholder="e.g., Green Leafhopper"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={newClassification.type}
              onChange={(e) => setNewClassification({ ...newClassification, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
            >
              <option value="pest">Pest</option>
              <option value="disease">Disease</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={newClassification.severity}
              onChange={(e) => setNewClassification({ ...newClassification, severity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={newClassification.description}
            onChange={(e) => setNewClassification({ ...newClassification, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
            rows="3"
            placeholder="Brief description of the pest or disease"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detection Threshold: {newClassification.detectionThreshold.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={newClassification.detectionThreshold}
            onChange={(e) => setNewClassification({ ...newClassification, detectionThreshold: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#479B6D]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Percentage Threshold: {newClassification.percentageThreshold}%
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={newClassification.percentageThreshold}
            onChange={(e) => setNewClassification({ ...newClassification, percentageThreshold: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#479B6D]"
          />
        </div>
      </div>
      <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={() => {
            setShowAddModal(false);
            setNewClassification({
              name: "",
              type: "pest",
              severity: "medium",
              detectionThreshold: 0.70,
              percentageThreshold: 10,
              enabled: true,
              description: ""
            });
          }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto"
        >
          Cancel
        </button>
        <button
          onClick={handleAddNew}
          disabled={!newClassification.name.trim()}
          className="px-4 py-2 bg-[#479B6D] text-white rounded-lg hover:bg-[#3a7d58] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          Add Classification
        </button>
      </div>
    </div>
  </div>
)}



            {/* Upload Model Modal */}
            {showUploadModal && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 sm:p-6 overflow-x-hidden">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-full sm:max-w-3xl md:max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Upload Model</h3>
        <p className="text-sm text-gray-600 mt-1">
          Upload your trained model to extract classification classes
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <span className="text-green-800">Classes extracted successfully!</span>
          </div>
        )}

        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model File *
          </label>
          <div className="relative">
            <input
              type="file"
              accept=".pt"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
              required
              disabled={isUploading}
            />
            {uploadSuccess && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Supported format: .pt</p>
        </div>

        {/* Model Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Name *
          </label>
          <input
            type="text"
            value={uploadForm.name}
            onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
            placeholder="e.g., Rice Disease Detector v2"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={uploadForm.description}
            onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#479B6D] focus:border-transparent"
            rows="3"
            placeholder="Brief description of the model and its training data"
          />
        </div>

        {/* Extracted Classes */}
        <div className="space-y-2">
          {extractedClasses.map((cls) => (
            <div key={cls.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
              <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900 flex items-center gap-2 w-full sm:w-auto">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                {cls.name}
              </div>
              <select
                value={cls.selectedId || ""}
                onChange={(e) => {
                  const selectedId = parseInt(e.target.value, 10);
                  setExtractedClasses(prev =>
                    prev.map(c => c.id === cls.id ? { ...c, selectedId } : c)
                  );
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg w-full sm:w-48"
              >
                <option value="">Select ID</option>
                {filteredClassifications.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={() => setShowUploadModal(false)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto"
        >
          Cancel
        </button>
        <button
          onClick={handleModelUpload}
          className="px-4 py-2 bg-[#479B6D] text-white rounded-lg hover:bg-[#3a7d58] transition-colors w-full sm:w-auto"
        >
          Upload
        </button>
      </div>
    </div>
  </div>
)}

          </div>
        );
      } catch (error) {
        console.error("Render error:", error);
        return (
          <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl">
              <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Settings</h2>
              <p className="text-red-700">
                An error occurred while loading the settings component. Please check the console for details.
              </p>
              <pre className="mt-4 p-4 bg-red-100 rounded text-xs overflow-auto">
                {error.toString()}
              </pre>
            </div>
          </div>
        );
      }
    }