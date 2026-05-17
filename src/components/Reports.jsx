import { useState, useEffect, useRef, useCallback } from 'react'
import {
    FileText, Download, Trash2, Plus, Search, Filter,
    CheckCircle, AlertCircle, Loader2, X, ChevronDown,
    Clock, Calendar, TrendingUp, Shield, BarChart2, Eye
} from 'lucide-react'

// ─── Re-use the same jsPDF loader + report generator from Dashboard ───────────

const loadJsPDF = () => {
    return new Promise((resolve, reject) => {
        if (window.jspdf && window.jspdf.jsPDF) { resolve(window.jspdf.jsPDF); return }
        document.querySelectorAll('script[data-jspdf]').forEach(s => s.remove())
        const script = document.createElement('script')
        script.setAttribute('data-jspdf', '1')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        script.onload = () => {
            if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF)
            else reject(new Error('jsPDF constructor not found'))
        }
        script.onerror = () => reject(new Error('Failed to load jsPDF'))
        document.head.appendChild(script)
    })
}

// ─── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'agrivision_report_records'

const loadRecords = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
const saveRecords = (records) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)) } catch { /* quota */ }
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG = {
    completed: { label: 'Completed', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    generating: { label: 'Generating', bg: '#fefce8', text: '#a16207', border: '#fef08a' },
    failed: { label: 'Failed', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
}

const RANGE_OPTIONS = [
    { label: 'This week',    days: '7 days' },
    { label: 'Last week',    days: '7 days' },
    { label: 'Last month',   days: '1 month' },
    { label: 'Last 6 months', days: '6 months' },
]

// ─── Mini sparkline for the stat cards ───────────────────────────────────────

function MiniSparkline({ data = [], color = '#10b981' }) {
    if (!data || data.length < 2) return null
    const W = 60, H = 18
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => [
        (i / (data.length - 1)) * (W - 1) + 0.5,
        H - 0.5 - ((v - min) / range) * (H - 2),
    ])
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    const fill = `${line} L${pts[pts.length-1][0]},${H} L${pts[0][0]},${H} Z`
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block', flexShrink: 0 }}>
            <path d={fill} fill={color} fillOpacity="0.15" stroke="none" />
            <path d={line} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = '#10b981', sparkData }) {
    return (
        <div style={{ background: 'white', border: '1px solid #26262610', borderRadius: 10, padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'rgba(38,38,38,0.55)' }}>{label}</p>
                <span style={{ color, opacity: 0.7 }}>{icon}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#262626', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
                <MiniSparkline data={sparkData} color={color} />
            </div>
            <div style={{ paddingTop: 10, borderTop: '1px solid #26262608', marginTop: 2 }}>
                <span style={{ fontSize: 11, color: 'rgba(38,38,38,0.4)', fontWeight: 500 }}>{sub}</span>
            </div>
        </div>
    )
}

// ─── Toast (same as Dashboard) ────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
    const colors = {
        success: { bg: '#f0fdf4', icon: <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} /> },
        error:   { bg: '#fef2f2', icon: <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} /> },
        info:    { bg: '#f8fafc', icon: <Loader2 size={16} style={{ color: 'rgba(38,38,38,0.5)', flexShrink: 0 }} className="animate-spin" /> },
    }
    const c = colors[type] || colors.info
    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', border: '1px solid #26262610', background: c.bg, color: '#262626', fontSize: 13, fontWeight: 600, maxWidth: 360, animation: 'slideUp 0.3s ease' }}>
            <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
            {c.icon}
            <span>{message}</span>
            <button onClick={onClose} style={{ marginLeft: 8, opacity: 0.4, background: 'none', border: 'none', cursor: 'pointer', color: '#262626', padding: 0, display: 'flex' }}>
                <X size={14} />
            </button>
        </div>
    )
}

// ─── Generate Report Modal ────────────────────────────────────────────────────

