# SynergySphere Deployment Guide

This document outlines the process for deploying the SynergySphere application to Google Cloud Run (backend) and Vercel (frontend).

## Deployed URLs

- **Backend**: [https://synergysphere-backend-1021308958916.us-central1.run.app](https://synergysphere-backend-1021308958916.us-central1.run.app)
- **Frontend**: [https://synergysphere-5fotpmpmi-adityar42069-8018s-projects.vercel.app](https://synergysphere-5fotpmpmi-adityar42069-8018s-projects.vercel.app)

## Backend Deployment (Google Cloud Run)

### Prerequisites

1. Google Cloud SDK installed
2. Authenticated with Google Cloud (`gcloud auth login`)
3. Project created in Google Cloud with billing enabled

### Deployment Steps

1. **Configure the Dockerfile**

   The Dockerfile should be configured to use the `PORT` environment variable provided by Cloud Run:

   ```dockerfile
   # Expose port
   EXPOSE 8080
   
   # Run the app (activate venv first)
   CMD ["/bin/bash", "-c", ". .venv/bin/activate && gunicorn -b 0.0.0.0:${PORT:-8080} app:app"]
   ```

2. **Create a cloudbuild.yaml file**

   ```yaml
   steps:
     # Build the container image
     - name: 'gcr.io/cloud-builders/docker'
       args: ['build', '-t', 'gcr.io/$PROJECT_ID/synergysphere-backend:$COMMIT_SHA', '.']
     
     # Push the container image to Container Registry
     - name: 'gcr.io/cloud-builders/docker'
       args: ['push', 'gcr.io/$PROJECT_ID/synergysphere-backend:$COMMIT_SHA']
     
     # Deploy container image to Cloud Run
     - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
       entrypoint: gcloud
       args:
         - 'run'
         - 'deploy'
         - 'synergysphere-backend'
         - '--image'
         - 'gcr.io/$PROJECT_ID/synergysphere-backend:$COMMIT_SHA'
         - '--region'
         - 'us-central1'
         - '--platform'
         - 'managed'
         - '--allow-unauthenticated'
   
   images:
     - 'gcr.io/$PROJECT_ID/synergysphere-backend:$COMMIT_SHA'
   ```

3. **Enable required Google Cloud APIs**

   ```
   gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
   ```

4. **Deploy the backend**

   ```
   gcloud builds submit --config cloudbuild.yaml --substitutions=COMMIT_SHA=latest .
   ```

5. **Make the service publicly accessible**

   ```
   gcloud run services add-iam-policy-binding --region=us-central1 --member=allUsers --role=roles/run.invoker synergysphere-backend
   ```

6. **Get the deployed service URL**

   ```
   gcloud run services describe synergysphere-backend --platform managed --region us-central1 --format 'value(status.url)'
   ```

## Frontend Deployment (Vercel)

### Prerequisites

1. Vercel CLI installed (`npm install -g vercel`)
2. Authenticated with Vercel (`vercel login`)

### Deployment Steps

1. **Create a vercel.json file**

   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/assets/(.*)",
         "headers": { "cache-control": "public, max-age=31536000, immutable" },
         "dest": "/assets/$1"
       },
       { "src": "/favicon.ico", "dest": "/favicon.ico" },
       { "src": "/(.*)", "dest": "/index.html" }
     ],
     "env": {
       "VITE_API_URL": "https://synergysphere-backend-cp4hpno3ia-uc.a.run.app"
     }
   }
   ```

2. **Add environment variables**

   ```
   vercel env add VITE_API_URL
   ```

   When prompted, enter the backend URL and select the Production environment.

3. **Deploy the frontend**

   ```
   vercel --prod
   ```

4. **Get the deployed frontend URL**

   ```
   vercel ls
   ```

## Environment Variables

### Backend Environment Variables

- `FLASK_ENV`: Set to `production` for production deployment
- `USE_POSTGRESQL`: Set to `true` to use PostgreSQL database
- `POSTGRES_USER`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_HOST`: PostgreSQL host
- `POSTGRES_PORT`: PostgreSQL port
- `POSTGRES_DB`: PostgreSQL database name
- `POSTGRES_SSLMODE`: PostgreSQL SSL mode (e.g., `require`)
- `JWT_SECRET_KEY`: Secret key for JWT token generation
- `REDIS_PASSWORD`: Redis/Valkey password
- `REDIS_HOST`: Redis/Valkey host
- `REDIS_PORT`: Redis/Valkey port
- `REDIS_SSL`: Set to `true` to use SSL for Redis/Valkey
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

### Frontend Environment Variables

- `VITE_API_URL`: URL of the deployed backend API

## Troubleshooting

### Backend Issues

1. **Container fails to start**
   - Check if the container is listening on the correct port (should use `PORT` environment variable)
   - Check logs: `gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=synergysphere-backend" --limit=20`

2. **Database connection issues**
   - Verify database credentials are correctly set
   - Ensure database is accessible from Google Cloud Run

3. **Redis/Valkey connection issues**
   - Verify Redis/Valkey credentials are correctly set
   - Ensure Redis/Valkey is accessible from Google Cloud Run

### Frontend Issues

1. **API connection issues**
   - Verify the `VITE_API_URL` environment variable is correctly set
   - Check CORS settings in the backend

2. **Build failures**
   - Check for syntax errors or merge conflicts in the code
   - Verify all dependencies are correctly installed

## Continuous Deployment

For continuous deployment:

1. **Backend**: Connect your GitHub repository to Google Cloud Build
2. **Frontend**: Connect your GitHub repository to Vercel

This will automatically deploy your application when you push to the main branch.
