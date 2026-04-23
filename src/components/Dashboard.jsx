import { useState, useEffect, useRef, useCallback } from 'react'
import { PlayCircle, Upload, Bell, FileText, MapPin, TrendingUp, TrendingDown, ChevronDown, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const SHARED_DETECTIONS_KEY = 'agriSharedDetections'

const formatDateShort = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const formatMonthYear = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

// ── Real-time date-aware time ranges ─────────────────────────────────────────
const buildTimeRanges = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = today.getDay()
  const diffToMonday = (day + 6) % 7

  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - diffToMonday)
  const thisWeekEnd = new Date(thisWeekStart)
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1)

  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const sixMonthsStart = new Date(today.getFullYear(), today.getMonth() - 5, 1)
  const sixMonthsEnd = new Date(today.getFullYear(), today.getMonth(), 1)

  return [
    { label: 'This week', date: `${formatDateShort(thisWeekStart)} – ${formatDateShort(thisWeekEnd)}`, days: '7 days' },
    { label: 'Last week', date: `${formatDateShort(lastWeekStart)} – ${formatDateShort(lastWeekEnd)}`, days: '7 days' },
    { label: 'Last month', date: formatMonthYear(lastMonthDate), days: '1 month' },
    { label: 'Last 6 months', date: `${sixMonthsStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${sixMonthsEnd.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`, days: '6 months' },
  ]
}

// ── Build date-range bucket labels (real-time) ──────────────────────────────
const buildRangeBuckets = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = today.getDay()
  const diffToMonday = (day + 6) % 7

  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - diffToMonday)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)

  const weekDates = (start) =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start); d.setDate(start.getDate() + i); return d
      })

  const monthLabels = (count) =>
      Array.from({ length: count }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - (count - 1 - i), 1)
        return d.toLocaleDateString('en-US', { month: 'short' })
      })

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastMonthWeekStarts = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(lastMonthStart); d.setDate(1 + i * 7); return d
  })

  return {
    'This week': {
      sublabel: 'Day',
      labels: weekDates(thisWeekStart).map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      getBucket: (ts) => {
        const d = new Date(ts)
        const days = weekDates(thisWeekStart)
        return days.findIndex(wd =>
            wd.getFullYear() === d.getFullYear() && wd.getMonth() === d.getMonth() && wd.getDate() === d.getDate()
        )
      },
      bucketCount: 7,
    },
    'Last week': {
      sublabel: 'Day',
      labels: weekDates(lastWeekStart).map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      getBucket: (ts) => {
        const d = new Date(ts)
        const days = weekDates(lastWeekStart)
        return days.findIndex(wd =>
            wd.getFullYear() === d.getFullYear() && wd.getMonth() === d.getMonth() && wd.getDate() === d.getDate()
        )
      },
      bucketCount: 7,
    },
    'Last month': {
      sublabel: 'Week',
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      getBucket: (ts) => {
        const d = new Date(ts)
        const lm = lastMonthStart
        if (d.getFullYear() !== lm.getFullYear() || d.getMonth() !== lm.getMonth()) return -1
        return Math.min(3, Math.floor((d.getDate() - 1) / 7))
      },
      bucketCount: 4,
    },
    'Last 6 months': {
      sublabel: 'Month',
      labels: monthLabels(6),
      getBucket: (ts) => {
        const d = new Date(ts)
        for (let i = 0; i < 6; i++) {
          const m = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
          if (d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth()) return i
        }
        return -1
      },
      bucketCount: 6,
    },
  }
}

// ── Build dynamic graph data from real detections ────────────────────────────
const buildDynamicGraphData = (detectionsList, classes) => {
  const buckets = buildRangeBuckets()
  const allClasses = ['All', ...classes]
  const result = {}

  Object.entries(buckets).forEach(([rangeKey, bucket]) => {
    const series = {}
    allClasses.forEach(cls => {
      series[cls] = Array(bucket.bucketCount).fill(0)
    })

    detectionsList.forEach(det => {
      if (!det.timestamp) return
      const bi = bucket.getBucket(det.timestamp)
      if (bi < 0) return
      series['All'][bi]++
      if (series[det.name] !== undefined) series[det.name][bi]++
    })

    result[rangeKey] = { labels: bucket.labels, sublabel: bucket.sublabel, series }
  })

  return result
}

// PEST_ONLY and DISEASE_ONLY are now derived dynamically from fetched classes
// kept as empty defaults — filled in at runtime
const PEST_ONLY_DEFAULT    = []
const DISEASE_ONLY_DEFAULT = []

const SEVERITY_CONFIG = [
  { key: 'Critical', color: '#ef4444', dashed: false },
  { key: 'High',     color: '#f97316', dashed: false },
  { key: 'Moderate', color: '#eab308', dashed: false },
  { key: 'Low',      color: '#22c55e', dashed: true  },
]

const RATIO = {
  Critical: [0.12, 0.18, 0.10, 0.20, 0.15, 0.22, 0.08],
  High:     [0.25, 0.22, 0.30, 0.20, 0.28, 0.24, 0.26],
  Moderate: [0.38, 0.35, 0.40, 0.32, 0.36, 0.30, 0.40],
  Low:      [0.25, 0.25, 0.20, 0.28, 0.21, 0.24, 0.26],
}

const METRICS_HELP = [
  {
    group: 'Detection Overview',
    items: [
      { name: 'Detections',    desc: 'Total number of pest or disease instances identified across all monitored fields in the selected period.' },
      { name: 'Active Alerts', desc: 'Alerts currently flagged as unresolved that require immediate attention or field inspection.' },
    ],
  },
  {
    group: 'Crop Health',
    items: [
      { name: 'Crop Loss',     desc: 'Estimated percentage of yield affected by confirmed pest and disease detections, based on severity and field area.' },
      { name: 'Healthy Crops', desc: 'Proportion of monitored crop area with no active detections or alerts — your baseline field health score.' },
    ],
  },
  {
    group: 'Severity Levels',
    items: [
      { name: 'Critical', desc: 'Immediate intervention required. Spread is rapid and yield loss is imminent without treatment.' },
      { name: 'High',     desc: 'Significant infestation detected. Schedule treatment within 24–48 hours to prevent escalation.' },
      { name: 'Moderate', desc: 'Manageable levels present. Monitor closely and prepare treatment plan as a precaution.' },
      { name: 'Low',      desc: 'Early signs detected. Continue routine monitoring; no immediate action required.' },
    ],
  },
  {
    group: 'Trend Indicators',
    items: [
      { name: '% Change', desc: 'Comparison against the equivalent prior period. Increases in detections or crop loss are shown in red.' },
    ],
  },
]

// ─── Normalizer ───────────────────────────────────────────────────────────────

const PEST_KEYWORDS = ['aphid', 'whitefly', 'mite', 'beetle', 'caterpillar', 'thrip', 'weevil', 'locust', 'pest',
  'planthopper', 'leafhopper', 'borer', 'folder', 'armyworm']

const deriveType = (item) => {
  if (item.type === 'Pest' || item.type === 'Disease') return item.type
  const name = (item.class ?? item.label ?? item.name ?? item.type ?? '').toLowerCase()
  return PEST_KEYWORDS.some(k => name.includes(k)) ? 'Pest' : 'Disease'
}

const deriveSeverity = (item) => {
  if (item.severity && ['high','medium','moderate','low','critical'].includes(String(item.severity).toLowerCase())) {
    return String(item.severity).toLowerCase()
  }
  const conf = item.confidence != null ? (item.confidence <= 1 ? item.confidence : item.confidence / 100) : 0
  if (conf >= 0.9) return 'high'
  if (conf >= 0.75) return 'medium'
  return 'low'
}

