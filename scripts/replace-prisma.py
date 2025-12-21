#!/usr/bin/env python3
"""
Replace PrismaClient instantiations with singleton import
"""

import os
import re
import sys
from pathlib import Path

def calculate_relative_path(from_file, to_file='apps/api-gateway/src/lib/prisma.ts'):
    """Calculate relative import path"""
    from_dir = Path(from_file).parent
    to_path = Path(to_file).with_suffix('')

    # Calculate relative path
    try:
        rel_path = os.path.relpath(to_path, from_dir)
        # Convert to import path (use forward slashes, remove .ts)
        import_path = rel_path.replace(os.sep, '/')
        if not import_path.startswith('.'):
            import_path = './' + import_path
        return import_path
    except ValueError:
        # Files on different drives (Windows), use absolute import
        return '../lib/prisma'

def replace_prisma_in_file(filepath):
    """Replace PrismaClient instantiations in a single file"""
    print(f"Processing: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if already using singleton
    if "from '../lib/prisma'" in content or "from '../../lib/prisma'" in content or "from '../../../lib/prisma'" in content:
        print(f"  ✓ Already using singleton, skipping")
        return False

    original_content = content

    # Calculate relative path
    rel_path = calculate_relative_path(filepath)

    # Add singleton import after @prisma/client import if it exists
    if "from '@prisma/client';" in content:
        content = re.sub(
            r"(from '@prisma/client';)",
            rf"\1\nimport {{ prisma }} from '{rel_path}';",
            content,
            count=1
        )
    elif "import {" in content:
        # Add after first import
        content = re.sub(
            r"(import .*?;\n)",
            rf"\1import {{ prisma }} from '{rel_path}';\n",
            content,
            count=1
        )

    # Remove "const prisma = new PrismaClient()" lines
    content = re.sub(
        r'^\s*const prisma = new PrismaClient\(\);?\s*\n',
        '',
        content,
        flags=re.MULTILINE
    )

    # Replace "this.prisma = new PrismaClient()" with "this.prisma = prisma"
    content = re.sub(
        r'this\.prisma = new PrismaClient\(\)',
        'this.prisma = prisma',
        content
    )

    # Replace "this.prisma = prisma || new PrismaClient()" with "this.prisma = prisma"
    content = re.sub(
        r'this\.prisma = prisma \|\| new PrismaClient\(\)',
        'this.prisma = prisma',
        content
    )

    if content != original_content:
        # Backup original
        with open(str(filepath) + '.bak', 'w', encoding='utf-8') as f:
            f.write(original_content)

        # Write modified content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"  ✓ Updated")
        return True
    else:
        print(f"  - No changes needed")
        return False

def main():
    # Find all TypeScript files with "new PrismaClient()"
    root = Path('apps/api-gateway/src')

    if not root.exists():
        print(f"Error: Directory {root} not found")
        sys.exit(1)

    files_to_process = []

    for ts_file in root.rglob('*.ts'):
        # Skip test files, mocks, and fixtures
        if any(x in str(ts_file) for x in ['test', 'mock', '__fixtures__', '.spec.', '.test.']):
            continue

        try:
            with open(ts_file, 'r', encoding='utf-8') as f:
                if 'new PrismaClient()' in f.read():
                    files_to_process.append(ts_file)
        except Exception as e:
            print(f"Error reading {ts_file}: {e}")

    print(f"\n🔄 Found {len(files_to_process)} files to process\n")

    updated_count = 0
    for filepath in files_to_process:
        if replace_prisma_in_file(filepath):
            updated_count += 1

    print(f"\n✅ Complete! Updated {updated_count}/{len(files_to_process)} files")
    print(f"   Backup files created with .bak extension")

if __name__ == '__main__':
    main()
