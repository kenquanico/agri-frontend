import { useState, useEffect, useRef, useCallback } from "react";
import {
    MapPin, List, RefreshCw, Download, AlertCircle,
    Layers, Activity, Filter, X, Loader2, Globe,
    Navigation, ShieldAlert, Microscope, Wheat,
    TrendingUp, Clock, Users, FileText, Zap, Search
} from "lucide-react";
import api from "../api/api";

// ─── AgriVision Detection Classes (16 classes per study) ──────────────────────

const DETECTION_CLASSES = {
    // Diseases
    "Bacterial Blight":       { type: "Disease", severity_default: "high" },
    "Bacterial Leaf Streak":  { type: "Disease", severity_default: "medium" },
    "Rice Blast":             { type: "Disease", severity_default: "critical" },
    "Brown Spot":             { type: "Disease", severity_default: "medium" },
    "Downy Mildew":           { type: "Disease", severity_default: "medium" },
    "False Smut":             { type: "Disease", severity_default: "high" },
    "Sheath Blight":          { type: "Disease", severity_default: "high" },
    "Tungro Virus Disease":   { type: "Disease", severity_default: "critical" },
    // Pests
    "Brown Planthopper":      { type: "Pest", severity_default: "critical" },
    "Dead Heart Damage":      { type: "Pest", severity_default: "high" },
    "Green Leafhopper":       { type: "Pest", severity_default: "high" },
    "Leaf Folder Damage":     { type: "Pest", severity_default: "medium" },
    "Rice Bug Infestation":   { type: "Pest", severity_default: "medium" },
    "Stem Borer Damage":      { type: "Pest", severity_default: "critical" },
    "Whorl Maggot Damage":    { type: "Pest", severity_default: "low" },
    // Healthy
    "Normal (Healthy)":       { type: "Healthy", severity_default: "low" },
};

// ─── Severity system aligned to BPI/PhilRice thresholds ───────────────────────

