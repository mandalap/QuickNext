@echo off
REM Script batch untuk update repository
REM Usage: update-repo.bat "Pesan commit"

setlocal

if "%~1"=="" (
    set "COMMIT_MSG=Update: Code changes"
) else (
    set "COMMIT_MSG=%~1"
)

echo.
echo 🔄 Updating Git Repository
echo =========================
echo.

REM 1. Check status
echo 📋 Checking status...
git status --short
echo.

REM 2. Add all changes
echo ➕ Adding changes...
git add .
if errorlevel 1 (
    echo ❌ Error: Failed to add files
    exit /b 1
)
echo ✅ Changes added
echo.

REM 3. Commit
echo 💾 Committing changes...
echo    Message: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo ❌ Error: Failed to commit
    exit /b 1
)
echo ✅ Changes committed
echo.

REM 4. Push
echo 🚀 Pushing to GitHub...
git push
if errorlevel 1 (
    echo ❌ Error: Failed to push
    echo 💡 Tip: Try 'git push -u origin main' if this is first push
    exit /b 1
)
echo ✅ Successfully pushed to GitHub
echo.

echo 🎉 Repository updated successfully!
echo.

endlocal
