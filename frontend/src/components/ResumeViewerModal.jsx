import { useEffect } from 'react'
import { motion } from 'framer-motion'

function ResumeViewerModal({ open, onClose, rawText, resumeData }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const content = rawText ?? (resumeData != null ? JSON.stringify(resumeData, null, 2) : '')

  if (!open) return null

  const spring = { type: 'spring', damping: 25, stiffness: 300 }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4"
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
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Current Resume</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-gray-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
            <pre
              className="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-slate-300"
              style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', lineHeight: 1.5 }}
            >
              {content || 'No resume content.'}
            </pre>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ResumeViewerModal