const SEVERITY = {
    critical: { label: "Critical",  color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", weight: 4, icon: "🔴", bpi: "Immediate intervention required" },
    high:     { label: "High",      color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", weight: 3, icon: "🟠", bpi: "Monitor closely, prepare treatment" },
    medium:   { label: "Moderate",  color: "#ca8a04", bg: "#fefce8", border: "#fde047", weight: 2, icon: "🟡", bpi: "Schedule treatment within 48h" },
    low:      { label: "Low",       color: "#16a34a", bg: "#f0fdf4", border: "#86efac", weight: 1, icon: "🟢", bpi: "Routine monitoring sufficient" },
};

const TYPE_STYLE = {
    Disease: { color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", icon: "🦠" },
    Pest:    { color: "#92400e", bg: "#fffbeb", border: "#fcd34d", icon: "🌾" },
    Healthy: { color: "#166534", bg: "#f0fdf4", border: "#86efac", icon: "✅" },
};

const PAGE_SIZE = 12;
const REFRESH_INTERVAL = 30000;

const GMAPS_KEY = "AIzaSyADSk5tfCqpILsD-2T54z4OtE5iNKY1Udw";

const CLEAN_MAP_STYLE = [
    { featureType: "poi",       elementType: "labels",        stylers: [{ visibility: "off" }] },
    { featureType: "transit",                                  stylers: [{ visibility: "off" }] },
    { featureType: "road",      elementType: "geometry",       stylers: [{ color: "#f0f0e8" }] },
    { featureType: "road",      elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
    { featureType: "water",     elementType: "geometry",       stylers: [{ color: "#c8dff0" }] },
    { featureType: "landscape", elementType: "geometry",       stylers: [{ color: "#edf4e8" }] },
    { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#e8ede0" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#b0c4a0", weight: 1 }] },
    { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#4b6b3a", weight: 1 }] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sev   = (raw) => SEVERITY[String(raw ?? "low").toLowerCase()] ?? SEVERITY.low;
const tStyle = (t)  => TYPE_STYLE[t] ?? TYPE_STYLE.Pest;

const formatDateTime = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("en-PH", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
};

const formatTimeAgo = (ts) => {
    if (!ts) return "—";
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return "just now";
    if (m < 60)  return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
};

// ─── GPS Hook ─────────────────────────────────────────────────────────────────

function useGPS() {
    const [gps,       setGps]       = useState(null);
    const [gpsStatus, setGpsStatus] = useState("idle");
    const watchRef = useRef(null);

    const acquire = useCallback(() => {
        if (!navigator.geolocation) { setGpsStatus("unavailable"); return; }
        setGpsStatus("acquiring");
        navigator.geolocation.getCurrentPosition(
            (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); setGpsStatus("ok"); },
            (e) => setGpsStatus(e.code === 1 ? "denied" : "unavailable"),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = navigator.geolocation.watchPosition(
            (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); setGpsStatus("ok"); },
            () => {},
            { enableHighAccuracy: true, maximumAge: 30000 }
        );
    }, []);

    useEffect(() => {
        acquire();
        return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
    }, [acquire]);

    return { gps, gpsStatus, reacquire: acquire };
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
    pill: (color, bg, border) => ({
        display: "inline-flex", alignItems: "center", gap: 3,
        fontSize: 10, fontWeight: 700, padding: "2px 7px",
        borderRadius: 100, color, background: bg,
        border: `1px solid ${border}`, whiteSpace: "nowrap", letterSpacing: "0.02em",
    }),
    card: {
        background: "white", border: "1px solid #e5e7eb",
        borderRadius: 12, padding: "16px 18px",
    },
    select: {
        fontSize: 12, fontWeight: 500, color: "#374151",
        border: "1px solid #d1d5db", borderRadius: 8,
        padding: "6px 10px", background: "white", outline: "none",
        cursor: "pointer", height: 32,
    },
    btnOutline: {
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 12, fontWeight: 600, color: "#374151",
        background: "white", border: "1px solid #d1d5db",
        borderRadius: 8, padding: "6px 12px", cursor: "pointer",
    },
};

// ─── GPS Banner ───────────────────────────────────────────────────────────────

function GPSBanner({ gpsStatus, gps, onReacquire }) {
    const base = {
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 500,
        marginBottom: 16,
    };
    if (gpsStatus === "ok") return (
        <div style={{ ...base, background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d" }}>
            <Navigation size={13} />
            <span>
                GPS active — your location: {Number(gps.lat).toFixed(5)}, {Number(gps.lng).toFixed(5)}
                {gps.accuracy && <span style={{ opacity: 0.6, marginLeft: 6 }}>±{Math.round(gps.accuracy)}m</span>}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.7 }}>Detections you submit will be geo-tagged automatically</span>
        </div>
    );
    if (gpsStatus === "acquiring") return (
        <div style={{ ...base, background: "#fefce8", border: "1px solid #fde047", color: "#854d0e" }}>
            <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
            Acquiring GPS location for geo-tagged alarm logging…
        </div>
    );
    if (gpsStatus === "denied") return (
        <div style={{ ...base, flexWrap: "wrap", background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626" }}>
            <AlertCircle size={13} />
            <span style={{ flex: 1 }}>Location permission denied — GPS coordinates will not be saved with detections</span>
            <button onClick={onReacquire} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "white", color: "#dc2626", cursor: "pointer" }}>
                Try again
            </button>
        </div>
    );
    if (gpsStatus === "unavailable") return (
        <div style={{ ...base, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#6b7280" }}>
            <Navigation size={13} style={{ opacity: 0.4 }} />
            GPS not available — detections will use field coordinates as fallback per system design
        </div>
    );
    return null;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }) {
    return (
        <div style={{ ...S.card, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: accent }}>{icon}</span>
            </div>
            <div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6b7280", fontWeight: 500 }}>{label}</p>
                {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9ca3af" }}>{sub}</p>}
            </div>
        </div>
    );
}

// ─── Live Ticker — recent critical/high alarms ────────────────────────────────

function LiveTicker({ detections }) {
    const [idx, setIdx] = useState(0);
    const urgent = detections.filter(d => d.severity === "critical" || d.severity === "high").slice(0, 10);

    useEffect(() => {
        if (!urgent.length) return;
        const t = setInterval(() => setIdx(i => (i + 1) % urgent.length), 4000);
        return () => clearInterval(t);
    }, [urgent.length]);

    if (!urgent.length) return null;
    const d = urgent[idx];
    const s = sev(d.severity);

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#fef2f2", border: "1px solid #fca5a5",
            borderRadius: 10, padding: "8px 14px", marginBottom: 16,
            fontSize: 12,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#dc2626", fontWeight: 700, flexShrink: 0 }}>
                <Zap size={13} />
                LIVE ALARM
            </div>
            <div style={{ width: 1, height: 14, background: "#fca5a5", flexShrink: 0 }} />
            <span style={{ color: s.color, fontWeight: 700 }}>[{s.label.toUpperCase()}]</span>
            <span style={{ color: "#374151", fontWeight: 600 }}>{d.name}</span>
            <span style={{ color: "#6b7280" }}>—</span>
            <span style={{ color: "#374151" }}>{d.zone || d.location || "Unknown Zone"}</span>
            {d.municipality && <span style={{ color: "#6b7280" }}>, {d.municipality}</span>}
            <span style={{ marginLeft: "auto", color: "#9ca3af", flexShrink: 0 }}>{formatTimeAgo(d.timestamp)}</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{idx + 1}/{urgent.length}</span>
        </div>
    );
}

// ─── Outbreak Risk Summary — aligned to PhilRice/BPI response tiers ──────────

function OutbreakRiskPanel({ detections, zones }) {
    const critical = detections.filter(d => d.severity === "critical").length;
    const high     = detections.filter(d => d.severity === "high").length;
    const total    = detections.length;
    const riskPct  = total > 0 ? Math.round(((critical * 2 + high) / (total * 2)) * 100) : 0;

    const riskLevel =
        riskPct >= 60 ? { label: "Severe Outbreak Risk",  color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", action: "Deploy BPI rapid response team. Coordinate with municipal AEWs immediately." } :
            riskPct >= 35 ? { label: "Elevated Outbreak Risk", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", action: "Alert Municipal Agricultural Officers. Prepare pesticide logistics." } :
                riskPct >= 15 ? { label: "Moderate Watch",         color: "#ca8a04", bg: "#fefce8", border: "#fde047", action: "Schedule AEW field visits within 48 hours. Monitor spread vectors." } :
                    { label: "Normal — Routine Watch", color: "#16a34a", bg: "#f0fdf4", border: "#86efac", action: "Continue standard PhilRice monitoring protocol." };

    // Top affected classes
    const classCounts = {};
    detections.forEach(d => { classCounts[d.name] = (classCounts[d.name] || 0) + 1; });
    const topClasses = Object.entries(classCounts).sort((a,b) => b[1]-a[1]).slice(0,4);

    return (
        <div style={{ ...S.card, border: `1px solid ${riskLevel.border}`, background: riskLevel.bg, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <ShieldAlert size={16} style={{ color: riskLevel.color }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: riskLevel.color }}>Regional Outbreak Risk Assessment</span>
                        <span style={{ ...S.pill(riskLevel.color, "white", riskLevel.border) }}>{riskLevel.label}</span>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#374151" }}>
                        <strong>Recommended Action (BPI Protocol):</strong> {riskLevel.action}
                    </p>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6b7280" }}>
                        <span>🔴 {critical} critical</span>
                        <span>🟠 {high} high</span>
                        <span>📍 {zones.length} zones affected</span>
                        <span>🌾 {detections.filter(d=>d.type==="Pest").length} pest detections</span>
                        <span>🦠 {detections.filter(d=>d.type==="Disease").length} disease detections</span>
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: riskLevel.color, lineHeight: 1 }}>{riskPct}%</p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6b7280" }}>risk index</p>
                </div>
            </div>
            {topClasses.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${riskLevel.border}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, alignSelf: "center" }}>Top threats:</span>
                    {topClasses.map(([name, count]) => {
                        const cls = DETECTION_CLASSES[name] || { type: "Pest" };
                        const ts = tStyle(cls.type);
                        return (
                            <span key={name} style={{ ...S.pill(ts.color, ts.bg, ts.border), fontSize: 11 }}>
                                {ts.icon} {name} ({count})
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filters, onChange, showDate = false }) {
    return (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select value={filters.severity} onChange={e => onChange({ ...filters, severity: e.target.value })} style={S.select}>
                <option value="">All Severities</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Moderate</option>
                <option value="low">🟢 Low</option>
            </select>
            <select value={filters.type} onChange={e => onChange({ ...filters, type: e.target.value })} style={S.select}>
                <option value="">All Types</option>
                <option value="Pest">🌾 Pest</option>
                <option value="Disease">🦠 Disease</option>
            </select>
            <select value={filters.classFilter || ""} onChange={e => onChange({ ...filters, classFilter: e.target.value })} style={{ ...S.select, maxWidth: 200 }}>
                <option value="">All 16 Classes</option>
                {Object.keys(DETECTION_CLASSES).map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>
            <input
                value={filters.search}
                onChange={e => onChange({ ...filters, search: e.target.value })}
                placeholder="Search zone, municipality…"
                style={{ ...S.select, minWidth: 180, flex: 1 }}
            />
            {showDate && (
                <>
                    <input type="date" value={filters.dateFrom || ""} onChange={e => onChange({ ...filters, dateFrom: e.target.value })} style={{ ...S.select }} />
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>to</span>
                    <input type="date" value={filters.dateTo || ""} onChange={e => onChange({ ...filters, dateTo: e.target.value })} style={{ ...S.select }} />
                </>
            )}
            {(filters.severity || filters.type || filters.search || filters.classFilter || filters.dateFrom || filters.dateTo) && (
                <button onClick={() => onChange({ severity: "", type: "", search: "", classFilter: "", dateFrom: "", dateTo: "" })}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                    <X size={12} /> Clear
                </button>
            )}
        </div>
    );
}

// ─── Places Search Box (Google Maps Autocomplete) ─────────────────────────────

function PlacesSearchBox({ mapInstance, mapsLoaded }) {
    const inputRef        = useRef(null);
    const autocompleteRef = useRef(null);
    const markerRef       = useRef(null);
    const [inputValue, setInputValue] = useState("");

    useEffect(() => {
        if (!mapsLoaded || !inputRef.current || !window.google?.maps?.places) return;
        if (autocompleteRef.current) return; // already initialised

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
            // bias toward the Philippines / Western Visayas region
            bounds: new window.google.maps.LatLngBounds(
                { lat: 9.5,  lng: 121.5 },
                { lat: 12.5, lng: 124.0 }
            ),
            componentRestrictions: { country: "ph" },
            fields: ["geometry", "name", "formatted_address"],
        });

        autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current.getPlace();
            if (!place.geometry?.location || !mapInstance.current) return;

            // Pan + zoom the map to the selected place
            mapInstance.current.panTo(place.geometry.location);
            mapInstance.current.setZoom(14);

            // Drop a temporary search pin
            if (markerRef.current) markerRef.current.setMap(null);
            markerRef.current = new window.google.maps.Marker({
                position: place.geometry.location,
                map: mapInstance.current,
                title: place.name,
                icon: {
                    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 6,
                    fillColor: "#7c3aed",
                    fillOpacity: 1,
                    strokeColor: "white",
                    strokeWeight: 2,
                },
                animation: window.google.maps.Animation.DROP,
                zIndex: 500,
            });

            setInputValue(place.name || place.formatted_address || "");
        });
    }, [mapsLoaded, mapInstance]);

    const handleClear = () => {
        setInputValue("");
        if (inputRef.current) inputRef.current.value = "";
        if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
    };

    return (
        <div style={{ position: "relative", flex: 1, minWidth: 240, maxWidth: 380 }}>
            <Search
                size={13}
                style={{
                    position: "absolute", left: 10, top: "50%",
                    transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none",
                }}
            />
            <input
                ref={inputRef}
                defaultValue=""
                placeholder="Search location on map…"
                style={{
                    width: "100%",
                    fontSize: 12, fontWeight: 500, color: "#374151",
                    border: "1px solid #d1d5db", borderRadius: 8,
                    padding: "6px 32px 6px 30px",
                    background: "white", outline: "none",
                    height: 32, boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 2px #ede9fe"; }}
                onBlur={e  => { e.target.style.borderColor = "#d1d5db"; e.target.style.boxShadow = "none"; }}
            />
            {inputValue && (
                <button
                    onClick={handleClear}
                    style={{
                        position: "absolute", right: 8, top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent", border: "none",
                        cursor: "pointer", padding: 2,
                        color: "#9ca3af", display: "flex", alignItems: "center",
                    }}
                >
                    <X size={12} />
                </button>
            )}
        </div>
    );
}

// ─── Google Maps Heatmap ──────────────────────────────────────────────────────

function GeoHeatmap({ detections, zones, filters, userGps }) {
    const mapRef         = useRef(null);
    const mapInstance    = useRef(null);
    const heatmapLayer   = useRef(null);
    const markersRef     = useRef([]);
    const zoneMarkersRef = useRef([]);
    const userMarkerRef  = useRef(null);
    const infoWindowRef  = useRef(null);

    const [mapLoaded,   setMapLoaded]   = useState(false);
    const [heatmapMode, setHeatmapMode] = useState(true);
    const [showZones,   setShowZones]   = useState(true);
    const [mapType,     setMapType]     = useState("roadmap");

    // Use only parent-level filters — no local duplicate
    const mergedFilters = {
        severity:    filters.severity    || "",
        type:        filters.type        || "",
        search:      filters.search      || "",
        classFilter: filters.classFilter || "",
    };

    const withGPS  = detections.filter(d => d.latitude != null && d.longitude != null);
    const filtered = withGPS.filter(r => {
        if (mergedFilters.severity && r.severity !== mergedFilters.severity) return false;
        if (mergedFilters.type        && r.type   !== mergedFilters.type)         return false;
        if (mergedFilters.classFilter && r.name   !== mergedFilters.classFilter)  return false;
        if (mergedFilters.search && ![r.zone, r.municipality, r.location, r.name]
            .filter(Boolean).some(v => v.toLowerCase().includes(mergedFilters.search.toLowerCase()))) return false;
        return true;
    });

    // Load Google Maps — visualization + places libraries
    useEffect(() => {
        if (window.google?.maps) { setMapLoaded(true); return; }
        const existing = document.getElementById("gm-agrivision");
        if (existing) {
            existing.addEventListener("load", () => setMapLoaded(true));
            return;
        }
        const script  = document.createElement("script");
        script.id     = "gm-agrivision";
        script.src    = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=visualization,places`;
        script.async  = true;
        script.onload = () => setMapLoaded(true);
        document.head.appendChild(script);
    }, []);

    // Init map — center on Western Visayas (Iloilo area)
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || mapInstance.current) return;
        const center = userGps
            ? { lat: userGps.lat, lng: userGps.lng }
            : filtered.length > 0
                ? { lat: filtered[0].latitude, lng: filtered[0].longitude }
                : { lat: 10.7202, lng: 122.5621 }; // Iloilo, Western Visayas

        mapInstance.current = new window.google.maps.Map(mapRef.current, {
            center, zoom: 12,
            mapTypeId: "roadmap",
            styles: CLEAN_MAP_STYLE,
            zoomControl: true, mapTypeControl: false,
            streetViewControl: false, fullscreenControl: true,
        });
        infoWindowRef.current = new window.google.maps.InfoWindow();
    }, [mapLoaded]);

    // User location blue dot
    useEffect(() => {
        if (!mapInstance.current || !window.google?.maps) return;
        if (userMarkerRef.current) { userMarkerRef.current.setMap(null); userMarkerRef.current = null; }
        if (!userGps) return;
        userMarkerRef.current = new window.google.maps.Marker({
            position: { lat: userGps.lat, lng: userGps.lng },
            map: mapInstance.current, title: "Your location",
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10, fillColor: "#3b82f6", fillOpacity: 0.95,
                strokeColor: "white", strokeWeight: 3,
            },
            zIndex: 999,
        });
        if (filtered.length === 0) mapInstance.current.panTo({ lat: userGps.lat, lng: userGps.lng });
    }, [userGps, mapLoaded]);

    // Heatmap / markers
    useEffect(() => {
        if (!mapInstance.current || !window.google?.maps) return;
        markersRef.current.forEach(m => m.setMap(null)); markersRef.current = [];
        if (heatmapLayer.current) { heatmapLayer.current.setMap(null); heatmapLayer.current = null; }
        if (!filtered.length) return;

        const bounds = new window.google.maps.LatLngBounds();

        if (heatmapMode) {
            const pts = filtered.map(d => {
                const ll = new window.google.maps.LatLng(Number(d.latitude), Number(d.longitude));
                bounds.extend(ll);
                return { location: ll, weight: sev(d.severity).weight };
            });
            heatmapLayer.current = new window.google.maps.visualization.HeatmapLayer({
                data: pts, map: mapInstance.current, radius: 45,
                gradient: [
                    "rgba(0,0,0,0)",
                    "rgba(22,163,74,0.5)",
                    "rgba(234,179,8,0.7)",
                    "rgba(234,88,12,0.85)",
                    "rgba(220,38,38,1)",
                ],
                maxIntensity: 6, opacity: 0.8,
            });
        } else {
            filtered.forEach(d => {
                const ll = new window.google.maps.LatLng(Number(d.latitude), Number(d.longitude));
                bounds.extend(ll);
                const s = sev(d.severity);
                const t = tStyle(d.type);
                const marker = new window.google.maps.Marker({
                    position: ll, map: mapInstance.current, title: d.name,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 9, fillColor: s.color, fillOpacity: 0.9,
                        strokeColor: "white", strokeWeight: 2,
                    },
                });
                marker.addListener("click", () => {
                    infoWindowRef.current.setContent(`
                        <div style="font-family:system-ui,sans-serif;padding:6px 2px;min-width:240px;max-width:280px">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                                <span style="font-size:18px">${tStyle(d.type).icon}</span>
                                <div>
                                    <p style="margin:0;font-size:14px;font-weight:700;color:#111827">${d.name || "Unknown"}</p>
                                    <p style="margin:0;font-size:11px;color:#6b7280">${formatDateTime(d.timestamp)}</p>
                                </div>
                            </div>
                            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
                                <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;color:${t.color};background:${t.bg};border:1px solid ${t.border}">${d.type || "—"}</span>
                                <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;color:${s.color};background:${s.bg};border:1px solid ${s.border}">${s.label}</span>
                            </div>
                            <p style="margin:0 0 2px;font-size:11px;color:#374151"><strong>Zone:</strong> ${d.zone || d.location || "—"}</p>
                            ${d.municipality ? `<p style="margin:0 0 2px;font-size:11px;color:#374151"><strong>Municipality:</strong> ${d.municipality}${d.province ? `, ${d.province}` : ""}</p>` : ""}
                            <p style="margin:0 0 6px;font-size:11px;color:#374151"><strong>Confidence:</strong> ${d.confidence}% &nbsp;|&nbsp; Source: ${d.source || "field"}</p>
                            <div style="padding:6px 8px;background:#fef2f2;border-radius:6px;font-size:10px;color:#991b1b;border:1px solid #fecaca">
                                <strong>BPI Action:</strong> ${s.bpi}
                            </div>
                            ${d.latitude != null ? `<p style="margin:6px 0 0;font-size:10px;color:#9ca3af">📍 ${Number(d.latitude).toFixed(6)}, ${Number(d.longitude).toFixed(6)}</p>` : ""}
                        </div>
                    `);
                    infoWindowRef.current.open(mapInstance.current, marker);
                });
                markersRef.current.push(marker);
            });
        }

        if (filtered.length > 0) mapInstance.current.fitBounds(bounds, { padding: 70 });
    }, [filtered.length, heatmapMode, mapLoaded, JSON.stringify(mergedFilters)]);

    // Zone cluster markers
    useEffect(() => {
        if (!mapInstance.current || !window.google?.maps) return;
        zoneMarkersRef.current.forEach(m => m.setMap(null)); zoneMarkersRef.current = [];
        if (!showZones) return;
        zones.filter(z => z.lat && z.lng).forEach(z => {
            const hasCritical = (z.critical_count ?? 0) > 0;
            const marker = new window.google.maps.Marker({
                position: { lat: Number(z.lat), lng: Number(z.lng) },
                map: mapInstance.current,
                label: { text: String(z.total), color: "white", fontWeight: "bold", fontSize: "11px" },
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 16 + Math.min(z.total, 28),
                    fillColor: hasCritical ? "#dc2626" : z.total > 5 ? "#ea580c" : "#16a34a",
                    fillOpacity: 0.88,
                    strokeColor: "white", strokeWeight: 2,
                },
                title: z.zone, zIndex: 10,
            });
            marker.addListener("click", () => {
                infoWindowRef.current.setContent(`
                    <div style="font-family:system-ui,sans-serif;padding:6px 2px;min-width:210px">
                        <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827">${z.zone}</p>
                        ${z.municipality ? `<p style="margin:0 0 8px;font-size:11px;color:#6b7280">${z.municipality}${z.province ? `, ${z.province}` : ""}</p>` : ""}
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;font-size:12px">
                            <div style="background:#fef2f2;padding:6px 8px;border-radius:6px"><strong style="color:#dc2626">${z.critical_count ?? 0}</strong><br><span style="font-size:10px;color:#6b7280">Critical</span></div>
                            <div style="background:#fff7ed;padding:6px 8px;border-radius:6px"><strong style="color:#ea580c">${z.total}</strong><br><span style="font-size:10px;color:#6b7280">Total</span></div>
                            <div style="background:#fffbeb;padding:6px 8px;border-radius:6px"><strong style="color:#92400e">${z.pest_count ?? 0}</strong><br><span style="font-size:10px;color:#6b7280">Pests</span></div>
                            <div style="background:#f0fdfa;padding:6px 8px;border-radius:6px"><strong style="color:#0f766e">${z.disease_count ?? 0}</strong><br><span style="font-size:10px;color:#6b7280">Diseases</span></div>
                        </div>
                        <p style="margin:0;font-size:10px;color:#9ca3af">Last detected: ${formatDateTime(z.last_detected)}</p>
                    </div>
                `);
                infoWindowRef.current.open(mapInstance.current, marker);
            });
            zoneMarkersRef.current.push(marker);
        });
    }, [showZones, zones, mapLoaded]);

    useEffect(() => {
        if (!mapInstance.current) return;
        mapInstance.current.setMapTypeId(mapType);
    }, [mapType]);

    const centerOnUser = () => {
        if (!mapInstance.current || !userGps) return;
        mapInstance.current.panTo({ lat: userGps.lat, lng: userGps.lng });
        mapInstance.current.setZoom(15);
    };

    const toggleBtnStyle = (active) => ({
        fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 6, border: "none",
        cursor: "pointer", transition: "all 0.12s",
        background: active ? "white" : "transparent",
        color: active ? "#111827" : "#6b7280",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Map controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {/* Heatmap / Markers toggle */}
                    <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, padding: 3, gap: 2 }}>
                        <button onClick={() => setHeatmapMode(true)}  style={toggleBtnStyle(heatmapMode)}>Heatmap</button>
                        <button onClick={() => setHeatmapMode(false)} style={toggleBtnStyle(!heatmapMode)}>Markers</button>
                    </div>
                    {/* Map type toggle */}
                    <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, padding: 3, gap: 2 }}>
                        {["roadmap","satellite","terrain"].map(mt => (
                            <button key={mt} onClick={() => setMapType(mt)} style={{ ...toggleBtnStyle(mapType === mt), textTransform: "capitalize" }}>{mt}</button>
                        ))}
                    </div>
                    {/* Zone clusters toggle */}
                    <button onClick={() => setShowZones(v => !v)} style={{
                        fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 8, border: "none",
                        cursor: "pointer",
                        background: showZones ? "#16a34a" : "#f3f4f6",
                        color: showZones ? "white" : "#6b7280",
                    }}>
                        <Globe size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                        Zone clusters
                    </button>
                    {userGps && (
                        <button onClick={centerOnUser} style={{
                            fontSize: 11, fontWeight: 600, padding: "5px 11px", borderRadius: 8,
                            border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        }}>
                            <Navigation size={11} /> My location
                        </button>
                    )}
                </div>

                {/* Places search — right side of controls row */}
                <PlacesSearchBox mapInstance={mapInstance} mapsLoaded={mapLoaded} />
            </div>

            {/* Point count */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {filtered.length} geo-tagged point{filtered.length !== 1 ? "s" : ""}
                    {withGPS.length !== detections.length && ` · ${detections.length - withGPS.length} without GPS (field fallback)`}
                </span>
            </div>

            {/* Map container */}
            <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                {!mapLoaded && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8faf8", zIndex: 10, flexDirection: "column", gap: 10 }}>
                        <Loader2 size={24} style={{ color: "#16a34a", animation: "spin 1s linear infinite" }} />
                        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Loading Google Maps…</p>
                    </div>
                )}
                <div ref={mapRef} style={{ width: "100%", height: 540 }} />

                {/* User GPS overlay */}
                {userGps && (
                    <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderRadius: 10, padding: "8px 12px", border: "1px solid #bfdbfe", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", display: "block" }} />
                            Field officer location
                        </div>
                        <div style={{ marginTop: 2, fontSize: 10, color: "#6b7280", fontWeight: 400 }}>
                            {Number(userGps.lat).toFixed(5)}, {Number(userGps.lng).toFixed(5)}
                        </div>
                        {userGps.accuracy && <div style={{ fontSize: 10, color: "#9ca3af" }}>±{Math.round(userGps.accuracy)}m accuracy</div>}
                    </div>
                )}

                {/* Heatmap legend */}
                {heatmapMode && (
                    <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,0.93)", backdropFilter: "blur(12px)", borderRadius: 10, padding: "10px 14px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                        <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Infestation Intensity</p>
                        <div style={{ width: 90, height: 8, borderRadius: 4, background: "linear-gradient(90deg, rgba(22,163,74,0.6), rgba(234,179,8,0.8), rgba(220,38,38,1))" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                            <span style={{ fontSize: 9, color: "#9ca3af" }}>Low</span>
                            <span style={{ fontSize: 9, color: "#9ca3af" }}>Critical</span>
                        </div>
                    </div>
                )}
                {!heatmapMode && (
                    <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,0.93)", backdropFilter: "blur(12px)", borderRadius: 10, padding: "10px 14px", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
                        <p style={{ margin: "0 0 5px", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>BPI Severity</p>
                        {Object.entries(SEVERITY).map(([k, v]) => (
                            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.color, display: "block" }} />
                                <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 500 }}>{v.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* No GPS warning */}
            {detections.length > 0 && withGPS.length === 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#fefce8", border: "1px solid #fde047", borderRadius: 12, padding: "14px 16px" }}>
                    <AlertCircle size={16} style={{ color: "#ca8a04", flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#854d0e" }}>No GPS coordinates in alarm log</p>
                        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#92400e" }}>
                            Detections exist but none carry GPS data. Allow location access in Field Monitoring — the YOLOv8m alarm logger will save device GPS automatically with every detection.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Zone Analysis — aligned to municipality/province structure ───────────────

function ZoneAnalysis({ zones, detections }) {
    if (!zones.length) {
        return (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 13 }}>
                No zone data yet. GPS-tagged detections will appear here grouped by barangay / municipality.
            </div>
        );
    }

    const maxTotal = Math.max(...zones.map(z => z.total), 1);

    // Class breakdown per zone from detections
    const zoneClasses = {};
    detections.forEach(d => {
        if (!d.zone) return;
        if (!zoneClasses[d.zone]) zoneClasses[d.zone] = {};
        zoneClasses[d.zone][d.name] = (zoneClasses[d.zone][d.name] || 0) + 1;
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                    {zones.length} zone{zones.length !== 1 ? "s" : ""} with recorded detections — sorted by risk
                </p>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Data feeds: BPI • PhilRice • AEW reports</span>
            </div>

            {[...zones].sort((a,b) => (b.critical_count ?? 0) - (a.critical_count ?? 0)).map((z, i) => {
                const pct     = Math.round((z.total / maxTotal) * 100);
                const critPct = z.total > 0 ? Math.round(((z.critical_count ?? 0) / z.total) * 100) : 0;
                const barColor = critPct > 40 ? "#dc2626" : critPct > 15 ? "#ea580c" : z.total > 3 ? "#ca8a04" : "#16a34a";
                const topClsEntries = Object.entries(zoneClasses[z.zone] || {}).sort((a,b) => b[1]-a[1]).slice(0,3);

                return (
                    <div key={z.zone ?? i} style={{ ...S.card }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#111827" }}>{z.zone ?? "Unknown Zone"}</p>
                                    {(z.critical_count ?? 0) > 0 && (
                                        <span style={{ ...S.pill("#dc2626", "#fef2f2", "#fca5a5"), fontSize: 10 }}>⚠ {z.critical_count} critical</span>
                                    )}
                                </div>
                                {z.municipality && (
                                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
                                        {z.municipality}{z.province ? `, ${z.province}` : ""} · Philippines
                                    </p>
                                )}
                            </div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <span style={{ ...S.pill("#374151", "#f3f4f6", "#e5e7eb") }}>{z.total} detections</span>
                                {z.lat && z.lng && (
                                    <span style={{ ...S.pill("#16a34a", "#f0fdf4", "#86efac"), fontSize: 10 }}>
                                        📍 geo-tagged
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ background: "#f3f4f6", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 10 }}>
                            <div style={{ height: "100%", borderRadius: 6, background: barColor, width: `${pct}%`, transition: "width 0.4s ease" }} />
                        </div>

                        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#6b7280", flexWrap: "wrap", marginBottom: topClsEntries.length ? 10 : 0 }}>
                            <span>🌾 {z.pest_count ?? 0} pests</span>
                            <span>🦠 {z.disease_count ?? 0} diseases</span>
                            <span>🔴 {z.critical_count ?? 0} critical</span>
                            {z.last_detected && <span><Clock size={10} style={{ verticalAlign: "middle" }} /> {formatTimeAgo(z.last_detected)}</span>}
                            {z.lat && z.lng && <span style={{ color: "#16a34a" }}>📍 {Number(z.lat).toFixed(4)}, {Number(z.lng).toFixed(4)}</span>}
                        </div>

                        {/* Top detected classes in this zone */}
                        {topClsEntries.length > 0 && (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {topClsEntries.map(([name, count]) => {
                                    const cls = DETECTION_CLASSES[name] || { type: "Pest" };
                                    const ts = tStyle(cls.type);
                                    return (
                                        <span key={name} style={{ ...S.pill(ts.color, ts.bg, ts.border), fontSize: 10 }}>
                                            {ts.icon} {name} ({count})
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        {/* BPI recommended action */}
                        {(z.critical_count ?? 0) > 0 && (
                            <div style={{ marginTop: 10, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 11, color: "#991b1b" }}>
                                <strong>BPI Action:</strong> {SEVERITY.critical.bpi}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Detection Table ──────────────────────────────────────────────────────────

function DetectionTable({ rows, loading }) {
    const [page,    setPage]    = useState(1);
    const [sortKey, setSortKey] = useState("timestamp");
    const [sortDir, setSortDir] = useState("desc");
    const [filters, setFilters] = useState({ severity: "", type: "", search: "", classFilter: "", dateFrom: "", dateTo: "" });

    const filtered = rows.filter(r => {
        if (filters.severity && r.severity !== filters.severity) return false;
        if (filters.type        && r.type !== filters.type)   return false;
        if (filters.classFilter && r.name !== filters.classFilter) return false;
        if (filters.search && ![r.name, r.zone, r.municipality, r.location]
            .filter(Boolean).some(v => v.toLowerCase().includes(filters.search.toLowerCase()))) return false;
        if (filters.dateFrom && new Date(r.timestamp) < new Date(filters.dateFrom)) return false;
        if (filters.dateTo   && new Date(r.timestamp) > new Date(filters.dateTo + "T23:59:59")) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        let av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
        if (sortKey === "timestamp")  { av = new Date(av); bv = new Date(bv); }
        if (sortKey === "confidence") { av = Number(av);   bv = Number(bv);   }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ?  1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const visible    = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const toggleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    useEffect(() => { setPage(1); }, [filters]);

    const exportCsv = () => {
        const headers = ["#","Timestamp","Class","Type","Confidence","Severity","Zone","Municipality","Province","Latitude","Longitude","Source","Device","BPI Action"];
        const csvRows = [headers.join(","), ...sorted.map((r, i) => [
            i + 1,
            formatDateTime(r.timestamp),
            `"${r.name ?? ""}"`,
            r.type ?? "",
            r.confidence ?? "",
            r.severity ?? "",
            `"${r.zone ?? ""}"`,
            `"${r.municipality ?? ""}"`,
            `"${r.province ?? ""}"`,
            r.latitude  ?? "",
            r.longitude ?? "",
            r.source    ?? "",
            r.device_type ?? "",
            `"${sev(r.severity).bpi}"`,
        ].join(","))];
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = "agrivision_alarm_log_export.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    const th = (label, key) => (
        <th onClick={() => key && toggleSort(key)} style={{
            padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700,
            color: "#6b7280", background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
            whiteSpace: "nowrap", cursor: key ? "pointer" : "default", userSelect: "none",
        }}>
            {label}
            {sortKey === key && <span style={{ marginLeft: 3, opacity: 0.6 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
        </th>
    );

    const tdS = { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <FilterBar filters={filters} onChange={setFilters} showDate />
                <button onClick={exportCsv} style={S.btnOutline}>
                    <Download size={13} /> Export CSV
                </button>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                {(filters.severity || filters.type || filters.search || filters.classFilter) ? " (filtered)" : ""}
                {" "}— YOLOv8m confidence &amp; BPI severity logged
            </p>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                        <tr>
                            {th("#")}
                            {th("Timestamp",   "timestamp")}
                            {th("Class (16)",  "name")}
                            {th("Type",        "type")}
                            {th("Confidence",  "confidence")}
                            {th("BPI Severity","severity")}
                            {th("Zone",        "zone")}
                            {th("GPS Coords")}
                            {th("Source")}
                        </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan={9} style={{ padding: "40px 0", textAlign: "center" }}>
                                <Loader2 size={20} style={{ color: "#6b7280", animation: "spin 1s linear infinite" }} />
                            </td></tr>
                        ) : visible.length === 0 ? (
                            <tr><td colSpan={9} style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
                                No detection records match the current filters.
                            </td></tr>
                        ) : visible.map((r, i) => {
                            const s = sev(r.severity);
                            const t = tStyle(r.type);
                            const hasCoords = r.latitude != null && r.longitude != null;
                            const confColor = r.confidence >= 90 ? "#16a34a" : r.confidence >= 75 ? "#ca8a04" : "#dc2626";
                            return (
                                <tr key={r.id ?? i}
                                    style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#f0fdf440"}
                                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"}
                                >
                                    <td style={tdS}><span style={{ color: "#9ca3af", fontWeight: 500 }}>{(page-1)*PAGE_SIZE+i+1}</span></td>
                                    <td style={tdS}>
                                        <div style={{ fontSize: 12 }}>{formatDateTime(r.timestamp)}</div>
                                        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{formatTimeAgo(r.timestamp)}</div>
                                    </td>
                                    <td style={{ ...tdS, fontWeight: 700, color: "#111827" }}>
                                        {r.name || "Unknown"}
                                        {DETECTION_CLASSES[r.name] && (
                                            <span style={{ marginLeft: 4, fontSize: 10 }}>{tStyle(DETECTION_CLASSES[r.name]?.type)?.icon}</span>
                                        )}
                                    </td>
                                    <td style={tdS}><span style={S.pill(t.color, t.bg, t.border)}>{t.icon} {r.type || "—"}</span></td>
                                    <td style={tdS}>
                                        <span style={{ fontWeight: 700, color: confColor, fontSize: 13 }}>{r.confidence}%</span>
                                        <div style={{ marginTop: 2, width: 40, height: 3, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
                                            <div style={{ width: `${r.confidence}%`, height: "100%", background: confColor, borderRadius: 2 }} />
                                        </div>
                                    </td>
                                    <td style={tdS}><span style={S.pill(s.color, s.bg, s.border)}>{s.icon} {s.label}</span></td>
                                    <td style={tdS}>
                                        <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{r.zone || r.location || "Unknown"}</p>
                                        {r.municipality && <p style={{ margin: "1px 0 0", fontSize: 10, color: "#6b7280" }}>{r.municipality}{r.province ? `, ${r.province}` : ""}</p>}
                                    </td>
                                    <td style={tdS}>
                                        {hasCoords ? (
                                            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#16a34a", fontWeight: 600, fontSize: 11 }}>
                                                    <MapPin size={10} />{Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}
                                                </span>
                                        ) : (
                                            <span style={{ color: "#9ca3af", fontSize: 11 }}>No GPS</span>
                                        )}
                                    </td>
                                    <td style={tdS}>
                                        <span style={{ fontSize: 11, color: "#6b7280" }}>{r.source || "field"}</span>
                                        {r.device_type && <div style={{ fontSize: 10, color: "#9ca3af" }}>{r.device_type}</div>}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Page {page} of {totalPages} · {sorted.length} records</span>
                    <div style={{ display: "flex", gap: 4 }}>
                        <button disabled={page === 1} onClick={() => setPage(p => p-1)} style={{ ...S.btnOutline, opacity: page===1?0.4:1 }}>‹ Prev</button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const p = Math.max(1, Math.min(totalPages-4, page-2)) + i;
                            return (
                                <button key={p} onClick={() => setPage(p)} style={{
                                    ...S.btnOutline,
                                    fontWeight: p===page ? 700 : 500,
                                    background: p===page ? "#f0fdf4" : "white",
                                    borderColor: p===page ? "#86efac" : "#d1d5db",
                                    color: p===page ? "#16a34a" : "#374151",
                                }}>{p}</button>
                            );
                        })}
                        <button disabled={page===totalPages} onClick={() => setPage(p => p+1)} style={{ ...S.btnOutline, opacity: page===totalPages?0.4:1 }}>Next ›</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Class Breakdown Panel ────────────────────────────────────────────────────

function ClassBreakdown({ detections }) {
    const counts = {};
    detections.forEach(d => { counts[d.name] = (counts[d.name] || 0) + 1; });

    // Fill zeros for all 16 classes
    Object.keys(DETECTION_CLASSES).forEach(c => { if (!counts[c]) counts[c] = 0; });

    const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    const max    = Math.max(...sorted.map(([,c]) => c), 1);

    return (
        <div style={{ ...S.card }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Microscope size={15} style={{ color: "#16a34a" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>YOLOv8m — 16-Class Detection Breakdown</span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>mAP@0.5: 95.7%</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sorted.map(([name, count]) => {
                    const cls = DETECTION_CLASSES[name] || { type: "Pest" };
                    const ts  = tStyle(cls.type);
                    const pct = Math.round((count / max) * 100);
                    return (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ts.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: "#374151", width: 180, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                            <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: ts.color, borderRadius: 3, opacity: 0.7 }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: count > 0 ? "#111827" : "#9ca3af", width: 30, textAlign: "right" }}>{count}</span>
                            <span style={{ ...S.pill(ts.color, ts.bg, ts.border), fontSize: 9, width: 56 }}>{ts.icon} {cls.type}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Main GeoSurveillance Page ────────────────────────────────────────────────

const TABS = ["Map View", "Zone Analysis", "Alarm Log", "Class Breakdown"];

export default function GeoSurveillance() {
    const [tab,         setTab]         = useState("Map View");
    const [detections,  setDetections]  = useState([]);
    const [zones,       setZones]       = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [filters,     setFilters]     = useState({ severity: "", type: "", search: "", classFilter: "" });

    const { gps, gpsStatus, reacquire } = useGPS();

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/detections", { validateStatus: () => true }).catch(() => null);
            let records  = [];
            let zoneData = [];

            if (res?.status === 200) {
                const body = res.data;
                records  = body?.data            ?? (Array.isArray(body) ? body : []);
                zoneData = body?.zone_aggregation ?? [];
            }

            const normalized = records.map((r, idx) => {
                const rawSev = String(r.severity ?? "low").toLowerCase();
                const severity = rawSev === "moderate" ? "medium" : rawSev;

                return {
                    id:           r.id          ?? `geo-${idx}`,
                    timestamp:    r.timestamp   ?? r.created_at ?? new Date().toISOString(),
                    type:         r.type        ?? DETECTION_CLASSES[r.name ?? r.class]?.type ?? "Disease",
                    name:         r.name        ?? r.class ?? "Unknown",
                    confidence:   r.confidence  != null
                        ? (r.confidence <= 1 ? Math.round(r.confidence * 100) : Math.round(r.confidence))
                        : 0,
                    location:     r.location    ?? (r.field_id ? `Field ${r.field_id}` : "Unknown"),
                    severity,
                    latitude:     r.latitude    != null ? Number(r.latitude)  : null,
                    longitude:    r.longitude   != null ? Number(r.longitude) : null,
                    municipality: r.municipality ?? null,
                    province:     r.province    ?? null,
                    zone:         r.zone        ?? null,
                    source:       r.source      ?? "api",
                    device_type:  r.device_type ?? null,
                };
            });

            const deduped = Array.from(new Map(normalized.map(r => [String(r.id), r])).values());
            deduped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setDetections(deduped);
            setZones(zoneData);
            setLastRefresh(new Date());
        } catch (e) {
            console.error("GeoSurveillance fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const iv = setInterval(fetchAll, REFRESH_INTERVAL);
        return () => clearInterval(iv);
    }, [fetchAll]);

    const withGPS      = detections.filter(d => d.latitude != null && d.longitude != null);
    const critical     = detections.filter(d => d.severity === "critical").length;
    const high         = detections.filter(d => d.severity === "high").length;
    const pestCount    = detections.filter(d => d.type === "Pest").length;
    const diseaseCount = detections.filter(d => d.type === "Disease").length;

    const tabIcon = {
        "Map View":       <Layers size={13} />,
        "Zone Analysis":  <Globe size={13} />,
        "Alarm Log":      <List size={13} />,
        "Class Breakdown":<Microscope size={13} />,
    };

    return (
        <div style={{ minHeight: "100vh", background: "white" }}>
            <style>{`
                @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                *{box-sizing:border-box}
                /* Prevent Google Autocomplete dropdown from being clipped */
                .pac-container { z-index: 9999 !important; }
            `}</style>

            <main style={{
                maxWidth: 1400, margin: "0 auto", padding: "0 28px 48px",
                fontFamily: "system-ui,-apple-system,sans-serif", color: "#111827",
                animation: "slideUp 0.25s ease",
            }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 0 20px", borderBottom: "1px solid #e5e7eb", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <MapPin size={16} style={{ color: "#16a34a" }} />
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
                                    AgriVision — Geo Surveillance
                                </h1>
                                <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
                                    Real-time geospatial pest &amp; disease alarm logging · YOLOv8m · PhilRice / BPI Protocol · SDG 2
                                </p>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {lastRefresh && (
                            <span style={{ fontSize: 11, color: "#9ca3af" }}>
                                <Clock size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />
                                Updated {lastRefresh.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                                &nbsp;·&nbsp;Auto-refresh every 30s
                            </span>
                        )}
                        <button onClick={fetchAll} disabled={loading} style={{ ...S.btnOutline, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* GPS Banner */}
                <GPSBanner gpsStatus={gpsStatus} gps={gps} onReacquire={reacquire} />

                {/* Live Alarm Ticker */}
                <LiveTicker detections={detections} />

                {/* Outbreak Risk Panel */}
                <OutbreakRiskPanel detections={detections} zones={zones} />

                {/* Stat Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                    <StatCard icon={<Activity size={17} />}     label="Total Detections"   value={detections.length}   sub={`${withGPS.length} geo-tagged`}        accent="#3b82f6" />
                    <StatCard icon={<MapPin size={17} />}       label="GPS-Logged Alarms"  value={withGPS.length}      sub="with coordinates"                       accent="#16a34a" />
                    <StatCard icon={<ShieldAlert size={17} />}  label="Critical + High"    value={critical + high}     sub={`${critical} critical · ${high} high`} accent="#dc2626" />
                    <StatCard icon={<Globe size={17} />}        label="Zones Monitored"    value={zones.length}        sub="active surveillance zones"              accent="#7c3aed" />
                    <StatCard icon={<Wheat size={17} />}        label="Pest Detections"    value={pestCount}           sub="across 8 pest classes"                  accent="#92400e" />
                    <StatCard icon={<Microscope size={17} />}   label="Disease Detections" value={diseaseCount}        sub="across 8 disease classes"               accent="#0f766e" />
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
                    {TABS.map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "9px 16px", fontSize: 13, fontWeight: 600,
                            border: "none", background: "transparent", cursor: "pointer",
                            color: tab === t ? "#111827" : "#6b7280",
                            borderBottom: `2px solid ${tab === t ? "#16a34a" : "transparent"}`,
                            marginBottom: -1,
                        }}>
                            {tabIcon[t]}{t}
                        </button>
                    ))}
                </div>

                {/* Shared filter bar — Map View and Zone Analysis only */}
                {(tab === "Map View" || tab === "Zone Analysis") && (
                    <div style={{ marginBottom: 16 }}>
                        <FilterBar filters={filters} onChange={setFilters} />
                    </div>
                )}

                {/* Tab content */}
                {tab === "Map View"        && <GeoHeatmap detections={detections} zones={zones} filters={filters} userGps={gps} />}
                {tab === "Zone Analysis"   && <ZoneAnalysis zones={zones} detections={detections} />}
                {tab === "Alarm Log"       && <DetectionTable rows={detections} loading={loading} />}
                {tab === "Class Breakdown" && <ClassBreakdown detections={detections} />}

                {/* Footer */}
                <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#9ca3af" }}>
                        <span>🌾 AgriVision — STI West Negros University, Capstone 2026</span>
                        <span>YOLOv8m · mAP@0.5: 95.7%</span>
                        <span>16-class rice health detection</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9ca3af" }}>
                        <span>SDG 2 Zero Hunger</span>
                        <span>SDG 9 Innovation</span>
                        <span>PhilRice 2023–2028</span>
                        <span>BPI Protocol</span>
                    </div>
                </div>
            </main>
        </div>
    );
}