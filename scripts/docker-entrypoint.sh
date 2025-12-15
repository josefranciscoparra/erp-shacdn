#!/bin/sh
set -e

echo "🚀 Starting deployment..."

# Aplicar migraciones pendientes
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Verificar el estado
echo "✅ Migrations applied successfully"

# Iniciar la aplicación
echo "🎯 Starting application..."
exec npm run start
