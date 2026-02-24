import { useRef, useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import JobCard from './JobCard'
import JobDetailsModal from './JobDetailsModal'
import ParseJobModal from './ParseJobModal'
import ResumeViewerModal from './ResumeViewerModal'

const COLUMNS = ['Discovery', 'Applied', 'Interviewing', 'Offer', 'Rejected']

const COLUMN_COLORS = {
  Discovery: 'bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-700',
  Applied: 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  Interviewing: 'bg-violet-50/50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800',
  Offer: 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
  Rejected: 'bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
}

const COLUMN_DRAG_OVER = {
  Discovery: 'ring-2 ring-slate-300 bg-slate-100/80 dark:ring-slate-500 dark:bg-slate-800/50',
  Applied: 'ring-2 ring-blue-300 bg-blue-100/60 dark:ring-blue-600 dark:bg-blue-900/40',
  Interviewing: 'ring-2 ring-violet-300 bg-violet-100/60 dark:ring-violet-600 dark:bg-violet-900/40',
  Offer: 'ring-2 ring-emerald-300 bg-emerald-100/60 dark:ring-emerald-600 dark:bg-emerald-900/40',
  Rejected: 'ring-2 ring-red-300 bg-red-100/60 dark:ring-red-600 dark:bg-red-900/40',
}

const COLUMN_HEADERS = {
  Discovery: 'Discovery',
  Applied: 'Applied',
  Interviewing: 'Interviewing',
  Offer: 'Offer',
  Rejected: 'Rejected',
}

function KanbanBoard() {
  const [jobs, setJobs] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [remindersOnly, setRemindersOnly] = useState(false)
  const [hasResume, setHasResume] = useState(false)
  const [resumeViewerOpen, setResumeViewerOpen] = useState(false)
  const [viewerContent, setViewerContent] = useState(null)
  const [jobDetailsJob, setJobDetailsJob] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [hideStaleApplied, setHideStaleApplied] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored === 'dark'
    return document.documentElement.classList.contains('dark')
  })

  // Sync React state with actual DOM on mount (e.g. after index.html script runs)
  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark')
    setIsDark(dark)
  }, [])

  const handleThemeToggle = useCallback(() => {
    const root = window.document.documentElement
    const currentlyDark = root.classList.contains('dark')
    const nextDark = !currentlyDark
    root.classList.remove('dark')
    if (nextDark) root.classList.add('dark')
    localStorage.setItem('theme', nextDark ? 'dark' : 'light')
    setIsDark(nextDark)
  }, [])

  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        setJobs(Array.isArray(list) ? list : [])
        setJobsLoaded(true)
      })
      .catch(() => setJobsLoaded(true))
  }, [])

  useEffect(() => {
    fetch('/api/resume')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setHasResume(!!(data.resume_data || data.raw_text))
      })
      .catch(() => {})
  }, [])

  const moveJob = useCallback((job, newStatus) => {
    const id = job.id
    setJobs((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j))
    )
    fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && (data.applied_at != null || data.follow_up_at != null)) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === id
                ? { ...j, status: data.status, applied_at: data.applied_at, follow_up_at: data.follow_up_at }
                : j
            )
          )
        }
      })
      .catch(() => {})
  }, [])

  const updateJob = useCallback((job, updates) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, ...updates } : j))
    )
  }, [])

  const handleAppliedAtChange = useCallback(
    (job, data) => {
      if (data.applied_at != null || data.follow_up_at != null) {
        updateJob(job, {
          applied_at: data.applied_at,
          follow_up_at: data.follow_up_at,
        })
      }
    },
    [updateJob]
  )

  const deleteJob = useCallback((job) => {
    setJobs((prev) => prev.filter((j) => j.id !== job.id))
  }, [])

  const clearAll = useCallback(() => {
    if (!window.confirm('Are you sure you want to delete all jobs? This cannot be undone.')) return
    fetch('/api/jobs', { method: 'DELETE' })
      .then((r) => (r.ok ? setJobs([]) : null))
      .catch(() => {})
  }, [])

  const addJob = useCallback((job) => {
    const payload = { ...job }
    delete payload.id
    fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        const saved = { ...job, id: data.id }
        setJobs((prev) => [...prev, saved])
      })
      .catch(() => {})
  }, [])

  const uploadInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState(null)

  const openResumeViewer = useCallback(() => {
    fetch('/api/resume')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setViewerContent({ raw_text: data.raw_text, resume_data: data.resume_data })
          setResumeViewerOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  const handleUploadResume = useCallback(async (e) => {
    const file = e?.target?.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMessage(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload-resume', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUploadMessage(data.detail || res.statusText || 'Upload failed')
      } else {
        setUploadMessage(data.message || 'Resume saved.')
        setHasResume(true)
      }
    } catch (err) {
      setUploadMessage(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
    }
  }, [])

  const term = searchTerm.trim().toLowerCase()
  const filteredJobs = term
    ? jobs.filter((j) => {
        const title = (j.title || '').toLowerCase()
        const company = (j.company || '').toLowerCase()
        const skills = Array.isArray(j.skills) ? j.skills : []
        const skillMatch = skills.some((s) => (String(s) || '').toLowerCase().includes(term))
        return title.includes(term) || company.includes(term) || skillMatch
      })
    : jobs

  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const displayJobs = hideStaleApplied
    ? filteredJobs.filter((j) => {
        if (j.status !== 'Applied') return true
        const appliedAt = j.applied_at ? new Date(j.applied_at).getTime() : null
        if (appliedAt == null) return true
        return appliedAt > thirtyDaysAgo
      })
    : filteredJobs

  const reminderJobIds = new Set(
    displayJobs
      .filter((j) => j.status === 'Applied' && j.follow_up_at && new Date(j.follow_up_at) <= new Date(now))
      .map((j) => j.id)
  )

  const jobsByColumn = COLUMNS.reduce((acc, col) => {
    const colJobs = displayJobs.filter((j) => j.status === col)
    acc[col] = remindersOnly ? colJobs.filter((j) => reminderJobIds.has(j.id)) : colJobs
    return acc
  }, {})

  const handleColumnDragOver = useCallback((e, col) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(col)
  }, [])

  const handleColumnDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleColumnDrop = useCallback(
    (e, col) => {
      e.preventDefault()
      setDragOverColumn(null)
      try {
        const raw = e.dataTransfer.getData('application/json')
        if (!raw) return
        const job = JSON.parse(raw)
        if (job?.id != null) moveJob(job, col)
      } catch {}
    },
    [moveJob]
  )

  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">ApplyTracker</h1>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, company, or skill…"
            className="min-w-[200px] max-w-xs flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
            aria-label="Search jobs by title, company, or skill"
          />
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Hide Stale Applications</span>
            <span
              role="switch"
              aria-checked={hideStaleApplied}
              tabIndex={0}
              onClick={() => setHideStaleApplied((v) => !v)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setHideStaleApplied((v) => !v) } }}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${hideStaleApplied ? 'border-slate-500 bg-slate-700 dark:bg-slate-600' : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform translate-y-0.5 ${hideStaleApplied ? 'translate-x-6' : 'translate-x-0.5'}`}
              />
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleThemeToggle}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept=".json,.pdf"
              className="hidden"
              onChange={handleUploadResume}
            />
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {uploading ? 'Uploading…' : 'Upload Resume'}
            </button>
            {hasResume && (
              <button
                type="button"
                onClick={openResumeViewer}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                📄 View Current Resume
              </button>
            )}
            <button
              type="button"
              onClick={() => setRemindersOnly((v) => !v)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${remindersOnly ? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}`}
            >
              Reminders
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-red-200 hover:text-red-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-red-800 dark:hover:text-red-300"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              Parse New Job
            </button>
          </div>
          {uploadMessage && (
            <p className="w-full text-sm text-slate-600 dark:text-slate-400">{uploadMessage}</p>
          )}
        </div>
      </header>

      <main className="w-full px-4 py-6">
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <motion.div
              key={col}
              layout
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              onDragOver={(e) => handleColumnDragOver(e, col)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(e) => handleColumnDrop(e, col)}
              className={`min-w-[260px] flex-1 rounded-lg border p-3 transition-colors ${COLUMN_COLORS[col]} ${dragOverColumn === col ? COLUMN_DRAG_OVER[col] : ''}`}
            >
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                {COLUMN_HEADERS[col]}
              </h2>
              <div className="space-y-2">
                {jobsByColumn[col]?.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onMove={moveJob}
                    onDelete={deleteJob}
                    onAppliedAtChange={handleAppliedAtChange}
                    onOpenDetails={setJobDetailsJob}
                    isReminderHighlight={remindersOnly && reminderJobIds.has(job.id)}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {modalOpen && (
          <ParseJobModal
            key="parse"
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={addJob}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {resumeViewerOpen && (
          <ResumeViewerModal
            key="resume"
            open={resumeViewerOpen}
            onClose={() => setResumeViewerOpen(false)}
            rawText={viewerContent?.raw_text ?? null}
            resumeData={viewerContent?.resume_data ?? null}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {jobDetailsJob && (
          <JobDetailsModal
            key="details"
            open={!!jobDetailsJob}
            onClose={() => setJobDetailsJob(null)}
            job={jobDetailsJob}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default KanbanBoard
