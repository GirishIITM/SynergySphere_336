#!/bin/bash

# Set commit SHA for the image tag
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

# Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml --substitutions=COMMIT_SHA=$COMMIT_SHA .

# Get the URL of the deployed service
echo "Backend deployed to:"
gcloud run services describe synergysphere-backend --platform managed --region us-central1 --format 'value(status.url)'
