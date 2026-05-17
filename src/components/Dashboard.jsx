import { useState, useEffect, useRef, useCallback } from 'react'
import { PlayCircle, Upload, Bell, FileText, MapPin, TrendingUp, TrendingDown, ChevronDown, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../api/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const formatDateShort = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const formatMonthYear = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

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

const buildDynamicGraphData = (detectionsList, classes) => {
  const buckets = buildRangeBuckets()
  const allClasses = ['All', ...classes]
  const result = {}

  Object.entries(buckets).forEach(([rangeKey, bucket]) => {
    const series = {}
    allClasses.forEach(cls => { series[cls] = Array(bucket.bucketCount).fill(0) })

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

// ─── PDF Report Generator (Formal DA-BPI / PRIME Surveillance Format) ─────────

const loadJsPDF = () => {
  return new Promise((resolve, reject) => {
    if (window.jspdf && window.jspdf.jsPDF) {
      resolve(window.jspdf.jsPDF)
      return
    }
    // Remove any previously failed script tags
    document.querySelectorAll('script[data-jspdf]').forEach(s => s.remove())
    const script = document.createElement('script')
    script.setAttribute('data-jspdf', '1')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => {
      // jsPDF 2.x UMD exposes window.jspdf.jsPDF
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF)
      } else {
        reject(new Error('jsPDF loaded but jsPDF constructor not found on window.jspdf'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load jsPDF from CDN'))
    document.head.appendChild(script)
  })
}

const generateAgriVisionReport = async (detections, rangeLabel, userInfo = {}) => {
  const jsPDF = await loadJsPDF()

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Page & margin constants ──
  const PW = 210   // page width
  const PH = 297   // page height
  const ML = 20    // margin left
  const MR = 20    // margin right
  const MT = 18    // margin top (after header)
  const CW = PW - ML - MR  // content width

  let y = MT
  let pageNum = 1

  // ── Helpers ──
  const newPage = () => {
    doc.addPage()
    pageNum++
    drawPageHeader()
    y = 34
  }

  const checkPage = (needed = 18) => {
    if (y + needed > PH - 18) newPage()
  }

  const line = (x1, y1, x2, y2, color = [200, 200, 200], width = 0.3) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(width)
    doc.line(x1, y1, x2, y2)
  }

  const rect = (x, yy, w, h, fillRGB, strokeRGB, radius = 0) => {
    if (fillRGB) doc.setFillColor(...fillRGB)
    if (strokeRGB) doc.setDrawColor(...strokeRGB)
    else doc.setDrawColor(0, 0, 0, 0)
    doc.setLineWidth(0.2)
    if (radius > 0) {
      doc.roundedRect(x, yy, w, h, radius, radius, fillRGB && strokeRGB ? 'FD' : fillRGB ? 'F' : 'D')
    } else {
      doc.rect(x, yy, w, h, fillRGB && strokeRGB ? 'FD' : fillRGB ? 'F' : 'D')
    }
  }

  const txt = (text, x, yy, opts = {}) => {
    const {
      size = 9, bold = false, color = [30, 30, 30], align = 'left',
      italic = false, maxW = null, lineHeight = 5
    } = opts
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal'))
    doc.setTextColor(...color)
    if (maxW) {
      const lines = doc.splitTextToSize(String(text), maxW)
      lines.forEach((l, i) => doc.text(l, x, yy + i * lineHeight, { align }))
      return lines.length * lineHeight
    }
    doc.text(String(text), x, yy, { align })
    return lineHeight
  }

  // ── Page header (repeats on every page) ──
  const now = new Date()
  const reportId = `AGV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000+1000)}`
  const generatedAt = now.toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })

  const drawPageHeader = () => {
    // Green top bar
    rect(0, 0, PW, 24, [14, 110, 60])
    // Logo circle
    rect(ML, 4, 16, 16, [255, 255, 255], null, 2)
    txt('AV', ML + 4.2, 14, { size: 8, bold: true, color: [14, 110, 60] })
    // Title block
    txt('AgriVision', ML + 20, 10, { size: 13, bold: true, color: [255, 255, 255] })
    txt('Pest & Disease Surveillance Report  ·  DA-BPI PRIME Monitoring System', ML + 20, 16, { size: 7, color: [180, 240, 200] })
    // Report ID block (right side)
    txt('REPORT NO.', PW - MR - 1, 9, { size: 6, bold: true, color: [180, 240, 200], align: 'right' })
    txt(reportId, PW - MR - 1, 14, { size: 8, bold: true, color: [255, 255, 255], align: 'right' })
    txt(`Page ${pageNum}`, PW - MR - 1, 19, { size: 6, color: [180, 240, 200], align: 'right' })
    // Thin gold accent line below header
    line(0, 24, PW, 24, [14, 110, 60], 0.8)
    line(0, 25.5, PW, 25.5, [234, 179, 8], 0.5)
  }

  // ── Footer on every page ──
  const drawFooter = (pn, total) => {
    doc.setPage(pn)
    line(ML, PH - 14, PW - MR, PH - 14, [200, 200, 200], 0.3)
    txt('CONFIDENTIAL — For Authorized Use Only  ·  Bureau of Plant Industry (BPI), Department of Agriculture', ML, PH - 9, { size: 6, color: [130, 130, 130] })
    txt(`${generatedAt}  ·  Model: YOLOv8n  ·  Page ${pn} of ${total}`, PW - MR, PH - 9, { size: 6, color: [130, 130, 130], align: 'right' })
  }

  // ── Section header ──
  const sectionHeader = (label, number) => {
    checkPage(16)
    rect(ML, y, 3, 10, [14, 110, 60])
    txt(`${number}.  ${label.toUpperCase()}`, ML + 6, y + 7, { size: 9.5, bold: true, color: [20, 20, 20] })
    line(ML + 6 + doc.getTextWidth(`${number}.  ${label.toUpperCase()}`) * (9.5 / 12) + 3, y + 3.5, PW - MR, y + 3.5, [220, 220, 220], 0.3)
    y += 14
  }

  // ── Key-value row (two column) ──
  const kvRow = (label, value, x, yy, labelW = 40) => {
    txt(label, x, yy, { size: 8, bold: true, color: [90, 90, 90] })
    txt(':', x + labelW - 4, yy, { size: 8, color: [90, 90, 90] })
    txt(value, x + labelW + 1, yy, { size: 8, color: [25, 25, 25] })
  }

  // ── Badge ──
  const badge = (label, x, yy, bgRGB, textRGB = [255, 255, 255]) => {
    const w = doc.getTextWidth(label) * (7 / 12) + 8
    rect(x, yy - 4, w, 6, bgRGB, null, 1.5)
    txt(label, x + 4, yy, { size: 7, bold: true, color: textRGB })
    return w
  }

  // ── Simple horizontal table ──
  const drawTable = (headers, rows, colWidths, startX = ML, headerBg = [14, 110, 60]) => {
    const rowH = 8
    const totalW = colWidths.reduce((a, b) => a + b, 0)

    checkPage(rowH + 4)
    rect(startX, y, totalW, rowH, headerBg)
    let cx = startX
    headers.forEach((h, i) => {
      txt(h, cx + 3, y + 5.5, { size: 7.5, bold: true, color: [255, 255, 255] })
      cx += colWidths[i]
    })
    y += rowH

    rows.forEach((row, ri) => {
      checkPage(rowH + 2)
      const bgColor = ri % 2 === 0 ? [247, 250, 247] : [255, 255, 255]
      rect(startX, y, totalW, rowH, bgColor, [235, 235, 235])
      cx = startX
      row.forEach((cell, ci) => {
        const cellStr = String(cell.value ?? cell)
        if (cell.badge) {
          badge(cellStr, cx + 2, y + 5.5, cell.bgColor || [80, 80, 80])
        } else {
          txt(cellStr, cx + 3, y + 5.5, {
            size: 7.5,
            bold: cell.bold || false,
            color: cell.color || (cell.dim ? [120, 120, 120] : [30, 30, 30]),
            maxW: colWidths[ci] - 5,
            lineHeight: 4,
          })
        }
        cx += colWidths[ci]
      })
      y += rowH
    })
    y += 5
  }

  // ── Stat card row ──
  const statCards = (items) => {
    const cardW = (CW - (items.length - 1) * 4) / items.length
    const cardH = 22
    checkPage(cardH + 6)
    items.forEach((item, i) => {
      const cx = ML + i * (cardW + 4)
      rect(cx, y, cardW, cardH, [245, 250, 245], [220, 235, 220], 2)
      txt(item.value, cx + 5, y + 12, { size: 16, bold: true, color: item.color || [14, 110, 60] })
      txt(item.label, cx + 5, y + 18.5, { size: 7, color: [110, 110, 110] })
    })
    y += cardH + 8
  }

  // ══════════════════════════════════════════════════════════════
  // BEGIN REPORT GENERATION
  // ══════════════════════════════════════════════════════════════

  drawPageHeader()
  y = 32

  // ── SECTION: Cover / Transmittal Information ──
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
  const riskColor = overallRisk === 'HIGH' ? [220, 38, 38] : overallRisk === 'MEDIUM' ? [217, 119, 6] : [22, 163, 74]

  // Transmittal box
  rect(ML, y, CW, 36, [245, 250, 247], [200, 225, 210], 3)
  // Left column
  txt('PEST SURVEILLANCE & EARLY WARNING REPORT', ML + 6, y + 8, { size: 9, bold: true, color: [14, 110, 60] })
  txt('Pursuant to DA-BPI Circular No. 2020-001 · PRIME Monitoring Framework', ML + 6, y + 13.5, { size: 7, italic: true, color: [90, 120, 90] })
  line(ML + 6, y + 16, ML + CW * 0.6 - 4, y + 16, [190, 215, 200], 0.3)
  kvRow('Report Period', rangeLabel, ML + 6, y + 22)
  kvRow('Date Generated', generatedAt, ML + 6, y + 28)
  kvRow('Prepared by', userInfo.name || 'Field Monitoring Officer', ML + 6, y + 34)
  // Right column (risk badge)
  const riskX = PW - MR - 38
  rect(riskX, y + 6, 36, 18, riskColor, null, 3)
  txt('OVERALL RISK', riskX + 18, y + 13, { size: 6.5, bold: true, color: [255, 255, 255], align: 'center' })
  txt(overallRisk, riskX + 18, y + 20, { size: 11, bold: true, color: [255, 255, 255], align: 'center' })
  y += 44

  // ── SECTION 1: Purpose & Scope ──
  sectionHeader('Purpose and Scope of Surveillance', '1')
  const purpose = `This report documents the results of automated field pest and disease surveillance conducted using the AgriVision AI-powered monitoring system (Model: YOLOv8n). Data herein was collected during the reporting period: ${rangeLabel}. The surveillance covers all registered field monitoring zones and image uploads submitted by field officers. This report is prepared in accordance with the Bureau of Plant Industry (BPI) Pest Surveillance and Early Warning Protocol and serves as an official record of pest/disease incidence for the reference of the Integrated Pest Management (IPM) Program and the Regional Field Office (RFO).`
  const scopeLines = doc.splitTextToSize(purpose, CW)
  rect(ML, y - 2, CW, scopeLines.length * 4.8 + 6, [250, 252, 250], [225, 235, 225], 2)
  scopeLines.forEach((l, i) => {
    txt(l, ML + 5, y + i * 4.8 + 2, { size: 8, color: [40, 40, 40] })
  })
  y += scopeLines.length * 4.8 + 12

  // ── SECTION 2: Report Metadata ──
  sectionHeader('Report Metadata and Certification', '2')
  const metaData = [
    ['Report Reference No.', reportId,       'Monitoring System', 'AgriVision v2.1.0 · YOLOv8n'],
    ['Reporting Period',     rangeLabel,      'Detection Method',  'AI Image Analysis (CNN-based)'],
    ['Date & Time Generated', generatedAt,   'Classification Model', 'YOLOv8n (ONNX Runtime)'],
    ['Prepared by',          userInfo.name || 'Field Monitoring Officer',
      'Field Officer ID',  userInfo.id || 'N/A'],
    ['Supervising Authority', userInfo.supervisor || 'Regional Plant Health Officer',
      'Office / Station',  userInfo.location || 'Multiple Field Zones'],
    ['Distribution',         'DA-RFO, BPI Plant Health Division, IPM Program Office',
      'Classification',    'CONFIDENTIAL'],
  ]
  metaData.forEach(([l1, v1, l2, v2]) => {
    checkPage(9)
    rect(ML, y - 1, CW / 2 - 2, 8, [248, 250, 248], [232, 238, 232])
    rect(ML + CW / 2 + 2, y - 1, CW / 2 - 2, 8, [248, 250, 248], [232, 238, 232])
    kvRow(l1, v1, ML + 3, y + 5, 38)
    kvRow(l2, v2, ML + CW / 2 + 5, y + 5, 38)
    y += 9
  })
  y += 5

  // ── SECTION 3: Executive Summary ──
  sectionHeader('Executive Summary', '3')
  const riskWord = overallRisk === 'HIGH' ? 'HIGH' : overallRisk === 'MEDIUM' ? 'MEDIUM' : 'LOW'
  const summary = `AgriVision AI surveillance logged a total of ${total} detection event${total !== 1 ? 's' : ''} during the reporting period (${rangeLabel}): ${pests} pest occurrence${pests !== 1 ? 's' : ''} and ${diseases} disease anomal${diseases !== 1 ? 'ies' : 'y'}. Of these, ${criticalCount} event${criticalCount !== 1 ? 's were' : ' was'} classified as CRITICAL, ${highCount - criticalCount} as HIGH, ${moderateCount} as MODERATE, and ${lowCount} as LOW severity. The system achieved an average detection confidence of ${avgConf}%, indicating ${avgConf >= 85 ? 'strong' : avgConf >= 70 ? 'acceptable' : 'moderate'} model reliability. ${uniqueLocations.length} distinct field zone${uniqueLocations.length !== 1 ? 's were' : ' was'} affected. Based on the distribution and severity of detections, the overall crop risk level is classified as ${riskWord}. ${criticalCount > 0 ? 'Immediate field intervention is required.' : highCount > 2 ? 'Field treatment should be scheduled within 24–48 hours.' : 'Continued routine monitoring is advised.'}`
  const sumLines = doc.splitTextToSize(summary, CW - 10)
  checkPage(sumLines.length * 4.8 + 12)
  rect(ML, y - 2, CW, sumLines.length * 4.8 + 8, [248, 252, 248], [215, 232, 215], 2)
  // Risk badge inside summary box
  badge(`RISK LEVEL: ${riskWord}`, ML + 5, y + 4, riskColor)
  y += 7
  sumLines.forEach((l, i) => {
    txt(l, ML + 5, y + i * 4.8, { size: 8, color: [35, 35, 35] })
  })
  y += sumLines.length * 4.8 + 10

  // ── SECTION 4: Quantitative Overview ──
  sectionHeader('Quantitative Detection Overview', '4')
  statCards([
    { label: 'Total Detection Events', value: String(total),      color: [15, 23, 42] },
    { label: 'Pest Occurrences',        value: String(pests),      color: [133, 77, 14] },
    { label: 'Disease Anomalies',       value: String(diseases),   color: [22, 101, 52] },
    { label: 'High / Critical Events',  value: String(highCount),  color: [185, 28, 28] },
  ])
  statCards([
    { label: 'Avg. Confidence (%)',   value: `${avgConf}%`,                  color: [29, 78, 216] },
    { label: 'Field Zones Affected',  value: String(uniqueLocations.length), color: [88, 28, 135] },
    { label: 'Critical Severity',     value: String(criticalCount),           color: [185, 28, 28] },
    { label: 'Low / Moderate Events', value: String(lowCount + moderateCount), color: [21, 128, 61] },
  ])

  // Detection type summary table
  checkPage(30)
  drawTable(
      ['Category', 'Count', 'Share (%)', 'Avg. Confidence', 'Detection Source'],
      [
        ['Pest Occurrence',    { value: String(pests),    bold: true }, { value: total > 0 ? `${Math.round(pests/total*100)}%` : '—' }, { value: `${pests > 0 ? Math.round(detections.filter(d=>d.type==='Pest').reduce((s,d)=>s+d.confidence,0)/pests) : 0}%` }, 'Camera / Upload'],
        ['Disease Anomaly',   { value: String(diseases), bold: true }, { value: total > 0 ? `${Math.round(diseases/total*100)}%` : '—' }, { value: `${diseases > 0 ? Math.round(detections.filter(d=>d.type==='Disease').reduce((s,d)=>s+d.confidence,0)/diseases) : 0}%` }, 'Camera / Upload'],
        [{ value: 'TOTAL', bold: true }, { value: String(total), bold: true }, { value: '100%' }, { value: `${avgConf}%`, bold: true }, '—'],
      ],
      [50, 22, 24, 32, 42]
  )

  // ── SECTION 5: Severity Classification Matrix ──
  sectionHeader('Severity Classification and Risk Matrix', '5')
  txt('Detection events are classified according to the BPI Pest Severity Scale (PSS-4) as follows:', ML, y, { size: 8, color: [70, 70, 70] })
  y += 7

  const sevRows = [
    [
      { value: 'CRITICAL', badge: true, bgColor: [185, 28, 28] },
      { value: String(criticalCount), bold: true, color: [185, 28, 28] },
      { value: total > 0 ? `${Math.round(criticalCount/total*100)}%` : '—' },
      'Immediate field intervention. Infestation at economic threshold. Notify RFO within 24 hours.',
      { value: criticalCount > 0 ? 'ACTION REQUIRED' : 'None', badge: criticalCount > 0, bgColor: criticalCount > 0 ? [185, 28, 28] : undefined },
    ],
    [
      { value: 'HIGH', badge: true, bgColor: [180, 70, 10] },
      { value: String(highCount - criticalCount), bold: true, color: [180, 70, 10] },
      { value: total > 0 ? `${Math.round((highCount-criticalCount)/total*100)}%` : '—' },
      'Schedule treatment within 24–48 hours. Increase monitoring frequency.',
      { value: (highCount - criticalCount) > 0 ? 'SCHEDULE TX' : 'None', badge: (highCount-criticalCount) > 0, bgColor: [217, 119, 6] },
    ],
    [
      { value: 'MODERATE', badge: true, bgColor: [133, 100, 0] },
      { value: String(moderateCount), bold: true, color: [133, 100, 0] },
      { value: total > 0 ? `${Math.round(moderateCount/total*100)}%` : '—' },
      'Prepare treatment plan. Monitor field progression twice weekly.',
      { value: moderateCount > 0 ? 'MONITOR' : 'None', badge: moderateCount > 0, bgColor: [133, 100, 0] },
    ],
    [
      { value: 'LOW', badge: true, bgColor: [21, 128, 61] },
      { value: String(lowCount), bold: true, color: [21, 128, 61] },
      { value: total > 0 ? `${Math.round(lowCount/total*100)}%` : '—' },
      'Continue routine monitoring. No immediate action required.',
      { value: 'ROUTINE', badge: true, bgColor: [21, 128, 61] },
    ],
  ]
  drawTable(
      ['Severity Level', 'Count', 'Share', 'Action Threshold', 'Status'],
      sevRows,
      [28, 18, 18, 80, 26]
  )

  // ── SECTION 6: Field Zone Summary ──
  sectionHeader('Field Zone Detection Summary', '6')
  if (uniqueLocations.length === 0) {
    txt('No field zone data available for this reporting period.', ML, y, { size: 8, italic: true, color: [150, 150, 150] })
    y += 10
  } else {
    const zoneRows = uniqueLocations.map(loc => {
      const zoneDets = detections.filter(d => d.location === loc)
      const zCrit = zoneDets.filter(d => d.severity === 'critical').length
      const zHigh = zoneDets.filter(d => d.severity === 'high').length
      const zMod  = zoneDets.filter(d => d.severity === 'moderate' || d.severity === 'medium').length
      const zLow  = zoneDets.filter(d => d.severity === 'low').length
      const zRisk = zCrit > 0 ? 'HIGH' : zHigh > 1 ? 'MED' : 'LOW'
      const zRiskColor = zCrit > 0 ? [185, 28, 28] : zHigh > 1 ? [217, 119, 6] : [21, 128, 61]
      const zConf = zoneDets.length > 0 ? Math.round(zoneDets.reduce((s, d) => s + d.confidence, 0) / zoneDets.length) : 0
      return [
        { value: loc, bold: true },
        { value: String(zoneDets.length), bold: true },
        String(zCrit),
        String(zHigh),
        String(zMod + zLow),
        `${zConf}%`,
        { value: zRisk, badge: true, bgColor: zRiskColor },
      ]
    })
    drawTable(
        ['Field Zone / Location', 'Total', 'Critical', 'High', 'Mod/Low', 'Avg Conf.', 'Zone Risk'],
        zoneRows,
        [48, 18, 18, 18, 18, 22, 28]
    )
  }

  // ── SECTION 7: Chronological Detection Log ──
  sectionHeader('Chronological Detection Log', '7')
  txt('Records are listed in reverse chronological order. Maximum 30 entries displayed; full dataset available in the system.', ML, y, { size: 7.5, italic: true, color: [100, 100, 100] })
  y += 7

  const sevColorMap = {
    critical: [185, 28, 28], high: [180, 70, 10],
    medium: [133, 100, 0], moderate: [133, 100, 0], low: [21, 128, 61]
  }
  const typeColorMap = { Pest: [133, 77, 14], Disease: [21, 101, 52] }

  if (detections.length === 0) {
    txt('No detection records available for this reporting period.', ML, y, { size: 8, italic: true, color: [150, 150, 150] })
    y += 10
  } else {
    const logRows = [...detections]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 30)
        .map((d, i) => {
          const ts = new Date(d.timestamp)
          const dateStr = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          const timeStr = ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          const sev = (d.severity || 'low').toLowerCase()
          return [
            { value: String(i + 1), dim: true },
            `${dateStr} ${timeStr}`,
            { value: d.name || 'Unknown', bold: true },
            { value: d.type, badge: true, bgColor: typeColorMap[d.type] || [80, 80, 80] },
            `${d.confidence}%`,
            { value: (sev.charAt(0).toUpperCase() + sev.slice(1)), badge: true, bgColor: sevColorMap[sev] || [80, 80, 80] },
            { value: d.location || 'Unknown', dim: true },
          ]
        })
    drawTable(
        ['#', 'Date / Time', 'Detected Species / Class', 'Type', 'Confidence', 'Severity', 'Field Location'],
        logRows,
        [10, 34, 44, 18, 20, 22, 22]
    )
    if (detections.length > 30) {
      txt(`… and ${detections.length - 30} additional records not displayed. Access full dataset in the AgriVision system.`, ML, y, { size: 7, italic: true, color: [130, 130, 130] })
      y += 8
    }
  }

  // ── SECTION 8: Recommendations & Required Actions ──
  sectionHeader('Recommendations and Required Actions', '8')
  const recommendations = []

  if (criticalCount > 0) {
    recommendations.push({
      priority: 'IMMEDIATE',
      color: [185, 28, 28],
      action: `${criticalCount} CRITICAL detection${criticalCount > 1 ? 's' : ''} recorded. Deploy field response team immediately. Notify Regional Plant Health Officer (RPHO) and submit Pest Outbreak Notification Form (DA-BPI Form 3A) within 24 hours. Apply registered pesticide per BPI pest management guidelines.`
    })
  }
  if (highCount - criticalCount > 0) {
    recommendations.push({
      priority: 'URGENT (24–48 HRS)',
      color: [180, 70, 10],
      action: `${highCount - criticalCount} HIGH-severity detection${(highCount-criticalCount) > 1 ? 's' : ''} require scheduled treatment. Coordinate with local agricultural technician. Prepare IPM Treatment Plan and document actions taken.`
    })
  }
  if (moderateCount > 0) {
    recommendations.push({
      priority: 'PRECAUTIONARY',
      color: [133, 100, 0],
      action: `${moderateCount} MODERATE-level detection${moderateCount > 1 ? 's' : ''} identified. Increase monitoring frequency to twice weekly. Prepare contingency treatment plan. Conduct farmer advisory.`
    })
  }
  if (lowCount > 0) {
    recommendations.push({
      priority: 'ROUTINE',
      color: [21, 128, 61],
      action: `${lowCount} LOW-severity detection${lowCount > 1 ? 's' : ''} recorded. Continue standard monitoring schedule. Document field observations in PRIME Collect App. No immediate intervention required.`
    })
  }
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'NO ACTION',
      color: [21, 128, 61],
      action: 'No detections recorded in this period. Maintain standard monitoring schedule and submit nil report to BPI-PRIME coordinator.'
    })
  }

  recommendations.forEach((rec, i) => {
    checkPage(20)
    rect(ML, y, CW, 16, [250, 250, 250], [220, 220, 220], 2)
    rect(ML, y, 4, 16, rec.color, null, 0)
    badge(rec.priority, ML + 8, y + 7, rec.color)
    const actionLines = doc.splitTextToSize(rec.action, CW - 16)
    actionLines.forEach((l, li) => {
      txt(l, ML + 8, y + 12 + li * 4.5, { size: 8, color: [40, 40, 40] })
    })
    y += Math.max(18, actionLines.length * 4.5 + 14)
  })
  y += 4

  // General standing recommendations
  checkPage(40)
  txt('Standing Field Monitoring Requirements (per BPI Circular 2020-001):', ML, y, { size: 8, bold: true, color: [40, 40, 40] })
  y += 6
  const standing = [
    '1. Submit completed PRIME monitoring data sheets to the DA-BPI Regional Coordinator within 3 days of each survey cycle.',
    '2. Maintain field logbook entries for all observations, including nil (negative) findings.',
    '3. Conduct weekly monitoring at a minimum; increase to twice-weekly during outbreak periods.',
    '4. Coordinate with the local Agricultural Extension Worker (AEW) before applying any chemical treatment.',
    '5. Report any new or unusual pest or disease signs immediately to the DA-RFO Plant Health Division.',
  ]
  standing.forEach(s => {
    checkPage(9)
    const sl = doc.splitTextToSize(s, CW - 6)
    sl.forEach((l, li) => {
      txt(l, ML + 3, y + li * 4.5, { size: 8, color: [60, 60, 60] })
    })
    y += sl.length * 4.5 + 2
  })
  y += 6

  // ── SECTION 9: Certification Block ──
  sectionHeader('Certification and Approval', '9')
  checkPage(50)

  const certBoxes = [
    { label: 'Prepared by', role: 'Field Monitoring Officer', name: userInfo.name || '___________________________' },
    { label: 'Reviewed by', role: 'IPM Program Coordinator', name: userInfo.reviewer || '___________________________' },
    { label: 'Noted by', role: 'Regional Plant Health Officer', name: userInfo.supervisor || '___________________________' },
  ]
  const certW = (CW - 8) / 3
  certBoxes.forEach((cb, i) => {
    const cx = ML + i * (certW + 4)
    rect(cx, y, certW, 38, [248, 250, 248], [210, 225, 210], 2)
    txt(cb.label.toUpperCase(), cx + 5, y + 7, { size: 7, bold: true, color: [14, 110, 60] })
    line(cx + 5, y + 23, cx + certW - 5, y + 23, [160, 160, 160], 0.4)
    txt(cb.name, cx + certW / 2, y + 28, { size: 8, bold: true, color: [30, 30, 30], align: 'center' })
    txt(cb.role, cx + certW / 2, y + 34, { size: 7, color: [100, 100, 100], align: 'center' })
  })
  y += 46

  // Official stamp note
  checkPage(18)
  rect(ML, y, CW, 14, [245, 248, 245], [200, 220, 200], 2)
  txt('This report is an official record of the AgriVision AI Pest Surveillance System and is filed in accordance with DA Department Order No. 16, Series of 2020 (Digital Agriculture Framework). It shall be retained for a minimum of five (5) years in the field station records management system.', ML + 5, y + 5, { size: 7, italic: true, color: [80, 100, 80], maxW: CW - 10, lineHeight: 4 })
  y += 18

  // ── Add footers to all pages ──
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    drawFooter(p, totalPages)
  }

  // ── Auto-download ──
  const filename = `AgriVision_Surveillance_Report_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${reportId}.pdf`
  doc.save(filename)

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
      <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)' }}
          onMouseDown={onClose}
      >
        <div
            onMouseDown={e => e.stopPropagation()}
            style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid #26262610', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.16)', width: '100%', maxWidth: 520, maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 20px', borderBottom: '1px solid #26262610', flexShrink: 0 }}>
            <div>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#262626', letterSpacing: '-0.02em' }}>Key Metrics Guide</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(38,38,38,0.45)', fontWeight: 500, marginTop: 4 }}>What each indicator means for your fields</p>
            </div>
            <button
                onClick={onClose}
                className="w-8 h-8 rounded-[10px] flex items-center justify-center cursor-pointer"
                style={{ background: 'transparent', border: 'none', color: '#262626' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(38,38,38,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={15} />
            </button>
          </div>
          <div style={{ overflowY: 'auto', padding: '22px 26px 26px', display: 'flex', flexDirection: 'column', gap: 28, scrollbarWidth: 'none' }}>
            {METRICS_HELP.map(group => (
                <div key={group.group}>
                  <p style={{ margin: 0, marginBottom: 14, fontSize: 15, fontWeight: 800, color: '#262626' }}>{group.group}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {group.items.map(item => (
                        <div key={item.name}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(38,38,38,0.6)', marginBottom: 4 }}>{item.name}</p>
                          <p style={{ margin: 0, fontSize: 13, color: 'rgba(38,38,38,0.45)', lineHeight: 1.6 }}>{item.desc}</p>
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
          const res = await api.post('/api/detection', { image: base64, source: 'upload' })
          const dets = res.data?.data?.detections ?? []
          setResult({ detections: dets, count: dets.length })
        } catch {
          setError('Detection API unavailable. Please try again.')
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
        <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div style={{ padding: '24px 28px 22px', borderBottom: '1px solid #26262610', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(38,38,38,0.45)', textTransform: 'uppercase', marginBottom: 4 }}>Field Monitoring</p>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#262626', letterSpacing: '-0.02em' }}>Upload Image for Detection</h2>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 12, border: '1px solid #26262610', background: 'rgba(38,38,38,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(38,38,38,0.45)', cursor: 'pointer' }}>
              <X size={15} />
            </button>
          </div>
          <div style={{ padding: '24px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!result ? (
                <>
                  <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
                      onClick={() => inputRef.current?.click()}
                      style={{ border: `2px dashed ${dragging ? '#10b981' : file ? '#34d399' : '#26262615'}`, borderRadius: 16, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragging ? 'rgba(16,185,129,0.04)' : file ? 'rgba(52,211,153,0.04)' : 'transparent' }}>
                    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
                    {file ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={20} style={{ color: '#10b981' }} />
                          </div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#262626' }}>{file.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'rgba(38,38,38,0.4)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#26262608', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Upload size={20} style={{ color: 'rgba(38,38,38,0.35)' }} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(38,38,38,0.6)' }}>Drop image here or click to browse</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(38,38,38,0.35)', marginTop: 4 }}>JPG, PNG, WebP supported</p>
                          </div>
                        </div>
                    )}
                  </div>
                  {error && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px' }}>
                        <AlertCircle size={15} style={{ color: '#f87171', marginTop: 1, flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{error}</p>
                      </div>
                  )}
                  <button onClick={handleUpload} disabled={!file || uploading}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#262626', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, padding: '12px 0', borderRadius: 14, cursor: file && !uploading ? 'pointer' : 'not-allowed', opacity: !file || uploading ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                    {uploading ? <><Loader2 size={16} className="animate-spin" />Analyzing Image…</> : <><Upload size={16} />Run Detection</>}
                  </button>
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ borderRadius: 16, padding: '20px', textAlign: 'center', background: result.count > 0 ? 'rgba(16,185,129,0.05)' : '#26262604', border: `1px solid ${result.count > 0 ? 'rgba(16,185,129,0.15)' : '#26262610'}` }}>
                    <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#262626', lineHeight: 1 }}>{result.count}</p>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(38,38,38,0.45)', marginTop: 6 }}>{result.count === 1 ? 'detection found' : 'detections found'}</p>
                  </div>
                  {result.detections.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {result.detections.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#26262604', borderRadius: 12, border: '1px solid #26262608' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#262626' }}>{d.class ?? 'Unknown'}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(38,38,38,0.45)' }}>{Math.round((d.confidence ?? 0) * 100)}% confidence</span>
                            </div>
                        ))}
                      </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={reset} style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: '1px solid #26262610', background: '#26262606', color: 'rgba(38,38,38,0.7)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Upload Another</button>
                    <button onClick={onClose} style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', background: '#262626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Done</button>
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
        <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(36px) saturate(220%)', border: '1px solid #26262610', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.10)', padding: '14px 16px', minWidth: 180 }}>
          <div style={{ marginBottom: 10, paddingBottom: 9, borderBottom: '1px solid #26262608' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#262626', margin: 0 }}>{label}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SEVERITY_CONFIG.map(s => {
              if (!activeKeys.has(s.key)) return null
              const val = severityData[s.key][hoverIdx]
              const rate = growthRate(severityData[s.key], hoverIdx)
              const isUp = rate !== null && Number(rate) >= 0
              return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0, display: 'block' }} />
                      <span style={{ fontSize: 11, color: 'rgba(38,38,38,0.55)', fontWeight: 500 }}>{s.key}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#262626', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
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
              <p style={{ fontSize: 9, color: 'rgba(38,38,38,0.3)', marginTop: 10, paddingTop: 9, borderTop: '1px solid #26262606', marginBottom: 0, fontWeight: 500 }}>
                % change vs previous {data.sublabel.toLowerCase()}
              </p>
          )}
        </div>
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
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 10, transition: 'background 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = '#26262606'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#262626', margin: 0, whiteSpace: 'nowrap', lineHeight: 1.2 }}>{current.date}</p>
            <p style={{ fontSize: 10, color: 'rgba(38,38,38,0.4)', margin: 0, marginTop: 2, fontWeight: 500, lineHeight: 1 }}>{current.days}</p>
          </div>
          <ChevronDown size={12} style={{ color: 'rgba(38,38,38,0.4)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
        </button>
        {open && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 40, background: 'white', border: '1px solid #26262610', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', padding: '6px', minWidth: 200 }}>
              {ranges.map(r => (
                  <button key={r.label} onClick={() => { onChange(r.label); onClose() }}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 14px', fontSize: 13, cursor: 'pointer', border: 'none', borderRadius: 10, background: range === r.label ? '#26262608' : 'transparent', color: range === r.label ? '#262626' : 'rgba(38,38,38,0.6)', transition: 'background 0.12s ease', display: 'flex', flexDirection: 'column', gap: 2 }}
                          onMouseEnter={e => { if (range !== r.label) e.currentTarget.style.background = '#26262604' }}
                          onMouseLeave={e => { if (range !== r.label) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: range === r.label ? '#262626' : 'rgba(38,38,38,0.75)' }}>{r.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(38,38,38,0.4)' }}>{r.date}</span>
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
  const W = 900, H = 380, PX_L = 12, PX_R = 42, PY = 24

  const [hoverPos, setHoverPos] = useState({ idx: null, x: 0, y: 0 })
  const [activeKeys, setActiveKeys] = useState(() => new Set(SEVERITY_CONFIG.map(s => s.key)))
  const [pestOpen, setPestOpen] = useState(false)
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
    const idx = Math.max(0, Math.min(labelCount - 1, Math.round((relX - PX_L) / colW)))
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
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={e => { e.stopPropagation(); setActiveView('All') }}
                    style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'All' ? '#26262610' : 'transparent', color: activeView === 'All' ? '#262626' : 'rgba(38,38,38,0.45)' }}
                    onMouseEnter={e => { if (activeView !== 'All') e.currentTarget.style.background = '#26262606' }}
                    onMouseLeave={e => { if (activeView !== 'All') e.currentTarget.style.background = 'transparent' }}>All</button>

            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setActiveView('Pests'); setPestOpen(o => !o); setDiseaseOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'Pests' ? '#26262610' : 'transparent', color: activeView === 'Pests' ? '#262626' : 'rgba(38,38,38,0.45)' }}
                      onMouseEnter={e => { if (activeView !== 'Pests') e.currentTarget.style.background = '#26262606' }}
                      onMouseLeave={e => { if (activeView !== 'Pests') e.currentTarget.style.background = 'transparent' }}>
                Pests
                {pestValue && activeView === 'Pests' && <span style={{ fontSize: 9, background: '#dcfce7', color: '#15803d', padding: '1px 5px', borderRadius: 4, marginLeft: 2, fontWeight: 700 }}>{pestValue.split(' ').slice(-1)[0]}</span>}
                <ChevronDown size={10} style={{ color: 'rgba(38,38,38,0.5)', transform: pestOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {pestOpen && (
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #26262610', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', padding: '6px', minWidth: 170 }}>
                    <button onClick={() => { setPestValue(null); setPestOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: !pestValue ? '#26262608' : 'transparent', color: !pestValue ? '#262626' : 'rgba(38,38,38,0.6)', fontWeight: 600 }}>All Pests</button>
                    {pestClasses.length === 0 ? (
                        <p style={{ fontSize: 11, color: 'rgba(38,38,38,0.4)', padding: '6px 12px', margin: 0 }}>No pest data yet</p>
                    ) : pestClasses.map(p => (
                        <button key={p} onClick={() => { setPestValue(p); setPestOpen(false) }}
                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: pestValue === p ? '#26262608' : 'transparent', color: pestValue === p ? '#262626' : 'rgba(38,38,38,0.6)', fontWeight: 500 }}
                                onMouseEnter={e => { if (pestValue !== p) e.currentTarget.style.background = '#26262604' }}
                                onMouseLeave={e => { if (pestValue !== p) e.currentTarget.style.background = 'transparent' }}
                        >{p}</button>
                    ))}
                  </div>
              )}
            </div>

            <div className="relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setActiveView('Diseases'); setDiseaseOpen(o => !o); setPestOpen(false) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'background 0.15s ease', background: activeView === 'Diseases' ? '#26262610' : 'transparent', color: activeView === 'Diseases' ? '#262626' : 'rgba(38,38,38,0.45)' }}
                      onMouseEnter={e => { if (activeView !== 'Diseases') e.currentTarget.style.background = '#26262606' }}
                      onMouseLeave={e => { if (activeView !== 'Diseases') e.currentTarget.style.background = 'transparent' }}>
                Diseases
                {diseaseValue && activeView === 'Diseases' && <span style={{ fontSize: 9, background: '#fef9c3', color: '#a16207', padding: '1px 5px', borderRadius: 4, marginLeft: 2, fontWeight: 700 }}>{diseaseValue.split(' ').slice(-1)[0]}</span>}
                <ChevronDown size={10} style={{ color: 'rgba(38,38,38,0.5)', transform: diseaseOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              {diseaseOpen && (
                  <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 40, background: 'white', border: '1px solid #26262610', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', padding: '6px', minWidth: 170 }}>
                    <button onClick={() => { setDiseaseValue(null); setDiseaseOpen(false) }} style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: !diseaseValue ? '#26262608' : 'transparent', color: !diseaseValue ? '#262626' : 'rgba(38,38,38,0.6)', fontWeight: 600 }}>All Diseases</button>
                    {diseaseClasses.length === 0 ? (
                        <p style={{ fontSize: 11, color: 'rgba(38,38,38,0.4)', padding: '6px 12px', margin: 0 }}>No disease data yet</p>
                    ) : diseaseClasses.map(d => (
                        <button key={d} onClick={() => { setDiseaseValue(d); setDiseaseOpen(false) }}
                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, cursor: 'pointer', border: 'none', borderRadius: 8, background: diseaseValue === d ? '#26262608' : 'transparent', color: diseaseValue === d ? '#262626' : 'rgba(38,38,38,0.6)', fontWeight: 500 }}
                                onMouseEnter={e => { if (diseaseValue !== d) e.currentTarget.style.background = '#26262604' }}
                                onMouseLeave={e => { if (diseaseValue !== d) e.currentTarget.style.background = 'transparent' }}
                        >{d}</button>
                    ))}
                  </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
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
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#262626' }}>{s.key}</span>
                  </button>
              )
            })}
          </div>
        </div>

        <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: 380, display: 'block', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverPos({ idx: null, x: 0, y: 0 })}
        >
          <defs>
            {SEVERITY_CONFIG.map(s => (
                <linearGradient key={s.key} id={`g-${s.color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
            ))}
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const yp = PY + t * (H - PY * 2)
            const val = (globalMax * (1 - t)).toFixed(1)
            return (
                <g key={t}>
                  <line x1={PX_L} x2={W - PX_R} y1={yp} y2={yp} stroke="#26262608" strokeWidth="1" strokeDasharray="4 7" />
                  <text
                      x={W - PX_R + 10}
                      y={yp + 4}
                      textAnchor="start"
                      fontSize="10"
                      fill="rgba(38,38,38,0.35)"
                  >
                    {val}
                  </text>
                </g>
            )
          })}

          {data.labels.map((l, i) => (
              <text
                  key={`${l}-${i}`}
                  x={PX_L + (i / (labelCount - 1)) * plotW}
                  y={H - 4}
                  textAnchor={i === 0 ? 'start' : i === labelCount - 1 ? 'end' : 'middle'}
                  fontSize="11"
                  fill="rgba(38,38,38,0.4)"
                  fontWeight={400}
              >
                {l}
              </text>
          ))}

          {hoverIdx !== null && (
              <line x1={tooltipX} x2={tooltipX} y1={PY} y2={H - PY} stroke="#26262612" strokeWidth="1.5" strokeDasharray="3 4" />
          )}

          {SEVERITY_CONFIG.map((s, si) => {
            if (!activeKeys.has(s.key)) return null
            const pts = buildPts(s.key)
            const pd = smoothD(pts)
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

// ─── Sparkline helper ─────────────────────────────────────────────────────────

function buildSparkPaths(data) {
  const W = 65, H = 20
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (W - 1) + 0.5,
    H - 0.5 - ((v - min) / range) * (H - 2),
  ])
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')
  const fillPath = `${linePath} L${pts[pts.length-1][0].toFixed(2)},${(H - 0.5).toFixed(2)} L${pts[0][0].toFixed(2)},${(H - 0.5).toFixed(2)} Z`
  return { linePath, fillPath }
}

// ─── Spark Stat Card ──────────────────────────────────────────────────────────

function SparkStatCard({ title, value, sparkData, color, trendValue, trendLabel, trendUp, loading }) {
  const { linePath, fillPath } = sparkData?.length > 1
      ? buildSparkPaths(sparkData)
      : { linePath: '', fillPath: '' }

  const trendIsGood = title === 'Healthy Crops' ? trendUp : !trendUp

  return (
      <div style={{ background: 'white', border: '1px solid #26262610', borderRadius: 10, padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'rgba(38,38,38,0.55)' }}>{title}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
          {loading ? (
              <div style={{ height: 36, width: 56, background: '#26262608', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : (
              <p style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#262626', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
          )}
          <svg viewBox="0 0 65 20" width="65" height="20" style={{ display: 'block', flexShrink: 0 }} aria-hidden="true">
            <rect x="0" y="0" width="65" height="20" stroke="none" strokeWidth="0" fillOpacity="0" fill="#ffffff" />
            {sparkData?.length > 1 && (
                <>
                  <path d={fillPath} stroke="none" strokeWidth="0" fillOpacity="0.3" fill={color} />
                  <path d={linePath} stroke={color} strokeWidth="1" fillOpacity="1" fill="none" />
                </>
            )}
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 10, borderTop: '1px solid #26262608', marginTop: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 100, color: trendIsGood ? '#16a34a' : '#dc2626' }}>
            {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trendValue}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(38,38,38,0.35)', fontWeight: 500 }}>{trendLabel}</span>
        </div>
      </div>
  )
}

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({ icon, title, onClick, loading }) {
  return (
      <button onClick={onClick} disabled={loading}
              style={{ background: 'white', borderRadius: 14, border: '1.5px dashed #26262615', padding: '18px 16px', width: '100%', textAlign: 'left', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', gap: 12, transition: 'all 0.2s', opacity: loading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = 'rgba(16,185,129,0.03)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#26262615'; e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateY(0)' }}>
        <span style={{ color: '#10b981', opacity: 0.85, display: 'flex' }}>
          {loading ? <Loader2 size={22} className="animate-spin" /> : icon}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(38,38,38,0.65)', lineHeight: 1.4 }}>{title}</span>
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
    success: { bg: '#f0fdf4', border: '#26262610', text: '#262626', icon: <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} /> },
    error:   { bg: '#fef2f2', border: '#26262610', text: '#262626', icon: <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} /> },
    info:    { bg: '#f8fafc',  border: '#26262610', text: '#262626', icon: <Loader2 size={16} style={{ color: 'rgba(38,38,38,0.5)', flexShrink: 0 }} className="animate-spin" /> },
  }
  const c = colors[type] || colors.info

  return (
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 13, fontWeight: 600, maxWidth: 360, animation: 'slideUp 0.3s ease' }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        {c.icon}
        <span>{message}</span>
        <button onClick={onClose} style={{ marginLeft: 8, opacity: 0.4, background: 'none', border: 'none', cursor: 'pointer', color: '#262626', padding: 0, display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
          <X size={14} />
        </button>
      </div>
  )
}

// ─── Build sparkline data from detections list ────────────────────────────────

function buildSparklineData(detectionsList, rangeKey) {
  const buckets = buildRangeBuckets()
  const bucket = buckets[rangeKey] || buckets['This week']
  const detCounts   = Array(bucket.bucketCount).fill(0)
  const alertCounts = Array(bucket.bucketCount).fill(0)

  detectionsList.forEach(det => {
    if (!det.timestamp) return
    const bi = bucket.getBucket(det.timestamp)
    if (bi < 0) return
    detCounts[bi]++
    if (det.severity === 'high' || det.severity === 'critical') alertCounts[bi]++
  })

  const cropLossVals = detCounts.map((v, i) => {
    const h = alertCounts[i]
    return v > 0 ? Math.min(99, Math.round((h * 4 + (v - h) * 1.2) / Math.max(v, 1) * 100) / 10) : 0
  })
  const healthVals = cropLossVals.map(cl => Math.max(0, Math.round(100 - cl * 2)))

  return { detCounts, alertCounts, cropLossVals, healthVals }
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

  const [graphData, setGraphData] = useState(() => buildDynamicGraphData([], []))

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  const apiNotFound = useRef({})

  const fetchLiveData = useCallback(async () => {
    let allRecords = []

    try {
      const noThrow = { validateStatus: () => true }

      if (!apiNotFound.current['/api/classes']) {
        const res = await api.get('/api/classes', noThrow).catch(() => null)
        if (res?.status === 404) {
          apiNotFound.current['/api/classes'] = true
        } else if (res?.status === 200) {
          const raw = res.data?.data ?? res.data ?? {}
          if (raw.pests && raw.diseases) {
            setPestClasses(raw.pests)
            setDiseaseClasses(raw.diseases)
          } else if (Array.isArray(raw.classes)) {
            setPestClasses(raw.classes.filter(c => PEST_KEYWORDS.some(k => c.toLowerCase().includes(k))))
            setDiseaseClasses(raw.classes.filter(c => !PEST_KEYWORDS.some(k => c.toLowerCase().includes(k))))
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
    } catch { /* api unavailable */ }

    const deduped = Array.from(new Map(allRecords.map(r => [String(r.id), r])).values())
    deduped.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    const uniqueNames = [...new Set(deduped.map(d => d.name).filter(n => n && n !== 'Unknown'))]
    const derivedPests    = uniqueNames.filter(n => PEST_KEYWORDS.some(k => n.toLowerCase().includes(k)))
    const derivedDiseases = uniqueNames.filter(n => !PEST_KEYWORDS.some(k => n.toLowerCase().includes(k)))

    if (derivedPests.length > 0)    setPestClasses(derivedPests)
    if (derivedDiseases.length > 0) setDiseaseClasses(derivedDiseases)

    const total = deduped.length
    const highCount = deduped.filter(d => d.severity === 'high' || d.severity === 'critical').length
    const cropLoss = total > 0
        ? Math.min(99, Math.round((highCount * 4 + (total - highCount) * 1.2) / Math.max(total, 1) * 100) / 10)
        : 0
    const healthyCrops = Math.max(0, Math.round(100 - cropLoss * 2))

    const allClasses = [...new Set([...derivedPests, ...derivedDiseases, ...uniqueNames])]
    setGraphData(buildDynamicGraphData(deduped, allClasses))
    setLiveData({ detections: total, activeAlerts: highCount, cropLoss, healthyCrops, detectionsList: deduped, loaded: true })
  }, [])

  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(fetchLiveData, 5000)
    return () => clearInterval(interval)
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
    showToast('Compiling surveillance report…', 'info')
    try {
      const currentRange = timeRanges.find(r => r.label === range)
      const rangeLabel = currentRange ? `${currentRange.label} (${currentRange.date})` : range
      await generateAgriVisionReport(liveData.detectionsList, rangeLabel)
      showToast('Surveillance report downloaded successfully!', 'success')
    } catch (e) {
      console.error('Report generation error:', e)
      showToast(`Report failed: ${e.message || 'Unknown error'}`, 'error')
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
  const sparks = buildSparklineData(liveData.detectionsList, range)

  const computeTrend = (arr) => {
    const mid = Math.floor(arr.length / 2)
    const prev = arr.slice(0, mid).reduce((a, b) => a + b, 0)
    const curr = arr.slice(mid).reduce((a, b) => a + b, 0)
    if (prev === 0) return { pct: '—', up: false }
    const pct = Math.abs(Math.round(((curr - prev) / prev) * 100))
    return { pct: `${pct}%`, up: curr >= prev }
  }

  const detTrend    = computeTrend(sparks.detCounts)
  const alertTrend  = computeTrend(sparks.alertCounts)
  const cropTrend   = computeTrend(sparks.cropLossVals)
  const healthTrend = computeTrend(sparks.healthVals)

  const currentRange = timeRanges.find(r => r.label === range)
  const trendLabel = `in the last ${currentRange?.days || '7 days'}`

  return (
      <div
          className="min-h-screen bg-white"
          onMouseDown={() => setRangeOpen(false)}
      >
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-4 lg:px-8 xl:px-12 py-2 lg:py-8 flex flex-col gap-10 font-sans text-[#262626]">
          <div className="bg-white">

            {/* ── Header ── */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '28px 32px 26px', borderBottom: '1px solid #26262608' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#262626', letterSpacing: '-0.02em' }}>Key Metrics</h2>
                <button
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setHelpOpen(true) }}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid #262626', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#262626', flexShrink: 0, padding: 0 }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, lineHeight: 1, userSelect: 'none' }}>?</span>
                </button>
              </div>

              <div onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                <DateRangeDropdown
                    range={range}
                    onChange={setRange}
                    open={rangeOpen}
                    onToggle={() => setRangeOpen(o => !o)}
                    onClose={() => setRangeOpen(false)}
                />
              </div>
            </div>

            {/* ── Stat Cards (above graph) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, padding: '28px 28px 0' }}>
              <SparkStatCard title="Detections" value={liveData.detections} sparkData={sparks.detCounts} color="#ef4444" trendValue={detTrend.pct} trendUp={detTrend.up} trendLabel={trendLabel} loading={isLoading} />
              <SparkStatCard title="Crop Loss" value={`${liveData.cropLoss}%`} sparkData={sparks.cropLossVals} color="#f97316" trendValue={cropTrend.pct} trendUp={cropTrend.up} trendLabel="estimated" loading={isLoading} />
              <SparkStatCard title="Active Alerts" value={liveData.activeAlerts} sparkData={sparks.alertCounts} color="#3b82f6" trendValue={alertTrend.pct} trendUp={alertTrend.up} trendLabel="high severity" loading={reportLoading} />
              <SparkStatCard title="Healthy Crops" value={`${liveData.healthyCrops}%`} sparkData={sparks.healthVals} color="#22c55e" trendValue={healthTrend.pct} trendUp={healthTrend.up} trendLabel="estimated" loading={isLoading} />
            </div>

            {/* ── Line Graph ── */}
            {/* Increase bottom whitespace + add a divider so the charts feel separated */}
            <div style={{ padding: '28px 28px 28px', borderBottom: '1px solid #26262608', marginBottom: 24 }}>
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

            {/* ── Pie & Bar Charts ── */}
            {/* Add more breathing room above charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '0 28px 28px', marginTop: 8 }}>
              {/* Pie Chart */}
              <div style={{ background: 'white', border: '1px solid #26262610', borderRadius: 10, padding: '20px' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'rgba(38,38,38,0.55)', marginBottom: 4 }}>Detection type breakdown</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#262626', marginBottom: 4 }}>Pest vs. disease share</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(38,38,38,0.4)', marginBottom: 14 }}>Proportion by category and severity — informs treatment prioritization.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Critical pest', color: '#D85A30' },
                    { label: 'High pest', color: '#FAC775' },
                    { label: 'Moderate pest', color: '#F09595' },
                    { label: 'Critical disease', color: '#185FA5' },
                    { label: 'High disease', color: '#85B7EB' },
                    { label: 'Moderate disease', color: '#B5D4F4' },
                    { label: 'Low (all)', color: '#3B6D11' },
                  ].map(item => (
                      <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(38,38,38,0.55)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        {item.label}
                    </span>
                  ))}
                </div>
                <div style={{ position: 'relative', width: '100%', height: 220 }}>
                  <canvas id="agriPieChart" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <div style={{ background: '#26262604', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(38,38,38,0.5)' }}>Total pests</p>
                    <p id="agriPestPct" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#262626' }}>—</p>
                  </div>
                  <div style={{ background: '#26262604', borderRadius: 8, padding: '10px 12px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(38,38,38,0.5)' }}>Total diseases</p>
                    <p id="agriDiseasePct" style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#262626' }}>—</p>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div style={{ background: 'white', border: '1px solid #26262610', borderRadius: 10, padding: '20px' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'rgba(38,38,38,0.55)', marginBottom: 4 }}>Field zone comparison</p>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#262626', marginBottom: 4 }}>Detections by field zone</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(38,38,38,0.4)', marginBottom: 14 }}>Detection volume per zone — helps prioritize resource dispatch and mobile milling deployment.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Critical', color: '#E24B4A' },
                    { label: 'High', color: '#EF9F27' },
                    { label: 'Moderate / Low', color: '#639922' },
                  ].map(item => (
                      <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(38,38,38,0.55)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        {item.label}
                    </span>
                  ))}
                </div>
                <div style={{ position: 'relative', width: '100%', height: 280 }}>
                  <canvas id="agriBarChart" />
                </div>
              </div>

            </div>

          </div>

          {/* ── Quick Actions ── */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#262626', letterSpacing: '-0.01em', marginBottom: 5 }}>Quick Actions</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(38,38,38,0.45)' }}>Jump to common tasks</p>
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

        {helpOpen && <MetricsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />}
        {uploadOpen && <UploadImageModal open={uploadOpen} onClose={() => setUploadOpen(false)} />}
        {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* ── Chart.js Initialization ── */}
        <ChartInitializer detectionsList={liveData.detectionsList} />
      </div>
  )
}

// ─── Chart Initializer (mounts Chart.js after DOM is ready) ──────────────────

function ChartInitializer({ detectionsList }) {
  const pieRef = useRef(null)
  const barRef = useRef(null)

  useEffect(() => {
    let script = document.getElementById('chartjs-cdn')
    const init = () => {
      const Chart = window.Chart
      if (!Chart) return

      // ── Derive data from live detections ──
      const total = detectionsList.length
      const pests = detectionsList.filter(d => d.type === 'Pest')
      const diseases = detectionsList.filter(d => d.type === 'Disease')

      const sevCount = (arr, sev) => arr.filter(d => d.severity === sev).length

      const pestCrit = sevCount(pests, 'critical')
      const pestHigh = sevCount(pests, 'high')
      const pestMod  = sevCount(pests, 'moderate') + sevCount(pests, 'medium')
      const disCrit  = sevCount(diseases, 'critical')
      const disHigh  = sevCount(diseases, 'high')
      const disMod   = sevCount(diseases, 'moderate') + sevCount(diseases, 'medium')
      const lowAll   = sevCount(detectionsList, 'low')

      const pieData = [pestCrit, pestHigh, pestMod, disCrit, disHigh, disMod, lowAll]
      const pieTotal = pieData.reduce((a, b) => a + b, 0) || 1

      // Update summary badges
      const pestPctEl = document.getElementById('agriPestPct')
      const disPctEl  = document.getElementById('agriDiseasePct')
      if (pestPctEl) pestPctEl.textContent = `${Math.round((pests.length / (total || 1)) * 100)}%`
      if (disPctEl)  disPctEl.textContent  = `${Math.round((diseases.length / (total || 1)) * 100)}%`

      // ── Pie Chart ──
      const pieCanvas = document.getElementById('agriPieChart')
      if (pieCanvas) {
        if (!pieRef.current) {
          pieRef.current = new Chart(pieCanvas, {
            type: 'doughnut',
            data: {
              labels: ['Critical pest','High pest','Moderate pest','Critical disease','High disease','Moderate disease','Low (all)'],
              datasets: [{
                data: pieTotal > 0 ? pieData : [1,1,1,1,1,1,1],
                backgroundColor: ['#D85A30','#FAC775','#F09595','#185FA5','#85B7EB','#B5D4F4','#3B6D11'],
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.8)',
                hoverOffset: 6,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: '60%',
              animation: false,
              transitions: {
                active: { animation: { duration: 0 } },
                resize: { animation: { duration: 0 } },
                show: { animations: { colors: { duration: 0 }, numbers: { duration: 0 } } },
                hide: { animations: { colors: { duration: 0 }, numbers: { duration: 0 } } },
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const pct = Math.round((ctx.raw / pieTotal) * 100)
                      return ` ${ctx.label}: ${ctx.raw} (${pct}%)`
                    },
                  },
                },
              },
            },
          })
        } else {
          pieRef.current.data.datasets[0].data = pieTotal > 0 ? pieData : [1,1,1,1,1,1,1]
          pieRef.current.update('none')
        }
      }

      // ── Bar Chart — derive zones from live detections ──
      const locationMap = {}
      detectionsList.forEach(d => {
        const loc = d.location || 'Unknown'
        if (!locationMap[loc]) locationMap[loc] = { critical: 0, high: 0, modLow: 0 }
        if (d.severity === 'critical') locationMap[loc].critical++
        else if (d.severity === 'high') locationMap[loc].high++
        else locationMap[loc].modLow++
      })

      let zones = Object.entries(locationMap)
          .map(([name, counts]) => ({ name, ...counts, total: counts.critical + counts.high + counts.modLow }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 6)

      // Fallback sample data if no detections yet
      if (zones.length === 0) {
        zones = [
          { name: 'Zone A', critical: 14, high: 19, modLow: 14 },
          { name: 'Zone B', critical: 11, high: 15, modLow: 12 },
          { name: 'Zone C', critical:  8, high: 12, modLow: 11 },
          { name: 'Zone D', critical:  5, high:  8, modLow: 11 },
          { name: 'Zone E', critical:  2, high:  5, modLow: 10 },
        ]
      }

      const barCanvas = document.getElementById('agriBarChart')
      if (barCanvas) {
        const labels = zones.map(z => z.name)
        const crit   = zones.map(z => z.critical)
        const high   = zones.map(z => z.high)
        const modLow = zones.map(z => z.modLow)

        if (!barRef.current) {
          barRef.current = new Chart(barCanvas, {
            type: 'bar',
            data: {
              labels,
              datasets: [
                { label: 'Critical',       data: crit,   backgroundColor: '#E24B4A', borderRadius: 0 },
                { label: 'High',           data: high,   backgroundColor: '#EF9F27', borderRadius: 0 },
                { label: 'Moderate / Low', data: modLow, backgroundColor: '#639922', borderRadius: 4 },
              ],
            },
            options: {
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              animation: false,
              transitions: {
                active: { animation: { duration: 0 } },
                resize: { animation: { duration: 0 } },
                show: { animations: { colors: { duration: 0 }, numbers: { duration: 0 } } },
                hide: { animations: { colors: { duration: 0 }, numbers: { duration: 0 } } },
              },
              scales: {
                x: {
                  stacked: true,
                  ticks: { font: { size: 11 }, color: 'rgba(38,38,38,0.4)' },
                  grid: { color: 'rgba(38,38,38,0.05)' },
                  title: { display: true, text: 'Number of detections', font: { size: 10 }, color: 'rgba(38,38,38,0.4)' },
                },
                y: {
                  stacked: true,
                  ticks: { font: { size: 11 }, color: 'rgba(38,38,38,0.55)' },
                  grid: { display: false },
                },
              },
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} detections` } },
              },
            },
          })
        } else {
          barRef.current.data.labels = labels
          barRef.current.data.datasets[0].data = crit
          barRef.current.data.datasets[1].data = high
          barRef.current.data.datasets[2].data = modLow
          barRef.current.update('none')
        }
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = 'chartjs-cdn'
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      script.onload = init
      document.head.appendChild(script)
    } else if (window.Chart) {
      init()
    } else {
      script.addEventListener('load', init)
    }

    return () => {
      // optional cleanup on unmount (prevents leaks if Dashboard unmounts)
      if (pieRef.current) { pieRef.current.destroy(); pieRef.current = null }
      if (barRef.current) { barRef.current.destroy(); barRef.current = null }
    }
  }, [detectionsList])

  return null
}

