# 🗄️ Configuración Base de Datos PostgreSQL

## Configuración Rápida

La base de datos está configurada con:
- **Usuario**: `erp_user`
- **Contraseña**: `erp_pass`
- **Base de datos**: `erp_dev`
- **Puerto**: `5432`
- **URL**: `postgresql://erp_user:erp_pass@localhost:5432/erp_dev`

## Opciones para Iniciar PostgreSQL

### Opción 1: Docker (Recomendado) 🐳
```bash
# Iniciar con Docker Compose
docker-compose up -d postgres

# O usar el script automático
./scripts/db-setup.sh

# Verificar que está funcionando
docker ps

# Ver logs si hay problemas
docker-compose logs postgres
```

### Opción 2: PostgreSQL Local con MCP
Si ya tienes PostgreSQL instalado localmente con tu MCP:

```bash
# Crear usuario y base de datos
psql -U postgres << EOF
CREATE USER erp_user WITH PASSWORD 'erp_pass';
CREATE DATABASE erp_dev OWNER erp_user;
GRANT ALL PRIVILEGES ON DATABASE erp_dev TO erp_user;
EOF

# Verificar conexión
psql postgresql://erp_user:erp_pass@localhost:5432/erp_dev -c "SELECT version();"
```

### Opción 3: PostgreSQL con Homebrew (macOS)
```bash
# Instalar PostgreSQL
brew install postgresql@15
brew services start postgresql@15

# Crear usuario y base de datos
createuser -P erp_user  # Password: erp_pass
createdb -O erp_user erp_dev
```

## Verificar Conexión

```bash
# Con psql
psql postgresql://erp_user:erp_pass@localhost:5432/erp_dev

# Con npm (después de instalar dependencias)
npx prisma db push
```

## Inicializar Prisma

Una vez PostgreSQL esté funcionando:

```bash
# 1. Instalar dependencias
npm install

# 2. Generar cliente Prisma
npx prisma generate

# 3. Crear tablas (primera vez)
npx prisma db push

# O con migraciones (recomendado)
npx prisma migrate dev --name init

# 4. Ver base de datos en navegador
npx prisma studio
```

## Comandos Útiles

```bash
# Docker
docker-compose up -d postgres     # Iniciar
docker-compose stop postgres      # Detener
docker-compose down              # Eliminar contenedor
docker-compose logs -f postgres  # Ver logs

# Prisma
npx prisma studio               # GUI para ver/editar datos
npx prisma migrate dev          # Crear migración
npx prisma db seed             # Cargar datos de prueba
npx prisma migrate reset       # Resetear BD (¡borra todo!)
```

## Troubleshooting

### Error: "Cannot connect to database"
```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# O si es local
pg_isready -h localhost -p 5432
```

### Error: "User does not exist"
```bash
# Recrear usuario con Docker
docker exec -it erp_postgres psql -U postgres -c "CREATE USER erp_user WITH PASSWORD 'erp_pass';"
```

### Error: "Database does not exist"
```bash
# Crear base de datos
docker exec -it erp_postgres psql -U postgres -c "CREATE DATABASE erp_dev OWNER erp_user;"
```

## MCP Configuration

Si estás usando MCP de PostgreSQL, asegúrate de que tu configuración incluye:

```json
{
  "mcpServers": {
    "postgresql": {
      "command": "mcp-server-postgresql",
      "args": ["postgresql://erp_user:erp_pass@localhost:5432/erp_dev"]
    }
  }
}
```

---

✅ **La base de datos está lista para usar con la aplicación ERP**