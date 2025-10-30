# Guía de Despliegue en Render

## ⚠️ IMPORTANTE: Resolver Migraciones Fallidas (Una sola vez)

### Problema

Las migraciones fallan en producción porque se hicieron `db push` directamente, por lo que las tablas/tipos ya existen pero las migraciones no están registradas en `_prisma_migrations`.

### Solución: Ejecutar en Render Shell

**Ve a tu servicio en Render → Shell** y ejecuta estos comandos:

```bash
# Marcar TODAS las migraciones como aplicadas (porque ya existen en la BD)
npx prisma migrate resolve --applied 20250917104450_init
npx prisma migrate resolve --applied 20250918091912_add_must_change_password_to_user
npx prisma migrate resolve --applied 20250918104055_add_employment_status_to_employee
npx prisma migrate resolve --applied 20250918140523_add_temporary_passwords
npx prisma migrate resolve --applied 20250919110151_add_department_manager
npx prisma migrate resolve --applied 20251014172522_add_variable_schedules
npx prisma migrate resolve --applied 20251030_add_hierarchy_manual_time_signatures
```

**Luego verifica que todo esté OK:**
```bash
npx prisma migrate status
```

Deberías ver:
```
Database schema is up to date!
```

### Después de resolver

Una vez hecho esto **UNA SOLA VEZ**, los futuros deploys funcionarán normalmente con:
```bash
npx prisma migrate deploy
```

---

## Configuración de Render

### Build Command
```bash
npm install && npm run build
```

### Start Command
```bash
npx prisma migrate deploy && npm run start
```

### Variables de Entorno Requeridas

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://tu-app.onrender.com
```

---

## Comandos Útiles

### Ver estado de migraciones
```bash
npx prisma migrate status
```

### Ver qué hay en la tabla de migraciones
```bash
npx prisma db execute --stdin <<SQL
SELECT migration_name, started_at, finished_at, logs FROM _prisma_migrations ORDER BY started_at;
SQL
```

### Si necesitas "desmarcar" una migración fallida
```bash
npx prisma migrate resolve --rolled-back NOMBRE_MIGRACION
```

---

## Troubleshooting

### Error: "type already exists" / "relation already exists"

✅ **Solución:** La migración intenta crear algo que ya existe. Usa `migrate resolve --applied` para marcarla como aplicada.

### Error: "migration failed"

1. Verifica el log del error
2. Si el cambio ya está en la BD: `migrate resolve --applied`
3. Si el cambio NO está en la BD: `migrate resolve --rolled-back` y vuelve a aplicar

### Resetear BD (⚠️ DESTRUYE TODOS LOS DATOS)

```bash
npx prisma migrate reset
```

**Solo usar en desarrollo. NUNCA en producción.**
