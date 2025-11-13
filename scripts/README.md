# 🌱 Scripts de Inicialización y Seed

Este directorio contiene scripts para inicializar y poblar datos en la base de datos del ERP TimeNow.

## 📋 Scripts Disponibles

### 1. 🚀 `seed-organization-init.ts` - **SCRIPT PRINCIPAL** ⭐

**Inicialización completa de una organización nueva**

Crea TODOS los datos necesarios para que una organización esté operativa:

- ✅ **7 Tipos de ausencia** (Vacaciones, Baja médica, Permiso personal, etc.)
- ✅ **Configuración de PTO** (22 días anuales por defecto, reglas España)
- ✅ **7 Niveles de puesto** (Trainee → Junior → Mid → Senior → Lead → Principal → Director)
- ✅ **10 Departamentos** profesionales (Dirección, RRHH, Finanzas, Comercial, Marketing, IT, Producción, Calidad, Logística, Atención)
- ✅ **~50 Puestos de trabajo** distribuidos entre departamentos
- ✅ **Política de gastos** (tarifas España 2024: 0.26€/km, límites comidas/alojamiento)
- ✅ **Centro de coste por defecto** (si no existe ninguno)

**Uso:**

```bash
npm run seed:org-init -- --orgId="org_id_aqui"
```

**Características:**
- ✅ **NO elimina datos existentes** (solo añade los faltantes)
- ✅ Verifica duplicados antes de crear
- ✅ Muestra resumen detallado de qué creó/omitió
- ✅ Confirmación de 5 segundos antes de ejecutar
- ✅ Validación de que la organización existe

**Cuándo usarlo:**
- ✅ Acabas de crear una organización nueva
- ✅ Quieres tener todos los datos base listos de una vez
- ✅ Estás configurando un entorno de desarrollo/staging

---

### 2. 📊 `seed-departments-positions.ts`

**Solo departamentos y puestos** (sin otros datos)

Útil si ya tienes una organización configurada y solo quieres añadir más departamentos/puestos.

**Contenido:**
- 10 Departamentos empresariales
- ~50 Puestos de trabajo

**Uso:**

```bash
npm run seed:departments -- --orgId="org_id_aqui"
```

**Cuándo usarlo:**
- Solo necesitas añadir estructura organizativa
- Ya tienes tipos de ausencia, PTO config, etc.

---

### 3. 📈 `seed-position-levels.ts`

**Solo niveles de seniority**

Crea niveles de puesto (Junior, Senior, etc.) para **TODAS las organizaciones** de la base de datos.

**Contenido:**
- 7 Niveles: Trainee, Junior, Mid, Senior, Lead, Principal, Director

**Uso:**

```bash
npx tsx scripts/seed-position-levels.ts
```

**Cuándo usarlo:**
- Quieres añadir niveles a todas las organizaciones de golpe
- Has creado varias organizaciones manualmente sin niveles

---

### 4. 🎨 `seed.ts` (prisma/seed.ts)

**Seed completo para desarrollo**

Crea una organización demo completa con usuarios, empleados, contratos, y datos de ejemplo.

**Contenido:**
- 1 Organización "Demo Company S.L."
- 7 Usuarios con diferentes roles
- 5 Empleados con datos completos
- 5 Contratos laborales
- 4 Departamentos
- 5 Puestos
- 1 Centro de coste
- 1 Política de gastos

**Uso:**

```bash
npx prisma db seed
```

**⚠️ IMPORTANTE:**
- ❌ **ELIMINA TODOS LOS DATOS** existentes
- Solo usar en desarrollo o para reset completo
- Crea usuarios con password: `password123`

---

## 🎯 ¿Qué Script Usar?

### Escenario 1: **Nueva organización en producción** ⭐

```bash
# 1. Crear organización desde la UI o API
# 2. Inicializar datos base
npm run seed:org-init -- --orgId="cm123456789"
```

✅ La organización estará lista para operar

---

### Escenario 2: **Desarrollo local (empezar desde cero)**

```bash
# 1. Reset completo + datos demo
npx prisma migrate reset
npx prisma db seed

# 2. Ya tienes todo: org, usuarios, empleados, datos
```

✅ Puedes empezar a desarrollar con datos reales

---

### Escenario 3: **Añadir solo departamentos/puestos a org existente**

```bash
npm run seed:departments -- --orgId="org_existente"
```

✅ Solo añade estructura organizativa, respeta lo demás