function GenerateReportModal({ open, onClose, onGenerate }) {
    const [rangeLabel, setRangeLabel] = useState('This week')
    const [title, setTitle] = useState('')
    const [officer, setOfficer] = useState('')
    const [rangeOpen, setRangeOpen] = useState(false)
    const [generating, setGenerating] = useState(false)

    useEffect(() => { if (!open) { setGenerating(false); setTitle(''); setOfficer('') } }, [open])
    if (!open) return null

    const handleGenerate = async () => {
        setGenerating(true)
        await onGenerate({ rangeLabel, title: title || `Surveillance Report — ${rangeLabel}`, officer })
        setGenerating(false)
        onClose()
    }

    const selectedRange = RANGE_OPTIONS.find(r => r.label === rangeLabel)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)' }}
             onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                 style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #26262610', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.16)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 20px', borderBottom: '1px solid #26262610' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(38,38,38,0.45)', textTransform: 'uppercase', marginBottom: 4 }}>DA-BPI PRIME</p>
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#262626', letterSpacing: '-0.02em' }}>Generate New Report</h2>
                    </div>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 12, border: '1px solid #26262610', background: 'rgba(38,38,38,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(38,38,38,0.45)', cursor: 'pointer' }}>
                        <X size={15} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px 26px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Report title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(38,38,38,0.6)', letterSpacing: '0.04em' }}>REPORT TITLE <span style={{ color: 'rgba(38,38,38,0.3)', fontWeight: 500 }}>(optional)</span></label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={`Surveillance Report — ${rangeLabel}`}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #26262612', background: '#26262604', fontSize: 13, color: '#262626', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            onFocus={e => e.target.style.borderColor = '#10b981'}
                            onBlur={e => e.target.style.borderColor = '#26262612'}
                        />
                    </div>

                    {/* Officer name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(38,38,38,0.6)', letterSpacing: '0.04em' }}>PREPARED BY <span style={{ color: 'rgba(38,38,38,0.3)', fontWeight: 500 }}>(optional)</span></label>
                        <input
                            value={officer}
                            onChange={e => setOfficer(e.target.value)}
                            placeholder="Field Monitoring Officer"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #26262612', background: '#26262604', fontSize: 13, color: '#262626', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            onFocus={e => e.target.style.borderColor = '#10b981'}
                            onBlur={e => e.target.style.borderColor = '#26262612'}
                        />
                    </div>

                    {/* Date range */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(38,38,38,0.6)', letterSpacing: '0.04em' }}>REPORTING PERIOD</label>
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setRangeOpen(o => !o)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, border: '1px solid #26262612', background: '#26262604', fontSize: 13, color: '#262626', cursor: 'pointer', fontFamily: 'inherit' }}>
                                <div style={{ textAlign: 'left' }}>
                                    <span style={{ fontWeight: 600 }}>{rangeLabel}</span>
                                    <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(38,38,38,0.4)' }}>{selectedRange?.days}</span>
                                </div>
                                <ChevronDown size={14} style={{ color: 'rgba(38,38,38,0.4)', transform: rangeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                            {rangeOpen && (
                                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 40, background: 'white', border: '1px solid #26262610', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', padding: '6px' }}>
                                    {RANGE_OPTIONS.map(r => (
                                        <button key={r.label} onClick={() => { setRangeLabel(r.label); setRangeOpen(false) }}
                                                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, cursor: 'pointer', border: 'none', borderRadius: 10, background: rangeLabel === r.label ? '#26262608' : 'transparent', color: rangeLabel === r.label ? '#262626' : 'rgba(38,38,38,0.6)', fontWeight: rangeLabel === r.label ? 700 : 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{r.label}</span>
                                            <span style={{ fontSize: 11, color: 'rgba(38,38,38,0.35)' }}>{r.days}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info box */}
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Shield size={14} style={{ color: '#15803d', marginTop: 1, flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.5 }}>
                            Report will be generated using current live detection data and saved to your report history. A PDF will be downloaded automatically.
                        </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: '1px solid #26262610', background: '#26262606', color: 'rgba(38,38,38,0.7)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancel
                        </button>
                        <button onClick={handleGenerate} disabled={generating}
                                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 14, border: 'none', background: '#262626', color: 'white', fontWeight: 700, fontSize: 13, cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1, fontFamily: 'inherit' }}>
                            {generating ? <><Loader2 size={15} className="animate-spin" />Generating…</> : <><FileText size={15} />Generate & Download</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ record, open, onClose, onDownload }) {
    if (!open || !record) return null
    const s = STATUS_CONFIG[record.status] || STATUS_CONFIG.completed
    const created = new Date(record.createdAt)
    const dateStr = created.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const timeStr = created.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const rows = [
        ['Report ID', record.id],
        ['Period', record.rangeLabel],
        ['Created', `${dateStr} at ${timeStr}`],
        ['Prepared by', record.officer || 'Field Monitoring Officer'],
        ['Total Detections', String(record.detectionCount ?? '—')],
        ['High / Critical', String(record.highCount ?? '—')],
        ['Status', record.status],
        ['Model', 'YOLOv8n · AgriVision v2.1.0'],
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)' }}
             onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                 style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #26262610', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.16)', width: '100%', maxWidth: 460, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 20px', borderBottom: '1px solid #26262610' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(38,38,38,0.45)', textTransform: 'uppercase', marginBottom: 4 }}>Report Details</p>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#262626', letterSpacing: '-0.02em', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</h2>
                    </div>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 12, border: '1px solid #26262610', background: 'rgba(38,38,38,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(38,38,38,0.45)', cursor: 'pointer' }}>
                        <X size={15} />
                    </button>
                </div>
                <div style={{ padding: '20px 26px 26px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {rows.map(([k, v], i) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < rows.length - 1 ? '1px solid #26262606' : 'none' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(38,38,38,0.45)' }}>{k}</span>
                            {k === 'Status' ? (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{s.label}</span>
                            ) : (
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#262626', textAlign: 'right', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                            )}
                        </div>
                    ))}
                    <button onClick={() => { onDownload(record); onClose() }}
                            style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', borderRadius: 14, border: 'none', background: '#262626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Download size={15} />Re-download PDF
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirmModal({ record, open, onClose, onConfirm }) {
    if (!open || !record) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)' }}
             onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                 style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #26262610', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.16)', width: '100%', maxWidth: 380, overflow: 'hidden' }}>
                <div style={{ padding: '24px 26px 22px', borderBottom: '1px solid #26262610' }}>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#262626' }}>Delete Report Record</h2>
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(38,38,38,0.55)', lineHeight: 1.5 }}>
                        Remove <strong>"{record.title}"</strong> from your history? The PDF file on your device will not be affected.
                    </p>
                </div>
                <div style={{ padding: '16px 26px 22px', display: 'flex', gap: 10 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: '1px solid #26262610', background: '#26262606', color: 'rgba(38,38,38,0.7)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={() => { onConfirm(record.id); onClose() }}
                            style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', background: '#dc2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Report Row ───────────────────────────────────────────────────────────────

function ReportRow({ record, onPreview, onDownload, onDelete }) {
    const [hovered, setHovered] = useState(false)
    const s = STATUS_CONFIG[record.status] || STATUS_CONFIG.completed
    const created = new Date(record.createdAt)
    const dateStr = created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = created.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 110px auto', gap: 16, alignItems: 'center', padding: '14px 20px', borderRadius: 12, background: hovered ? '#26262604' : 'transparent', transition: 'background 0.15s ease', cursor: 'default' }}>

            {/* Title + meta */}
            <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#262626', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(38,38,38,0.45)', fontWeight: 500 }}>
                    {record.officer || 'Field Monitoring Officer'} · {record.id}
                </p>
            </div>

            {/* Period */}
            <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(38,38,38,0.7)' }}>{record.rangeLabel}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(38,38,38,0.4)' }}>{record.detectionCount ?? 0} detections</p>
            </div>

            {/* Date */}
            <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(38,38,38,0.7)' }}>{dateStr}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(38,38,38,0.4)' }}>{timeStr}</p>
            </div>

            {/* Status */}
            <div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
          {record.status === 'completed' && <CheckCircle size={10} />}
            {record.status === 'failed' && <AlertCircle size={10} />}
            {record.status === 'generating' && <Loader2 size={10} className="animate-spin" />}
            {s.label}
        </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s ease' }}>
                <button onClick={() => onPreview(record)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #26262610', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(38,38,38,0.5)', transition: 'all 0.15s' }}
                        title="Preview"
                        onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#15803d' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'rgba(38,38,38,0.5)' }}>
                    <Eye size={13} />
                </button>
                {record.status === 'completed' && (
                    <button onClick={() => onDownload(record)}
                            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #26262610', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(38,38,38,0.5)', transition: 'all 0.15s' }}
                            title="Download"
                            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#1d4ed8' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'rgba(38,38,38,0.5)' }}>
                        <Download size={13} />
                    </button>
                )}
                <button onClick={() => onDelete(record)}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #26262610', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(38,38,38,0.5)', transition: 'all 0.15s' }}
                        title="Delete"
                        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'rgba(38,38,38,0.5)' }}>
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    )
}

