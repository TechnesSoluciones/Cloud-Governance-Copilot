#!/bin/bash

# ============================================================
# Version Bump Script
# ============================================================
# Manually bump version and create git tag
# Usage: ./scripts/bump-version.sh [patch|minor|major]
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default bump type
BUMP_TYPE=${1:-patch}

# Validate bump type
if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}❌ Error: Invalid bump type '$BUMP_TYPE'${NC}"
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

echo -e "${BLUE}📦 Version Bump Script${NC}"
echo -e "${BLUE}=====================${NC}"

# Get current version from api-gateway
cd apps/api-gateway
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"

# Bump version
echo -e "${BLUE}Bumping version (${BUMP_TYPE})...${NC}"
npm version $BUMP_TYPE --no-git-tag-version

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ New version: ${NEW_VERSION}${NC}"

# Update frontend version
cd ../frontend
echo -e "${BLUE}Updating frontend version...${NC}"
npm version $NEW_VERSION --no-git-tag-version --allow-same-version

cd ../..

# Git operations
echo -e "${BLUE}Creating git commit and tag...${NC}"

# Stage changes
git add apps/*/package.json

# Commit
git commit -m "chore(release): bump version to ${NEW_VERSION}"

# Create tag
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

echo -e "${GREEN}✅ Version bumped successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the changes: git show"
echo "2. Push to GitHub: git push origin main --follow-tags"
echo "3. GitHub Actions will automatically build and deploy"
echo ""
echo -e "${BLUE}Version: ${CURRENT_VERSION} → ${NEW_VERSION}${NC}"
