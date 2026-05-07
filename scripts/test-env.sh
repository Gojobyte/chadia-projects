#!/bin/bash
set -e

cd /tmp/chadia-projects

echo "=== Installing dependencies ==="
npm install 2>&1 | tail -5

echo "=== Generating Prisma client ==="
npx prisma generate 2>&1 | tail -3

echo "=== Running TypeScript check ==="
npx tsc --noEmit 2>&1 | head -50

echo "=== Running ESLint ==="
npx eslint . --max-warnings=10 2>&1 | head -50

echo "=== Build check ==="
npx next build 2>&1 | tail -20

echo "=== DONE ==="
