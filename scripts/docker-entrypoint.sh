#!/bin/sh
set -e

echo "🚀 Starting deployment..."

# Sincronizar schema (temporalmente usando db push)
echo "📦 Syncing database schema..."
npx prisma db push --skip-generate

# Verificar el estado
echo "✅ Migrations applied successfully"

# Iniciar la aplicación
echo "🎯 Starting application..."
exec npm run start