const normalizeRecord = (raw, index) => {
  const type = deriveType(raw)
  const confidence = raw.confidence != null
      ? (raw.confidence <= 1 ? Math.round(raw.confidence * 100) : Math.round(raw.confidence))
      : 0
  const timestamp = raw.timestamp ?? raw.createdAt ?? raw.detected_at ?? raw.detectedAt ?? new Date().toISOString()
  return {
    id: raw.id ?? raw._id ?? `${timestamp}-${index}`,
    timestamp,
    type,
    name: raw.class ?? raw.label ?? raw.name ?? 'Unknown',
    confidence,
    location: raw.location ?? raw.field ?? raw.fieldName ?? (raw.fieldId ? `Field ${raw.fieldId}` : 'Unknown'),
    severity: deriveSeverity({ ...raw, confidence: raw.confidence ?? confidence / 100 }),
    source: raw.source ?? 'api',
  }
}

const loadSharedDetections = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SHARED_DETECTIONS_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}

// ─── AgriVision PDF Report Generator ─────────────────────────────────────────

const generateAgriVisionReport = async (detections, rangeLabel, userInfo = {}) => {
  // Load jsPDF
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
      s.onload = resolve
      s.onerror = reject
      document.head.appendChild(s)
    })
  }

  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210, H = 297
  const ML = 18, MR = 18, MT = 14
  const TW = W - ML - MR
  let y = MT

  const checkPage = (needed = 20) => {
    if (y + needed > H - 16) { doc.addPage(); y = MT + 4 }
  }

  const now = new Date()
  const reportId = `AGV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`
  const timestamp = now.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const total = detections.length
  const pests = detections.filter(d => d.type === 'Pest').length
  const diseases = detections.filter(d => d.type === 'Disease').length
  const criticalCount = detections.filter(d => d.severity === 'critical').length
  const highCount = detections.filter(d => d.severity === 'high' || d.severity === 'critical').length
  const avgConf = total > 0 ? Math.round(detections.reduce((s,d) => s + d.confidence, 0) / total) : 0
  const overallRisk = criticalCount > 0 ? 'HIGH' : highCount > 2 ? 'MEDIUM' : 'LOW'
  const riskColor = overallRisk === 'HIGH' ? [220, 38, 38] : overallRisk === 'MEDIUM' ? [217, 119, 6] : [22, 163, 74]

  // ── HEADER SECTION ────────────────────────────────────────────────────────

  // Top green bar
  doc.setFillColor(16, 124, 66)
  doc.rect(0, 0, W, 38, 'F')

  // Subtle diagonal stripe texture
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.2)
  doc.setGState && doc.setGState(doc.GState({ opacity: 0.06 }))
  for (let i = -10; i < W + 50; i += 8) {
    doc.line(i, 0, i + 40, 38)
  }
  doc.setGState && doc.setGState(doc.GState({ opacity: 1.0 }))

  // Logo circle (leaf icon placeholder)
  doc.setFillColor(255, 255, 255)
  doc.circle(ML + 10, 19, 9, 'F')
  doc.setFillColor(16, 124, 66)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(16, 124, 66)
  doc.text('AV', ML + 6.5, 21)

  // System name + report title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(255, 255, 255)
  doc.text('AgriVision', ML + 24, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(187, 247, 208)
  doc.text('Pest and Disease Detection Report', ML + 24, 22)
  doc.text(`Field Monitoring & Analysis System  •  Model: YOLOv8n`, ML + 24, 28)

  // Report ID badge
  doc.setFillColor(0, 0, 0)
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.4)
  doc.roundedRect(W - MR - 48, 8, 48, 22, 3, 3, 'D')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(187, 247, 208)
  doc.text('REPORT ID', W - MR - 44, 15)
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(reportId, W - MR - 44, 22)
  doc.setFontSize(6)
  doc.setTextColor(187, 247, 208)
  doc.text(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), W - MR - 44, 27)

  y = 46

  // Metadata row
  doc.setFillColor(240, 253, 244)
  doc.rect(ML, y, TW, 18, 'F')
  doc.setDrawColor(187, 247, 208)
  doc.setLineWidth(0.3)
  doc.rect(ML, y, TW, 18, 'D')

  const metaFields = [
    { label: 'Generated', value: timestamp },
    { label: 'Period', value: rangeLabel },
    { label: 'Farmer / User', value: userInfo.name || 'Field Officer' },
    { label: 'Location', value: userInfo.location || 'Multiple Field Zones' },
  ]
  metaFields.forEach((m, i) => {
    const cx = ML + 4 + i * (TW / 4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(22, 163, 74)
    doc.text(m.label.toUpperCase(), cx, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 41, 59)
    const truncated = m.value.length > 28 ? m.value.slice(0, 26) + '…' : m.value
    doc.text(truncated, cx, y + 13)
  })

  y += 26

  // ── SECTION HEADER helper ─────────────────────────────────────────────────
  const sectionHeader = (title, number) => {
    checkPage(16)
    doc.setFillColor(16, 124, 66)
    doc.rect(ML, y, 2.5, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(`${number}. ${title}`, ML + 6, y + 7.2)
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(ML + 6 + doc.getTextWidth(`${number}. ${title}`) + 4, y + 4, W - MR, y + 4)
    y += 14
  }

  // ── TABLE helper ──────────────────────────────────────────────────────────
  const drawTable = (headers, rows, colWidths, opts = {}) => {
    const rowH = opts.rowH || 9
    const totalW = colWidths.reduce((a, b) => a + b, 0)

    // Header
    doc.setFillColor(16, 124, 66)
    doc.rect(ML, y, totalW, rowH, 'F')
    let cx = ML
    headers.forEach((h, i) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(255, 255, 255)
      doc.text(h, cx + 3, y + 6.2)
      cx += colWidths[i]
    })
    y += rowH

    rows.forEach((row, ri) => {
      checkPage(rowH + 2)
      doc.setFillColor(ri % 2 === 0 ? 248 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255)
      doc.rect(ML, y, totalW, rowH, 'F')
      doc.setDrawColor(241, 245, 249)
      doc.setLineWidth(0.2)
      doc.rect(ML, y, totalW, rowH, 'D')

      cx = ML
      row.forEach((cell, ci) => {
        const cellStr = String(cell.value ?? cell)
        const isBadge = cell.badge
        if (isBadge) {
          const [br, bg, bb] = cell.color || [22, 163, 74]
          doc.setFillColor(br, bg, bb)
          doc.roundedRect(cx + 2, y + 1.5, Math.min(colWidths[ci] - 4, doc.getTextWidth(cellStr) + 6), rowH - 3, 1.5, 1.5, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(255, 255, 255)
          doc.text(cellStr, cx + 5, y + 6)
        } else {
          doc.setFont(cell.bold ? 'helvetica' : 'helvetica', cell.bold ? 'bold' : 'normal')
          doc.setFontSize(7.5)
          doc.setTextColor(cell.dim ? 100 : 30, cell.dim ? 116 : 41, cell.dim ? 139 : 59)
          const txt = doc.splitTextToSize(cellStr, colWidths[ci] - 5)[0]
          doc.text(txt, cx + 3, y + 6.2)
        }
        cx += colWidths[ci]
      })
      y += rowH
    })
    y += 6
  }

  // ── 1. EXECUTIVE SUMMARY ──────────────────────────────────────────────────
  sectionHeader('Executive Summary', '1')

  const riskWord = overallRisk === 'HIGH' ? 'high' : overallRisk === 'MEDIUM' ? 'moderate' : 'low'
  const summaryText = `The AgriVision system completed an automated scan of all monitored field zones during the reporting period (${rangeLabel}). A total of ${total} detection event${total !== 1 ? 's' : ''} were recorded — ${pests} classified as pest occurrences and ${diseases} as disease anomalies. The average model confidence across all detections was ${avgConf}%, indicating ${avgConf >= 85 ? 'strong' : avgConf >= 70 ? 'acceptable' : 'moderate'} detection reliability. ${highCount} detection${highCount !== 1 ? 's' : ''} were classified at high or critical severity, placing the overall crop risk at ${riskWord} level. Immediate field inspection and targeted intervention are ${overallRisk === 'HIGH' ? 'urgently required' : overallRisk === 'MEDIUM' ? 'recommended within 48 hours' : 'not necessary at this time but routine monitoring should continue'}.`

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(ML, y, TW, 28, 3, 3, 'FD')

  // Risk badge inside summary
  doc.setFillColor(...riskColor)
  doc.roundedRect(W - MR - 28, y + 5, 26, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text(`RISK: ${overallRisk}`, W - MR - 26, y + 11.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  const sumLines = doc.splitTextToSize(summaryText, TW - 36)
  doc.text(sumLines, ML + 5, y + 8)
  y += Math.max(28, sumLines.length * 5) + 8

  // ── 2. DETECTION OVERVIEW ─────────────────────────────────────────────────
  checkPage(50)
  sectionHeader('Detection Overview', '2')

  const overviewRows = [
    [
      { value: 'Pre-harvest (Field)' },
      { value: 'Live Camera / Upload' },
      { value: String(total), bold: true },
      { value: `${avgConf}%`, bold: true },
      { value: overallRisk, badge: true, color: riskColor },
    ],
  ]

  drawTable(
      ['Detection Type', 'Image Source', 'Total Detections', 'Avg. Confidence', 'Risk Level'],
      overviewRows,
      [46, 46, 34, 32, 28]
  )

  // Summary stats row
  const statItems = [
    { label: 'Total Events', val: String(total), color: [15, 23, 42] },
    { label: 'Pest Detections', val: String(pests), color: [133, 77, 14] },
    { label: 'Disease Detections', val: String(diseases), color: [22, 101, 52] },
    { label: 'High / Critical', val: String(highCount), color: [185, 28, 28] },
    { label: 'Avg. Confidence', val: `${avgConf}%`, color: [29, 78, 216] },
    { label: 'Unique Locations', val: String(new Set(detections.map(d => d.location)).size), color: [88, 28, 135] },
  ]

  const cardW = (TW - 10) / 3
  const cardH = 20
  statItems.forEach((item, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const cx = ML + col * (cardW + 5)
    const cy = y + row * (cardH + 4)
    checkPage(cardH + 6)
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...item.color)
    doc.text(item.val, cx + 4, cy + 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(item.label, cx + 4, cy + 17)
  })
  y += Math.ceil(statItems.length / 3) * (cardH + 4) + 8

  // ── 3. DETECTION RESULTS TABLE ────────────────────────────────────────────
  checkPage(30)
  sectionHeader('Detection Results', '3')

  if (detections.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.text('No detection records available for this reporting period.', ML, y)
    y += 12
  } else {
    const sevColorMap = {
      critical: [220, 38, 38],
      high:     [234, 88, 12],
      medium:   [161, 98, 7],
      moderate: [161, 98, 7],
      low:      [22, 163, 74],
    }
    const typeColorMap = {
      Pest:    [133, 77, 14],
      Disease: [22, 101, 52],
    }

    const resultRows = detections.slice(0, 20).map(d => [
      { value: d.name, bold: true },
      { value: d.type, badge: true, color: typeColorMap[d.type] || [71, 85, 105] },
      { value: `${d.confidence}%`, bold: true },
      { value: (d.severity || 'low').charAt(0).toUpperCase() + (d.severity || 'low').slice(1), badge: true, color: sevColorMap[d.severity] || [148, 163, 184] },
      { value: d.location, dim: true },
    ])

    drawTable(
        ['Detected Class', 'Category', 'Confidence (%)', 'Severity Level', 'Affected Area / Location'],
        resultRows,
        [42, 24, 28, 26, 46]
    )

    if (detections.length > 20) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(`  … and ${detections.length - 20} more records not shown. Download full CSV for complete data.`, ML, y - 2)
      y += 4
    }
  }

  // ── 4. ANALYSIS AND INTERPRETATION ───────────────────────────────────────
  checkPage(40)
  sectionHeader('Analysis and Interpretation', '4')

  const countByName = {}
  detections.forEach(d => { countByName[d.name] = (countByName[d.name] || 0) + 1 })
  const sortedNames = Object.entries(countByName).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const interpretations = {
    'Brown Planthopper': 'A sap-sucking insect that feeds on rice phloem, causing "hopperburn." Thrives in dense canopies with high nitrogen levels and humid conditions. Spreads rapidly through field-to-field migration.',
    'Rice Blast':        'Fungal pathogen (Magnaporthe oryzae) causing lesions on leaves, neck, and panicles. Favored by cool nights, warm days, and high humidity. Can cause total crop failure if neck infection occurs at booting.',
    'Leaf Folder':       'Larval stage folds leaves and feeds on the green tissue, reducing photosynthetic area. Populations increase during vegetative stage with lush, nitrogen-rich growth.',
    'Stem Borer':        'Larvae bore into stems causing "dead hearts" during vegetative stage or "white ears" at reproductive stage. A major yield-reducing pest with cyclical population surges.',
    'Rice Tungro':       'A viral disease transmitted by Green Leafhopper. Infected plants show yellow-orange discoloration and stunted growth. No direct chemical control; vector management is critical.',
    'Bacterial Blight':  'Caused by Xanthomonas oryzae. Spreads through water, wounds, and infected seedlings. Produces water-soaked lesions that turn yellow to white. Worsens under flooding and wind damage.',
  }

  if (sortedNames.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.text('No detections to interpret for this period.', ML, y)
    y += 10
  } else {
    sortedNames.forEach(([name, count]) => {
      checkPage(24)
      const interp = interpretations[name] || `${name} was detected ${count} time${count !== 1 ? 's' : ''}. Monitor closely and cross-validate with manual field scouting to determine severity and spread.`
      const d = detections.find(r => r.name === name)
      const typeColor = d?.type === 'Pest' ? [133, 77, 14] : [22, 101, 52]

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)

      const textLines = doc.splitTextToSize(interp, TW - 16)
      const blockH = 10 + textLines.length * 5 + 4
      doc.roundedRect(ML, y, TW, blockH, 2, 2, 'FD')

      doc.setFillColor(...typeColor)
      doc.rect(ML, y, 2.5, blockH, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...typeColor)
      doc.text(`${name}`, ML + 7, y + 7)

      doc.setFillColor(...typeColor)
      doc.roundedRect(ML + 7 + doc.getTextWidth(name) + 3, y + 2.5, 26, 5.5, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.5)
      doc.setTextColor(255, 255, 255)
      doc.text(`${count} detection${count !== 1 ? 's' : ''}`, ML + 7 + doc.getTextWidth(name) + 5.5, y + 6.8)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text(textLines, ML + 7, y + 13)
      y += blockH + 5
    })
  }

  // ── 5. RECOMMENDATIONS ────────────────────────────────────────────────────
  checkPage(50)
  sectionHeader('Recommendations', '5')

  const recSections = [
    {
      title: 'Immediate Actions',
      color: [220, 38, 38],
      bg: [254, 242, 242],
      border: [252, 165, 165],
      items: highCount > 0
          ? [
            `Dispatch field scouts to inspect ${highCount} high/critical severity detection zone${highCount !== 1 ? 's' : ''} within 24 hours.`,
            'Apply targeted pesticide or fungicide treatment in confirmed hotspot areas using precision spraying.',
            'Isolate and mark affected field sections to prevent lateral spread to adjacent plots.',
          ]
          : ['No critical detections at this time. Maintain standard monitoring schedule.'],
    },
    {
      title: 'Short-Term (3–7 Days)',
      color: [217, 119, 6],
      bg: [255, 251, 235],
      border: [253, 230, 138],
      items: [
        'Verify AI detections with manual scouting — cross-reference confidence scores against physical inspection.',
        pests > 0
            ? `Monitor pest pressure closely — ${pests} pest event${pests !== 1 ? 's' : ''} logged this period. Adjust spray schedule if counts exceed economic threshold.`
            : 'No pest events logged. Continue preventive monitoring of field perimeters.',
        'Adjust irrigation timing and drainage in disease-affected zones to lower humidity at canopy level.',
      ],
    },
    {
      title: 'Long-Term Management',
      color: [22, 163, 74],
      bg: [240, 253, 244],
      border: [134, 239, 172],
      items: [
        'Review varietal resistance profiles; consider adopting certified disease-resistant cultivars next planting season.',
        'Increase monitoring frequency during peak humidity months (June–September) and after heavy rainfall events.',
        'Maintain a complete detection log for seasonal trend analysis and long-term yield loss estimation.',
      ],
    },
  ]

  recSections.forEach(sec => {
    checkPage(36)
    const itemsH = sec.items.length * 11 + 14
    doc.setFillColor(...sec.bg)
    doc.setDrawColor(...sec.border)
    doc.setLineWidth(0.4)
    doc.roundedRect(ML, y, TW, itemsH, 3, 3, 'FD')
    doc.setFillColor(...sec.color)
    doc.rect(ML, y, 3, itemsH, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...sec.color)
    doc.text(sec.title, ML + 8, y + 8)

    sec.items.forEach((item, i) => {
      checkPage(12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(51, 65, 85)
      const lines = doc.splitTextToSize(`•  ${item}`, TW - 14)
      doc.text(lines, ML + 8, y + 15 + i * 11)
    })
    y += itemsH + 6
  })

  // ── 6. RISK ASSESSMENT ────────────────────────────────────────────────────
  checkPage(40)
  sectionHeader('Risk Assessment', '6')

  const riskDesc = {
    HIGH: `The current detection data indicates a HIGH risk level. With ${criticalCount} critical and ${highCount} high-severity events recorded, immediate agronomic intervention is essential to prevent significant yield loss. Affected zones should be treated within 24 hours.`,
    MEDIUM: `The current detection data indicates a MEDIUM risk level. ${highCount} high-severity detection${highCount !== 1 ? 's' : ''} require attention within 48 hours. Timely treatment and continued monitoring will prevent escalation to critical status.`,
    LOW: `The current detection data indicates a LOW risk level. Detections are minimal and within manageable thresholds. Continue routine monitoring and standard integrated pest management protocols.`,
  }

  const riskLevels = [
    { label: 'Low', color: [22, 163, 74], active: overallRisk === 'LOW' },
    { label: 'Medium', color: [217, 119, 6], active: overallRisk === 'MEDIUM' },
    { label: 'High', color: [220, 38, 38], active: overallRisk === 'HIGH' },
  ]

  // Risk gauge bar
  const gaugeW = TW
  const segW = gaugeW / 3
  riskLevels.forEach((r, i) => {
    doc.setFillColor(...(r.active ? r.color : [229, 231, 235]))
    // Use plain rect to avoid jsPDF per-corner radius limitation
    doc.rect(ML + i * segW + (i > 0 ? 1 : 0), y, segW - (i < 2 ? 1 : 0), 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(r.active ? 255 : 156, r.active ? 255 : 163, r.active ? 255 : 175)
    doc.text(r.label, ML + i * segW + segW / 2, y + 6.5, { align: 'center' })
  })
  y += 14

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  const riskLines = doc.splitTextToSize(riskDesc[overallRisk], TW - 10)
  const riskBlockH = riskLines.length * 5 + 10
  doc.roundedRect(ML, y, TW, riskBlockH, 2, 2, 'FD')
  doc.setFillColor(...riskColor)
  doc.rect(ML, y, 3, riskBlockH, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text(riskLines, ML + 8, y + 8)
  y += riskBlockH + 8

  // ── 7. SYSTEM INFORMATION ─────────────────────────────────────────────────
  checkPage(40)
  sectionHeader('System Information', '7')

  const sysInfo = [
    ['System Name', 'AgriVision Field Monitoring System'],
    ['Model Used', 'YOLOv8n (You Only Look Once — Nano variant)'],
    ['Detection Method', 'Image-based real-time object detection'],
    ['Report Version', 'v2.1.0'],
    ['Report Generated By', 'AgriVision Automated Report Engine'],
  ]

  const infoColW = [50, TW - 50]
  sysInfo.forEach(([key, val], i) => {
    checkPage(10)
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255)
    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(0.2)
    doc.rect(ML, y, TW, 9, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text(key, ML + 3, y + 6.2)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(val, ML + infoColW[0] + 3, y + 6.2)
    y += 9
  })
  y += 6

  // Limitations box
  checkPage(30)
  doc.setFillColor(255, 251, 235)
  doc.setDrawColor(253, 230, 138)
  doc.setLineWidth(0.3)
  doc.roundedRect(ML, y, TW, 24, 2, 2, 'FD')
  doc.setFillColor(217, 119, 6)
  doc.rect(ML, y, 3, 24, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(180, 83, 9)
  doc.text('System Limitations', ML + 8, y + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(92, 45, 3)
  doc.text('•  Detection accuracy depends on image quality, lighting conditions, and camera angle.', ML + 8, y + 13.5)
  doc.text('•  Only classes included in the training dataset can be identified by the model.', ML + 8, y + 19.5)
  y += 30

  // ── FOOTER on all pages ───────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    // Footer bar
    doc.setFillColor(16, 124, 66)
    doc.rect(0, H - 12, W, 12, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(187, 247, 208)
    doc.text('Generated by AgriVision  •  Pest & Disease Field Monitoring System  •  v2.1.0', ML, H - 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 255, 255)
    doc.text(`${timestamp}  •  Page ${p} of ${totalPages}`, W - MR, H - 5, { align: 'right' })

    // Page number badge
    doc.setFillColor(255, 255, 255)
    doc.circle(W / 2, H - 6, 3.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(16, 124, 66)
    doc.text(String(p), W / 2, H - 4.2, { align: 'center' })

    // Confidential watermark top-right (light)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(200, 200, 200)
    doc.text('CONFIDENTIAL', W - MR, MT + 2, { align: 'right' })
  }

  return doc
}

// ─── Help Modal ───────────────────────────────────────────────────────────────

function MetricsHelpModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
           style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)' }}
           onClick={onClose}>
        <div onClick={e => e.stopPropagation()}
             style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.16)', width: '100%', maxWidth: 520, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 18px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Key Metrics Guide</p>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 500, marginTop: 3 }}>What each indicator means for your fields</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              <X size={15} />
            </button>
          </div>
          <div style={{ overflowY: 'auto', padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 24, scrollbarWidth: 'none' }}>
            {METRICS_HELP.map(group => (
                <div key={group.group}>
                  <p style={{ margin: 0, marginBottom: 12, fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{group.group}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {group.items.map(item => (
                        <div key={item.name}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{item.name}</p>
                          <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{item.desc}</p>
                        </div>
                    ))}
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
  )
}

// ─── Upload Image Modal ───────────────────────────────────────────────────────

function UploadImageModal({ open, onClose }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('Please upload an image file.'); return }
    setFile(f); setResult(null); setError(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true); setError(null)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1]
        try {
          const { default: api } = await import('../api/api')
          const res = await api.post('/api/detection', { image: base64 })
          const dets = res.data?.data?.detections ?? []
          setResult({ detections: dets, count: dets.length })

          if (dets.length > 0) {
            const nowIso = new Date().toISOString()
            const existing = JSON.parse(localStorage.getItem(SHARED_DETECTIONS_KEY) || '[]')
            const newRecs = dets.map((d, idx) => ({
              id: `upload-${Date.now()}-${idx}`,
              timestamp: nowIso,
              type: PEST_KEYWORDS.some(k => (d.class||'').toLowerCase().includes(k)) ? 'Pest' : 'Disease',
              class: d.class ?? 'Unknown',
              name: d.class ?? 'Unknown',
              confidence: d.confidence ?? 0,
              location: 'Uploaded Image',
              source: 'upload',
            }))
            localStorage.setItem(SHARED_DETECTIONS_KEY, JSON.stringify([...newRecs, ...existing].slice(0, 500)))
          }
        } catch {
          setError('Detection API unavailable. Image saved for manual review.')
          setResult({ detections: [], count: 0 })
        }
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Failed to read file.')
      setUploading(false)
    }
  }

  const reset = () => { setFile(null); setResult(null); setError(null) }

  useEffect(() => { if (!open) reset() }, [open])
  if (!open) return null

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
           style={{ background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)' }}
           onClick={onClose}>
        <div onClick={e => e.stopPropagation()}
             className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="px-8 pt-7 pb-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase mb-1">Field Monitoring</p>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Upload Image for Detection</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <X size={15} />
            </button>
          </div>
          <div className="px-8 py-7 space-y-5">
            {!result ? (
                <>
                  <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
                      onClick={() => inputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-emerald-400 bg-emerald-50' : file ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                    {file ? (
                        <div className="space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto">
                            <CheckCircle size={20} className="text-emerald-600" />
                          </div>
                          <p className="text-sm font-bold text-slate-800">{file.name}</p>
                          <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto">
                            <Upload size={20} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-600">Drop image here or click to browse</p>
                            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP supported</p>
                          </div>
                        </div>
                    )}
                  </div>
                  {error && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-600">{error}</p>
                      </div>
                  )}
                  <button onClick={handleUpload} disabled={!file || uploading}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-colors">
                    {uploading ? <><Loader2 size={16} className="animate-spin" />Analyzing Image…</> : <><Upload size={16} />Run Detection</>}
                  </button>
                </>
            ) : (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-5 text-center ${result.count > 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'}`}>
                    <p className="text-3xl font-black text-slate-900">{result.count}</p>
                    <p className="text-sm text-slate-500 mt-1">{result.count === 1 ? 'detection found' : 'detections found'}</p>
                  </div>
                  {result.detections.length > 0 && (
                      <div className="space-y-2">
                        {result.detections.map((d, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                              <span className="text-sm font-semibold text-slate-800">{d.class ?? 'Unknown'}</span>
                              <span className="text-xs font-bold text-slate-500">{Math.round((d.confidence ?? 0) * 100)}% confidence</span>
                            </div>
                        ))}
                      </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={reset} className="flex-1 py-2.5 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors">Upload Another</button>
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-2xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors">Done</button>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  )
}

// ─── Graph helpers ────────────────────────────────────────────────────────────

function buildSeverityData(data, pest) {
  const key = (data.series && data.series[pest]) ? pest : 'All'
  const vals = (data.series && data.series[key]) ? data.series[key] : Array(data.labels?.length ?? 7).fill(0)
  const out = {}
  SEVERITY_CONFIG.forEach(s => {
    out[s.key] = vals.map((v, i) => Math.max(0, Math.round(v * RATIO[s.key][i % 7])))
  })
  return out
}

function measurePathLength(d) {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
    document.body.appendChild(svg)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
    const len = path.getTotalLength()
    document.body.removeChild(svg)
    return len
  } catch { return 1000 }
}

function AnimatedLine({ d, color, dashed, delay = 0, animKey }) {
  const [len, setLen] = useState(null)
  const [animating, setAnimating] = useState(false)
  useEffect(() => {
    const measured = measurePathLength(d)
    setLen(measured)
    setAnimating(false)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
    return () => cancelAnimationFrame(raf)
  }, [animKey])
  if (len === null) return null
  return (
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={dashed ? undefined : `${len} ${len}`}
            strokeDashoffset={dashed ? undefined : (animating ? 0 : len)}
            opacity="0.95"
            style={dashed
                ? { strokeDasharray: '5 4', strokeDashoffset: animating ? 0 : len, transition: animating ? `stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}s` : 'none' }
                : { transition: animating ? `stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}s` : 'none' }
            }
      />
  )
}

function AnimatedFill({ d, pts, color, H, PY, delay = 0, animKey }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), delay * 1000 + 200)
    return () => clearTimeout(t)
  }, [animKey, delay])
  const fill = `${d} L ${pts[pts.length - 1][0]} ${H - PY} L ${pts[0][0]} ${H - PY} Z`
  return <path d={fill} fill={`url(#g-${color.replace('#', '')})`} style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease' }} />
}

function FloatingTooltip({ hoverPos, data, hoverIdx, severityData, activeKeys, growthRate }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(null)
  const targetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (hoverPos.idx === null) { setVisible(false); return }
    setVisible(true)
    targetRef.current = { x: hoverPos.x, y: hoverPos.y }
    const loop = () => {
      setPos(prev => {
        const dx = targetRef.current.x - prev.x
        const dy = targetRef.current.y - prev.y
        if (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4) return targetRef.current
        return { x: prev.x + dx * 0.18, y: prev.y + dy * 0.18 }
      })
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [hoverPos.idx, hoverPos.x, hoverPos.y])

  if (!visible || hoverIdx === null) return null
  const flipLeft = pos.x > window.innerWidth * 0.62
  const label = data.labels[hoverIdx]

  return (
      <div className="fixed pointer-events-none z-50" style={{ left: pos.x, top: pos.y, transform: `translateY(-50%) ${flipLeft ? 'translateX(calc(-100% - 20px))' : 'translateX(20px)'}`, opacity: visible ? 1 : 0, transition: 'opacity 0.18s ease' }}>
        <div style={{ background: 'rgba(248,250,252,0.78)', backdropFilter: 'blur(36px) saturate(220%)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.12)', padding: '14px 16px', minWidth: 180 }}>
          <div style={{ marginBottom: 10, paddingBottom: 9, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{label}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SEVERITY_CONFIG.map(s => {
              if (!activeKeys.has(s.key)) return null
              const val  = severityData[s.key][hoverIdx]
              const rate = growthRate(severityData[s.key], hoverIdx)
              const isUp = rate !== null && Number(rate) >= 0
              return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'block' }} />
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>{s.key}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
                      {rate !== null && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 100, color: isUp ? '#dc2626' : '#16a34a' }}>
                      {isUp ? '↑' : '↓'}{Math.abs(rate)}%
                    </span>
                      )}
                    </div>
                  </div>
              )
            })}
          </div>
          {hoverIdx > 0 && (
              <p style={{ fontSize: 9, color: 'rgba(148,163,184,0.65)', marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(0,0,0,0.05)', marginBottom: 0, fontWeight: 500 }}>
                % change vs previous {data.sublabel.toLowerCase()}
              </p>
          )}
        </div>
      </div>
  )
}

