# ApplyTracker — Requirements Document

**Mini-Project:** ApplyTracker  
**Mini-Project Lead:** Lizbeth Jaramillo  
**Contributors:** None  
**Last Updated:** February 24, 2025  

---

## 1. Functional Requirements

### 1.1 Job Management
- **FR-1.1** The system shall allow users to add jobs to the application (manually or from parsed job text).
- **FR-1.2** The system shall store for each job: title, company, status, match score, raw text, and optional structured details (skills, salary_range, is_remote, pain_points, tech_stack, missing_skills, improvement_tip).
- **FR-1.3** The system shall support exactly five Kanban stages: Discovery, Applied, Interviewing, Offer, Rejected.
- **FR-1.4** The system shall allow users to update a job’s status (e.g., drag-and-drop on the Kanban board).
- **FR-1.5** When a job’s status is set to Applied, the system shall record an applied date and a follow-up date (e.g., applied_at and follow_up_at = applied_at + 5 days).
- **FR-1.6** The system shall allow users to delete a single job or all jobs.
- **FR-1.7** The system shall list all jobs for display on the Kanban board and support a list of jobs needing follow-up (follow_up_at today or in the past).

### 1.2 Job Parsing (AI)
- **FR-2.1** The system shall accept raw job post text and return a structured representation including: title, company, skills (list), salary_range, is_remote (boolean), pain_points (list), tech_stack (list).
- **FR-2.2** Parsing shall be performed by an AI service (Together AI, Llama-3.3-70B-Instruct-Turbo); the system shall handle missing or invalid API key gracefully (e.g., 503 or clear error message).

### 1.3 Resume Management
- **FR-3.1** The system shall allow users to upload a resume as JSON (structured resume data) or PDF.
- **FR-3.2** For PDF uploads, the system shall extract text and store it; structured resume data may be derived via AI on first use (e.g., for scoring or outreach).
- **FR-3.3** The system shall support at least one stored resume at a time (single active resume).
- **FR-3.4** The system shall expose the current resume (structured data and/or raw text) to the frontend for display and for use in scoring/outreach.

### 1.4 Compatibility Scoring (AI)
- **FR-4.1** The system shall compare the stored (or provided) resume against a job and return: match_score (0–100), missing_skills (list), improvement_tip (string).
- **FR-4.2** Scoring shall use the same AI service as parsing; the system shall handle API key and API errors appropriately.

### 1.5 Outreach Generation (AI)
- **FR-5.1** The system shall generate a 3-paragraph LinkedIn cold message for a given job using the stored resume and job data.
- **FR-5.2** The system shall return plain text only (no subject line or labels); generation shall use the same AI service and error-handling approach as other AI features.

### 1.6 User Interface
- **FR-6.1** The system shall provide a web-based UI with a Kanban board showing jobs in the five stages.
- **FR-6.2** The UI shall support opening a “Parse job” flow (paste raw text, receive structured job, option to save).
- **FR-6.3** The UI shall support viewing job details, match score, and generating/viewing outreach for a job.
- **FR-6.4** The UI shall support uploading and viewing the current resume.

### 1.7 Optional / Future (Ghost Filter)
- **FR-7.1** (Optional) The system may support a “ghost filter” that hides or de-emphasizes applications inactive for a configurable period (e.g., 30 days). This is noted in the README and may be implemented in the UI or backend.

---

## 2. Constraints & Assumptions

### 2.1 Constraints
- **C-1** AI features require a valid Together AI API key stored in a `.env` file (not committed to the repository).
- **C-2** The application is designed for local or single-user use; no multi-user authentication or authorization is required in the current scope.
- **C-3** Backend and frontend run as separate processes (FastAPI server and Vite dev server); production deployment (e.g., single origin) is out of scope for this requirements document.
- **C-4** Data persistence is SQLite; the database file is created automatically on first run (e.g., `applytracker.db` in the backend directory).
- **C-5** CORS is configured to allow the designated frontend origins (e.g., http://localhost:5173, http://127.0.0.1:5173) only.

### 2.2 Assumptions
- **A-1** Users have access to a Together AI API key and will configure it in `.env`.
- **A-2** One active resume per deployment is sufficient; no multi-resume or multi-tenant model is assumed.
- **A-3** Job and resume data are not highly sensitive in the current context (local use); security hardening (e.g., encryption at rest, HTTPS) may be addressed in a later phase.
- **A-4** PDF resume parsing quality depends on the extracted text; no OCR or image-based parsing is required for this project.
- **A-5** The frontend is a React SPA that consumes a REST API; no server-side rendering or alternate clients are in scope.

---

## 3. Dependencies

### 3.1 External Services
- **Together AI API** — Used for job parsing, resume parsing, resume–job scoring, and outreach generation. Model: `meta-llama/Llama-3.3-70B-Instruct-Turbo`. Availability and rate limits depend on the user’s Together AI account.

### 3.2 Backend (Python)
- **FastAPI** — Web framework and API.
- **Uvicorn** — ASGI server.
- **SQLAlchemy** — ORM and SQLite connectivity.
- **Pydantic** — Request/response validation.
- **python-dotenv** — Loading `.env` for `TOGETHER_API_KEY`.
- **together** — Together AI client.
- **pypdf** — PDF text extraction for resume uploads (optional dependency for PDF support).

### 3.3 Frontend (Node/JavaScript)
- **React** — UI framework.
- **Vite** — Build and dev server.
- **Tailwind CSS** — Styling.
- **Axios** — HTTP client for backend API.
- **Framer Motion** — Animations (if used).
- **Lucide React** — Icons (if used).

### 3.4 Environment
- **Python 3.x** — Backend runtime.
- **Node.js / npm** — Frontend build and run.
- **.env file** — Must contain `TOGETHER_API_KEY` for all AI features.

---

## 4. Risks & Limitations

### 4.1 Risks
- **R-1** **API key exposure:** Storing the API key in `.env` is standard for local development but must not be committed; `.env` should remain in `.gitignore`.
- **R-2** **API cost and rate limits:** Heavy use of Together AI (parse, score, outreach) may incur cost and hit rate limits; the application does not implement caching or rate limiting.
- **R-3** **AI output quality:** Parsed job data, match scores, and outreach text depend on model behavior; invalid or unexpected JSON is handled with fallbacks and user-facing error messages, but quality is not guaranteed.

### 4.2 Limitations
- **L-1** No user accounts or authentication; the application is suitable for single-user/local use only.
- **L-2** No integration with external job boards (e.g., Adzuna, Jooble) in the current scope; jobs are added manually or via paste-and-parse.
- **L-3** Follow-up reminders are stored and exposed via an API; the current scope does not require email or calendar integration.
- **L-4** PDF resume parsing depends on text extraction (e.g., pypdf); scanned or image-only PDFs may not work well without additional tooling.

---

## 5. References

- **Repository:** https://github.com/lizj999/mini-project-ApplyTracker.git  
- **Setup:** See `README.md` in the repository for backend and frontend setup instructions.  
- **Project rules:** See `.cursorrules` for stack and Kanban stages.
