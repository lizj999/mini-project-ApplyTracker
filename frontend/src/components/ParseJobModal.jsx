import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

function buildResumeMatchText(resumeData) {
  const parts = []
  if (Array.isArray(resumeData.skills)) parts.push(...resumeData.skills.map((s) => String(s).toLowerCase()))
  if (Array.isArray(resumeData.experience)) {
    resumeData.experience.forEach((e) => {
      if (e.company) parts.push(String(e.company).toLowerCase())
      if (e.role) parts.push(String(e.role).toLowerCase())
      if (e.highlights) parts.push(String(e.highlights).toLowerCase())
    })
  }
  return parts.join(' ')
}

function techMatchesResume(tech, resumeData) {
  if (!tech || !resumeData?.skills) return false
  const t = String(tech).toLowerCase()
  return resumeData.skills.some((s) => {
    const sk = String(s).toLowerCase()
    return sk.includes(t) || t.includes(sk)
  })
}

function painPointMatchesExperience(painPoint, resumeMatchText) {
  if (!painPoint || !resumeMatchText) return false
  const words = String(painPoint)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3)
  return words.some((w) => resumeMatchText.includes(w))
}

const DEFAULT_RESUME = {
  name: 'Liz Jaramillo',
  target_roles: ['Sales Associate', 'Customer Success', 'Retail Management'],
  skills: ['Customer Service', 'Sales Initiatives', 'Point of Sale Systems', 'Team Leadership'],
  experience: [
    {
      company: 'Previous Example Co',
      role: 'Sales Lead',
      highlights: 'Exceeded monthly sales goals by 15% and trained 3 new associates.',
    },
  ],
}

function ParseJobModal({ open, onClose, onSuccess }) {
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resumeData, setResumeData] = useState(DEFAULT_RESUME)
  const [previewJob, setPreviewJob] = useState(null)
  const [previewEdit, setPreviewEdit] = useState({ company: '', title: '' })

  useEffect(() => {
    if (open) {
      setRawText('')
      setError(null)
      setPreviewJob(null)
      setPreviewEdit({ company: '', title: '' })
      fetch('/api/resume')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.resume_data) return setResumeData(data.resume_data)
          return fetch('/resume.json')
            .then((r) => (r.ok ? r.json() : null))
            .then((staticData) => staticData && setResumeData(staticData))
        })
        .catch(() => {})
    }
  }, [open])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewJob) setPreviewJob(null)
        else onClose()
      }
    }
    if (open) window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, previewJob])

  const runParseAndScore = useCallback(async () => {
    const text = rawText.trim()
    if (!text) {
      setError('Paste job description text first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parseRes = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text }),
      })
      if (!parseRes.ok) {
        const err = await parseRes.json().catch(() => ({}))
        throw new Error(err.detail || parseRes.statusText || 'Parse failed')
      }
      const jobData = await parseRes.json()

      // Use uploaded resume from backend when available (resume_data); else send current modal resume
      const scoreRes = await fetch('/api/score-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_data: jobData,
          resume_data: resumeData,
        }),
      })
      if (!scoreRes.ok) {
        const err = await scoreRes.json().catch(() => ({}))
        throw new Error(err.detail || scoreRes.statusText || 'Score failed')
      }
      const scoreData = await scoreRes.json()

      const job = {
        ...jobData,
        match_score: scoreData.match_score,
        missing_skills: scoreData.missing_skills,
        improvement_tip: scoreData.improvement_tip,
        status: 'Discovery',
        raw_text: text,
      }
      setPreviewEdit({ company: job.company || '', title: job.title || '' })
      setPreviewJob(job)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [rawText, resumeData])

  const confirmAndSave = useCallback(() => {
    if (!previewJob) return
    const final = {
      ...previewJob,
      company: previewEdit.company.trim() || previewJob.company,
      title: previewEdit.title.trim() || previewJob.title,
    }
    onSuccess(final)
    onClose()
  }, [previewJob, previewEdit, onSuccess, onClose])

  const resumeMatchText = useMemo(() => buildResumeMatchText(resumeData), [resumeData])

  if (!open) return null

  const spring = { type: 'spring', damping: 25, stiffness: 300 }
  const showPreview = !!previewJob

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && (showPreview ? setPreviewJob(null) : onClose())}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={spring}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {showPreview ? 'Preview job' : 'Parse New Job'}
          </h2>
          <button
            type="button"
            onClick={showPreview ? () => setPreviewJob(null) : onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!showPreview ? (
          <>
            <div className="px-5 py-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Paste job description</label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste the full job post here..."
                rows={8}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runParseAndScore}
                disabled={loading}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                {loading ? 'Parsing & scoring…' : 'Submit'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 py-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Company</label>
                <input
                  type="text"
                  value={previewEdit.company}
                  onChange={(e) => setPreviewEdit((p) => ({ ...p, company: e.target.value }))}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Company name"
                />
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-3 mb-1">Role</label>
                <input
                  type="text"
                  value={previewEdit.title}
                  onChange={(e) => setPreviewEdit((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Job title"
                />
              </div>

              {Array.isArray(previewJob.pain_points) && previewJob.pain_points.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Top 3 Pain Points</h3>
                  <ul className="space-y-1.5">
                    {previewJob.pain_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        {painPointMatchesExperience(point, resumeMatchText) && (
                          <span className="shrink-0" title="Matches your experience">✨</span>
                        )}
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(previewJob.tech_stack) && previewJob.tech_stack.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Tech Stack</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {previewJob.tech_stack.map((tech, i) => {
                      const match = techMatchesResume(tech, resumeData)
                      return (
                        <span
                          key={i}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            match
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {tech}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewJob(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmAndSave}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Confirm & Save
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

export default ParseJobModal
