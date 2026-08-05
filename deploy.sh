#!/bin/sh
# ============================================
# Ultron API — Railway deployment entrypoint
# 1. Push Prisma schema (no migration files exist yet)
# 2. Seed required tenant + admin rows
# 3. Start the NestJS API
# ============================================

set -e

cd /app/apps/api

echo "⏳ Running Prisma schema push..."
npx prisma db push --skip-generate
echo "✅ Schema pushed"

echo "⏳ Seeding database..."
node dist/apps/api/prisma/seed.js
echo "✅ Seed complete"

cd /app

echo "🚀 Starting API..."
exec node apps/api/dist/apps/api/src/main.js