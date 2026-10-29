# AI-Based Automated Traffic Signal Control System - PowerShell Launcher
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host " AI-Based Automated Traffic Signal Control System Launcher" -ForegroundColor Green
Write-Host " Engineering College Prototype - Full Stack Application" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/2] Starting Backend FastAPI Server (Port 8000)..." -ForegroundColor Yellow
$BackendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\backend'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting Frontend Vite Server (Port 5173)..." -ForegroundColor Yellow
$FrontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npm run dev" -PassThru

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host " System running!" -ForegroundColor Green
Write-Host " Frontend Web Dashboard : http://localhost:5173" -ForegroundColor White
Write-Host " Backend API Docs       : http://localhost:8000/docs" -ForegroundColor White
Write-Host "=====================================================================" -ForegroundColor Green