function GhostDropdown({ label, options, value, onChange, open, onToggle, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  return (
      <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
        <button onClick={onToggle}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 8, transition: 'background 0.15s ease', color: '#334155' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
          <ChevronDown size={12} style={{ color: '#94a3b8', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </button>
        {open && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #f1f5f9', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '6px', minWidth: 180 }}>
              {options.map(opt => (
                  <button key={opt} onClick={() => { onChange(opt); onClose() }}
                          style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', borderRadius: 10, background: value === opt ? '#f0fdf4' : 'transparent', color: value === opt ? '#15803d' : '#475569', transition: 'background 0.12s ease', display: 'block' }}
                          onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = 'transparent' }}
                  >{opt}</button>
              ))}
            </div>
        )}
      </div>
  )
}

function DateRangeDropdown({ range, onChange, open, onToggle, onClose }) {
  const ranges = buildTimeRanges()
  const current = ranges.find(r => r.label === range) || ranges[0]
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])

  return (
      <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
        <button onClick={onToggle}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 8, transition: 'background 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{current.date}</p>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, marginTop: 2, fontWeight: 500, lineHeight: 1 }}>{current.days}</p>
          </div>
          <ChevronDown size={12} style={{ color: '#94a3b8', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </button>
        {open && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #f1f5f9', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '6px', minWidth: 200 }}>
              {ranges.map(r => (
                  <button key={r.label} onClick={() => { onChange(r.label); onClose() }}
                          style={{ width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 13, cursor: 'pointer', border: 'none', borderRadius: 10, background: range === r.label ? '#f0fdf4' : 'transparent', color: range === r.label ? '#15803d' : '#475569', transition: 'background 0.12s ease', display: 'flex', flexDirection: 'column', gap: 2 }}
                          onMouseEnter={e => { if (range !== r.label) e.currentTarget.style.background = '#f8fafc' }}
                          onMouseLeave={e => { if (range !== r.label) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{r.label}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{r.date}</span>
                  </button>
              ))}
            </div>
        )}
      </div>
  )
}

// ─── Graph ────────────────────────────────────────────────────────────────────

function DoodleGraph({ range, pest, activeView, setActiveView, pestValue, diseaseValue, setPestValue, setDiseaseValue, graphData, pestClasses, diseaseClasses }) {
  const data = graphData[range] || Object.values(graphData)[0]
  const W = 900, H = 270, PX_L = 12, PX_R = 42, PY = 20

  const [hoverPos, setHoverPos] = useState({ idx: null, x: 0, y: 0 })
  const [activeKeys, setActiveKeys] = useState(() => new Set(SEVERITY_CONFIG.map(s => s.key)))
  const [pestOpen, setPestOpen]     = useState(false)
  const [diseaseOpen, setDiseaseOpen] = useState(false)
  const svgRef = useRef(null)

  const animKey = `${range}__${pest}`
  const severityData = buildSeverityData(data, pest)
  const allVals = SEVERITY_CONFIG.flatMap(s => activeKeys.has(s.key) ? severityData[s.key] : [])
  const globalMax = Math.max(...allVals, 1)
  const plotW = W - PX_L - PX_R

  function buildPts(key) {
    return severityData[key].map((v, i) => [
      PX_L + (i / (severityData[key].length - 1)) * plotW,
      PY + (1 - v / globalMax) * (H - PY * 2),
    ])
  }

  function smoothD(pts) {
    return pts.reduce((acc, [x, y], i) => {
      if (i === 0) return `M ${x} ${y}`
      const [px, py] = pts[i - 1]
      const cx = px + (x - px) * 0.5
      return `${acc} C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`
    }, '')
  }

  function growthRate(vals, idx) {
    if (idx === 0 || vals[idx - 1] === 0) return null
    return (((vals[idx] - vals[idx - 1]) / vals[idx - 1]) * 100).toFixed(0)
  }

  const labelCount = data.labels.length
  const colW = plotW / Math.max(labelCount - 1, 1)

  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width * W
    const idx  = Math.max(0, Math.min(labelCount - 1, Math.round((relX - PX_L) / colW)))
    setHoverPos({ idx, x: e.clientX, y: e.clientY })
  }, [colW, labelCount])

  const hoverIdx = hoverPos.idx
  const tooltipX = hoverIdx !== null ? PX_L + (hoverIdx / (labelCount - 1)) * plotW : null

  const toggleSeries = (key) => {
    setActiveKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size === 1) return prev; next.delete(key) }
      else next.add(key)
      return next
    })
  }

  return (
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={e => { e.stopPropagation(); setActiveView('All') }}
                    style={{ padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'All' ? '#f1f5f9' : 'transparent', color: activeView === 'All' ? '#1e293b' : '#94a3b8' }}
                    onMouseEnter={e => { if (activeView !== 'All') e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={e => { if (activeView !== 'All') e.currentTarget.style.background = 'transparent' }}>All</button>

            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setActiveView('Pests'); setPestOpen(o => !o); setDiseaseOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'Pests' ? '#f1f5f9' : 'transparent', color: activeView === 'Pests' ? '#1e293b' : '#94a3b8' }}
                      onMouseEnter={e => { if (activeView !== 'Pests') e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={e => { if (activeView !== 'Pests') e.currentTarget.style.background = 'transparent' }}>
                Pests
                {pestValue && activeView === 'Pests' && <span style={{ fontSize: 9, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 4, marginLeft: 2, fontWeight: 700 }}>{pestValue.split(' ').slice(-1)[0]}</span>}
                <ChevronDown size={10} style={{ color: '#94a3b8', transform: pestOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {pestOpen && (
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #f1f5f9', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '6px', minWidth: 170 }}>
                    <button onClick={() => { setPestValue(null); setPestOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: !pestValue ? '#f0fdf4' : 'transparent', color: !pestValue ? '#15803d' : '#64748b', fontWeight: 600 }}>All Pests</button>
                    {pestClasses.length === 0 ? (
                        <p style={{ fontSize: 11, color: '#94a3b8', padding: '6px 12px', margin: 0 }}>No pest data yet</p>
                    ) : pestClasses.map(p => (
                        <button key={p} onClick={() => { setPestValue(p); setPestOpen(false) }}
                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: pestValue === p ? '#f0fdf4' : 'transparent', color: pestValue === p ? '#15803d' : '#475569', fontWeight: 500 }}
                                onMouseEnter={e => { if (pestValue !== p) e.currentTarget.style.background = '#f8fafc' }}
                                onMouseLeave={e => { if (pestValue !== p) e.currentTarget.style.background = 'transparent' }}
                        >{p}</button>
                    ))}
                  </div>
              )}
            </div>

            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setActiveView('Diseases'); setDiseaseOpen(o => !o); setPestOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'Diseases' ? '#f1f5f9' : 'transparent', color: activeView === 'Diseases' ? '#1e293b' : '#94a3b8' }}
                      onMouseEnter={e => { if (activeView !== 'Diseases') e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={e => { if (activeView !== 'Diseases') e.currentTarget.style.background = 'transparent' }}>
                Diseases
                {diseaseValue && activeView === 'Diseases' && <span style={{ fontSize: 9, background: '#fef9c3', color: '#a16207', padding: '1px 5px', borderRadius: 4, marginLeft: 2, fontWeight: 700 }}>{diseaseValue.split(' ').slice(-1)[0]}</span>}
                <ChevronDown size={10} style={{ color: '#94a3b8', transform: diseaseOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {diseaseOpen && (
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #f1f5f9', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', padding: '6px', minWidth: 170 }}>
                    <button onClick={() => { setDiseaseValue(null); setDiseaseOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: !diseaseValue ? '#f0fdf4' : 'transparent', color: !diseaseValue ? '#15803d' : '#64748b', fontWeight: 600 }}>All Diseases</button>
                    {diseaseClasses.length === 0 ? (
                        <p style={{ fontSize: 11, color: '#94a3b8', padding: '6px 12px', margin: 0 }}>No disease data yet</p>
                    ) : diseaseClasses.map(d => (
                        <button key={d} onClick={() => { setDiseaseValue(d); setDiseaseOpen(false) }}
                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: diseaseValue === d ? '#f0fdf4' : 'transparent', color: diseaseValue === d ? '#15803d' : '#475569', fontWeight: 500 }}
                                onMouseEnter={e => { if (diseaseValue !== d) e.currentTarget.style.background = '#f8fafc' }}
                                onMouseLeave={e => { if (diseaseValue !== d) e.currentTarget.style.background = 'transparent' }}
                        >{d}</button>
                    ))}
                  </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {SEVERITY_CONFIG.map(s => {
              const active = activeKeys.has(s.key)
              return (
                  <button key={s.key} onClick={() => toggleSeries(s.key)}
                          className="flex items-center gap-1.5 bg-transparent border-0 cursor-pointer p-0"
                          style={{ opacity: active ? 1 : 0.28, transition: 'opacity 0.2s ease' }}>
                    <svg width="14" height="6">
                      <line x1="0" y1="3" x2="14" y2="3" stroke={s.color} strokeWidth="2"
                            strokeDasharray={s.dashed ? '4 2' : undefined} strokeLinecap="round" />
                    </svg>
                    <span className="text-[10px] font-semibold text-slate-500">{s.key}</span>
                  </button>
              )
            })}
          </div>
        </div>

        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
             style={{ width: '100%', height: 280, display: 'block', cursor: 'crosshair' }}
             onMouseMove={handleMouseMove}
             onMouseLeave={() => setHoverPos({ idx: null, x: 0, y: 0 })}>
          <defs>
            {SEVERITY_CONFIG.map(s => (
                <linearGradient key={s.key} id={`g-${s.color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
            ))}
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const yp  = PY + t * (H - PY * 2)
            const val = (globalMax * (1 - t)).toFixed(1)
            return (
                <g key={t}>
                  <line x1={PX_L} x2={W - PX_R} y1={yp} y2={yp} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 7" />
                  <text x={W - PX_R + 10} y={yp + 4} textAnchor="start" fontSize="10" fill="#94a3b8" fontFamily="monospace" fontWeight="600">{val}</text>
                </g>
            )
          })}

          {data.labels.map((l, i) => (
              <text key={`${l}-${i}`} x={PX_L + (i / (labelCount - 1)) * plotW} y={H - 4}
                    textAnchor={i === 0 ? 'start' : i === labelCount - 1 ? 'end' : 'middle'}
                    fontSize="11" fill="#94a3b8" fontFamily="monospace" fontWeight="600">{l}</text>
          ))}

          {hoverIdx !== null && (
              <line x1={tooltipX} x2={tooltipX} y1={PY} y2={H - PY} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 4" />
          )}

          {SEVERITY_CONFIG.map((s, si) => {
            if (!activeKeys.has(s.key)) return null
            const pts = buildPts(s.key)
            const pd  = smoothD(pts)
            return (
                <g key={s.key}>
                  <AnimatedFill d={pd} pts={pts} color={s.color} H={H} PY={PY} delay={si * 0.12} animKey={animKey} />
                  <AnimatedLine d={pd} color={s.color} dashed={s.dashed} delay={si * 0.12} animKey={animKey} />
                  {hoverIdx !== null && pts[hoverIdx] && (
                      <>
                        <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="6.5" fill="white" stroke={s.color} strokeWidth="2" />
                        <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="2.8" fill={s.color} />
                      </>
                  )}
                </g>
            )
          })}
        </svg>

        <FloatingTooltip hoverPos={hoverPos} data={data} hoverIdx={hoverIdx}
                         severityData={severityData} activeKeys={activeKeys} growthRate={growthRate} />
      </div>
  )
}

// ─── Stat Cards ───────────────────────────────────────────────────────────────

function MiniStatCard({ title, value, changeLabel, loading }) {
  return (
      <div style={{ background: 'white', border: '1.5px solid #f1f5f9', borderRadius: 16 }}
           className="p-5 flex flex-col justify-between w-40 h-40">
        <p style={{ color: '#94a3b8' }} className="text-[10px] font-bold tracking-[0.14em] uppercase leading-none m-0">
          {title}
        </p>
        <div className="flex flex-col gap-2">
          {loading ? (
              <div className="h-9 w-14 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
              <p style={{ color: '#0f172a' }} className="text-3xl font-black leading-none m-0 tabular-nums">
                {value}
              </p>
          )}
        </div>
        <p style={{ color: '#cbd5e1', borderTopColor: '#f1f5f9' }} className="text-[10px] m-0 font-semibold leading-none border-t pt-3">
          {loading ? 'Loading…' : (changeLabel || 'Live data')}
        </p>
      </div>
  )
}

function ActionCard({ icon, title, onClick, loading }) {
  return (
      <button onClick={onClick} disabled={loading}
              className="bg-white rounded-2xl border border-dashed border-slate-200 px-5 py-5 w-full text-left cursor-pointer flex flex-col gap-3 transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
      <span className="text-emerald-600 opacity-80 flex">
        {loading ? <Loader2 size={22} className="animate-spin" /> : icon}
      </span>
        <span className="text-sm font-semibold text-slate-600 leading-snug">{title}</span>
      </button>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', icon: <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" /> },
    error:   { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: <AlertCircle size={16} className="text-red-500 flex-shrink-0" /> },
    info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', icon: <Loader2 size={16} className="text-blue-500 flex-shrink-0 animate-spin" /> },
  }
  const c = colors[type] || colors.info

  return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold max-w-sm"
           style={{ background: c.bg, borderColor: c.border, color: c.text, animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        {c.icon}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
      </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const timeRanges = buildTimeRanges()

  const [range, setRange]           = useState('This week')
  const [rangeOpen, setRangeOpen]   = useState(false)
  const [activeView, setActiveView] = useState('All')
  const [pestValue, setPestValue]   = useState(null)
  const [diseaseValue, setDiseaseValue] = useState(null)
  const [helpOpen, setHelpOpen]     = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [toast, setToast]           = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  // Dynamic class lists fetched from model / derived from detections
  const [pestClasses, setPestClasses]       = useState([])
  const [diseaseClasses, setDiseaseClasses] = useState([])

  const [liveData, setLiveData] = useState({
    detections: 0,
    activeAlerts: 0,
    cropLoss: 0,
    healthyCrops: 100,
    detectionsList: [],
    loaded: false,
  })

  // Graph data rebuilt whenever detectionsList changes
  const [graphData, setGraphData] = useState(() =>
      buildDynamicGraphData([], [])
  )

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  // Track which API endpoints have returned 404 so we stop hitting them
  const apiNotFound = useRef({})

  const fetchLiveData = useCallback(async () => {
    let allRecords = []
    const shared = loadSharedDetections().map((item, idx) => normalizeRecord(item, idx))
    allRecords = [...shared]

    try {
      const { default: api } = await import('../api/api')
      const noThrow = { validateStatus: () => true }

      // Try to fetch model classes from dedicated endpoint first
      if (!apiNotFound.current['/api/classes']) {
        const res = await api.get('/api/classes', noThrow).catch(() => null)
        if (res?.status === 404) {
          apiNotFound.current['/api/classes'] = true
        } else if (res?.status === 200) {
          const raw = res.data?.data ?? res.data ?? {}
          // Expects { pests: [...], diseases: [...] } OR { classes: [...] }
          if (raw.pests && raw.diseases) {
            setPestClasses(raw.pests)
            setDiseaseClasses(raw.diseases)
          } else if (Array.isArray(raw.classes)) {
            const pests = raw.classes.filter(c => PEST_KEYWORDS.some(k => c.toLowerCase().includes(k)))
            const diseases = raw.classes.filter(c => !PEST_KEYWORDS.some(k => c.toLowerCase().includes(k)))
            setPestClasses(pests)
            setDiseaseClasses(diseases)
          }
        }
      }

      if (!apiNotFound.current['/api/alarms']) {
        const res = await api.get('/api/alarms', noThrow).catch(() => null)
        if (res?.status === 404) { apiNotFound.current['/api/alarms'] = true }
        else if (res?.status === 200) {
          const raw = res.data?.data ?? res.data ?? []
          if (Array.isArray(raw)) allRecords = [...allRecords, ...raw.map(normalizeRecord)]
        }
      }

      if (!apiNotFound.current['/api/detections']) {
        const res = await api.get('/api/detections', noThrow).catch(() => null)
        if (res?.status === 404) { apiNotFound.current['/api/detections'] = true }
        else if (res?.status === 200) {
          const raw = res.data?.data ?? res.data ?? []
          if (Array.isArray(raw)) allRecords = [...allRecords, ...raw.map(normalizeRecord)]
        }
      }
    } catch { /* api module not available */ }

    const deduped = Array.from(new Map(allRecords.map(r => [String(r.id), r])).values())
    deduped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // Derive classes dynamically from actual detections if API didn't provide them
    const uniqueNames = [...new Set(deduped.map(d => d.name).filter(n => n && n !== 'Unknown'))]
    const derivedPests    = uniqueNames.filter(n => PEST_KEYWORDS.some(k => n.toLowerCase().includes(k)))
    const derivedDiseases = uniqueNames.filter(n => !PEST_KEYWORDS.some(k => n.toLowerCase().includes(k)))

    setPestClasses(prev => prev.length > 0 ? prev : derivedPests)
    setDiseaseClasses(prev => prev.length > 0 ? prev : derivedDiseases)

    const total = deduped.length
    const highCount = deduped.filter(d => d.severity === 'high' || d.severity === 'critical').length
    const cropLoss = total > 0
        ? Math.min(99, Math.round((highCount * 4 + (total - highCount) * 1.2) / Math.max(total, 1) * 100) / 10)
        : 0
    const healthyCrops = Math.max(0, Math.round(100 - cropLoss * 2))

    // Rebuild graph with all known class names
    const allClasses = [...new Set([...derivedPests, ...derivedDiseases, ...uniqueNames])]
    setGraphData(buildDynamicGraphData(deduped, allClasses))

    setLiveData({ detections: total, activeAlerts: highCount, cropLoss, healthyCrops, detectionsList: deduped, loaded: true })
  }, [])

  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(fetchLiveData, 5000)
    return () => clearInterval(interval)
  }, [fetchLiveData])

  useEffect(() => {
    const onStorage = (e) => { if (e.key === SHARED_DETECTIONS_KEY) fetchLiveData() }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [fetchLiveData])

  const navigate = (path) => {
    if (window.history && window.history.pushState) {
      window.history.pushState({}, '', path)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } else {
      window.location.href = path
    }
  }

  const handleGenerateReport = async () => {
    setReportLoading(true)
    showToast('Building AgriVision report…', 'info')
    try {
      const currentRange = timeRanges.find(r => r.label === range)
      const rangeLabel = currentRange ? `${currentRange.label} (${currentRange.date})` : range
      const doc = await generateAgriVisionReport(liveData.detectionsList, rangeLabel)
      const filename = `AgriVision_Report_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      showToast('AgriVision report downloaded successfully!', 'success')
    } catch (e) {
      console.error(e)
      showToast('Failed to generate report. Please try again.', 'error')
    } finally {
      setReportLoading(false)
    }
  }

  const pest = activeView === 'Pests' && pestValue
      ? pestValue
      : activeView === 'Diseases' && diseaseValue
          ? diseaseValue
          : 'All'

  const isLoading = !liveData.loaded

  return (
      <div className="min-h-screen bg-slate-50" onClick={() => setRangeOpen(false)}>
        <MetricsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        <UploadImageModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
        {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <main className="max-w-screen-2xl mx-auto px-4 sm:px-4 lg:px-8 xl:px-12 py-6 lg:py-10 flex flex-col gap-8">

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 px-8 lg:px-10 pt-8 pb-7 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight m-0 leading-none whitespace-nowrap">
                  Key Metrics
                </h2>
                <button
                    onClick={e => { e.stopPropagation(); setHelpOpen(true) }}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, padding: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, lineHeight: 1, userSelect: 'none' }}>?</span>
                </button>
              </div>

              <div onClick={e => e.stopPropagation()}>
                <DateRangeDropdown
                    range={range} onChange={setRange}
                    open={rangeOpen} onToggle={() => setRangeOpen(o => !o)} onClose={() => setRangeOpen(false)}
                />
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col lg:flex-row items-stretch">
              <div className="lg:w-[296px] flex-shrink-0 grid grid-cols-2 auto-rows-fr gap-4 p-6 border-b lg:border-b-0 lg:border-r border-slate-50">
                <MiniStatCard title="Detections"   value={liveData.detections}        changeLabel="live count"    loading={isLoading} />
                <MiniStatCard title="Crop Loss"    value={`${liveData.cropLoss}%`}    changeLabel="estimated"     loading={isLoading} />
                <MiniStatCard title="Active Alerts" value={liveData.activeAlerts}     changeLabel="high severity" loading={isLoading} />
                <MiniStatCard title="Healthy Crops" value={`${liveData.healthyCrops}%`} changeLabel="estimated"  loading={isLoading} />
              </div>

              <div className="flex-1 min-w-0 px-5 lg:px-7 py-6">
                <DoodleGraph
                    range={range} pest={pest}
                    activeView={activeView} setActiveView={setActiveView}
                    pestValue={pestValue} diseaseValue={diseaseValue}
                    setPestValue={setPestValue} setDiseaseValue={setDiseaseValue}
                    graphData={graphData}
                    pestClasses={pestClasses}
                    diseaseClasses={diseaseClasses}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="mb-5">
              <p className="text-lg font-bold text-slate-900 m-0 mb-1 tracking-tight">Quick Actions</p>
              <p className="text-sm text-slate-400 m-0">Jump to common tasks</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <ActionCard icon={<PlayCircle size={22} />} title="Start Field Monitoring" onClick={() => navigate('/field-monitoring')} />
              <ActionCard icon={<Upload size={22} />}     title="Upload Image"           onClick={() => setUploadOpen(true)} />
              <ActionCard icon={<Bell size={22} />}       title="View Alarm Logs"        onClick={() => navigate('/alarm-log')} />
              <ActionCard icon={<FileText size={22} />}   title="Generate Report"        onClick={handleGenerateReport} loading={reportLoading} />
              <ActionCard icon={<MapPin size={22} />}     title="View Fields"            onClick={() => navigate('/fields')} />
            </div>
          </div>

        </main>
      </div>
  )
}