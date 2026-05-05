@echo off
echo ========================================
echo   CourtPilot Full Stack Startup
echo   Team NyayaSaar - PanIIT Bangalore
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    echo Then: .\venv\Scripts\pip.exe install -r requirements.txt
    pause
    exit /b 1
)

REM Check if frontend dependencies are installed
if not exist "CourtPilotAI\node_modules" (
    echo ERROR: Frontend dependencies not installed!
    echo Please run: cd CourtPilotAI && npm install
    pause
    exit /b 1
)

echo [1/3] Starting Backend Server...
echo.
start "CourtPilot Backend" cmd /k "cd /d %~dp0 && .\venv\Scripts\python.exe start_server.py"
timeout /t 5 /nobreak >nul

echo [2/3] Starting Frontend Development Server...
echo.
start "CourtPilot Frontend" cmd /k "cd /d %~dp0CourtPilotAI && npm run dev"
timeout /t 5 /nobreak >nul

echo [3/3] Opening Application...
echo.
timeout /t 3 /nobreak >nul

echo ========================================
echo   CourtPilot is Starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo   System Status
echo ========================================
echo Backend:  Running on port 8000
echo Frontend: Running on port 5173
echo AI Model: Ollama gemma3:12b
echo Database: SQLite + MongoDB
echo.
echo Press any key to open API documentation...
pause >nul
start http://localhost:8000/docs

echo.
echo ========================================
echo   Quick Commands
echo ========================================
echo.
echo Test Backend:
echo   curl http://localhost:8000/health
echo.
echo Test Pipeline:
echo   .\venv\Scripts\python.exe test_full_pipeline.py
echo.
echo View Logs:
echo   type logs\courtpilot.log
echo.
echo ========================================
echo   Both servers are running!
echo   Close this window to keep them running.
echo ========================================
echo.
