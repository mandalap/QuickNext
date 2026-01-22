@echo off
echo ========================================
echo  OPTIMIZING FRONTEND FOR PRODUCTION
echo ========================================

echo.
echo [1/4] Installing dependencies...
npm install

echo.
echo [2/4] Cleaning previous builds...
if exist build rmdir /s /q build
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo [3/4] Building optimized production bundle...
set NODE_ENV=production
npm run build

echo.
echo [4/4] Analyzing bundle size...
npm run build:analyze

echo.
echo ========================================
echo  FRONTEND OPTIMIZATION COMPLETE!
echo ========================================
echo.
echo Optimizations applied:
echo - Console.log removed
echo - PostHog tracking removed
echo - Code splitting enabled
echo - Gzip compression enabled
echo - Bundle minified
echo - Tree shaking enabled
echo.
echo Bundle analysis report generated!
echo.
pause