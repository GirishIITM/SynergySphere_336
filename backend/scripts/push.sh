#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Pushing Docker image to Docker Hub${NC}"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if version file exists
if [ ! -f .docker_version ] || [ ! -f .docker_image ]; then
    echo -e "${RED}❌ Error: Build files not found. Please run ./scripts/build.sh first${NC}"
    exit 1
fi

APP_VERSION=$(cat .docker_version)
FULL_IMAGE_NAME=$(cat .docker_image)

echo -e "${YELLOW}📋 Push Information:${NC}"
echo "  Image: ${FULL_IMAGE_NAME}"
echo "  Version: ${APP_VERSION}"

# Check if user is logged in to Docker Hub
if ! docker info | grep -q "Username:"; then
    echo -e "${YELLOW}🔐 Not logged in to Docker Hub. Please login:${NC}"
    docker login
fi

# Push both tags
echo -e "${GREEN}📤 Pushing ${FULL_IMAGE_NAME}:${APP_VERSION}...${NC}"
docker push "${FULL_IMAGE_NAME}:${APP_VERSION}"

echo -e "${GREEN}📤 Pushing ${FULL_IMAGE_NAME}:latest...${NC}"
docker push "${FULL_IMAGE_NAME}:latest"

echo -e "${GREEN}✅ Images pushed successfully!${NC}"

# Display the pushed images
echo -e "${YELLOW}🎯 Pushed images:${NC}"
echo "  - ${FULL_IMAGE_NAME}:${APP_VERSION}"
echo "  - ${FULL_IMAGE_NAME}:latest"

echo -e "${BLUE}🔗 Docker Hub URL: https://hub.docker.com/r/${FULL_IMAGE_NAME}/tags${NC}"

# Clean up temporary files
rm -f .docker_version .docker_image

echo -e "${GREEN}🎉 Push completed successfully!${NC}"
