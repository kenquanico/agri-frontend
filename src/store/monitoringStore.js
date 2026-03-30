// monitoringStore.js — shared store for field-monitoring detections
// FieldMonitoring writes here; AlarmLog reads from here.

export const SHARED_DETECTIONS_KEY = 'agriSharedDetections'
export const SHARED_DETECTIONS_MAX = 300
export const SHARED_DETECTIONS_EVENT = 'agri:shared-detections-updated'

const PEST_KEYWORDS = [
  'aphid', 'whitefly', 'mite', 'beetle', 'caterpillar',
  'thrip', 'weevil', 'locust', 'pest',
]

/** Classify a detection class name as 'Pest' or 'Disease'. */
export function classifyDetectionType(name = '') {
  const n = String(name).toLowerCase()
  return PEST_KEYWORDS.some(k => n.includes(k)) ? 'Pest' : 'Disease'
}

/** Load all shared detections from localStorage. */
export function loadSharedDetections() {
  try {
    const raw = JSON.parse(localStorage.getItem(SHARED_DETECTIONS_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

/**
 * Append new detection records to the shared localStorage store and
 * dispatch a same-tab custom event so AlarmLog can react instantly.
 *
 * @param {Array<{id, timestamp, type, class, name, confidence, location, fieldId, source}>} records
 */
export function appendSharedDetections(records) {
  if (!Array.isArray(records) || records.length === 0) return
  try {
    const prev = loadSharedDetections()
    const next = [...records, ...prev].slice(0, SHARED_DETECTIONS_MAX)
    localStorage.setItem(SHARED_DETECTIONS_KEY, JSON.stringify(next))
    // Notify same-tab listeners (storage event only fires in OTHER tabs)
    window.dispatchEvent(new CustomEvent(SHARED_DETECTIONS_EVENT))
  } catch (e) {
    console.warn('monitoringStore write error:', e)
  }
}
