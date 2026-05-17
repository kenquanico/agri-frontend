import React, { useState, useRef, useEffect } from "react";
import { Check, Plus, Save, RotateCcw, AlertTriangle, Trash2, Edit2, X, ChevronDown, Wifi, Smartphone, Radio } from "lucide-react";
import api from "../api/api";

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

function Section({ title, subtitle, children, action }) {
  return (
      <section className="w-full">
        <div className="flex items-end justify-between gap-4 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight text-[#262626]">{title}</h2>
            {subtitle ? (
                <p className="text-xs font-medium text-[rgba(38,38,38,0.45)] mt-1">{subtitle}</p>
            ) : null}
          </div>
          {action ? <div className="flex-shrink-0">{action}</div> : null}
        </div>
        <div className="h-px w-full bg-[#26262608]" />
        <div className="py-6">{children}</div>
      </section>
  );
}

function Field({ label, hint, children }) {
  return (
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label className="block text-xs font-semibold text-[rgba(38,38,38,0.55)] uppercase tracking-wide">{label}</label>
          {hint && <span className="text-xs text-[rgba(38,38,38,0.4)]">{hint}</span>}
        </div>
        {children}
      </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
      <div className="flex items-center justify-between py-3 border-b border-[#26262608] last:border-0">
        <span className="text-sm font-medium text-[rgba(38,38,38,0.7)]">{label}</span>
        <Toggle checked={checked} onChange={onChange} />
      </div>
  );
}