---

### Escenario 4: **Añadir niveles a todas las orgs**

```bash
npx tsx scripts/seed-position-levels.ts
```

✅ Todas las organizaciones tendrán niveles de seniority

---

## 📝 Datos Creados por `seed-organization-init`

### Tipos de Ausencia

| Código | Nombre | Requiere Aprobación | Retribuido |
|--------|---------|---------------------|------------|
| `VAC` | Vacaciones | ✅ | ✅ |
| `SICK` | Baja por Enfermedad | ❌ | ✅ |
| `PERS` | Permiso Personal | ✅ | ✅ |
| `UNPAID` | Permiso No Retribuido | ✅ | ❌ |
| `REMOTE` | Teletrabajo | ✅ | ✅ |
| `TRAIN` | Formación | ✅ | ✅ |
| `MAT` | Maternidad/Paternidad | ❌ | ✅ |

### Configuración PTO (España)

- **Días anuales:** 22 días laborables
- **Inicio acumulación:** Enero
- **Aviso mínimo:** 15 días
- **Máximo consecutivo:** 30 días
- **Arrastre:** Deshabilitado por defecto

### Niveles de Puesto

1. **Trainee** - En formación / prácticas
2. **Junior** - 0-2 años experiencia
3. **Mid** - 2-4 años experiencia
4. **Senior** - 4+ años experiencia
5. **Lead** - Líder técnico
6. **Principal** - Arquitecto / experto
7. **Director** - Director de área

### Departamentos

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

**Total:** ~50 puestos distribuidos

### Política de Gastos (España 2024)

- **Kilometraje:** 0.26 €/km
- **Límite comidas:** 30 €/día
- **Límite alojamiento:** 100 €/día
- **Categorías:** Combustible, Kilometraje, Comidas, Peajes, Parking, Alojamiento, Otros

---

## 🔍 Cómo obtener tu ORG_ID

### Desde Prisma Studio (Recomendado)

```bash
npx prisma studio
```

Ve a la tabla `Organization` y copia el `id`.

### Desde la base de datos (psql)

```bash
# Conectar a la base de datos
psql postgresql://erp_user:erp_pass@localhost:5432/erp_dev

# Listar organizaciones
SELECT id, name FROM "Organization";
```

---

## 🔧 Modificar los Datos

Si quieres personalizar los datos creados, edita directamente el script:

```bash
nano scripts/seed-organization-init.ts
```

**Variables editables:**
- `ABSENCE_TYPES` - Añadir/modificar tipos de ausencia
- `PTO_CONFIG` - Cambiar días anuales, reglas, etc.
- `POSITION_LEVELS` - Añadir/quitar niveles
- `DEPARTMENTS_AND_POSITIONS` - Añadir/quitar departamentos y puestos
- `EXPENSE_POLICY` - Cambiar tarifas y límites

---

## 📋 Ejemplo de Salida del Script Principal

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🚀 INICIALIZACIÓN DE ORGANIZACIÓN - ERP TimeNow       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

✅ Organización encontrada: Mi Empresa S.L.
📋 ID: cm123456789

⚠️  Este script creará los siguientes datos iniciales:

   📋 7 tipos de ausencia (vacaciones, bajas, permisos)
   🏖️  1 configuración de PTO (vacaciones)
   📊 7 niveles de puesto (Junior, Senior, etc.)
   🏢 10 departamentos
   💼 54 puestos de trabajo
   💰 1 política de gastos
   🏭 1 centro de coste (si no existe ninguno)

⏳ Esperando 5 segundos antes de continuar...
   (Presiona Ctrl+C para cancelar)

============================================================
  📋 TIPOS DE AUSENCIA
============================================================

   ✅ Creado: Vacaciones (VAC)
   ✅ Creado: Baja por Enfermedad (SICK)
   ✅ Creado: Permiso Personal (PERS)
   ...

   📊 Resumen: 7 creados, 0 omitidos

============================================================
  🏖️  CONFIGURACIÓN DE PTO (VACACIONES)
============================================================

   ✅ Configuración de PTO creada
   📌 Días anuales por defecto: 22
   📌 Aviso mínimo: 15 días
   📌 Máximo consecutivo: 30 días

============================================================
  📊 NIVELES DE PUESTO
============================================================

   ✅ Creado: Trainee (orden: 1)
   ✅ Creado: Junior (orden: 2)
   ...

   📊 Resumen: 7 creados, 0 omitidos

