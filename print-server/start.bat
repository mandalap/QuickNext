@echo off
echo ========================================
echo QuickKasir Print Server - Startup
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

echo Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Checking configuration...
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file to configure your printer!
    echo Press any key to open .env file...
    pause >nul
    notepad .env
)

echo.
echo Starting QuickKasir Print Server...
echo Server will run on http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

npm start
