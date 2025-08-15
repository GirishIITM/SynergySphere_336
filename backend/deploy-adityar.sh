#!/bin/bash
# Script to deploy the backend from the adityar branch to Google Cloud Run

# Ensure we're on the adityar branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "adityar" ]; then
  echo "Error: You must be on the adityar branch to deploy."
  echo "Current branch is: $CURRENT_BRANCH"
  echo "Please run: git checkout adityar"
  exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: You have uncommitted changes. Please commit or stash them before deploying."
  exit 1
fi

echo "Deploying backend from adityar branch to Google Cloud Run..."

# Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml --substitutions=COMMIT_SHA=$(git rev-parse HEAD) .

# Make the service publicly accessible
gcloud run services add-iam-policy-binding --region=us-central1 --member=allUsers --role=roles/run.invoker synergysphere-backend

# Get the deployed service URL
SERVICE_URL=$(gcloud run services describe synergysphere-backend --platform managed --region us-central1 --format 'value(status.url)')

echo "Backend deployed successfully!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Remember to update the frontend vercel.json with this URL if needed."
