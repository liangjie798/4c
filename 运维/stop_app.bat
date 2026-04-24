@echo off
chcp 65001 > nul
echo Stopping Global Energy Crisis Assessment Platform...
echo ========================================

echo [1/2] Stopping FastAPI Backend (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    if not errorlevel 1 echo   - Closed PID: %%a
)

echo [2/2] Stopping Frontend Server (Port 8080)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    if not errorlevel 1 echo   - Closed PID: %%a
)

echo ========================================
echo ALL SERVICES STOPPED!
pause
