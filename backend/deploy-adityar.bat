@echo off
REM Script to deploy the backend from the adityar branch to Google Cloud Run
REM Windows Batch file version

echo SynergySphere Backend Deployment Script (Windows Batch)
echo =======================================================
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

REM Check if gcloud is installed
gcloud version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Google Cloud CLI (gcloud) is not installed or not in PATH.
    echo Please install it from: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)
echo [OK] Google Cloud CLI is available

REM Check authentication
for /f "tokens=*" %%i in ('gcloud auth list --filter=status:ACTIVE --format="value(account)" 2^>nul') do set auth_account=%%i
if "%auth_account%"=="" (
    echo Error: You are not authenticated with Google Cloud.
    echo Please run: gcloud auth login
    pause
    exit /b 1
)
echo [OK] Authenticated with Google Cloud as: %auth_account%

echo.
echo Deploying backend from adityar branch to Google Cloud Run...

REM Get commit SHA
for /f "tokens=*" %%i in ('git rev-parse HEAD 2^>nul') do set commit_sha=%%i
if "%commit_sha%"=="" (
    echo Error: Unable to get commit SHA.
    pause
    exit /b 1
)
echo [OK] Commit SHA: %commit_sha%

echo.
echo Starting Cloud Build deployment...

REM Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml --substitutions=COMMIT_SHA=%commit_sha% .
if %errorlevel% neq 0 (
    echo Error: Cloud Build deployment failed.
    pause
    exit /b 1
)
echo [OK] Cloud Build completed successfully

echo.
echo Setting up public access permissions...

REM Make the service publicly accessible
gcloud run services add-iam-policy-binding --region=us-central1 --member=allUsers --role=roles/run.invoker synergysphere-backend >nul 2>&1
if %errorlevel% neq 0 (
    echo Warning: Failed to set public access permissions. Service may already be public.
) else (
    echo [OK] Public access permissions set
)

echo.
echo Retrieving deployment information...

REM Get the deployed service URL
for /f "tokens=*" %%i in ('gcloud run services describe synergysphere-backend --platform managed --region us-central1 --format "value(status.url)" 2^>nul') do set service_url=%%i
if "%service_url%"=="" (
    echo Error: Unable to retrieve service URL.
    pause
    exit /b 1
)

echo.
echo =========================================
echo Backend deployed successfully!
echo =========================================
echo Service URL: %service_url%
echo.
echo Remember to update the frontend vercel.json with this URL if needed:
echo   VITE_API_URL: "%service_url%"
echo.
echo Deployment completed at: %date% %time%
echo.
echo Press any key to exit...
pause >nul
