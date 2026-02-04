@echo off
echo ========================================
echo QuickKasir Print Server - Setup Wizard
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo 1. Download from: https://nodejs.org
    echo 2. Install the LTS version
    echo 3. Restart this script
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js installed: 
node --version
echo.

echo [2/5] Installing dependencies...
if not exist "node_modules\" (
    echo Installing npm packages...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)
echo.

echo [3/5] Setting up configuration...
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env >nul
    echo [OK] Configuration file created
    echo.
    echo IMPORTANT: Do you want to configure printer now? (Y/N)
    set /p config="Enter choice: "
    if /i "%config%"=="Y" (
        notepad .env
    )
) else (
    echo [OK] Configuration file exists
)
echo.

echo [4/5] Detecting printers...
echo Running printer detection...
node list-printers.js
echo.

echo [5/5] Testing print server...
echo.
echo Do you want to test the printer now? (Y/N)
set /p test="Enter choice: "
if /i "%test%"=="Y" (
    echo.
    echo Starting test...
    timeout /t 2 >nul
    node test-print.js
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start the server: npm start
echo 2. Or install as Windows Service: npm run install-service
echo.
echo For quick start, run: start.bat
echo For documentation, see: README.md
echo.
pause
