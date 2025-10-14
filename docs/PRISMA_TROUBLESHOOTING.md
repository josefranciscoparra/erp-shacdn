# Guía de resolución de problemas con Prisma

## Problema: Migración fallida por elementos duplicados en producción

### 🚨 Síntomas
```
Error: P3018
A migration failed to apply. New migrations cannot be applied before the error is recovered from.
Migration name: 20251014172522_add_variable_schedules
Database error code: 42710
Database error: ERROR: type "CalendarType" already exists
```

### 🔍 Causa raíz
La base de datos de producción tiene un **estado mixto**:
- Algunos elementos (enums, tablas, columnas) ya existen por `prisma db push` previos
- La migración intenta crear esos mismos elementos → falla
- La migración fallida **bloquea** futuros deploys

### ✅ Solución (paso a paso)

#### 1. Acceder al Shell de Render
```bash
Render Dashboard → Tu servicio → Shell
```

#### 2. Marcar la migración como rolled back
```bash
npx prisma migrate resolve --rolled-back <MIGRATION_NAME>
```

#### 3. Sincronizar la BD sin errores
```bash
npx prisma db push --accept-data-loss
```
> ⚠️ `--accept-data-loss` es necesario pero seguro: solo añade columnas nuevas, no borra datos.

#### 4. Marcar la migración como aplicada
```bash
npx prisma migrate resolve --applied <MIGRATION_NAME>
```

#### 5. Verificar
Probar la app en producción para confirmar que todo funciona.

---

## Prevención: Flujo correcto de trabajo

### ❌ **NUNCA hacer en producción:**
```bash
npx prisma db push  # Crea elementos sin migración → desincronización
```

### ✅ **SIEMPRE seguir este flujo:**

#### En desarrollo (local):
```bash
# 1. Modificar schema.prisma
# 2. Crear migración
npx prisma migrate dev --name descripcion_del_cambio

# 3. Verificar que funciona localmente
npm run dev
```

#### En producción (Render):
```bash
# Automático vía docker-entrypoint.sh:
npx prisma migrate deploy
```

---

## Casos especiales

### Migración corrupta (archivos vacíos)

Si encuentras carpetas de migraciones sin `migration.sql`:

```bash
# 1. Eliminar del filesystem
rm -rf prisma/migrations/MIGRATION_VACIA

# 2. Eliminar del historial de BD
psql $DATABASE_URL -c "DELETE FROM _prisma_migrations WHERE migration_name = 'MIGRATION_VACIA';"
```

### Drift entre local y producción

Si `prisma migrate dev` dice "drift detected":

```bash
# Opción 1: Limpiar historial local (SI local está sincronizado)
psql $DATABASE_URL_LOCAL -c "DELETE FROM _prisma_migrations WHERE migration_name = 'MIGRATION_PROBLEMATICA';"

# Opción 2: Marcar como aplicada localmente
npx prisma migrate resolve --applied MIGRATION_PROBLEMATICA
```

---

## Comandos útiles

### Ver estado de migraciones
```bash
npx prisma migrate status
```

### Ver historial en BD
```bash
psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10;"
```

### Ver estructura de tabla
```bash
psql $DATABASE_URL -c "\d nombre_tabla"
```

### Generar cliente Prisma
```bash
npx prisma generate
```

---

## Contacto

Si encuentras un problema no documentado aquí, actualiza este archivo con la solución.

**Última actualización:** 2025-10-14