// ─── Full PDF generator (same logic as Dashboard, imported inline) ────────────

const generateAndSavePDF = async (detections, rangeLabel, userInfo = {}) => {
    const jsPDF = await loadJsPDF()
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const PW = 210, PH = 297, ML = 20, MR = 20, MT = 18, CW = PW - ML - MR
    let y = MT, pageNum = 1

    const newPage = () => { doc.addPage(); pageNum++; drawPageHeader(); y = 34 }
    const checkPage = (needed = 18) => { if (y + needed > PH - 18) newPage() }

    const line = (x1, y1, x2, y2, color = [200,200,200], width = 0.3) => {
        doc.setDrawColor(...color); doc.setLineWidth(width); doc.line(x1, y1, x2, y2)
    }
    const rect = (x, yy, w, h, fillRGB, strokeRGB, radius = 0) => {
        if (fillRGB) doc.setFillColor(...fillRGB)
        if (strokeRGB) doc.setDrawColor(...strokeRGB); else doc.setDrawColor(0,0,0,0)
        doc.setLineWidth(0.2)
        if (radius > 0) doc.roundedRect(x, yy, w, h, radius, radius, fillRGB && strokeRGB ? 'FD' : fillRGB ? 'F' : 'D')
        else doc.rect(x, yy, w, h, fillRGB && strokeRGB ? 'FD' : fillRGB ? 'F' : 'D')
    }
    const txt = (text, x, yy, opts = {}) => {
        const { size = 9, bold = false, color = [30,30,30], align = 'left', italic = false, maxW = null, lineHeight = 5 } = opts
        doc.setFontSize(size)
        doc.setFont('helvetica', bold ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal'))
        doc.setTextColor(...color)
        if (maxW) {
            const lines = doc.splitTextToSize(String(text), maxW)
            lines.forEach((l, i) => doc.text(l, x, yy + i * lineHeight, { align }))
            return lines.length * lineHeight
        }
        doc.text(String(text), x, yy, { align }); return lineHeight
    }

    const now = new Date()
    const reportId = `AGV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`
    const generatedAt = now.toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })

    const drawPageHeader = () => {
        rect(0, 0, PW, 24, [14,110,60])
        rect(ML, 4, 16, 16, [255,255,255], null, 2)
        txt('AV', ML + 4.2, 14, { size: 8, bold: true, color: [14,110,60] })
        txt('AgriVision', ML + 20, 10, { size: 13, bold: true, color: [255,255,255] })
        txt('Pest & Disease Surveillance Report  ·  DA-BPI PRIME Monitoring System', ML + 20, 16, { size: 7, color: [180,240,200] })
        txt('REPORT NO.', PW - MR - 1, 9, { size: 6, bold: true, color: [180,240,200], align: 'right' })
        txt(reportId, PW - MR - 1, 14, { size: 8, bold: true, color: [255,255,255], align: 'right' })
        txt(`Page ${pageNum}`, PW - MR - 1, 19, { size: 6, color: [180,240,200], align: 'right' })
        line(0, 24, PW, 24, [14,110,60], 0.8)
        line(0, 25.5, PW, 25.5, [234,179,8], 0.5)
    }

    const drawFooter = (pn, total) => {
        doc.setPage(pn)
        line(ML, PH - 14, PW - MR, PH - 14, [200,200,200], 0.3)
        txt('CONFIDENTIAL — For Authorized Use Only  ·  Bureau of Plant Industry (BPI), Department of Agriculture', ML, PH - 9, { size: 6, color: [130,130,130] })
        txt(`${generatedAt}  ·  Model: YOLOv8n  ·  Page ${pn} of ${total}`, PW - MR, PH - 9, { size: 6, color: [130,130,130], align: 'right' })
    }

    const sectionHeader = (label, number) => {
        checkPage(16)
        rect(ML, y, 3, 10, [14,110,60])
        txt(`${number}.  ${label.toUpperCase()}`, ML + 6, y + 7, { size: 9.5, bold: true, color: [20,20,20] })
        y += 14
    }

    const kvRow = (label, value, x, yy, labelW = 40) => {
        txt(label, x, yy, { size: 8, bold: true, color: [90,90,90] })
        txt(':', x + labelW - 4, yy, { size: 8, color: [90,90,90] })
        txt(value, x + labelW + 1, yy, { size: 8, color: [25,25,25] })
    }

    const badge = (label, x, yy, bgRGB, textRGB = [255,255,255]) => {
        const w = doc.getTextWidth(label) * (7/12) + 8
        rect(x, yy - 4, w, 6, bgRGB, null, 1.5)
        txt(label, x + 4, yy, { size: 7, bold: true, color: textRGB })
        return w
    }

    const drawTable = (headers, rows, colWidths, startX = ML, headerBg = [14,110,60]) => {
        const rowH = 8, totalW = colWidths.reduce((a, b) => a + b, 0)
        checkPage(rowH + 4)
        rect(startX, y, totalW, rowH, headerBg)
        let cx = startX
        headers.forEach((h, i) => { txt(h, cx + 3, y + 5.5, { size: 7.5, bold: true, color: [255,255,255] }); cx += colWidths[i] })
        y += rowH
        rows.forEach((row, ri) => {
            checkPage(rowH + 2)
            const bgColor = ri % 2 === 0 ? [247,250,247] : [255,255,255]
            rect(startX, y, totalW, rowH, bgColor, [235,235,235])
            cx = startX
            row.forEach((cell, ci) => {
                const cellStr = String(cell.value ?? cell)
                if (cell.badge) { badge(cellStr, cx + 2, y + 5.5, cell.bgColor || [80,80,80]) }
                else { txt(cellStr, cx + 3, y + 5.5, { size: 7.5, bold: cell.bold || false, color: cell.color || (cell.dim ? [120,120,120] : [30,30,30]), maxW: colWidths[ci] - 5, lineHeight: 4 }) }
                cx += colWidths[ci]
            })
            y += rowH
        })
        y += 5
    }

    const statCards = (items) => {
        const cardW = (CW - (items.length - 1) * 4) / items.length, cardH = 22
        checkPage(cardH + 6)
        items.forEach((item, i) => {
            const cx = ML + i * (cardW + 4)
            rect(cx, y, cardW, cardH, [245,250,245], [220,235,220], 2)
            txt(item.value, cx + 5, y + 12, { size: 16, bold: true, color: item.color || [14,110,60] })
            txt(item.label, cx + 5, y + 18.5, { size: 7, color: [110,110,110] })
        })
        y += cardH + 8
    }

    drawPageHeader(); y = 32

    const total = detections.length
    const pests = detections.filter(d => d.type === 'Pest').length
    const diseases = detections.filter(d => d.type === 'Disease').length
    const criticalCount = detections.filter(d => d.severity === 'critical').length
    const highCount = detections.filter(d => d.severity === 'high' || d.severity === 'critical').length
    const moderateCount = detections.filter(d => d.severity === 'moderate' || d.severity === 'medium').length
    const lowCount = detections.filter(d => d.severity === 'low').length
    const avgConf = total > 0 ? Math.round(detections.reduce((s, d) => s + d.confidence, 0) / total) : 0
    const uniqueLocations = [...new Set(detections.map(d => d.location).filter(Boolean))]
    const overallRisk = criticalCount > 0 ? 'HIGH' : highCount > 2 ? 'MEDIUM' : 'LOW'
    const riskColor = overallRisk === 'HIGH' ? [220,38,38] : overallRisk === 'MEDIUM' ? [217,119,6] : [22,163,74]

    rect(ML, y, CW, 36, [245,250,247], [200,225,210], 3)
    txt('PEST SURVEILLANCE & EARLY WARNING REPORT', ML + 6, y + 8, { size: 9, bold: true, color: [14,110,60] })
    txt('Pursuant to DA-BPI Circular No. 2020-001 · PRIME Monitoring Framework', ML + 6, y + 13.5, { size: 7, italic: true, color: [90,120,90] })
    line(ML + 6, y + 16, ML + CW * 0.6 - 4, y + 16, [190,215,200], 0.3)
    kvRow('Report Period', rangeLabel, ML + 6, y + 22)
    kvRow('Date Generated', generatedAt, ML + 6, y + 28)
    kvRow('Prepared by', userInfo.name || 'Field Monitoring Officer', ML + 6, y + 34)
    const riskX = PW - MR - 38
    rect(riskX, y + 6, 36, 18, riskColor, null, 3)
    txt('OVERALL RISK', riskX + 18, y + 13, { size: 6.5, bold: true, color: [255,255,255], align: 'center' })
    txt(overallRisk, riskX + 18, y + 20, { size: 11, bold: true, color: [255,255,255], align: 'center' })
    y += 44

    sectionHeader('Executive Summary', '1')
    const summary = `AgriVision AI surveillance logged ${total} detection event${total !== 1 ? 's' : ''} during ${rangeLabel}: ${pests} pest occurrence${pests !== 1 ? 's' : ''} and ${diseases} disease anomal${diseases !== 1 ? 'ies' : 'y'}. Of these, ${criticalCount} event${criticalCount !== 1 ? 's were' : ' was'} CRITICAL, ${highCount - criticalCount} HIGH, ${moderateCount} MODERATE, and ${lowCount} LOW severity. Average detection confidence: ${avgConf}%. ${uniqueLocations.length} field zone${uniqueLocations.length !== 1 ? 's' : ''} affected. Overall risk: ${overallRisk}.`
    const sumLines = doc.splitTextToSize(summary, CW - 10)
    checkPage(sumLines.length * 4.8 + 12)
    rect(ML, y - 2, CW, sumLines.length * 4.8 + 8, [248,252,248], [215,232,215], 2)
    badge(`RISK LEVEL: ${overallRisk}`, ML + 5, y + 4, riskColor)
    y += 7
    sumLines.forEach((l, i) => { txt(l, ML + 5, y + i * 4.8, { size: 8, color: [35,35,35] }) })
    y += sumLines.length * 4.8 + 10

    sectionHeader('Quantitative Detection Overview', '2')
    statCards([
        { label: 'Total Detections', value: String(total), color: [15,23,42] },
        { label: 'Pest Occurrences', value: String(pests), color: [133,77,14] },
        { label: 'Disease Anomalies', value: String(diseases), color: [22,101,52] },
        { label: 'High / Critical', value: String(highCount), color: [185,28,28] },
    ])

    sectionHeader('Severity Classification', '3')
    const sevRows = [
        [{ value: 'CRITICAL', badge: true, bgColor: [185,28,28] }, { value: String(criticalCount), bold: true, color: [185,28,28] }, { value: total > 0 ? `${Math.round(criticalCount/total*100)}%` : '—' }, 'Immediate field intervention required.'],
        [{ value: 'HIGH', badge: true, bgColor: [180,70,10] }, { value: String(highCount - criticalCount), bold: true, color: [180,70,10] }, { value: total > 0 ? `${Math.round((highCount-criticalCount)/total*100)}%` : '—' }, 'Schedule treatment within 24–48 hours.'],
        [{ value: 'MODERATE', badge: true, bgColor: [133,100,0] }, { value: String(moderateCount), bold: true, color: [133,100,0] }, { value: total > 0 ? `${Math.round(moderateCount/total*100)}%` : '—' }, 'Monitor closely; prepare treatment plan.'],
        [{ value: 'LOW', badge: true, bgColor: [21,128,61] }, { value: String(lowCount), bold: true, color: [21,128,61] }, { value: total > 0 ? `${Math.round(lowCount/total*100)}%` : '—' }, 'Continue routine monitoring.'],
    ]
    drawTable(['Severity', 'Count', 'Share', 'Recommended Action'], sevRows, [30, 18, 20, 102])

    sectionHeader('Chronological Detection Log', '4')
    if (detections.length === 0) {
        txt('No detection records for this period.', ML, y, { size: 8, italic: true, color: [150,150,150] }); y += 10
    } else {
        const sevColorMap = { critical: [185,28,28], high: [180,70,10], medium: [133,100,0], moderate: [133,100,0], low: [21,128,61] }
        const typeColorMap = { Pest: [133,77,14], Disease: [21,101,52] }
        const logRows = [...detections].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30).map((d, i) => {
            const ts = new Date(d.timestamp)
            const sev = (d.severity || 'low').toLowerCase()
            return [
                { value: String(i + 1), dim: true },
                ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                { value: d.name || 'Unknown', bold: true },
                { value: d.type, badge: true, bgColor: typeColorMap[d.type] || [80,80,80] },
                `${d.confidence}%`,
                { value: sev.charAt(0).toUpperCase() + sev.slice(1), badge: true, bgColor: sevColorMap[sev] || [80,80,80] },
                { value: d.location || 'Unknown', dim: true },
            ]
        })
        drawTable(['#', 'Date', 'Detected Class', 'Type', 'Conf.', 'Severity', 'Location'], logRows, [10, 30, 42, 18, 16, 22, 32])
    }

    const certBoxes = [
        { label: 'Prepared by', role: 'Field Monitoring Officer', name: userInfo.name || '___________________________' },
        { label: 'Reviewed by', role: 'IPM Program Coordinator', name: '___________________________' },
        { label: 'Noted by', role: 'Regional Plant Health Officer', name: '___________________________' },
    ]
    sectionHeader('Certification and Approval', '5')
    checkPage(50)
    const certW = (CW - 8) / 3
    certBoxes.forEach((cb, i) => {
        const cx = ML + i * (certW + 4)
        rect(cx, y, certW, 38, [248,250,248], [210,225,210], 2)
        txt(cb.label.toUpperCase(), cx + 5, y + 7, { size: 7, bold: true, color: [14,110,60] })
        line(cx + 5, y + 23, cx + certW - 5, y + 23, [160,160,160], 0.4)
        txt(cb.name, cx + certW / 2, y + 28, { size: 8, bold: true, color: [30,30,30], align: 'center' })
        txt(cb.role, cx + certW / 2, y + 34, { size: 7, color: [100,100,100], align: 'center' })
    })
    y += 46

    const totalPages = doc.internal.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) drawFooter(p, totalPages)

    const filename = `AgriVision_Report_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${reportId}.pdf`
    doc.save(filename)
    return { filename, reportId }
}

