#!/bin/bash

# Fix duplicate div wrappers in all dashboard pages

echo "Fixing duplicate div wrappers..."

files=(
  "src/app/(dashboard)/dashboard/page.tsx"
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
    # Check if file has duplicate p-6 space-y-6 divs
    if grep -q 'p-6 space-y-6.*p-6 space-y-6' "$file"; then
      echo "Fixing: $file"

      # Create a temp file with the fix
      awk '
        /<div className="p-6 space-y-6">/ {
          if (prev_line ~ /<div className="p-6 space-y-6">/) {
            next
          }
        }
        { prev_line = $0; print }
      ' "$file" > "$file.tmp"

      mv "$file.tmp" "$file"
      echo "  ✓ Fixed $file"
    fi
  fi
done

echo "Done!"
