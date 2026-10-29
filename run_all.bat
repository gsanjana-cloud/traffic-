@echo off
title AI Traffic Signal Control System Launcher
echo =====================================================================
echo  AI-Based Automated Traffic Signal Control System
echo  Engineering College Prototype Launch Script
echo =====================================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend FastAPI Server on Port 8000...
start "Traffic System - Backend" cmd /k "cd /d ""%~dp0backend"" && call .venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend Vite Development Server on Port 5173...
start "Traffic System - Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo =====================================================================
echo  System is running!
echo  Open your browser at: http://localhost:5173
echo  Backend API Docs:     http://localhost:8000/docs
echo =====================================================================
pause
