#!/bin/sh
set -e

echo "🚀 Starting deployment..."

# TEMPORAL: Migraciones desactivadas para fix de producción
# echo "📦 Running database migrations..."
# npx prisma migrate deploy

# Verificar el estado
echo "⚠️  Migrations skipped (temporary fix)"

# Iniciar la aplicación
echo "🎯 Starting application..."
exec npm run start
