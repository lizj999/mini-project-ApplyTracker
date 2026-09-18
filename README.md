# 🚀 ApplyTracker - AI Job Search CRM

An AI-powered dashboard for high-volume job seekers. Features include automated job parsing, skill-match visualization, and strategic pain-point extraction.

## 💡 Features
- **Smart Parse**: Paste a URL, and the AI extracts Company, Role, and "Pain Points."
- **Skill Sync**: Automatically highlights your DePaul CS skills (Python/Java) in job posts.
- **Ghost Filter**: Toggles off inactive applications older than 30 days.

## 🚀 Getting Started

Follow these steps to get the project running on your local machine.

### 1. Clone the Repository
```bash
git clone <repo-url>
cd ApplyTracker
```

### 2. Backend Setup (FastAPI)

Navigate to the backend folder:
```bash
cd backend
```

Activate the existing virtual environment (already included in the repo):
- Mac/Linux: `source ../.venv/bin/activate`
- Windows: `..\.venv\Scripts\activate`

> ⚠️ Do NOT run `python -m venv venv` — this project already has a configured environment at the project root (`.venv`). Creating a new one will result in missing dependencies.

Install dependencies:
```bash
pip install -r requirements.txt
```

Configure your API key:
- Create a file named `.env` inside the `backend/` folder
- Add your Together AI key: `TOGETHER_API_KEY=your_actual_key_here`
- Note: this file is ignored by Git to keep keys safe

Start the server:
```bash
uvicorn main:app --reload
```

The backend will automatically create a fresh `applytracker.db` file on first run.

### 3. Frontend Setup (React + Vite)

Open a new terminal and navigate to the frontend:
```bash
cd frontend
npm install
npm run dev
```

Access the app at the URL shown in the terminal (usually `http://localhost:5173`).
