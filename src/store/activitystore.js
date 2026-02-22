// activityStore.js — lightweight shared store for detection activity
// FieldMonitoring writes here; Dashboard reads from here.

const listeners = new Set()

let _log = JSON.parse(localStorage.getItem('detectionLog') || '[]')

function persist() {
    try { localStorage.setItem('detectionLog', JSON.stringify(_log)) } catch {}
}

/** Safe % change: returns null if no previous data to compare */
function pctChange(current, previous) {
    if (previous === 0 && current === 0) return null
    if (previous === 0) return null        // can't compute % from zero baseline
    return Math.round(((current - previous) / previous) * 100)
}

export const activityStore = {
    /** Returns all entries from the past `days` days */
    getRecent(days = 7) {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
        return _log.filter(e => e.epochMs >= cutoff)
    },

    /** Append new detection entries */
    push(entries) {
        _log = [...entries, ..._log].slice(0, 2000)
        persist()
        listeners.forEach(fn => fn())
    },

    /**
     * Returns computed stats with live % change values.
     *
     * totalDetections  — all-time count
     * totalChange      — this week vs last week (%)
     *
     * activeAlerts     — detections in last 24h
     * alertsChange     — last 24h vs the 24h before that (%)
     */
    getStats() {
        const now      = Date.now()
        const h24      = 24 * 60 * 60 * 1000
        const week     = 7 * h24

        // ── Active Alerts: last 24h vs previous 24h ─────────────────────────
        const last24Start = now - h24
        const prev24Start = now - h24 * 2
        const last24Count = _log.filter(e => e.epochMs >= last24Start).length
        const prev24Count = _log.filter(e => e.epochMs >= prev24Start && e.epochMs < last24Start).length

        // ── Total Detections: this week vs last week ─────────────────────────
        const thisWeekStart = now - week
        const lastWeekStart = now - week * 2
        const thisWeekCount = _log.filter(e => e.epochMs >= thisWeekStart).length
        const lastWeekCount = _log.filter(e => e.epochMs >= lastWeekStart && e.epochMs < thisWeekStart).length

        return {
            totalDetections: _log.length,
            totalChange:     pctChange(thisWeekCount, lastWeekCount),

            activeAlerts:    last24Count,
            alertsChange:    pctChange(last24Count, prev24Count),
        }
    },

    /** Subscribe to changes; returns unsubscribe fn */
    subscribe(fn) {
        listeners.add(fn)
        return () => listeners.delete(fn)
    },

    clear() {
        _log = []
        persist()
        listeners.forEach(fn => fn())
    },
}