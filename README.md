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

🚀 Getting Started for Collaborators
Follow these steps to get the project running on your local machine.

1. Clone the Repository
Bash
git clone <your-repo-url-here>
cd ApplyTracker
2. Backend Setup (FastAPI)
Navigate to backend: cd backend

Create a Virtual Environment: * Mac/Linux: python3 -m venv venv

Windows: python -m venv venv

Activate the Environment:

Mac/Linux: source venv/bin/activate

Windows: venv\Scripts\activate

Install Dependencies: pip install -r requirements.txt

Configure API Keys:

Create a new file named .env inside the backend/ folder.

Add your Together AI key: TOGETHER_API_KEY=your_actual_key_here

Note: This file is ignored by Git to keep our keys safe.

Start the Server: uvicorn main:app --reload

The backend will automatically create a fresh apply_tracker.db file for you on the first run.

3. Frontend Setup (React + Vite)
Open a new terminal and navigate to frontend: cd frontend

Install Dependencies: npm install

Start the Development Server: npm run dev

Access the App: Open the URL provided in the terminal (usually http://localhost:5173).