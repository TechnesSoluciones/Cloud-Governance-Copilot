#!/bin/bash

# Quick Verification Script for UI Component Changes
# Usage: bash QUICK_VERIFICATION.sh

echo "=========================================="
echo "UI Component Verification Script"
echo "=========================================="
echo ""

FRONTEND_PATH="/Users/josegomez/Documents/Code/SaaS/Copilot/apps/frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if modified files exist
echo "1. Checking modified component files..."
echo ""

files=(
  "src/components/ui/select.tsx"
  "src/components/ui/textarea.tsx"
  "src/components/ui/button.tsx"
  "src/components/ui/input.tsx"
  "src/components/recommendations/RecommendationsFilters.tsx"
  "src/components/audit/AuditFilters.tsx"
  "src/components/cloud-accounts/ProviderForm.tsx"
)

for file in "${files[@]}"; do
  full_path="$FRONTEND_PATH/$file"
  if [ -f "$full_path" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (NOT FOUND)"
  fi
done

echo ""
echo "2. Checking key exports in select.tsx..."
echo ""

select_file="$FRONTEND_PATH/src/components/ui/select.tsx"

# Check for required exports
exports=(
  "SelectTrigger"
  "SelectValue"
  "SelectContent"
  "SelectItem"
  "SimpleSelect"
)

for export in "${exports[@]}"; do
  if grep -q "export.*$export" "$select_file"; then
    echo -e "${GREEN}✓${NC} $export exported"
  else
    echo -e "${RED}✗${NC} $export NOT exported"
  fi
done

echo ""
echo "3. Checking cn() usage in components..."
echo ""

# Check button.tsx for cn() usage
if grep -q "cn(" "$FRONTEND_PATH/src/components/ui/button.tsx"; then
  echo -e "${GREEN}✓${NC} button.tsx uses cn()"
else
  echo -e "${RED}✗${NC} button.tsx doesn't use cn()"
fi

# Check input.tsx for cn() usage
if grep -q "cn(" "$FRONTEND_PATH/src/components/ui/input.tsx"; then
  echo -e "${GREEN}✓${NC} input.tsx uses cn()"
else
  echo -e "${RED}✗${NC} input.tsx doesn't use cn()"
fi

# Check textarea.tsx for design tokens
if grep -q "border-input" "$FRONTEND_PATH/src/components/ui/textarea.tsx"; then
  echo -e "${GREEN}✓${NC} textarea.tsx uses design tokens"
else
  echo -e "${RED}✗${NC} textarea.tsx doesn't use design tokens"
fi

echo ""
echo "4. Checking dependent component imports..."
echo ""

# Check RecommendationsFilters
if grep -q "SimpleSelect" "$FRONTEND_PATH/src/components/recommendations/RecommendationsFilters.tsx"; then
  echo -e "${GREEN}✓${NC} RecommendationsFilters imports SimpleSelect"
else
  echo -e "${RED}✗${NC} RecommendationsFilters doesn't import SimpleSelect"
fi

# Check AuditFilters
if grep -q "SimpleSelect" "$FRONTEND_PATH/src/components/audit/AuditFilters.tsx"; then
  echo -e "${GREEN}✓${NC} AuditFilters imports SimpleSelect"
else
  echo -e "${RED}✗${NC} AuditFilters doesn't import SimpleSelect"
fi

# Check ProviderForm
if grep -q "SimpleSelect" "$FRONTEND_PATH/src/components/cloud-accounts/ProviderForm.tsx"; then
  echo -e "${GREEN}✓${NC} ProviderForm imports SimpleSelect"
else
  echo -e "${RED}✗${NC} ProviderForm doesn't import SimpleSelect"
fi

echo ""
echo "5. TypeScript compilation test..."
echo ""

cd "$FRONTEND_PATH"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
  component_errors=$(npx tsc --noEmit 2>&1 | grep "components/ui" | wc -l)
  if [ "$component_errors" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No UI component TypeScript errors"
  else
    echo -e "${YELLOW}⚠${NC} Found $component_errors UI component TypeScript errors"
  fi
else
  echo -e "${GREEN}✓${NC} TypeScript check passed"
fi

echo ""
echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
