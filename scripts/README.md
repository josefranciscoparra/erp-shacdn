# Scripts de Inicialización de Datos

Este directorio contiene scripts para inicializar y rellenar datos en la base de datos.

## Seed de Departamentos y Puestos

### 📋 Descripción

El script `seed-departments-positions.ts` rellena una organización existente con departamentos y puestos típicos de una empresa española.

**Incluye:**
- 10 departamentos (Dirección, RRHH, Finanzas, Comercial, Marketing, IT, Producción, Calidad, Logística, Atención al Cliente)
- 54 puestos distribuidos por departamento

### 🚀 Uso

#### Opción 1: Pasar el ORG_ID como argumento (Recomendado)

```bash
npm run seed:departments -- --orgId="tu-organization-id-aqui"
```

#### Opción 2: Variable de entorno

```bash
ORG_ID="tu-organization-id-aqui" npm run seed:departments
```

#### Opción 3: Editar el script

Edita el archivo `scripts/seed-departments-positions.ts` y cambia la línea:

```typescript
const ORG_ID = process.env.ORG_ID || "tu-organization-id-aqui";
```

Luego ejecuta:

```bash
npm run seed:departments
```

### 🔍 Cómo obtener tu ORG_ID

#### Desde la base de datos (psql)

```bash
# Conectar a la base de datos
psql postgresql://usuario:password@localhost:5432/base_datos

# Listar organizaciones
SELECT id, name FROM "Organization";
```

#### Desde Prisma Studio

```bash
npx prisma studio
```

Ve a la tabla `Organization` y copia el `id`.

### ⚙️ Características del Script

- ✅ **Seguro**: Verifica que la organización existe antes de ejecutar
- ✅ **Idempotente**: No duplica departamentos/puestos existentes, solo añade los que faltan
- ✅ **Informativo**: Muestra un resumen detallado de lo que creará
- ✅ **Confirmación**: Espera 5 segundos antes de ejecutar (Ctrl+C para cancelar)
- ✅ **Detallado**: Muestra progreso en tiempo real

### 📊 Datos que se crean

**Departamentos (10):**
1. Dirección General (3 puestos)
2. Recursos Humanos (4 puestos)
3. Administración y Finanzas (5 puestos)
4. Comercial y Ventas (5 puestos)
5. Marketing y Comunicación (5 puestos)
6. Tecnología (IT) (8 puestos)
7. Producción (5 puestos)
8. Calidad (3 puestos)
9. Logística y Almacén (4 puestos)
10. Atención al Cliente (3 puestos)

**Total: 54 puestos**

### 🔒 Uso en Producción

**IMPORTANTE:** Este script es seguro para ejecutar en producción porque:

1. Solo **añade** datos, nunca elimina
2. Verifica duplicados antes de crear
3. Requiere confirmación manual (5 segundos)
4. Muestra un resumen antes de ejecutar

Sin embargo, siempre se recomienda:
- ✅ Hacer backup de la base de datos antes
- ✅ Ejecutar primero en staging/desarrollo
- ✅ Revisar el ORG_ID antes de ejecutar

### 📝 Ejemplo de Salida

```
🚀 Iniciando script de seed de departamentos y puestos...

✅ Organización encontrada: Mi Empresa S.L. (cm123456789)

⚠️  Este script creará los siguientes departamentos y puestos:
   Total: 10 departamentos
   Total: 54 puestos

⚠️  La organización ya tiene:
   - 2 departamentos
   - 5 puestos

   Este script NO eliminará los existentes, solo añadirá los nuevos.

Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...

📝 Creando departamentos y puestos...

   ⏭️  Departamento ya existe: Dirección General
      ⏭️  Puesto ya existe: Director/a General
      ✅ Puesto creado: Director/a de Operaciones
      ✅ Puesto creado: Asistente de Dirección

   ✅ Departamento creado: Recursos Humanos
      ✅ Puesto creado: Director/a de RRHH
      ✅ Puesto creado: Responsable de Selección
      ...

✨ Proceso completado!

📊 Resumen:
   Departamentos creados: 8
   Departamentos omitidos (ya existían): 2
   Puestos creados: 49
   Puestos omitidos (ya existían): 5
```

### 🛠️ Personalización

Si quieres personalizar los departamentos y puestos, edita la constante `DEPARTMENTS_AND_POSITIONS` en el archivo `scripts/seed-departments-positions.ts`.

### ❗ Troubleshooting

**Error: "No se encontró la organización"**
- Verifica que el ORG_ID es correcto
- Verifica que estás conectado a la base de datos correcta

**Error: "Debes proporcionar un ORG_ID"**
- Asegúrate de pasar el parámetro `--orgId=` o configurar la variable de entorno

**No se crean los datos**
- Verifica que tienes la conexión DATABASE_URL correcta en tu `.env`
- Verifica que tienes permisos de escritura en la base de datos
