#!/bin/bash

# QuickKasir - Fix Git Pull dengan Local Changes
# Script ini akan stash local changes, pull, lalu apply stash jika perlu

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/kasir-pos"

echo "🔄 QuickKasir - Fix Git Pull"
echo "============================="
echo ""

cd "${PROJECT_DIR}"

# Check if there are local changes
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✅ No local changes, pulling directly...${NC}"
    git pull origin development
    exit 0
fi

echo -e "${YELLOW}⚠️  Local changes detected${NC}"
echo ""

# Show what files have changes
echo "📋 Files with local changes:"
git status --short
echo ""

# Ask user what to do
echo "Options:"
echo "  1. Stash changes, pull, then apply stash (recommended)"
echo "  2. Discard local changes and pull (WARNING: will lose local changes)"
echo "  3. Cancel"
echo ""
read -p "Choose option (1/2/3): " -n 1 -r
echo ""

case $REPLY in
    1)
        echo -e "${YELLOW}📦 Stashing local changes...${NC}"
        git stash push -m "Local changes before pull $(date +%Y%m%d_%H%M%S)"
        
        echo -e "${YELLOW}⬇️  Pulling from development...${NC}"
        git pull origin development
        
        echo -e "${YELLOW}📥 Applying stashed changes...${NC}"
        if git stash pop; then
            echo -e "${GREEN}✅ Stash applied successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Stash apply had conflicts. Please resolve manually:${NC}"
            echo "   git status"
            echo "   git stash list"
        fi
        ;;
    2)
        echo -e "${RED}🗑️  Discarding local changes...${NC}"
        git reset --hard HEAD
        git clean -fd
        
        echo -e "${YELLOW}⬇️  Pulling from development...${NC}"
        git pull origin development
        
        echo -e "${GREEN}✅ Pull completed (local changes discarded)${NC}"
        ;;
    3)
        echo -e "${YELLOW}❌ Cancelled${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}============================="
echo "✅ Git Pull Completed!"
echo "=============================${NC}"
