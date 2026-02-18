import React, { useState, useRef, useEffect } from "react";
import { Check, Info, Plus, Save, RotateCcw, AlertTriangle, Trash2, Edit2, X } from "lucide-react";
import api from "../api/api";

// ─── Reusable Toggle ────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-green-500
        after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white
        after:rounded-full after:h-4 after:w-4 after:transition-all
        peer-checked:after:translate-x-5 peer-focus:ring-2 peer-focus:ring-green-500/20" />
      </label>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, action, children }) {
  return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="p-6">{children}</div>
      </div>
  );
}

const severityColors = {
  critical: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  high:     { bg: "#fed7aa", border: "#f97316", text: "#9a3412" },
  medium:   { bg: "#fef3c7", border: "#eab308", text: "#854d0e" },
  low:      { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
};

export default function Settings() {
  const [classifications, setClassifications] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [extractedClasses, setExtractedClasses] = useState([]);
  const [uploadedClasses, setUploadedClasses] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const [uploadForm, setUploadForm] = useState({ file: null, name: "", description: "" });
  const [newClassification, setNewClassification] = useState({
    name: "", type: "pest", severity: "medium",
    detectionThreshold: 0.70, percentageThreshold: 10, description: ""
  });
  const [settings, setSettings] = useState({
    detection: { enabled: true, scanInterval: 5, autoRefresh: true, alertSound: true },
    notifications: { email: true, push: false, sms: false },
    general: { totalCrops: 128, alertCooldown: 300, showConfidenceScore: true },
  });

  useEffect(() => {
    api.get("/api/models")
        .then(r => setModels(Array.isArray(r.data) ? r.data : r.data.data || []))
        .catch(() => setModelsError("Failed to fetch models"))
        .finally(() => setModelsLoading(false));
  }, []);

  useEffect(() => {
    api.get("/api/classification")
        .then(r => setClassifications(Array.isArray(r.data) ? r.data : r.data.data || []))
        .catch(() => setError("Failed to fetch classifications"))
        .finally(() => setLoading(false));
  }, []);

  if (loading) return (
      <div className="min-h-screen bg-gray-50/60 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading settings…</p>
        </div>
      </div>
  );

  if (error) return (
      <div className="min-h-screen bg-gray-50/60 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-100 p-8 max-w-md text-center">
          <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-600">{error}</p>
        </div>
      </div>
  );

  const handleSettingsChange = (cat, field, value) => {
    setSettings(p => ({ ...p, [cat]: { ...p[cat], [field]: value } }));
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      localStorage.setItem("appSettings", JSON.stringify(settings));
      localStorage.setItem("classifications", JSON.stringify(classifications));
      setHasChanges(false); setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch { alert("Failed to save settings"); }
  };

  const handleReset = () => {
    if (!window.confirm("Reset all settings to default?")) return;
    setClassifications([]);
    setSettings({
      detection: { enabled: true, scanInterval: 5, autoRefresh: true, alertSound: true },
      notifications: { email: true, push: false, sms: false },
      general: { totalCrops: 128, alertCooldown: 300, showConfidenceScore: true },
    });
    setHasChanges(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this classification?")) return;
    try {
      await api.delete(`/api/classification/${id}`);
      setClassifications(p => p.filter(item => item.id?.id !== id?.id));
    } catch { alert("Failed to delete classification."); }
  };

  const handleAddNew = async () => {
    if (!newClassification.name.trim()) return;
    try {
      const res = await api.post("/api/classification", {
        ...newClassification,
        detectionThreshold: parseFloat(newClassification.detectionThreshold),
        percentageThreshold: parseFloat(newClassification.percentageThreshold),
      });
      setClassifications(p => [...p, res.data]);
      setShowAddModal(false);
      setNewClassification({ name: "", type: "pest", severity: "medium", detectionThreshold: 0.70, percentageThreshold: 10, description: "" });
    } catch { alert("Failed to add classification."); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file?.name.endsWith('.pt')) { setUploadError('Please select a valid .pt file'); return; }
    setUploadForm(p => ({ ...p, file }));
    setIsUploading(true); setUploadError(''); setUploadSuccess(false);
    try {
      const fd = new FormData(); fd.append('model', file);
      const response = await api.post('/api/models/classification-checker', fd);
      const cls = (response.data.classes || []).map((c, i) => ({ name: c, id: i + 1, selectedId: null }));
      setExtractedClasses(cls); setUploadSuccess(true);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to extract classes');
    } finally { setIsUploading(false); }
  };

  const handleModelUpload = async () => {
    if (!uploadForm.file) return setUploadError("Please select a model file");
    if (!uploadForm.name.trim()) return setUploadError("Please enter a model name");
    if (!uploadSuccess || !extractedClasses.length) return setUploadError("Wait for class extraction");
    setIsUploading(true); setUploadError('');
    try {
      const fd = new FormData();
      fd.append("model", uploadForm.file);
      fd.append("name", uploadForm.name);
      fd.append("description", uploadForm.description || "");
      extractedClasses.forEach((cls, i) => {
        fd.append(`classes[${i}][model_class_name]`, cls.name);
        fd.append(`classes[${i}][system_class_id]`, cls.selectedId || cls.id);
      });
      await api.post("/api/models/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadedClasses(p => [...p, ...extractedClasses]);
      setShowUploadModal(false);
      setUploadForm({ file: null, name: "", description: "" });
      setExtractedClasses([]); setUploadSuccess(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err.response?.data?.message || "Failed to upload model");
    } finally { setIsUploading(false); }
  };

  const filteredClassifications = Array.isArray(classifications)
      ? classifications.filter(item =>
          (filterType === "all" || item.type === filterType) &&
          (filterSeverity === "all" || item.severity === filterSeverity)
      )
      : [];

  const getAlarmInfo = (c) => {
    const pct = c.percentageThreshold > 1 ? c.percentageThreshold : c.percentageThreshold * 100;
    return { percentage: pct, affected: Math.ceil((pct / 100) * settings.general.totalCrops), total: settings.general.totalCrops };
  };

  const filterBtn = (active, onClick, label) => (
      <button
          onClick={onClick}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              active ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:text-gray-800'
          }`}
      >
        {label}
      </button>
  );

  return (
      <div className="min-h-screen bg-gray-50/60 p-6 md:p-10">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Configuration</p>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-sm text-gray-400 mt-0.5">Configure classifications, detection thresholds, and alarm conditions</p>
          </div>

          {/* Save Success */}
          {saveSuccess && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
                <Check size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-green-700">Settings saved successfully</span>
              </div>
          )}

          {/* ── General Settings ── */}
          <SectionCard title="General" subtitle="Global system configuration">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Crops</label>
                <input
                    type="number" min="1" value={settings.general.totalCrops}
                    onChange={e => handleSettingsChange("general", "totalCrops", parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                />
                <p className="text-xs text-gray-400">Used for percentage calculations</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Alert Cooldown (s)</label>
                <input
                    type="number" min="0" value={settings.general.alertCooldown}
                    onChange={e => handleSettingsChange("general", "alertCooldown", parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                />
                <p className="text-xs text-gray-400">Time between duplicate alerts</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Confidence Score</p>
                  <p className="text-xs text-gray-400 mt-0.5">Display AI confidence %</p>
                </div>
                <Toggle checked={settings.general.showConfidenceScore} onChange={e => handleSettingsChange("general", "showConfidenceScore", e.target.checked)} />
              </div>
            </div>
          </SectionCard>

          {/* ── Upload Model ── */}
          <SectionCard title="Custom Model" subtitle="Upload a trained .pt model to extract classification classes">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 bg-blue-50/70 border border-blue-100 rounded-2xl p-5">
                <p className="text-sm font-bold text-gray-800 mb-3">How it works</p>
                <ol className="space-y-2.5">
                  {[
                    'Upload your trained model file (.pt)',
                    'API analyzes it and extracts classification classes',
                    'Classes appear in Add Classification for selection',
                    'Configure thresholds for each detected class',
                  ].map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                        {step}
                      </li>
                  ))}
                </ol>
                {uploadedClasses.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{uploadedClasses.length} Classes Available</p>
                      <div className="flex flex-wrap gap-1.5">
                        {uploadedClasses.map((c, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white border border-blue-200 rounded-full text-xs text-gray-700">{c.name}</span>
                        ))}
                      </div>
                    </div>
                )}
              </div>
              <button
                  onClick={() => setShowUploadModal(true)}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                  <Plus size={20} className="text-blue-600" />
                </div>
                <p className="text-sm font-bold text-gray-700 mb-1">Upload Model</p>
                <p className="text-xs text-gray-400">Extract classes automatically</p>
              </button>
            </div>
          </SectionCard>

          {/* ── Uploaded Models Table ── */}
          <SectionCard title="Uploaded Models" subtitle="All models registered in the system">
            {modelsLoading ? (
                <div className="py-10 text-center">
                  <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
            ) : modelsError ? (
                <p className="text-sm text-red-500 text-center py-8">{modelsError}</p>
            ) : models.length === 0 ? (
                <div className="py-14 text-center">
                  <Info size={24} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-400">No models uploaded yet</p>
                </div>
            ) : (
                <table className="w-full">
                  <thead>
                  <tr>
                    {['Model Name', 'Description', 'Created', 'Updated'].map(col => (
                        <th key={col} className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{col}</th>
                    ))}
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                  {models.map(m => (
                      <tr key={m.id} className="group hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 text-sm font-semibold text-gray-900 pr-4">{m.name}</td>
                        <td className="py-3.5 text-sm text-gray-500 pr-4">{m.description || <span className="italic text-gray-300">—</span>}</td>
                        <td className="py-3.5 text-sm text-gray-500 whitespace-nowrap pr-4">
                          {new Date(m.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3.5 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(m.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
            )}
          </SectionCard>

          {/* ── Classifications ── */}
          <SectionCard
              title="Pest & Disease Classifications"
              subtitle="Configure detection thresholds and alarm conditions"
              action={
                <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm shadow-green-200 flex-shrink-0"
                >
                  <Plus size={14} />
                  Add Classification
                </button>
              }
          >
            {/* Filters */}
            <div className="flex flex-wrap gap-5 mb-6 pb-6 border-b border-gray-100">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Type</p>
                <div className="flex gap-1.5">
                  {['all', 'pest', 'disease'].map(t => filterBtn(filterType === t, () => setFilterType(t), t.charAt(0).toUpperCase() + t.slice(1)))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Severity</p>
                <div className="flex gap-1.5 flex-wrap">
                  {['all', 'critical', 'high', 'medium', 'low'].map(s => filterBtn(filterSeverity === s, () => setFilterSeverity(s), s.charAt(0).toUpperCase() + s.slice(1)))}
                </div>
              </div>
            </div>

            {/* Classification Cards */}
            <div className="space-y-4">
              {filteredClassifications.map(classification => {
                const isEditing = editingId === classification.id;
                const current = isEditing ? editForm : classification;
                const colors = severityColors[current.severity] || severityColors.medium;
                const alarm = getAlarmInfo(current);

                return (
                    <div key={classification.id} className="border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-colors bg-white">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                              <input
                                  type="text" value={current.name || ''}
                                  onChange={e => setEditForm({ ...current, name: e.target.value })}
                                  className="text-base font-bold text-gray-900 border-b-2 border-green-500 focus:outline-none mb-2 w-full bg-transparent"
                              />
                          ) : (
                              <h3 className="text-base font-bold text-gray-900 mb-2">{current.name}</h3>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize"
                              style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}>
                          {current.severity}
                        </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                                current.type === 'pest' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>{current.type}</span>
                          </div>
                          {isEditing ? (
                              <textarea
                                  value={current.description} rows={2}
                                  onChange={e => setEditForm({ ...current, description: e.target.value })}
                                  className="mt-2 w-full text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                              />
                          ) : (
                              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{current.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                          {isEditing ? (
                              <>
                                <button onClick={() => { setClassifications(p => p.map(item => item.id === editingId ? { ...editForm } : item)); setEditingId(null); setEditForm({}); setHasChanges(true); }}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                                  <Check size={15} />
                                </button>
                                <button onClick={() => { setEditingId(null); setEditForm({}); }}
                                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
                                  <X size={15} />
                                </button>
                              </>
                          ) : (
                              <>
                                <button onClick={() => { setEditingId(classification.id); setEditForm({ ...classification }); }}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                                  <Edit2 size={15} />
                                </button>
                                <button onClick={() => handleDelete(classification.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                  <Trash2 size={15} />
                                </button>
                              </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-gray-100">
                        {/* Detection Threshold */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Detection Threshold <span className="text-green-600 font-bold">{(current.detectionThreshold ?? 0).toFixed(2)}</span>
                          </label>
                          <input type="range" min="0" max="1" step="0.05"
                                 value={current.detectionThreshold ?? 0}
                                 onChange={e => {
                                   const v = parseFloat(e.target.value);
                                   isEditing ? setEditForm({ ...current, detectionThreshold: v })
                                       : (setClassifications(p => p.map(i => i.id === classification.id ? { ...i, detectionThreshold: v } : i)), setHasChanges(true));
                                 }}
                                 className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500"
                          />
                          <div className="flex justify-between text-xs text-gray-300 mt-1"><span>0.0</span><span>1.0</span></div>
                        </div>

                        {/* Percentage Threshold */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Crop % Threshold <span className="text-green-600 font-bold">{current.percentageThreshold > 1 ? current.percentageThreshold : current.percentageThreshold * 100}%</span>
                          </label>
                          <input type="range" min="1" max="100" step="1"
                                 value={current.percentageThreshold > 1 ? current.percentageThreshold : current.percentageThreshold * 100}
                                 onChange={e => {
                                   const v = parseInt(e.target.value);
                                   isEditing ? setEditForm({ ...current, percentageThreshold: v })
                                       : (setClassifications(p => p.map(i => i.id === classification.id ? { ...i, percentageThreshold: v } : i)), setHasChanges(true));
                                 }}
                                 className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500"
                          />
                          <div className="flex justify-between text-xs text-gray-300 mt-1"><span>1%</span><span>100%</span></div>
                        </div>

                        {/* Severity */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Severity Level</label>
                          <select
                              value={current.severity}
                              onChange={e => {
                                const v = e.target.value;
                                isEditing ? setEditForm({ ...current, severity: v })
                                    : (setClassifications(p => p.map(i => i.id === classification.id ? { ...i, severity: v } : i)), setHasChanges(true));
                              }}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                          >
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>

                      {/* Alarm trigger info */}
                      <div className="mt-4 flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
                        <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                        <span>Alarm triggers when <strong>{alarm.affected}+ crops</strong> ({alarm.percentage}% of {alarm.total}) are affected</span>
                      </div>
                    </div>
                );
              })}

              {filteredClassifications.length === 0 && (
                  <div className="py-16 text-center">
                    <AlertTriangle size={28} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-400">No classifications match the selected filters</p>
                  </div>
              )}
            </div>
          </SectionCard>

          {/* ── Detection Settings ── */}
          <SectionCard title="Detection" subtitle="Automatic detection configuration">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Enable Detection', desc: 'Turn on/off automatic detection', field: 'enabled' },
                { label: 'Auto Refresh', desc: 'Automatically refresh detection data', field: 'autoRefresh' },
                { label: 'Alert Sound', desc: 'Play sound when alert triggers', field: 'alertSound' },
              ].map(({ label, desc, field }) => (
                  <div key={field} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <Toggle checked={settings.detection[field]} onChange={e => handleSettingsChange("detection", field, e.target.checked)} />
                  </div>
              ))}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Scan Interval (seconds)</label>
                <input
                    type="number" min="1" max="60" value={settings.detection.scanInterval}
                    onChange={e => handleSettingsChange("detection", "scanInterval", parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                />
              </div>
            </div>
          </SectionCard>

          {/* ── Notifications ── */}
          <SectionCard title="Notifications" subtitle="Choose how you receive alerts">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Email', desc: 'Receive alerts via email', field: 'email' },
                { label: 'Push', desc: 'Browser push notifications', field: 'push' },
                { label: 'SMS', desc: 'Receive alerts via text', field: 'sms' },
              ].map(({ label, desc, field }) => (
                  <div key={field} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <Toggle checked={settings.notifications[field]} onChange={e => handleSettingsChange("notifications", field, e.target.checked)} />
                  </div>
              ))}
            </div>
          </SectionCard>

          {/* ── Bottom Actions ── */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 text-sm font-semibold text-gray-500 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-all shadow-sm"
            >
              <RotateCcw size={14} />
              Reset to Default
            </button>
            <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm shadow-green-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </div>

        {/* ── Add Classification Modal ── */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Add Classification</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Configure a new pest or disease type</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"><X size={16} /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {uploadedClasses.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">From Uploaded Model</label>
                        <select
                            defaultValue=""
                            onChange={e => e.target.value && setNewClassification(p => ({ ...p, name: e.target.value, description: `Class from uploaded model: ${e.target.value}` }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                        >
                          <option value="">— Select a class —</option>
                          {uploadedClasses.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                        </select>
                        <div className="flex items-center gap-3 my-3"><div className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-400">or enter manually</span><div className="flex-1 h-px bg-gray-100" /></div>
                      </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                    <input type="text" value={newClassification.name} placeholder="e.g., Green Leafhopper"
                           onChange={e => setNewClassification(p => ({ ...p, name: e.target.value }))}
                           className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                      <select value={newClassification.type} onChange={e => setNewClassification(p => ({ ...p, type: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                        <option value="pest">Pest</option>
                        <option value="disease">Disease</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Severity</label>
                      <select value={newClassification.severity} onChange={e => setNewClassification(p => ({ ...p, severity: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                    <textarea rows={2} value={newClassification.description} placeholder="Brief description…"
                              onChange={e => setNewClassification(p => ({ ...p, description: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Detection Threshold <span className="text-green-600 font-bold">{newClassification.detectionThreshold.toFixed(2)}</span>
                    </label>
                    <input type="range" min="0" max="1" step="0.05" value={newClassification.detectionThreshold}
                           onChange={e => setNewClassification(p => ({ ...p, detectionThreshold: parseFloat(e.target.value) }))}
                           className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Percentage Threshold <span className="text-green-600 font-bold">{newClassification.percentageThreshold}%</span>
                    </label>
                    <input type="range" min="1" max="100" step="1" value={newClassification.percentageThreshold}
                           onChange={e => setNewClassification(p => ({ ...p, percentageThreshold: parseInt(e.target.value) }))}
                           className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500"
                    />
                  </div>
                </div>
                <div className="px-6 py-5 border-t border-gray-100 flex gap-2">
                  <button onClick={handleAddNew} disabled={!newClassification.name.trim()}
                          className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40">
                    Add Classification
                  </button>
                  <button onClick={() => setShowAddModal(false)}
                          className="flex-1 bg-gray-100 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* ── Upload Model Modal ── */}
        {showUploadModal && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Upload Model</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Upload a trained model to extract classes</p>
                  </div>
                  <button onClick={() => setShowUploadModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"><X size={16} /></button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {uploadError && (
                      <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700">{uploadError}</span>
                      </div>
                  )}
                  {uploadSuccess && (
                      <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                        <Check size={14} className="text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-700">Classes extracted successfully!</span>
                      </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Model File (.pt)</label>
                    <input type="file" accept=".pt" onChange={handleFileChange} ref={fileInputRef} disabled={isUploading}
                           className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Model Name</label>
                    <input type="text" value={uploadForm.name} placeholder="e.g., Rice Disease Detector v2"
                           onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                           className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                    <textarea rows={2} value={uploadForm.description} placeholder="Brief description of the model…"
                              onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                    />
                  </div>

                  {extractedClasses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Map Extracted Classes</p>
                        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                          {extractedClasses.map(cls => (
                              <div key={cls.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/50">
                                <span className="text-sm font-medium text-gray-700 flex-1">{cls.name}</span>
                                <select
                                    value={cls.selectedId || ""}
                                    onChange={e => setExtractedClasses(p => p.map(c => c.id === cls.id ? { ...c, selectedId: parseInt(e.target.value) } : c))}
                                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                                >
                                  <option value="">Map to…</option>
                                  {filteredClassifications.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                              </div>
                          ))}
                        </div>
                      </div>
                  )}
                </div>

                <div className="px-6 py-5 border-t border-gray-100 flex gap-2">
                  <button onClick={handleModelUpload} disabled={isUploading}
                          className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {isUploading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {isUploading ? 'Uploading…' : 'Upload Model'}
                  </button>
                  <button onClick={() => setShowUploadModal(false)}
                          className="flex-1 bg-gray-100 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}