// ─── Main Reports Page ────────────────────────────────────────────────────────

export default function Reports() {
    const [records, setRecords] = useState(() => loadRecords())
    const [generateOpen, setGenerateOpen] = useState(false)
    const [previewRecord, setPreviewRecord] = useState(null)
    const [deleteRecord, setDeleteRecord] = useState(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [toast, setToast] = useState(null)
    const [liveDetections, setLiveDetections] = useState([])

    const showToast = useCallback((message, type = 'info') => setToast({ message, type, id: Date.now() }), [])

    // Fetch live detections for report generation
    useEffect(() => {
        const fetchDetections = async () => {
            try {
                const noThrow = { validateStatus: () => true }
                // dynamic import to avoid circular deps — use fetch fallback
                const res = await fetch('/api/detections').catch(() => null)
                if (res?.ok) {
                    const json = await res.json()
                    const raw = json?.data ?? json ?? []
                    if (Array.isArray(raw)) {
                        const PEST_KEYWORDS = ['aphid','whitefly','mite','beetle','caterpillar','thrip','weevil','locust','pest','planthopper','leafhopper','borer','folder','armyworm']
                        const deriveType = (item) => {
                            const name = (item.class ?? item.label ?? item.name ?? item.type ?? '').toLowerCase()
                            return PEST_KEYWORDS.some(k => name.includes(k)) ? 'Pest' : 'Disease'
                        }
                        const normalized = raw.map((item, i) => ({
                            id: item.id ?? item._id ?? `${i}`,
                            timestamp: item.timestamp ?? item.createdAt ?? new Date().toISOString(),
                            type: deriveType(item),
                            name: item.class ?? item.label ?? item.name ?? 'Unknown',
                            confidence: item.confidence != null ? (item.confidence <= 1 ? Math.round(item.confidence * 100) : Math.round(item.confidence)) : 0,
                            location: item.location ?? item.field ?? 'Unknown',
                            severity: (() => {
                                if (item.severity) return String(item.severity).toLowerCase()
                                const c = item.confidence != null ? (item.confidence <= 1 ? item.confidence : item.confidence / 100) : 0
                                return c >= 0.9 ? 'high' : c >= 0.75 ? 'medium' : 'low'
                            })(),
                        }))
                        setLiveDetections(normalized)
                    }
                }
            } catch { /* api unavailable */ }
        }
        fetchDetections()
        const interval = setInterval(fetchDetections, 10000)
        return () => clearInterval(interval)
    }, [])

    const handleGenerate = async ({ rangeLabel, title, officer }) => {
        const tempId = `AGV-${Date.now()}`
        const tempRecord = {
            id: tempId,
            title,
            rangeLabel,
            officer,
            status: 'generating',
            createdAt: new Date().toISOString(),
            detectionCount: liveDetections.length,
            highCount: liveDetections.filter(d => d.severity === 'high' || d.severity === 'critical').length,
        }
        const updated = [tempRecord, ...records]
        setRecords(updated)
        saveRecords(updated)
        showToast('Compiling surveillance report…', 'info')

        try {
            const { filename, reportId } = await generateAndSavePDF(liveDetections, rangeLabel, { name: officer })
            const final = updated.map(r => r.id === tempId ? { ...r, id: reportId, status: 'completed', filename } : r)
            setRecords(final)
            saveRecords(final)
            showToast('Report generated and downloaded!', 'success')
        } catch (e) {
            const failed = updated.map(r => r.id === tempId ? { ...r, status: 'failed' } : r)
            setRecords(failed)
            saveRecords(failed)
            showToast(`Report failed: ${e.message || 'Unknown error'}`, 'error')
        }
    }

    const handleDownload = async (record) => {
        showToast('Re-generating PDF for download…', 'info')
        try {
            await generateAndSavePDF(liveDetections, record.rangeLabel, { name: record.officer })
            showToast('PDF downloaded successfully!', 'success')
        } catch (e) {
            showToast(`Download failed: ${e.message}`, 'error')
        }
    }

    const handleDelete = (id) => {
        const updated = records.filter(r => r.id !== id)
        setRecords(updated)
        saveRecords(updated)
        showToast('Report record removed.', 'success')
    }

    // Filtered records
    const filtered = records.filter(r => {
        const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()) || (r.officer || '').toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter
        return matchesSearch && matchesStatus
    })

    // Stat computations
    const completedCount = records.filter(r => r.status === 'completed').length
    const totalDetections = records.reduce((s, r) => s + (r.detectionCount ?? 0), 0)
    const thisMonth = records.filter(r => {
        const d = new Date(r.createdAt); const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    // Sparkline data: reports per day for last 7 days
    const reportSparkData = (() => {
        const days = Array(7).fill(0)
        const now = new Date()
        records.forEach(r => {
            const d = new Date(r.createdAt)
            const diff = Math.floor((now - d) / 86400000)
            if (diff >= 0 && diff < 7) days[6 - diff]++
        })
        return days
    })()

    return (
        <div className="min-h-screen bg-white">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .report-row-anim { animation: fadeIn 0.25s ease forwards; }
      `}</style>

            <main className="max-w-screen-2xl mx-auto px-4 sm:px-4 lg:px-8 xl:px-12 py-2 lg:py-8 flex flex-col gap-10 font-sans text-[#262626]">

                {/* ── Header ── */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '28px 32px 26px', borderBottom: '1px solid #26262608', background: 'white' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(38,38,38,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>DA-BPI PRIME Monitoring</p>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#262626', letterSpacing: '-0.02em' }}>Report History</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(38,38,38,0.45)' }}>Track, download, and manage your surveillance reports</p>
                    </div>
                    <button onClick={() => setGenerateOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 14, border: 'none', background: '#262626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                        <Plus size={15} />Generate Report
                    </button>
                </div>

                {/* ── Stat Cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, padding: '0 0 0' }}>
                    <StatCard icon={<FileText size={16} />} label="Total Reports" value={records.length} sub="all time" color="#262626" sparkData={reportSparkData} />
                    <StatCard icon={<CheckCircle size={16} />} label="Completed" value={completedCount} sub="successfully generated" color="#10b981" sparkData={reportSparkData.map((v, i) => Math.round(v * 0.9))} />
                    <StatCard icon={<Calendar size={16} />} label="This Month" value={thisMonth} sub="reports generated" color="#3b82f6" sparkData={reportSparkData} />
                    <StatCard icon={<BarChart2 size={16} />} label="Total Detections Logged" value={totalDetections} sub="across all reports" color="#f97316" sparkData={reportSparkData.map(v => v * 4)} />
                </div>

                {/* ── Table Card ── */}
                <div style={{ background: 'white', border: '1px solid #26262610', borderRadius: 14, overflow: 'hidden' }}>

                    {/* Table header / filters */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 20px', borderBottom: '1px solid #26262608', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#262626' }}>Reports</p>
                            {records.length > 0 && (
                                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#26262608', color: 'rgba(38,38,38,0.5)' }}>{filtered.length}</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {/* Search */}
                            <div style={{ position: 'relative' }}>
                                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(38,38,38,0.35)', pointerEvents: 'none' }} />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search reports…"
                                    style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: '1px solid #26262612', background: '#26262604', fontSize: 12, color: '#262626', outline: 'none', width: 180, fontFamily: 'inherit' }}
                                    onFocus={e => e.target.style.borderColor = '#10b981'}
                                    onBlur={e => e.target.style.borderColor = '#26262612'}
                                />
                            </div>

                            {/* Status filter */}
                            {['all', 'completed', 'failed'].map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                        style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: statusFilter === s ? '#26262610' : 'transparent', color: statusFilter === s ? '#262626' : 'rgba(38,38,38,0.45)', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Column headers */}
                    {filtered.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 110px auto', gap: 16, padding: '8px 20px', borderBottom: '1px solid #26262608' }}>
                            {['Report Title', 'Period', 'Generated', 'Status', ''].map((h, i) => (
                                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(38,38,38,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
                            ))}
                        </div>
                    )}

                    {/* Rows */}
                    {filtered.length === 0 ? (
                        <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#26262806', border: '1.5px dashed #26262615', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <FileText size={22} style={{ color: 'rgba(38,38,38,0.2)' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(38,38,38,0.4)' }}>
                                {records.length === 0 ? 'No reports yet' : 'No matching reports'}
                            </p>
                            <p style={{ margin: '6px 0 20px', fontSize: 12, color: 'rgba(38,38,38,0.3)' }}>
                                {records.length === 0 ? 'Generate your first surveillance report to get started.' : 'Try adjusting your search or filter.'}
                            </p>
                            {records.length === 0 && (
                                <button onClick={() => setGenerateOpen(true)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, border: 'none', background: '#262626', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    <Plus size={14} />Generate First Report
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '6px 0' }}>
                            {filtered.map((record, i) => (
                                <div key={record.id} className="report-row-anim" style={{ animationDelay: `${i * 0.03}s` }}>
                                    <ReportRow
                                        record={record}
                                        onPreview={setPreviewRecord}
                                        onDownload={handleDownload}
                                        onDelete={setDeleteRecord}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer note */}
                    {filtered.length > 0 && (
                        <div style={{ padding: '12px 20px', borderTop: '1px solid #26262806', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={11} style={{ color: 'rgba(38,38,38,0.3)' }} />
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(38,38,38,0.35)' }}>
                                Reports are stored locally in your browser. Re-downloading regenerates the PDF using current detection data.
                            </p>
                        </div>
                    )}
                </div>

            </main>

            {/* Modals */}
            <GenerateReportModal open={generateOpen} onClose={() => setGenerateOpen(false)} onGenerate={handleGenerate} />
            <PreviewModal record={previewRecord} open={!!previewRecord} onClose={() => setPreviewRecord(null)} onDownload={handleDownload} />
            <DeleteConfirmModal record={deleteRecord} open={!!deleteRecord} onClose={() => setDeleteRecord(null)} onConfirm={handleDelete} />
            {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    )
}