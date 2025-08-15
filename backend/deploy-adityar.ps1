# Script to deploy the backend from the adityar branch to Google Cloud Run
# Windows PowerShell version

Write-Host "SynergySphere Backend Deployment Script (Windows)" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Ensure we're on the adityar branch
try {
    $currentBranch = git branch --show-current 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Unable to determine current Git branch. Make sure you're in a Git repository." -ForegroundColor Red
        exit 1
    }
    
    if ($currentBranch -ne "adityar") {
        Write-Host "Error: You must be on the adityar branch to deploy." -ForegroundColor Red
        Write-Host "Current branch is: $currentBranch" -ForegroundColor Yellow
        Write-Host "Please run: git checkout adityar" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host "✓ Currently on branch: $currentBranch" -ForegroundColor Green
}
catch {
    Write-Host "Error: Failed to check Git branch status." -ForegroundColor Red
    exit 1
}

# Check for uncommitted changes
try {
    $gitStatus = git status --porcelain 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Unable to check Git status." -ForegroundColor Red
        exit 1
    }
    
    if ($gitStatus) {
        Write-Host "Error: You have uncommitted changes. Please commit or stash them before deploying." -ForegroundColor Red
        Write-Host "Uncommitted files:" -ForegroundColor Yellow
        git status --short
        exit 1
    }
    
    Write-Host "✓ No uncommitted changes found" -ForegroundColor Green
}
catch {
    Write-Host "Error: Failed to check Git status." -ForegroundColor Red
    exit 1
}

# Check if gcloud CLI is installed and authenticated
try {
    $gcloudVersion = gcloud version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Google Cloud CLI (gcloud) is not installed or not in PATH." -ForegroundColor Red
        Write-Host "Please install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host "✓ Google Cloud CLI is available" -ForegroundColor Green
}
catch {
    Write-Host "Error: Unable to verify Google Cloud CLI installation." -ForegroundColor Red
    exit 1
}

# Check if user is authenticated with gcloud
try {
    $authStatus = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($authStatus)) {
        Write-Host "Error: You are not authenticated with Google Cloud." -ForegroundColor Red
        Write-Host "Please run: gcloud auth login" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host "✓ Authenticated with Google Cloud as: $authStatus" -ForegroundColor Green
}
catch {
    Write-Host "Error: Unable to verify Google Cloud authentication." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploying backend from adityar branch to Google Cloud Run..." -ForegroundColor Yellow

# Get the commit SHA
try {
    $commitSha = git rev-parse HEAD 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Unable to get commit SHA." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Commit SHA: $commitSha" -ForegroundColor Green
}
catch {
    Write-Host "Error: Failed to get commit SHA." -ForegroundColor Red
    exit 1
}

# Build and deploy using Cloud Build
Write-Host ""
Write-Host "Starting Cloud Build deployment..." -ForegroundColor Yellow

try {
    gcloud builds submit --config cloudbuild.yaml --substitutions=COMMIT_SHA=$commitSha .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Cloud Build deployment failed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Cloud Build completed successfully" -ForegroundColor Green
}
catch {
    Write-Host "Error: Cloud Build deployment failed with exception." -ForegroundColor Red
    exit 1
}

# Make the service publicly accessible
Write-Host ""
Write-Host "Setting up public access permissions..." -ForegroundColor Yellow

try {
    gcloud run services add-iam-policy-binding --region=us-central1 --member=allUsers --role=roles/run.invoker synergysphere-backend 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Failed to set public access permissions. Service may already be public." -ForegroundColor Yellow
    } else {
        Write-Host "✓ Public access permissions set" -ForegroundColor Green
    }
}
catch {
    Write-Host "Warning: Exception occurred while setting public access." -ForegroundColor Yellow
}

# Get the deployed service URL
Write-Host ""
Write-Host "Retrieving deployment information..." -ForegroundColor Yellow

try {
    $serviceUrl = gcloud run services describe synergysphere-backend --platform managed --region us-central1 --format 'value(status.url)' 2>$null
    
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($serviceUrl)) {
        Write-Host "Error: Unable to retrieve service URL." -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Backend deployed successfully!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Remember to update the frontend vercel.json with this URL if needed:" -ForegroundColor Yellow
    Write-Host "  VITE_API_URL: `"$serviceUrl`"" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Deployment completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
    
    # Copy URL to clipboard if possible
    try {
        $serviceUrl | Set-Clipboard
        Write-Host "✓ Service URL copied to clipboard" -ForegroundColor Green
    }
    catch {
        Write-Host "Note: Could not copy URL to clipboard" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Error: Failed to retrieve service information." -ForegroundColor Red
    exit 1
}
