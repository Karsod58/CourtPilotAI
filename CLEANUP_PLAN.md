# Project Cleanup and Reorganization Plan

## Current Issues
1. ❌ Duplicate `app/` folder at root (only has __pycache__)
2. ❌ Duplicate `data/` folder at root (empty)
3. ❌ Empty `CourtPilotAI/` folder
4. ❌ Empty `logs/` folder at root
5. ❌ Root-level files that should be in backend
6. ❌ Unnecessary test files at root
7. ❌ Virtual environment in repo (should be gitignored)

## Target Structure
```
courtpilot/
├── backend/                    # Python FastAPI backend
│   ├── app/                   # Application code
│   ├── data/                  # Data storage
│   ├── logs/                  # Log files
│   ├── .env                   # Backend environment
│   ├── .env.example
│   ├── requirements.txt
│   ├── requirements-minimal.txt
│   ├── runtime.txt
│   ├── Procfile              # For Render deployment
│   ├── render.yaml           # Render config
│   └── create_mysql_db.py
│
├── frontend/                   # React + TypeScript frontend
│   ├── src/                   # Source code
│   ├── public/                # Static assets
│   ├── .env                   # Frontend environment
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   ├── vercel.json           # Vercel deployment config
│   └── index.html
│
├── .git/                      # Git repository
├── .gitignore                 # Git ignore rules
├── README.md                  # Main documentation
├── DEPLOYMENT.md              # Deployment guide
├── start_full_stack.bat       # Local development script
└── PHASE_1_FIXES_COMPLETED.md # Documentation

```

## Files to DELETE
1. `/app/` - Duplicate, only has cache
2. `/data/` - Duplicate, empty
3. `/logs/` - Empty
4. `/CourtPilotAI/` - Empty
5. `/venv/` - Should not be in repo
6. `/.env` - Duplicate (use backend/.env)
7. `/.env.example` - Duplicate (use backend/.env.example)
8. `/courtpilot.db` - Duplicate (use backend/courtpilot.db)
9. `/requirements-minimal.txt` - Duplicate (use backend/)
10. `/test_reject_directive.py` - Test file, not needed
11. `/RENDER_DEPLOYMENT.md` - Merged into DEPLOYMENT.md

## Files to KEEP at Root
- `.gitignore` - Git configuration
- `README.md` - Main documentation
- `DEPLOYMENT.md` - Deployment instructions
- `PHASE_1_FIXES_COMPLETED.md` - Documentation
- `start_full_stack.bat` - Development helper
- `.git/` - Git repository
- `.kiro/` - Kiro configuration
- `.vscode/` - VS Code settings

## Actions Required
1. Delete duplicate/unnecessary folders
2. Update .gitignore to exclude venv, __pycache__, etc.
3. Update start_full_stack.bat paths if needed
4. Update README.md with new structure
5. Verify backend and frontend work after cleanup
