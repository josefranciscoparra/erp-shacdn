# 🚀 ERP Multi-tenant - Resumen Ejecutivo

## 📋 Funcionalidades Principales

### 1. **Gestión de Empleados**

- ✅ Ficha completa (datos personales, bancarios, contractuales)
- ✅ Multi-empresa con centros de costo y departamentos
- ✅ Organigrama jerárquico
- ✅ Importación masiva CSV
- ✅ Validación NIF/NIE española
- ✅ Encriptación de datos sensibles (IBAN)

### 2. **Control Horario / Fichajes**

- ✅ **Fichaje Web**: Entrada/Salida/Pausas con geolocalización
- ✅ **Modo Kiosco**: PIN de 4 dígitos por centro
- ✅ **Antifraude**:
  - Validación IP/Geofencing
  - Detección de patrones sospechosos
  - Selfie opcional
- ✅ **Cálculo automático**:
  - Horas normales, extras, nocturnas, festivos
  - Incidencias (llegadas tarde, salidas tempranas)
- ✅ **Cuadrantes**: Turnos fijos/rotativos con cambios

### 3. **Vacaciones y Ausencias (PTO)**

- ✅ Tipos configurables (vacaciones, enfermedad, permisos)
- ✅ **Balance automático**:
  - Devengo mensual/anual/prorrata
  - Arrastre con límites
- ✅ **Flujo de aprobación**: Manager → HR
- ✅ **Validaciones**:
  - Saldo disponible
  - Días mínimos antelación
  - Bloqueos por solapes
  - Mínimos de servicio
- ✅ Calendario de equipo

### 4. **Exportación Nómina**

- ✅ Formatos: CSV, Excel, A3NOM, SAGE
- ✅ Cálculo de conceptos:
  - Horas trabajadas/extras/nocturnas/festivos
  - Días de ausencia por tipo
- ✅ Mapeo configurable por software de nómina
- ✅ Exportación por periodo/centro/empleado

### 5. **Notificaciones**

- ✅ In-app + Email
- ✅ Eventos: solicitudes PTO, aprobaciones, anomalías fichaje
- ✅ Plantillas multiidioma (ES/EN)

## 🏗️ Arquitectura Técnica

### Stack Principal

```typescript
// Frontend
- Next.js 15 (App Router)
- shadcn/ui + Tailwind CSS
- TanStack Query + Zustand
- React Hook Form + Zod

// Backend
- tRPC (type-safe API)
- Prisma ORM + PostgreSQL
- NextAuth v5 (Auth.js)

// Infraestructura
- Local: PostgreSQL + archivos locales
- Azure: PostgreSQL + Blob Storage
```

### Seguridad Implementada

- 🔐 **Multi-tenancy**: Aislamiento por `org_id`
- 🔐 **RBAC**: 5 roles (Super Admin, Org Admin, HR, Manager, Employee)
- 🔐 **Validación**: Zod en todos los inputs
- 🔐 **Rate limiting**: Por endpoint y usuario
- 🔐 **Encriptación**: AES-256 para datos sensibles
- 🔐 **Audit log**: Todas las acciones críticas
- 🔐 **CSRF + XSS**: Protección automática

## 📊 Modelos de Datos Clave

```prisma
// Núcleo
Organization → CostCenter → Department
         ↓
      Employee → EmploymentContract
         ↓
       User (login)

// Fichajes
Employee → TimeEntry → WorkdaySummary
              ↓
        AntiFraudCheck

// Vacaciones
Employee → PtoBalance → PtoRequest
                           ↓
                      Aprobaciones

// Exportación
WorkdaySummary + PtoRequest → PayrollExport
```

## 🎯 Roadmap Implementación (6 semanas)

### **Sprint 0 - Fundaciones** (1 semana)

- Setup PostgreSQL + Prisma
- NextAuth con multi-tenancy
- tRPC + middleware seguridad
- CRUD Organizaciones

### **Sprint 1 - RRHH** (2 semanas)

- CRUD Empleados completo
- Contratos y estructura organizativa
- Calendarios laborales
- Importador CSV

### **Sprint 2 - Fichajes** (2 semanas)

- Reloj web + kiosco
- Sistema antifraude
- Cálculo jornadas
- Panel incidencias

### **Sprint 3 - PTO** (1 semana)

- Solicitudes y aprobaciones
- Gestión de saldos
- Calendario equipo
- Jobs de devengo

### **Sprint 4 - Nómina** (0.5 semanas)

- Exportación multi-formato
- Mapeo configurable
- Reporting

### **Sprint 5 - Polish** (0.5 semanas)

- Testing E2E
- Optimización
- Deploy Azure

## 💻 Comandos Rápidos

```bash
# Setup inicial
npm install
npx prisma migrate dev
npm run dev

# Desarrollo
npm run db:studio    # Ver BD
npm run lint         # Verificar código
npm test            # Tests

# Producción
npm run build
npm run start
```

## 🔑 Variables de Entorno

```env
# .env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/erp_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cambiar-en-produccion"
ENCRYPTION_KEY="32-caracteres-random"

# Azure (producción)
AZURE_STORAGE_CONNECTION_STRING=""
AZURE_POSTGRESQL_CONNECTION_STRING=""
```

## ✅ Checklist Pre-Deploy

- [ ] Migraciones Prisma ejecutadas
- [ ] Seeds con datos de prueba
- [ ] Auth funcionando con roles
- [ ] Rate limiting activo
- [ ] Encriptación configurada
- [ ] Audit log verificado
- [ ] Tests pasando
- [ ] Variables de entorno Azure

## 📈 KPIs del Sistema

- **Tasa de puntualidad**: % empleados puntuales
- **Horas extra**: Por centro/departamento
- **Absentismo**: Días perdidos/mes
- **Uso PTO**: % días usados vs disponibles
- **SLA aprobaciones**: Tiempo medio aprobación

## 🚨 Consideraciones Importantes

1. **Multi-tenancy**: Todos los queries filtrados por `org_id`
2. **Jornadas**: Se calculan automáticamente al fichar OUT
3. **PTO**: Devengo automático diario a las 2 AM
4. **Nómina**: Solo exporta jornadas aprobadas
5. **Antifraude**: 6 verificaciones simultáneas
6. **Escalabilidad**: Preparado para 10K+ empleados

---

**Stack probado | Seguridad desde día 1 | Listo para Azure | Sin vendor lock-in**