============================================================
  🏢 DEPARTAMENTOS Y PUESTOS
============================================================

   ✅ Departamento creado: Dirección General
      ✅ Puesto creado: Director/a General
      ✅ Puesto creado: Director/a de Operaciones
      ✅ Puesto creado: Asistente de Dirección

   ✅ Departamento creado: Recursos Humanos
      ✅ Puesto creado: Director/a de RRHH
      ...

   📊 Resumen Departamentos: 10 creados, 0 omitidos
   📊 Resumen Puestos: 54 creados, 0 omitidos

============================================================
  💰 POLÍTICA DE GASTOS
============================================================

   ✅ Política de gastos creada
   📌 Kilometraje: 0.26 €/km
   📌 Límite comidas: 30 €/día
   📌 Límite alojamiento: 100 €/día

============================================================
  🏭 CENTRO DE COSTE POR DEFECTO (OPCIONAL)
============================================================

   ✅ Centro de coste creado: Oficina Principal (MAIN)
   ℹ️  Recuerda actualizar la dirección en la configuración

============================================================
  ✨ PROCESO COMPLETADO
============================================================

📊 RESUMEN FINAL:

   📋 Tipos de ausencia: 7 creados, 0 omitidos
   🏖️  Configuración PTO: 1 creada, 0 omitida
   📊 Niveles de puesto: 7 creados, 0 omitidos
   🏢 Departamentos: 10 creados, 0 omitidos
   💼 Puestos: 54 creados, 0 omitidos
   💰 Política de gastos: 1 creada, 0 omitida
   🏭 Centros de coste: 1 creados, 0 omitidos

✅ La organización está lista para empezar a operar!

📝 Próximos pasos sugeridos:
   1. Crear usuarios y asignar roles
   2. Crear empleados y vincularlos a usuarios
   3. Asignar empleados a departamentos y puestos
   4. Configurar calendarios y festivos
   5. Configurar centros de coste adicionales (si es necesario)
```

---

## ⚠️ Importante

1. **Todos los scripts respetan datos existentes** (excepto `prisma db seed` que hace reset)
2. **Verifican duplicados** por nombre/código antes de crear
3. **Muestran confirmación** antes de ejecutar (5 segundos)
4. **Resumen detallado** al finalizar de qué crearon/omitieron

---

## 🔒 Uso en Producción

**IMPORTANTE:** Los scripts son seguros para ejecutar en producción porque:

1. Solo **añaden** datos, nunca eliminan
2. Verifican duplicados antes de crear
3. Requieren confirmación manual (5 segundos)
4. Muestran un resumen antes de ejecutar

Sin embargo, siempre se recomienda:
- ✅ Hacer backup de la base de datos antes
- ✅ Ejecutar primero en staging/desarrollo
- ✅ Revisar el ORG_ID antes de ejecutar

---

## 🆘 Solución de Problemas

### Error: "Organization not found"

```bash
# Verifica que el ID es correcto
npx prisma studio
# Busca tu organización y copia el ID exacto
```

### Script se ejecuta pero no crea nada

- ✅ Probablemente los datos ya existen
- ✅ Revisa el resumen final para ver qué se omitió
- ✅ Si necesitas recrear, elimina manualmente desde Prisma Studio

### Error: "Debes proporcionar un ORG_ID"

```bash
# Asegúrate de pasar el parámetro correctamente
npm run seed:org-init -- --orgId="tu-org-id-aqui"
#                       ^^ Los dos guiones son importantes
```

### "No se puede ejecutar tsx"

```bash
npm install
```

---

## 📚 Próximos Pasos Después de Seed

Después de ejecutar `seed:org-init`, tu organización tiene:

✅ Tipos de ausencia configurados
✅ Reglas de vacaciones (PTO)
✅ Niveles de seniority
✅ Departamentos y puestos
✅ Política de gastos
✅ Centro de coste base

**Ahora puedes:**

1. **Crear usuarios** desde la UI → `/dashboard/users`
2. **Crear empleados** y vincularlos a usuarios → `/dashboard/employees`
3. **Asignar empleados** a departamentos y puestos
4. **Configurar calendarios** y festivos → `/dashboard/calendars`
5. **Activar fichajes** → Los empleados pueden empezar a fichar
6. **Solicitar vacaciones** → El sistema PTO está listo

---

**¿Dudas?** Consulta el código de los scripts o revisa la documentación de Prisma.