const SEVERITY = {
  critical: { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    dot: "bg-red-500"    },
  high:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  medium:   { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-400"  },
  low:      { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   dot: "bg-blue-400"   },
};

const DEVICE_TYPES = [
  { value: "phone", label: "Phone / IP Camera", icon: Smartphone, color: "blue" },
  { value: "drone", label: "Drone (WebRTC/WHEP)", icon: Radio, color: "green" },
  { value: "generic", label: "Generic Stream", icon: Wifi, color: "gray" },
];

const DEVICE_TYPE_STYLES = {
  phone:   { badge: "bg-blue-50 text-blue-700 border-blue-100",   icon: "bg-blue-100 text-blue-600"   },
  drone:   { badge: "bg-green-50 text-green-700 border-green-100", icon: "bg-green-100 text-green-600" },
  generic: { badge: "bg-gray-50 text-gray-600 border-gray-200",   icon: "bg-gray-100 text-gray-500"   },
};

export default function Settings() {
  const [classifications, setClassifications] = useState([]);
  const [error, setError]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editingId, setEditingId]   = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSuccess, setUploadSuccess]     = useState(false);
  const [extractedClasses, setExtractedClasses] = useState([]);
  const [uploadedClasses, setUploadedClasses]   = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [models, setModels]           = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError]     = useState(null);
  const [filterType, setFilterType]         = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [hasChanges, setHasChanges]   = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadForm, setUploadForm] = useState({ file: null, name: "", description: "" });
  const [newClassification, setNewClassification] = useState({
    name: "", type: "pest", severity: "medium",
    detectionThreshold: 0.70, percentageThreshold: 10, description: ""
  });
  const [settings, setSettings] = useState({
    detection:     { enabled: true, scanInterval: 5, autoRefresh: true, alertSound: true, detectionThreshold: 0.50 },
    notifications: { email: true, push: false, sms: false },
    general:       { totalCrops: 128, alertCooldown: 300, showConfidenceScore: true },
  });

  // ── Camera Devices state ────────────────────────────────────────────────
  const [devices, setDevices] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cameraDevices") || "[]"); } catch { return []; }
  });
  const [showAddDevice, setShowAddDevice]   = useState(false);
  const [editingDevice, setEditingDevice]   = useState(null);
  const [deviceEditForm, setDeviceEditForm] = useState({});
  const [newDevice, setNewDevice] = useState({ name: "", ip: "", type: "phone", path: "/video", notes: "" });
  const [deviceError, setDeviceError] = useState("");

  useEffect(() => {
    localStorage.setItem("cameraDevices", JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("appSettings") || "null");
      if (saved) {
        setSettings(prev => ({
          ...prev,
          ...saved,
          detection: {
            ...prev.detection,
            ...(saved.detection || {}),
            detectionThreshold: parseFloat(saved.detection?.detectionThreshold ?? prev.detection.detectionThreshold) || 0,
          },
        }));
      }
    } catch (e) {
      console.warn("Failed to load saved settings:", e);
    }
  }, []);

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
      <div className="min-h-screen bg-white">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-4 lg:px-8 xl:px-12 py-2 lg:py-8 flex items-center justify-center font-sans text-[#262626]">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
  );

  if (error) return (
      <div className="min-h-screen bg-white">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-4 lg:px-8 xl:px-12 py-2 lg:py-8 flex items-center justify-center font-sans text-[#262626]">
          <div className="bg-white border border-red-100 p-8 max-w-sm text-center shadow-sm">
            <AlertTriangle size={24} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        </main>
      </div>
  );

  const handleSettingsChange = (cat, field, value) => {
    setSettings(p => ({ ...p, [cat]: { ...p[cat], [field]: value } }));
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      localStorage.setItem("appSettings", JSON.stringify(settings));
      localStorage.setItem("detectionThreshold", String(settings.detection.detectionThreshold));
      localStorage.setItem("classifications", JSON.stringify(classifications));
      localStorage.setItem("cameraDevices", JSON.stringify(devices));
      setHasChanges(false); setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch { alert("Failed to save settings"); }
  };

  const handleReset = () => {
    if (!window.confirm("Reset all settings to default?")) return;
    setClassifications([]);
    setSettings({
      detection:     { enabled: true, scanInterval: 5, autoRefresh: true, alertSound: true, detectionThreshold: 0.50 },
      notifications: { email: true, push: false, sms: false },
      general:       { totalCrops: 128, alertCooldown: 300, showConfidenceScore: true },
    });
    setHasChanges(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this classification?")) return;
    try {
      await api.delete(`/api/classification/${id}`);
      setClassifications(p => p.filter(item => item.id?.id !== id?.id));
    } catch { alert("Failed to delete."); }
  };

  const handleAddNew = async () => {
    if (!newClassification.name.trim()) return;
    try {
      const res = await api.post("/api/classification", {
        ...newClassification,
        detectionThreshold:  parseFloat(newClassification.detectionThreshold),
        percentageThreshold: parseFloat(newClassification.percentageThreshold),
      });
      setClassifications(p => [...p, res.data]);
      setShowAddModal(false);
      setNewClassification({ name: "", type: "pest", severity: "medium", detectionThreshold: 0.70, percentageThreshold: 10, description: "" });
    } catch { alert("Failed to add classification."); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file?.name.endsWith('.pt')) { setUploadError('Select a valid .pt file'); return; }
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
    if (!uploadForm.file)              return setUploadError("Select a model file");
    if (!uploadForm.name.trim())       return setUploadError("Enter a model name");
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
      setUploadError(err.response?.data?.message || "Upload failed");
    } finally { setIsUploading(false); }
  };

  // ── Device handlers ─────────────────────────────────────────────────────
  const validateDevice = (d) => {
    if (!d.name.trim())  return "Device name is required.";
    if (!d.ip.trim())    return "IP address or URL is required.";
    return "";
  };

  const handleAddDevice = () => {
    const err = validateDevice(newDevice);
    if (err) { setDeviceError(err); return; }
    const device = { ...newDevice, id: Date.now().toString() };
    setDevices(p => [...p, device]);
    setNewDevice({ name: "", ip: "", type: "phone", path: "/video", notes: "" });
    setShowAddDevice(false);
    setDeviceError("");
    setHasChanges(true);
  };

  const handleSaveDevice = (id) => {
    const err = validateDevice(deviceEditForm);
    if (err) { setDeviceError(err); return; }
    setDevices(p => p.map(d => d.id === id ? { ...deviceEditForm } : d));
    setEditingDevice(null);
    setDeviceEditForm({});
    setDeviceError("");
    setHasChanges(true);
  };

  const handleDeleteDevice = (id) => {
    if (!window.confirm("Delete this device?")) return;
    setDevices(p => p.filter(d => d.id !== id));
    setHasChanges(true);
  };

  const getDeviceStreamUrl = (device) => {
    if (device.type === "drone") return device.ip;
    return `http://${device.ip}${device.path || "/video"}`;
  };

  const filteredClassifications = Array.isArray(classifications)
      ? classifications.filter(item =>
          (filterType     === "all" || item.type     === filterType) &&
          (filterSeverity === "all" || item.severity === filterSeverity)
      )
      : [];

  const getAlarmInfo = (c) => {
    const pct = c.percentageThreshold > 1 ? c.percentageThreshold : c.percentageThreshold * 100;
    return { percentage: pct, affected: Math.ceil((pct / 100) * settings.general.totalCrops), total: settings.general.totalCrops };
  };

  const inputCls =
      "w-full border border-[#26262610] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all";
  const selectCls =
      "w-full border border-[#26262610] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white";

  const Chip = ({ active, onClick, children }) => (
      <button
          onClick={onClick}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active
                  ? "bg-[#262626] text-white"
                  : "bg-white text-[rgba(38,38,38,0.55)] border border-[#26262610] hover:text-[#262626] hover:bg-[#26262604]"
          }`}
      >
        {children}
      </button>
  );

  return (
      <div className="min-h-screen bg-white">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-4 lg:px-8 xl:px-12 py-2 lg:py-8 flex flex-col gap-10 font-sans text-[#262626]">
          <div className="max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Configuration</p>
                <h1 className="text-3xl font-bold text-[#262626] tracking-tight">Settings</h1>
                <p className="text-sm text-[rgba(38,38,38,0.45)] mt-0.5">Manage detection, notifications, devices, and models</p>
              </div>

              <div className="flex items-center gap-2">
                {saveSuccess && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                  <Check size={13} /> Saved
                </span>
                )}
                <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#26262610] text-sm font-semibold text-[rgba(38,38,38,0.65)] rounded-xl hover:bg-[#26262604] transition-all"
                >
                  <RotateCcw size={13} /> Reset
                </button>
                <button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={13} /> Save Changes
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-10">

              {/* ── General ── */}
              <Section title="General">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Field label="Total Crops">
                    <input type="number" min="1" value={settings.general.totalCrops}
                           onChange={e => handleSettingsChange("general", "totalCrops", parseInt(e.target.value) || 1)}
                           className={inputCls} />
                  </Field>
                  <Field label="Alert Cooldown" hint="seconds">
                    <input type="number" min="0" value={settings.general.alertCooldown}
                           onChange={e => handleSettingsChange("general", "alertCooldown", parseInt(e.target.value) || 0)}
                           className={inputCls} />
                  </Field>
                  <ToggleRow label="Show Confidence Score"
                             checked={settings.general.showConfidenceScore}
                             onChange={e => handleSettingsChange("general", "showConfidenceScore", e.target.checked)} />
                </div>
              </Section>

              {/* ── Detection ── */}
              <Section title="Detection">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                  <div>
                    {[
                      { label: "Enable Detection",  field: "enabled"     },
                      { label: "Auto Refresh",       field: "autoRefresh" },
                      { label: "Alert Sound",        field: "alertSound"  },
                    ].map(({ label, field }) => (
                        <ToggleRow key={field} label={label}
                                   checked={settings.detection[field]}
                                   onChange={e => handleSettingsChange("detection", field, e.target.checked)} />
                    ))}
                  </div>
                  <div className="space-y-6">
                    <Field label="Scan Interval" hint="seconds">
                      <input type="number" min="1" max="60" value={settings.detection.scanInterval}
                             onChange={e => handleSettingsChange("detection", "scanInterval", parseInt(e.target.value) || 1)}
                             className={inputCls} />
                    </Field>

                    <Field
                        label="Detection Threshold"
                        hint={
                          <span className="font-bold text-green-600">
                        {settings.detection.detectionThreshold.toFixed(2)}
                            {" "}
                            <span className="text-gray-400 font-normal">
                          ({Math.round(settings.detection.detectionThreshold * 100)}% min confidence)
                        </span>
                      </span>
                        }
                    >
                      <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={settings.detection.detectionThreshold}
                          onChange={e =>
                              handleSettingsChange("detection", "detectionThreshold", parseFloat(e.target.value))
                          }
                          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500"
                      />
                      <div className="flex justify-between text-[10px] text-gray-300 mt-1">
                        <span>0.00 — accept all</span>
                        <span>1.00 — max precision</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                        Detections below this confidence score will be hidden in Field Monitoring and excluded from the alarm log.
                        {settings.detection.detectionThreshold === 0 && (
                            <span className="ml-1 text-amber-500 font-semibold">All detections shown (no filter).</span>
                        )}
                      </p>
                    </Field>
                  </div>
                </div>
              </Section>

              {/* ── Notifications ── */}
              <Section title="Notifications">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10">
                  {[
                    { label: "Email", field: "email" },
                    { label: "Push",  field: "push"  },
                    { label: "SMS",   field: "sms"   },
                  ].map(({ label, field }) => (
                      <ToggleRow key={field} label={label}
                                 checked={settings.notifications[field]}
                                 onChange={e => handleSettingsChange("notifications", field, e.target.checked)} />
                  ))}
                </div>
              </Section>

              {/* ── Camera Devices ── */}
              <Section
                  title="Camera Devices"
                  subtitle="Configure cameras and streaming devices used in Field Monitoring."
                  action={
                    <button
                        onClick={() => { setShowAddDevice(true); setDeviceError(""); }}
                        className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-green-700 transition-colors"
                    >
                      <Plus size={13} /> Add Device
                    </button>
                  }
              >
                {devices.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Wifi size={20} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-400">No devices configured</p>
                      <p className="text-xs text-gray-300 mt-1">Add a phone IP camera or drone WHEP endpoint to get started</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#26262608]">
                      {devices.map(device => {
                        const isEditingThis = editingDevice === device.id;
                        const cur = isEditingThis ? deviceEditForm : device;
                        const typeInfo = DEVICE_TYPES.find(t => t.value === cur.type) || DEVICE_TYPES[2];
                        const styles = DEVICE_TYPE_STYLES[cur.type] || DEVICE_TYPE_STYLES.generic;
                        const IconComp = typeInfo.icon;
                        const streamUrl = getDeviceStreamUrl(cur);

                        return (
                            <div key={device.id} className="py-5">
                              {isEditingThis ? (
                                  <div className="space-y-4">
                                    {deviceError && (
                                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-700">
                                          <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                                          {deviceError}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                      <Field label="Device Name">
                                        <input type="text" value={cur.name}
                                               onChange={e => setDeviceEditForm(p => ({ ...p, name: e.target.value }))}
                                               placeholder="e.g., Backfield Drone"
                                               className={inputCls} />
                                      </Field>
                                      <Field label="Type">
                                        <select value={cur.type}
                                                onChange={e => setDeviceEditForm(p => ({ ...p, type: e.target.value }))}
                                                className={selectCls}>
                                          {DEVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                      </Field>
                                    </div>
                                    <Field label={cur.type === "drone" ? "WHEP URL" : "IP Address"}>
                                      <input type="text" value={cur.ip}
                                             onChange={e => setDeviceEditForm(p => ({ ...p, ip: e.target.value }))}
                                             placeholder={cur.type === "drone" ? "http://192.168.1.97:8889/drone/whep" : "192.168.1.102:8080"}
                                             className={inputCls} />
                                    </Field>
                                    {cur.type !== "drone" && (
                                        <Field label="Stream Path" hint="appended after IP">
                                          <input type="text" value={cur.path || ""}
                                                 onChange={e => setDeviceEditForm(p => ({ ...p, path: e.target.value }))}
                                                 placeholder="/video"
                                                 className={inputCls} />
                                        </Field>
                                    )}
                                    <Field label="Notes">
                                      <input type="text" value={cur.notes || ""}
                                             onChange={e => setDeviceEditForm(p => ({ ...p, notes: e.target.value }))}
                                             placeholder="Optional description"
                                             className={inputCls} />
                                    </Field>
                                    <div className="flex gap-2 pt-1">
                                      <button onClick={() => handleSaveDevice(device.id)}
                                              className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
                                        <Check size={12} /> Save
                                      </button>
                                      <button onClick={() => { setEditingDevice(null); setDeviceEditForm({}); setDeviceError(""); }}
                                              className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors">
                                        <X size={12} /> Cancel
                                      </button>
                                    </div>
                                  </div>
                              ) : (
                                  <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
                                      <IconComp size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-bold text-[#262626]">{device.name}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${styles.badge}`}>
                                  {typeInfo.label.split(" ")[0]}
                                </span>
                                      </div>
                                      <p className="text-xs font-mono text-[rgba(38,38,38,0.6)] truncate">{streamUrl}</p>
                                      {device.notes && <p className="text-xs text-[rgba(38,38,38,0.45)] mt-1">{device.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <button
                                          onClick={() => { setEditingDevice(device.id); setDeviceEditForm({ ...device }); setDeviceError(""); }}
                                          className="p-2 text-[rgba(38,38,38,0.35)] hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                          onClick={() => handleDeleteDevice(device.id)}
                                          className="p-2 text-[rgba(38,38,38,0.35)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                              )}
                            </div>
                        );
                      })}
                    </div>
                )}

                {showAddDevice && (
                    <div className="mt-6 pt-6 border-t border-[#26262608] space-y-4">
                      <p className="text-xs font-bold text-green-700 uppercase tracking-wider">New Device</p>
                      {deviceError && (
                          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 text-xs text-red-700">
                            <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
                            {deviceError}
                          </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Device Name">
                          <input type="text" value={newDevice.name}
                                 onChange={e => setNewDevice(p => ({ ...p, name: e.target.value }))}
                                 placeholder="e.g., South Field Drone"
                                 className={inputCls} />
                        </Field>
                        <Field label="Type">
                          <select value={newDevice.type}
                                  onChange={e => setNewDevice(p => ({ ...p, type: e.target.value }))}
                                  className={selectCls}>
                            {DEVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </Field>
                      </div>
                      <Field label={newDevice.type === "drone" ? "WHEP URL" : "IP Address"}>
                        <input type="text" value={newDevice.ip}
                               onChange={e => setNewDevice(p => ({ ...p, ip: e.target.value }))}
                               placeholder={newDevice.type === "drone" ? "http://192.168.1.97:8889/drone/whep" : "192.168.1.102:8080"}
                               className={inputCls} />
                      </Field>
                      {newDevice.type !== "drone" && (
                          <Field label="Stream Path" hint="appended after IP">
                            <input type="text" value={newDevice.path}
                                   onChange={e => setNewDevice(p => ({ ...p, path: e.target.value }))}
                                   placeholder="/video"
                                   className={inputCls} />
                          </Field>
                      )}
                      <Field label="Notes">
                        <input type="text" value={newDevice.notes}
                               onChange={e => setNewDevice(p => ({ ...p, notes: e.target.value }))}
                               placeholder="Optional description"
                               className={inputCls} />
                      </Field>
                      <div className="flex gap-2">
                        <button onClick={handleAddDevice}
                                className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors">
                          <Plus size={12} /> Add Device
                        </button>
                        <button onClick={() => { setShowAddDevice(false); setDeviceError(""); setNewDevice({ name: "", ip: "", type: "phone", path: "/video", notes: "" }); }}
                                className="flex items-center gap-1.5 bg-white text-gray-600 text-xs font-semibold px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                )}
              </Section>

              {/* ── Models ── */}
              <Section
                  title="Models"
                  action={
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-1.5 bg-[#262626] text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-[#1f1f1f] transition-colors"
                    >
                      <Plus size={13} /> Upload Model
                    </button>
                  }
              >
                <div className="w-full">
                  {modelsLoading ? (
                      <div className="py-10 flex justify-center">
                        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                  ) : modelsError ? (
                      <p className="text-sm text-red-500 text-center py-8">{modelsError}</p>
                  ) : models.length === 0 ? (
                      <div className="py-12 text-center text-sm text-gray-300 font-medium">No models uploaded</div>
                  ) : (
                      <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-gray-100">
                          {["Name", "Description", "Created", "Updated"].map(col => (
                              <th key={col} className="pb-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pr-4">{col}</th>
                          ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                        {models.map(m => (
                            <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="py-3.5 font-semibold text-gray-900 pr-4">{m.name}</td>
                              <td className="py-3.5 text-gray-400 pr-4">{m.description || <span className="text-gray-200">—</span>}</td>
                              <td className="py-3.5 text-gray-400 whitespace-nowrap pr-4">{new Date(m.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                              <td className="py-3.5 text-gray-400 whitespace-nowrap">{new Date(m.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                  )}
                </div>
              </Section>

              {/* ── Classifications ── */}
              <Section
                  title="Classifications"
                  action={
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1.5 bg-green-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-green-700 transition-colors"
                    >
                      <Plus size={13} /> Add Classification
                    </button>
                  }
              >
                {/* Filters */}
                <div className="flex items-center gap-6 mb-5 pb-5 border-b border-[#26262608]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide mr-1">Type</span>
                    {["all", "pest", "disease"].map(t => (
                        <Chip key={t} active={filterType === t} onClick={() => setFilterType(t)}>
                          {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                        </Chip>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide mr-1">Severity</span>
                    {["all", "critical", "high", "medium", "low"].map(s => (
                        <Chip key={s} active={filterSeverity === s} onClick={() => setFilterSeverity(s)}>
                          {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </Chip>
                    ))}
                  </div>
                </div>

                {/* Classification list */}
                <div className="divide-y divide-[#26262608]">
                  {filteredClassifications.length === 0 ? (
                      <div className="py-14 text-center text-sm text-[rgba(38,38,38,0.35)] font-medium">
                        No classifications match filters
                      </div>
                  ) : (
                      filteredClassifications.map(classification => {
                        const isEditing = editingId === classification.id;
                        const current = isEditing ? editForm : classification;
                        const sev = SEVERITY[current.severity] || SEVERITY.medium;
                        const alarm = getAlarmInfo(current);

                        return (
                            <div key={classification.id} className="py-5">

                              {/* Top row: name + badges + actions */}
                              <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1 min-w-0">
                                  {isEditing ? (
                                      <input
                                          type="text"
                                          value={current.name || ""}
                                          onChange={e => setEditForm({ ...current, name: e.target.value })}
                                          className="text-sm font-bold text-gray-900 border-b-2 border-green-500 focus:outline-none w-full bg-transparent mb-2"
                                      />
                                  ) : (
                                      <h3 className="text-sm font-bold text-gray-900 mb-2">{current.name}</h3>
                                  )}
                                  <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${sev.bg} ${sev.text} ${sev.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                                {current.severity}
                              </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                                        current.type === "pest"
                                            ? "bg-purple-50 text-purple-700 border-purple-100"
                                            : "bg-amber-50 text-amber-700 border-amber-100"
                                    }`}>{current.type}</span>
                                  </div>
                                  {isEditing ? (
                                      <textarea
                                          value={current.description}
                                          rows={2}
                                          onChange={e => setEditForm({ ...current, description: e.target.value })}
                                          className="mt-2 w-full text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                                      />
                                  ) : current.description ? (
                                      <p className="text-sm text-gray-400 mt-2 leading-relaxed">{current.description}</p>
                                  ) : null}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                  {isEditing ? (
                                      <>
                                        <button
                                            onClick={() => {
                                              setClassifications(p => p.map(item => item.id === editingId ? { ...editForm } : item));
                                              setEditingId(null); setEditForm({}); setHasChanges(true);
                                            }}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                                        >
                                          <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => { setEditingId(null); setEditForm({}); }}
                                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      </>
                                  ) : (
                                      <>
                                        <button
                                            onClick={() => { setEditingId(classification.id); setEditForm({ ...classification }); }}
                                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(classification.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </>
                                  )}
                                </div>
                              </div>

                              {/* Thresholds */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-[#26262608]">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detection Threshold</span>
                                    <span className="text-xs font-bold text-green-600">{(current.detectionThreshold ?? 0).toFixed(2)}</span>
                                  </div>
                                  <input
                                      type="range" min="0" max="1" step="0.05"
                                      value={current.detectionThreshold ?? 0}
                                      onChange={e => {
                                        const v = parseFloat(e.target.value);
                                        isEditing
                                            ? setEditForm({ ...current, detectionThreshold: v })
                                            : (setClassifications(p => p.map(i => i.id === classification.id ? { ...i, detectionThreshold: v } : i)), setHasChanges(true));
                                      }}
                                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500"
                                  />
                                  <div className="flex justify-between text-[10px] text-gray-300 mt-1"><span>0.0</span><span>1.0</span></div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Crop Threshold</span>
                                    <span className="text-xs font-bold text-green-600">
                                {current.percentageThreshold > 1 ? current.percentageThreshold : current.percentageThreshold * 100}%
                              </span>
                                  </div>
                                  <input
                                      type="range" min="1" max="100" step="1"
                                      value={current.percentageThreshold > 1 ? current.percentageThreshold : current.percentageThreshold * 100}
                                      onChange={e => {
                                        const v = parseInt(e.target.value);
                                        isEditing
                                            ? setEditForm({ ...current, percentageThreshold: v })
                                            : (setClassifications(p => p.map(i => i.id === classification.id ? { ...i, percentageThreshold: v } : i)), setHasChanges(true));
                                      }}
                                      className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500"
                                  />
                                  <div className="flex justify-between text-[10px] text-gray-300 mt-1"><span>1%</span><span>100%</span></div>
                                </div>

                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Severity</label>
                                  <select
                                      value={current.severity}
                                      onChange={e => {
                                        const v = e.target.value;
                                        isEditing
                                            ? setEditForm({ ...current, severity: v })
                                            : (setClassifications(p => p.map(i => i.id === classification.id ? { ...i, severity: v } : i)), setHasChanges(true));
                                      }}
                                      className={selectCls}
                                  >
                                    {["critical", "high", "medium", "low"].map(s => (
                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Alarm info badge */}
                              <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 text-xs text-amber-800">
                                <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                                Triggers at <strong className="mx-0.5">{alarm.affected}+ crops</strong> ({alarm.percentage}% of {alarm.total})
                              </div>

                            </div>
                        );
                      })
                  )}
                </div>
              </Section>

            </div>
          </div>

          <div className="h-8" />
        </main>

        {/* ── Add Classification Modal ── */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Add Classification</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"><X size={15} /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {uploadedClasses.length > 0 && (
                      <>
                        <Field label="From Model">
                          <select defaultValue=""
                                  onChange={e => e.target.value && setNewClassification(p => ({ ...p, name: e.target.value, description: "" }))}
                                  className={selectCls}>
                            <option value="">Select a class</option>
                            {uploadedClasses.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
                          </select>
                        </Field>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-xs text-gray-400">or</span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                      </>
                  )}
                  <Field label="Name">
                    <input type="text" value={newClassification.name} placeholder="e.g., Green Leafhopper"
                           onChange={e => setNewClassification(p => ({ ...p, name: e.target.value }))}
                           className={inputCls} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Type">
                      <select value={newClassification.type} onChange={e => setNewClassification(p => ({ ...p, type: e.target.value }))} className={selectCls}>
                        <option value="pest">Pest</option>
                        <option value="disease">Disease</option>
                      </select>
                    </Field>
                    <Field label="Severity">
                      <select value={newClassification.severity} onChange={e => setNewClassification(p => ({ ...p, severity: e.target.value }))} className={selectCls}>
                        {["critical", "high", "medium", "low"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Description">
                <textarea rows={2} value={newClassification.description} placeholder="Optional description"
                          onChange={e => setNewClassification(p => ({ ...p, description: e.target.value }))}
                          className={`${inputCls} resize-none`} />
                  </Field>
                  <Field label="Detection Threshold" hint={newClassification.detectionThreshold.toFixed(2)}>
                    <input type="range" min="0" max="1" step="0.05" value={newClassification.detectionThreshold}
                           onChange={e => setNewClassification(p => ({ ...p, detectionThreshold: parseFloat(e.target.value) }))}
                           className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500" />
                  </Field>
                  <Field label="Crop Threshold" hint={`${newClassification.percentageThreshold}%`}>
                    <input type="range" min="1" max="100" step="1" value={newClassification.percentageThreshold}
                           onChange={e => setNewClassification(p => ({ ...p, percentageThreshold: parseInt(e.target.value) }))}
                           className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-green-500" />
                  </Field>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                  <button onClick={handleAddNew} disabled={!newClassification.name.trim()}
                          className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition-all disabled:opacity-40">
                    Add
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
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Upload Model</h3>
                  <button onClick={() => setShowUploadModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"><X size={15} /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {uploadError && (
                      <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700">{uploadError}</span>
                      </div>
                  )}
                  {uploadSuccess && (
                      <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                        <Check size={13} className="text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-700">{extractedClasses.length} classes extracted</span>
                      </div>
                  )}
                  <Field label="Model File (.pt)">
                    <input type="file" accept=".pt" onChange={handleFileChange} ref={fileInputRef} disabled={isUploading}
                           className={inputCls} />
                  </Field>
                  <Field label="Model Name">
                    <input type="text" value={uploadForm.name} placeholder="e.g., Rice Disease Detector v2"
                           onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                           className={inputCls} />
                  </Field>
                  <Field label="Description">
                <textarea rows={2} value={uploadForm.description} placeholder="Optional"
                          onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                          className={`${inputCls} resize-none`} />
                  </Field>
                  {extractedClasses.length > 0 && (
                      <Field label="Map Classes">
                        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                          {extractedClasses.map(cls => (
                              <div key={cls.id} className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/50">
                                <span className="text-sm font-medium text-gray-700 flex-1">{cls.name}</span>
                                <select
                                    value={cls.selectedId || ""}
                                    onChange={e => setExtractedClasses(p => p.map(c => c.id === cls.id ? { ...c, selectedId: parseInt(e.target.value) } : c))}
                                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 w-36 focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                                >
                                  <option value="">Map to…</option>
                                  {filteredClassifications.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                              </div>
                          ))}
                        </div>
                      </Field>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                  <button onClick={handleModelUpload} disabled={isUploading}
                          className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {isUploading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {isUploading ? "Uploading…" : "Upload"}
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