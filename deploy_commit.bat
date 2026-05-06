@echo off
echo ========================================
echo CourtPilot AI - Deployment Commit
echo ========================================
echo.

echo Checking git status...
git status
echo.

echo ========================================
echo Files to be committed:
echo ========================================
echo - backend/requirements.txt (added email-validator)
echo - backend/app/api/v1/alerts.py (fixed regex deprecation)
echo - backend/app/api/v1/search.py (fixed regex deprecation)
echo - backend/app/core/__init__.py (CREATED - missing file)
echo - backend/render.yaml (fixed build command)
echo - frontend/src/pages/AIProcessing.tsx (UI flow fix)
echo - frontend/src/pages/Verification.tsx (UI flow fix)
echo - frontend/src/pages/ActionPlan.tsx (UI flow fix)
echo - frontend/.env.production (CREATED - production config)
echo - Documentation files
echo.

set /p confirm="Do you want to commit these changes? (y/n): "
if /i "%confirm%" neq "y" (
    echo Commit cancelled.
    pause
    exit /b
)

echo.
echo Adding files to git...
git add backend/requirements.txt
git add backend/app/api/v1/alerts.py
git add backend/app/api/v1/search.py
git add backend/app/core/__init__.py
git add backend/render.yaml
git add frontend/src/pages/AIProcessing.tsx
git add frontend/src/pages/Verification.tsx
git add frontend/src/pages/ActionPlan.tsx
git add frontend/.env.production
git add RENDER_DEPLOYMENT_FIX.md
git add COMPLETE_DEPLOYMENT_GUIDE.md
git add ACTUAL_FIX_SUMMARY.md
git add UI_FLOW_IMPROVEMENTS.md
git add BACKEND_DEPLOYMENT_ISSUES_FIXED.md
git add DEPLOYMENT_READY.md

echo.
echo Committing changes...
git commit -m "fix: comprehensive deployment fixes for Render and UI flow

Backend Fixes:
- Added email-validator>=2.1.0 to requirements.txt (fixes Render crash)
- Fixed deprecated regex parameter to pattern in Query (alerts.py, search.py)
- Created missing backend/app/core/__init__.py (fixes import issues)
- Fixed render.yaml to use requirements.txt instead of requirements-minimal.txt

Frontend Fixes:
- Fixed UI flow: Processing page shows 'No PDF file' when accessed directly
- Fixed UI flow: Verification page shows error instead of loading old data
- Fixed UI flow: Action Plan uses only current verification data
- Created frontend/.env.production for Vercel deployment

Documentation:
- Added comprehensive deployment documentation
- Added backend deployment issues analysis
- Added UI flow improvements documentation"

echo.
echo ========================================
echo Commit successful!
echo ========================================
echo.

set /p push="Do you want to push to GitHub now? (y/n): "
if /i "%push%" neq "y" (
    echo.
    echo Changes committed locally but not pushed.
    echo Run 'git push origin main' when ready to deploy.
    pause
    exit /b
)

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ========================================
echo Push successful!
echo ========================================
echo.
echo Next steps:
echo 1. Go to Render dashboard
echo 2. Your service will auto-deploy from the new commit
echo 3. Monitor the deploy logs
echo 4. Test the /health endpoint once deployed
echo.
echo Or manually trigger redeploy in Render dashboard.
echo.
pause
