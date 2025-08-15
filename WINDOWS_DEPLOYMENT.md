# Windows Deployment Guide for SynergySphere

This guide provides instructions for deploying SynergySphere from Windows using the provided scripts.

## Prerequisites

### Required Software
1. **Git** - Download from [git-scm.com](https://git-scm.com/downloads)
2. **Node.js** (v16+) - Download from [nodejs.org](https://nodejs.org/)
3. **Google Cloud CLI** - Download from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

### Authentication Setup
1. **Google Cloud**: Run `gcloud auth login` to authenticate
2. **Vercel**: The script will prompt you to login if needed

## Available Scripts

We provide two types of Windows deployment scripts:

### PowerShell Scripts (Recommended)
- `backend/deploy-adityar.ps1` - Backend deployment to Google Cloud Run
- `frontend/deploy-adityar.ps1` - Frontend deployment to Vercel

### Batch Files (Alternative)
- `backend/deploy-adityar.bat` - Backend deployment to Google Cloud Run
- `frontend/deploy-adityar.bat` - Frontend deployment to Vercel

## Deployment Instructions

### Backend Deployment

#### Using PowerShell (Recommended)
```powershell
# Navigate to backend directory
cd backend

# Run the PowerShell script
./deploy-adityar.ps1
```

#### Using Batch File
```cmd
# Navigate to backend directory
cd backend

# Run the batch file
deploy-adityar.bat
```

### Frontend Deployment

#### Using PowerShell (Recommended)
```powershell
# Navigate to frontend directory
cd frontend

# Run the PowerShell script
./deploy-adityar.ps1
```

#### Using Batch File
```cmd
# Navigate to frontend directory
cd frontend

# Run the batch file
deploy-adityar.bat
```

## Script Features

### Automatic Checks
- ✅ Git repository validation
- ✅ Current branch verification (must be `adityar`)
- ✅ Uncommitted changes detection
- ✅ Required software installation checks
- ✅ Authentication status verification

### Error Handling
- 🔍 Comprehensive error messages
- 🎨 Colored output (PowerShell only)
- ⏹️ Graceful script termination on errors
- 📝 Helpful troubleshooting suggestions

### Automatic Setup
- 📦 Dependency installation (npm packages, Vercel CLI)
- 🔐 Authentication prompts when needed
- 🏗️ Project building before deployment
- 📋 Configuration validation

## Troubleshooting

### Common Issues

#### PowerShell Execution Policy
If you get an execution policy error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Git Not Found
Make sure Git is installed and added to your PATH environment variable.

#### Google Cloud CLI Issues
1. Install Google Cloud CLI
2. Run `gcloud auth login`
3. Verify with `gcloud auth list`

#### Node.js/npm Issues
1. Install Node.js from official website
2. Restart your terminal/command prompt
3. Verify with `node --version` and `npm --version`

#### Vercel Authentication
The scripts will automatically prompt for Vercel login if needed. You can also manually login:
```cmd
vercel login
```

### Script Permissions

#### For PowerShell Scripts
You may need to allow script execution:
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy to allow local scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### For Batch Files
Batch files should run without additional permissions.

## Deployment URLs

After successful deployment:

### Backend
- **Google Cloud Run URL**: The script will display the service URL
- **Format**: `https://synergysphere-backend-*.us-central1.run.app`

### Frontend
- **Vercel URL**: Check your Vercel dashboard for the deployment URL
- **Format**: `https://your-project-name.vercel.app`

## Configuration Updates

### Updating Backend URL in Frontend
After backend deployment, update the frontend configuration:

1. Copy the backend URL from the deployment output
2. Update `frontend/vercel.json`:
```json
{
  "env": {
    "VITE_API_URL": "https://your-backend-url.us-central1.run.app"
  }
}
```
3. Redeploy the frontend

## Security Notes

- Scripts validate branch and Git status before deployment
- Authentication is verified before starting deployment
- No sensitive information is stored in scripts
- All deployments use production-ready configurations

## Support

If you encounter issues:

1. Check the error messages carefully
2. Verify all prerequisites are installed
3. Ensure you're on the correct branch (`adityar`)
4. Check authentication status for both Google Cloud and Vercel
5. Review the troubleshooting section above

For additional help, refer to the main project documentation or contact the development team.
