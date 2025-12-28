#!/bin/bash

# Script to fix layout duplication by removing DashboardLayoutV2 wrapper from all pages
# The layout is now provided by DashboardLayoutWrapper in (dashboard)/layout.tsx

echo "Fixing layout duplication in dashboard pages..."

# List of files to update
files=(
  "src/app/(dashboard)/costs/page.tsx"
  "src/app/(dashboard)/security/page.tsx"
  "src/app/(dashboard)/settings/profile/page.tsx"
  "src/app/(dashboard)/settings/security/page.tsx"
  "src/app/(dashboard)/recommendations/page.tsx"
  "src/app/(dashboard)/incidents/page.tsx"
  "src/app/(dashboard)/incidents/[id]/page.tsx"
  "src/app/(dashboard)/cloud-accounts/page.tsx"
  "src/app/(dashboard)/cloud-accounts/new/page.tsx"
  "src/app/(dashboard)/azure-advisor/page.tsx"
  "src/app/(dashboard)/assets/page.tsx"
  "src/app/(dashboard)/audit-logs/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Remove import of DashboardLayoutV2
    sed -i '' '/import.*DashboardLayoutV2.*from/d' "$file"

    # Replace opening <DashboardLayoutV2> or <DashboardLayoutV2 with <div
    sed -i '' 's/<DashboardLayoutV2[^>]*>/<div className="p-6 space-y-6">/g' "$file"

    # Replace closing </DashboardLayoutV2> with </div>
    sed -i '' 's/<\/DashboardLayoutV2>/<\/div>/g' "$file"

    echo "  ✓ Updated $file"
  else
    echo "  ✗ File not found: $file"
  fi
done

echo ""
echo "Done! All pages updated to remove duplicate layout wrapper."
echo "Layout is now provided by DashboardLayoutWrapper in (dashboard)/layout.tsx"
