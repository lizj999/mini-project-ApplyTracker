import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

const TAB_SUMMARY = 'Summary'
const TAB_FULL = 'Full Description'

function buildResumeMatchText(resumeData) {
  if (!resumeData) return ''
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

function painPointMatchesExperience(painPoint, resumeMatchText) {
  if (!painPoint || !resumeMatchText) return false
  const words = String(painPoint)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3)
  return words.some((w) => resumeMatchText.includes(w))
}

function JobDetailsModal({ open, onClose, job }) {
  const [activeTab, setActiveTab] = useState(TAB_SUMMARY)
  const [resumeData, setResumeData] = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) setActiveTab(TAB_SUMMARY)
  }, [open])

  useEffect(() => {
    if (open) {
      fetch('/api/resume')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setResumeData(data?.resume_data ?? null))
        .catch(() => setResumeData(null))
    }
  }, [open])

  if (!open || !job) return null

  const spring = { type: 'spring', damping: 25, stiffness: 300 }
  const skills = Array.isArray(job.skills) ? job.skills : []
  const missingSkills = Array.isArray(job.missing_skills) ? job.missing_skills : []
  const painPoints = Array.isArray(job.pain_points)
    ? job.pain_points
    : Array.isArray(job.details?.pain_points)
      ? job.details.pain_points
      : []
  const salaryRange = job.salary_range ?? 'Not specified'
  const isRemote = job.is_remote === true || job.is_remote === 'true'
  const improvementTip = job.improvement_tip ?? ''

  const resumeMatchText = useMemo(() => buildResumeMatchText(resumeData), [resumeData])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={spring}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{job.title}</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{job.company}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex gap-1 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab(TAB_SUMMARY)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition ${activeTab === TAB_SUMMARY ? 'border-slate-800 text-slate-800 dark:border-slate-200 dark:text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab(TAB_FULL)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition ${activeTab === TAB_FULL ? 'border-slate-800 text-slate-800 dark:border-slate-200 dark:text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Full Description
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === TAB_SUMMARY && (
            <div className="font-sans text-slate-700 dark:text-slate-300">
              {painPoints.length > 0 && (
                <section className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">💡 Strategic Insights</h3>
                  <ul className="space-y-1">
                    {painPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" aria-hidden />
                        <span>{point}</span>
                        {painPointMatchesExperience(point, resumeMatchText) && (
                          <span className="shrink-0" title="Matches your experience">✨</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="mb-4">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Skills</h3>
                {skills.length > 0 ? (
                  <ul className="list-inside list-disc space-y-0.5 text-sm">
                    {skills.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Not specified</p>
                )}
              </section>
              <section className="mb-4">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Salary</h3>
                <p className="text-sm">{salaryRange}</p>
              </section>
              <section className="mb-4">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Remote</h3>
                <p className="text-sm">{isRemote ? 'Yes' : 'No'}</p>
              </section>
              {missingSkills.length > 0 && (
                <section className="mb-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Missing skills (vs. your resume)</h3>
                  <ul className="list-inside list-disc space-y-0.5 text-sm">
                    {missingSkills.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </section>
              )}
              {improvementTip && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Improvement tip</h3>
                  <p className="text-sm leading-relaxed">{improvementTip}</p>
                </section>
              )}
            </div>
          )}

          {activeTab === TAB_FULL && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {job.raw_text || 'No full description saved for this job.'}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default JobDetailsModal
