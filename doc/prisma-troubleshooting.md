# Troubleshooting Prisma - Modelos no disponibles en cliente

## Problema

- API devuelve error 500: `"Cannot read properties of undefined (reading 'findMany')"`
- Los modelos de Prisma (como `employee`, `department`, etc.) no están disponibles en el cliente
- Solo aparecen los modelos básicos (`organization`, `user`, `session`)

## Síntomas

- `prisma.employee` devuelve `undefined`
- Logs muestran `"Employee model available: false"`
- Los modelos están definidos en `schema.prisma` pero no en el cliente generado

## Causa

El cliente de Prisma no se regeneró correctamente después de:

- Agregar nuevos modelos al schema
- Ejecutar migraciones
- Cambios en la estructura de la base de datos

## Solución (Pasos en orden)

### 1. Borrar cliente de Prisma completamente

```bash
rm -rf node_modules/@prisma/client
```

### 2. Regenerar cliente desde cero

```bash
npx prisma generate
```

### 3. Reiniciar servidor de desarrollo

```bash
# Matar procesos existentes
pkill -f "next dev"

# Reiniciar servidor
npm run dev
```

### 4. Verificar que funciona

```bash
curl http://localhost:3000/api/employees
```

## Comandos de verificación adicionales

### Verificar que las tablas existen en BD

```bash
# Usando Docker PostgreSQL
echo "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | docker exec -i $(docker ps -q --filter "name=postgres") psql -U erp_user -d erp_dev
```

### Verificar migración está aplicada

```bash
ls -la prisma/migrations/
```

### Regenerar migración si es necesario

```bash
npx prisma migrate dev --name add-missing-models
```

## Prevención

- Siempre ejecutar `npx prisma generate` después de cambios en el schema
- Reiniciar el servidor de desarrollo después de cambios importantes en Prisma
- Verificar que las migraciones se aplican correctamente antes de usar nuevos modelos

## Notas

- Este problema es común en desarrollo cuando se añaden nuevos modelos
- El singleton de Prisma (`src/lib/prisma.ts`) debe usarse en lugar de crear instancias directas
- En producción, asegurarse de que el build incluye la regeneración del cliente
