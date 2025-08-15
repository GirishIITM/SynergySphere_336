@echo off
REM Script to deploy the frontend from the adityar branch to Vercel
REM Windows Batch file version

echo SynergySphere Frontend Deployment Script (Windows Batch)
echo ========================================================
echo.

REM Check if we're in a Git repository
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Not in a Git repository or Git is not installed.
    echo Please make sure you're in the project directory and Git is installed.
    pause
    exit /b 1
)

REM Check current branch
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set current_branch=%%i
if "%current_branch%" neq "adityar" (
    echo Error: You must be on the adityar branch to deploy.
    echo Current branch is: %current_branch%
    echo Please run: git checkout adityar
    pause
    exit /b 1
)
echo [OK] Currently on branch: %current_branch%

REM Check for uncommitted changes
for /f %%i in ('git status --porcelain 2^>nul ^| find /c /v ""') do set uncommitted_count=%%i
if %uncommitted_count% neq 0 (
    echo Error: You have uncommitted changes. Please commit or stash them before deploying.
    echo Uncommitted files:
    git status --short
    pause
    exit /b 1
)
echo [OK] No uncommitted changes found

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: npm is not available.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version 2^>nul') do set node_version=%%i
for /f "tokens=*" %%i in ('npm --version 2^>nul') do set npm_version=%%i
echo [OK] Node.js version: %node_version%
echo [OK] npm version: %npm_version%

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI is not installed. Installing globally...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo Error: Failed to install Vercel CLI.
        echo Please install it manually using: npm install -g vercel
        pause
        exit /b 1
    )
    echo [OK] Vercel CLI installed successfully
) else (
    for /f "tokens=*" %%i in ('vercel --version 2^>nul') do set vercel_version=%%i
    echo [OK] Vercel CLI version: %vercel_version%
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo You need to log in to Vercel first.
    echo Starting Vercel login process...
    vercel login
    if %errorlevel% neq 0 (
        echo Error: Vercel login failed.
        pause
        exit /b 1
    )
    
    REM Verify login after authentication
    vercel whoami >nul 2>&1
    if %errorlevel% neq 0 (
        echo Error: Unable to verify Vercel authentication after login.
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('vercel whoami 2^>nul') do set vercel_user=%%i
echo [OK] Logged in to Vercel as: %vercel_user%

REM Check if package.json exists
if not exist "package.json" (
    echo Error: package.json not found. Make sure you're in the frontend directory.
    pause
    exit /b 1
)
echo [OK] Found package.json

echo.
echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies installed successfully

echo.
echo Building the project...
npm run build
if %errorlevel% neq 0 (
    echo Error: Build failed.
    pause
    exit /b 1
)
echo [OK] Build completed successfully

REM Check vercel.json configuration
if exist "vercel.json" (
    echo.
    echo Current Vercel configuration found: vercel.json
    echo Please verify VITE_API_URL is set correctly in vercel.json
) else (
    echo.
    echo Warning: vercel.json not found. Default configuration will be used.
)

echo.
echo Deploying frontend from adityar branch to Vercel...

REM Deploy to Vercel
vercel --prod --branch=adityar
if %errorlevel% neq 0 (
    echo Error: Vercel deployment failed.
    pause
    exit /b 1
)

echo.
echo =========================================
echo Frontend deployment initiated!
echo =========================================
echo Please check the Vercel dashboard for deployment status.
echo.
echo Important reminders:
echo • Verify that the VITE_API_URL in vercel.json points to the correct backend URL
echo • Check the deployment logs in Vercel dashboard if issues occur
echo • Test the deployed application after deployment completes
echo.
echo Deployment started at: %date% %time%
echo.
echo Press any key to exit...
pause >nul
