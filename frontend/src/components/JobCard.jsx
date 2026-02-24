import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'

function JobCard({ job, onMove, onDelete, onAppliedAtChange, onOpenDetails, isReminderHighlight }) {
  const { id, title, company, match_score, status, applied_at, follow_up_at, skills = [], missing_skills = [] } = job
  const hasSkills = Array.isArray(skills) ? skills.filter((s) => !missing_skills?.includes(s)) : []
  const gapSkills = Array.isArray(missing_skills) ? missing_skills : []
  const topHasSkills = hasSkills.slice(0, 2)
  const topGapSkills = gapSkills.slice(0, 3 - topHasSkills.length)
  const estimatedGainPerSkill = gapSkills.length > 0 && match_score != null
    ? Math.round((100 - match_score) / gapSkills.length)
    : 0
  const followUpDue = status === 'Applied' && follow_up_at && new Date(follow_up_at) <= new Date()
  const appliedDate = applied_at ? new Date(applied_at) : null
  const daysSinceApplied =
    appliedDate
      ? Math.max(0, Math.floor((Date.now() - appliedDate.getTime()) / (24 * 60 * 60 * 1000)))
      : null
  const dateInputValue = applied_at ? applied_at.slice(0, 10) : ''
  const [outreachOpen, setOutreachOpen] = useState(false)
  const [dateSaving, setDateSaving] = useState(false)
  const [outreachLoading, setOutreachLoading] = useState(false)
  const [outreachMessage, setOutreachMessage] = useState(null)
  const [outreachError, setOutreachError] = useState(null)

  const handleDelete = useCallback(() => {
    if (!id || !onDelete) return
    if (!window.confirm('Are you sure you want to delete this job?')) return
    fetch(`/api/jobs/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.detail || r.statusText) })
      })
      .then(() => onDelete(job))
      .catch(() => {})
  }, [id, job, onDelete])

  const handleAppliedAtChange = useCallback(
    (e) => {
      const value = e.target.value
      if (!value || !id || !onAppliedAtChange) return
      setDateSaving(true)
      fetch(`/api/jobs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Applied', applied_at: value }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) onAppliedAtChange(job, data)
        })
        .finally(() => setDateSaving(false))
    },
    [id, job, onAppliedAtChange]
  )

  const requestOutreach = useCallback(() => {
    if (!id) return
    setOutreachOpen(true)
    setOutreachMessage(null)
    setOutreachError(null)
    setOutreachLoading(true)
    fetch(`/api/outreach/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.detail || r.statusText || 'Request failed')
        if (data.detail) throw new Error(data.detail)
        setOutreachMessage(data.message || '')
      })
      .catch((e) => setOutreachError(e.message || 'Failed to generate outreach'))
      .finally(() => setOutreachLoading(false))
  }, [id])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOutreachOpen(false) }
    if (outreachOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [outreachOpen])

  const scoreColor =
    match_score >= 70
      ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30'
      : match_score >= 40
        ? 'text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30'
        : 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-700/50'

  const spring = { type: 'spring', damping: 24, stiffness: 300 }

  return (
    <>
      <motion.div
        layout
        transition={spring}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/json', JSON.stringify(job))
          e.dataTransfer.effectAllowed = 'move'
        }}
        className={`relative rounded-lg border bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800/40 dark:backdrop-blur-md ${isReminderHighlight ? 'ring-2 ring-amber-400 border-amber-300 dark:ring-amber-500 dark:border-amber-600' : 'border-slate-200'}`}
        data-status={status}
      >
        {followUpDue && (
          <span className="mb-1.5 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
            ⏰ Follow-up Due
          </span>
        )}
        {status === 'Applied' && (
          <div className="mb-1.5 flex flex-col gap-0.5">
            <input
              type="date"
              value={dateInputValue}
              onChange={handleAppliedAtChange}
              disabled={dateSaving}
              className="w-full max-w-[140px] rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-500 dark:focus:ring-slate-500"
              title="Application date"
            />
            {daysSinceApplied != null && (
              <p className="text-xs text-slate-500 dark:text-slate-400" title="Days since applied">
                {daysSinceApplied === 0 ? 'Applied today' : daysSinceApplied === 1 ? 'Applied 1 day ago' : `Applied ${daysSinceApplied} days ago`}
              </p>
            )}
          </div>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="absolute top-2 right-2 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            aria-label="Delete job"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenDetails?.(job)}
          className="text-left font-semibold text-slate-800 truncate pr-6 hover:text-slate-600 hover:underline focus:outline-none focus:underline dark:text-slate-100 dark:hover:text-slate-300"
          title={`View details: ${title}`}
        >
          {title}
        </button>
        <p className="text-sm text-slate-500 truncate mt-0.5 dark:text-slate-400" title={company}>
          {company}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="relative h-7 w-7 shrink-0" aria-hidden>
              <svg className="h-7 w-7 -rotate-90 text-slate-200 dark:text-slate-600" viewBox="0 0 24 24">
                <circle
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                  cx="12"
                  cy="12"
                  r="9"
                />
                <circle
                  className={match_score >= 70 ? 'text-emerald-500 dark:text-emerald-400' : match_score >= 40 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  cx="12"
                  cy="12"
                  r="9"
                  strokeDasharray={2 * Math.PI * 9}
                  strokeDashoffset={2 * Math.PI * 9 * (1 - (match_score != null ? Math.max(0, Math.min(100, match_score)) / 100 : 0))}
                />
              </svg>
            </div>
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${scoreColor}`}
            >
              {match_score != null ? `${Math.round(match_score)}% match` : '—'}
            </span>
          </div>
          {onMove && (
            <select
              className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              value={status}
              onChange={(e) => onMove(job, e.target.value)}
            >
              <option value="Discovery">Discovery</option>
              <option value="Applied">Applied</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
            </select>
          )}
          <button
            type="button"
            onClick={requestOutreach}
            className="text-xs font-medium text-slate-600 underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Outreach
          </button>
        </div>
        {(topHasSkills.length > 0 || topGapSkills.length > 0) && (
          <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
            <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Top Skills</p>
            <div className="flex flex-wrap gap-1">
              {topHasSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  {skill}
                </span>
              ))}
              {topGapSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex rounded border border-red-300 bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700 dark:border-red-800 dark:bg-slate-700/50 dark:text-slate-300"
                  title={estimatedGainPerSkill > 0 ? `Acquire ${skill} to increase match by ~${estimatedGainPerSkill}%` : `Acquire ${skill} to increase match score`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {outreachOpen && (
          <motion.div
            key="outreach"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && setOutreachOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">LinkedIn outreach</h2>
              <button
                type="button"
                onClick={() => setOutreachOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 min-h-[120px]">
              {outreachLoading && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Generating message…</span>
                </div>
              )}
              {outreachError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">{outreachError}</p>
              )}
              {!outreachLoading && outreachMessage && (
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{outreachMessage}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default JobCard
