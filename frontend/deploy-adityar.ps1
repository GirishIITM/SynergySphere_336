# Script to deploy the frontend from the adityar branch to Vercel
# Windows PowerShell version

Write-Host "SynergySphere Frontend Deployment Script (Windows)" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

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

# Check if Node.js and npm are installed
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Node.js is not installed or not in PATH." -ForegroundColor Red
        Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Cyan
        exit 1
    }
    
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: npm is not available." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "Error: Unable to verify Node.js/npm installation." -ForegroundColor Red
    exit 1
}

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Vercel CLI is not installed." -ForegroundColor Red
        Write-Host "Installing Vercel CLI globally..." -ForegroundColor Yellow
        
        npm install -g vercel
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Failed to install Vercel CLI." -ForegroundColor Red
            Write-Host "Please install it manually using: npm install -g vercel" -ForegroundColor Cyan
            exit 1
        }
        
        Write-Host "✓ Vercel CLI installed successfully" -ForegroundColor Green
    } else {
        Write-Host "✓ Vercel CLI version: $vercelVersion" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: Unable to verify or install Vercel CLI." -ForegroundColor Red
    exit 1
}

# Check if user is logged in to Vercel
try {
    $vercelUser = vercel whoami 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "You need to log in to Vercel first." -ForegroundColor Yellow
        Write-Host "Starting Vercel login process..." -ForegroundColor Cyan
        
        vercel login
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Vercel login failed." -ForegroundColor Red
            exit 1
        }
        
        # Verify login after authentication
        $vercelUser = vercel whoami 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Error: Unable to verify Vercel authentication after login." -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host "✓ Logged in to Vercel as: $vercelUser" -ForegroundColor Green
}
catch {
    Write-Host "Error: Failed to authenticate with Vercel." -ForegroundColor Red
    exit 1
}

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Make sure you're in the frontend directory." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Found package.json" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

try {
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install dependencies." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
}
catch {
    Write-Host "Error: Exception occurred during dependency installation." -ForegroundColor Red
    exit 1
}

# Build the project
Write-Host ""
Write-Host "Building the project..." -ForegroundColor Yellow

try {
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Build failed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Build completed successfully" -ForegroundColor Green
}
catch {
    Write-Host "Error: Exception occurred during build." -ForegroundColor Red
    exit 1
}

# Check current vercel.json configuration
if (Test-Path "vercel.json") {
    Write-Host ""
    Write-Host "Current Vercel configuration:" -ForegroundColor Cyan
    
    try {
        $vercelConfig = Get-Content "vercel.json" | ConvertFrom-Json
        if ($vercelConfig.env -and $vercelConfig.env.VITE_API_URL) {
            Write-Host "  VITE_API_URL: $($vercelConfig.env.VITE_API_URL)" -ForegroundColor Yellow
        } else {
            Write-Host "  No VITE_API_URL found in vercel.json" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  Could not parse vercel.json" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Warning: vercel.json not found. Default configuration will be used." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Deploying frontend from adityar branch to Vercel..." -ForegroundColor Yellow

# Deploy to Vercel with production flag and adityar branch
try {
    vercel --prod --branch=adityar
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Vercel deployment failed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Frontend deployment initiated!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Please check the Vercel dashboard for deployment status." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Important reminders:" -ForegroundColor Yellow
    Write-Host "• Verify that the VITE_API_URL in vercel.json points to the correct backend URL" -ForegroundColor Cyan
    Write-Host "• Check the deployment logs in Vercel dashboard if issues occur" -ForegroundColor Cyan
    Write-Host "• Test the deployed application after deployment completes" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Deployment started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
    
    # Try to get deployment URL
    try {
        $deploymentInfo = vercel ls 2>$null | Select-String "adityar" | Select-Object -First 1
        if ($deploymentInfo) {
            Write-Host "Recent deployment: $deploymentInfo" -ForegroundColor Cyan
        }
    }
    catch {
        Write-Host "Note: Could not retrieve deployment URL automatically" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Error: Exception occurred during Vercel deployment." -ForegroundColor Red
    exit 1
}
