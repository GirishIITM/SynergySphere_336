#!/bin/bash
# Script to deploy the frontend from the adityar branch to Vercel

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

echo "Deploying frontend from adityar branch to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "Error: Vercel CLI is not installed."
  echo "Please install it using: npm install -g vercel"
  exit 1
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
  echo "You need to log in to Vercel first."
  vercel login
fi

# Deploy to Vercel with production flag and adityar branch
vercel --prod --branch=adityar

echo "Frontend deployment initiated!"
echo "Please check the Vercel dashboard for deployment status."
echo ""
echo "Remember to verify that the VITE_API_URL in vercel.json points to the correct backend URL."
