#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Building Docker image for SynergySphere Backend${NC}"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if git is available and we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Get git information
GIT_COMMIT=$(git rev-parse --short HEAD)
COMMIT_COUNT=$(git rev-list --count HEAD)
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Generate version
BASE_VERSION="1.0"
APP_VERSION="${BASE_VERSION}.${COMMIT_COUNT}"

# Docker image details
DOCKER_USERNAME="23f2005217"
IMAGE_NAME="odoo"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

echo -e "${YELLOW}📋 Build Information:${NC}"
echo "  Version: ${APP_VERSION}"
echo "  Git Commit: ${GIT_COMMIT}"
echo "  Build Date: ${BUILD_DATE}"
echo "  Image: ${FULL_IMAGE_NAME}:${APP_VERSION}"

# Build the Docker image
echo -e "${GREEN}🔨 Building Docker image...${NC}"
docker build \
    --build-arg APP_VERSION="${APP_VERSION}" \
    --build-arg BUILD_DATE="${BUILD_DATE}" \
    --build-arg GIT_COMMIT="${GIT_COMMIT}" \
    --build-arg DOCKER_TAG="${APP_VERSION}" \
    -t "${FULL_IMAGE_NAME}:${APP_VERSION}" \
    -t "${FULL_IMAGE_NAME}:latest" \
    .

echo -e "${GREEN}✅ Docker image built successfully!${NC}"
echo -e "${YELLOW}🏷️  Tagged as:${NC}"
echo "  - ${FULL_IMAGE_NAME}:${APP_VERSION}"
echo "  - ${FULL_IMAGE_NAME}:latest"

# Save version info for push script
echo "${APP_VERSION}" > .docker_version
echo "${FULL_IMAGE_NAME}" > .docker_image

echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo -e "${YELLOW}💡 To push to Docker Hub, run: ./scripts/push.sh${NC}"
