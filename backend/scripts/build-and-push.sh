#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Building and Pushing SynergySphere Backend to Docker Hub${NC}"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run build
echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
"$SCRIPT_DIR/build.sh"

echo -e "${YELLOW}Step 2: Pushing to Docker Hub...${NC}"
"$SCRIPT_DIR/push.sh"

echo -e "${GREEN}🎉 Build and push completed successfully!${NC}"
