#!/bin/bash
# ============================================================
# Replace PrismaClient Instances with Singleton
# Cloud Governance Copilot
# ============================================================

set -e

echo "🔄 Replacing PrismaClient instances with singleton..."
echo ""

# Find all TypeScript files that instantiate PrismaClient
FILES=$(find apps/api-gateway/src -type f -name "*.ts" -exec grep -l "new PrismaClient()" {} \; | grep -v test | grep -v mock | grep -v "__fixtures__")

TOTAL_FILES=$(echo "$FILES" | wc -l | tr -d ' ')
CURRENT=0

for file in $FILES; do
  CURRENT=$((CURRENT + 1))
  echo "[$CURRENT/$TOTAL_FILES] Processing: $file"

  # Check if file already imports from lib/prisma
  if grep -q "from.*lib/prisma" "$file" 2>/dev/null; then
    echo "  ✓ Already uses singleton, skipping"
    continue
  fi

  # Backup original file
  cp "$file" "$file.bak"

  # Step 1: Add import for singleton at the top (after other @prisma/client imports if any)
  # Find relative path to lib/prisma
  DIR=$(dirname "$file")
  REL_PATH=$(realpath --relative-to="$DIR" apps/api-gateway/src/lib/prisma.ts 2>/dev/null || python3 -c "import os.path; print(os.path.relpath('apps/api-gateway/src/lib/prisma.ts', '$DIR'))")
  REL_PATH="${REL_PATH%.ts}"

  # Add import if not exists
  if ! grep -q "from.*lib/prisma" "$file"; then
    # Find line with @prisma/client import
    if grep -q "from '@prisma/client'" "$file"; then
      # Add after @prisma/client import
      sed -i.tmp "/from '@prisma\/client'/a\\
import { prisma } from '$REL_PATH';
" "$file"
    else
      # Add at top after other imports
      sed -i.tmp "1a\\
import { prisma } from '$REL_PATH';
" "$file"
    fi
    rm -f "$file.tmp"
  fi

  # Step 2: Remove lines with "const prisma = new PrismaClient()"
  sed -i.tmp '/const prisma = new PrismaClient/d' "$file"
  rm -f "$file.tmp"

  # Step 3: Replace "this.prisma = new PrismaClient()" with "this.prisma = prisma"
  sed -i.tmp 's/this\.prisma = new PrismaClient()/this.prisma = prisma/g' "$file"
  rm -f "$file.tmp"

  echo "  ✓ Updated"
done

echo ""
echo "✅ Completed! Updated $TOTAL_FILES files"
echo ""
echo "⚠️  Note: Some files may need manual review for complex cases"
echo "   Backup files created with .bak extension"
