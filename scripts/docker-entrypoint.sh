#!/bin/sh
set -e

echo "🚀 Starting deployment..."

# Sincronizar schema con la base de datos
echo "📦 Syncing database schema..."
npx prisma db push

# Verificar el estado
echo "✅ Database schema synced successfully"

# Iniciar la aplicación
echo "🎯 Starting application..."
exec npm run start
