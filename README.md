# 🚀 ApplyTracker - AI Job Search CRM

An AI-powered dashboard for high-volume job seekers. Features include automated job parsing, skill-match visualization, and strategic pain-point extraction.

## 🛠️ Setup Instructions

### 1. Backend (FastAPI)
1. Navigate to the backend folder: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate it: 
   - Mac/Linux: `source venv/bin/activate`
   - Windows: `venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`
5. **API Key Setup**:
   - Create a file named `.env` in the `backend/` folder.
   - Add your Together AI key: `TOGETHER_API_KEY=your_key_here`
6. Start the server: `uvicorn main:app --reload`

### 2. Frontend (React + Vite)
1. Navigate to the frontend folder: `cd frontend`
2. Install dependencies: `npm install`
3. Start the app: `npm run dev`

## 💡 Features
- **Smart Parse**: Paste a URL, and the AI extracts Company, Role, and "Pain Points."
- **Skill Sync**: Automatically highlights your DePaul CS skills (Python/Java) in job posts.
- **Ghost Filter**: Toggles off inactive applications older than 30 days.