# Orden de Implementación - Mi Espacio

Plan de desarrollo incremental para las funcionalidades del área personal del empleado.

## 📋 Orden Recomendado

### 1️⃣ Mi Perfil (Base Fundamental)

**Prioridad:** Alta - Implementar primero

- Base fundamental: datos del usuario autenticado
- Necesario para todas las demás funcionalidades
- **Modelos:** `User`, `Employee`, `Organization`
- Permite validar la autenticación y relaciones básicas

---

### 2️⃣ Fichar (Core del Sistema)

**Prioridad:** Alta

- Funcionalidad core del sistema
- **Modelos:** `TimeEntry`, `WorkdaySummary`
- Independiente de vacaciones/calendario
- Alta frecuencia de uso

---

### 3️⃣ Mi Calendario (Soporte)

**Prioridad:** Media

- Gestión de festivos y eventos corporativos
- **Modelos:** `Calendar`, `CalendarEvent`
- Necesario para validar solicitudes de vacaciones

---

### 4️⃣ Mis Vacaciones (Depende de Calendario)

**Prioridad:** Media

- Depende de: Perfil, Calendario
- **Modelos:** `PtoRequest`, `PtoBalance`, `AbsenceType`
- Necesita calendario para evitar conflictos con festivos

---

### 5️⃣ Mi Espacio (Consolidación)

**Prioridad:** Baja

- Dashboard personal con resumen de información
- Depende de datos de perfil
- Mostrará resúmenes de: fichajes, vacaciones, próximos eventos
- Se completa al final cuando las demás funcionalidades estén listas

---

### 6️⃣ Mis Documentos (Complementario)

**Prioridad:** Baja

- Funcionalidad más independiente
- Puede requerir integración con almacenamiento externo
- Menos crítico para operación diaria

---

## 🔄 Flujo de Dependencias

```
Mi Perfil (base)
  ↓
Fichar (core)
  ↓
Mi Calendario (soporte)
  ↓
Mis Vacaciones (depende de calendario)
  ↓
Mi Espacio (consolida todo)
  ↓
Mis Documentos (complementario)
```

## ⚡ Estrategia de Base de Datos

**IMPORTANTE:** Desarrollo incremental de schema

- NO crear todo el schema de Prisma de una vez
- Añadir modelos conforme se implementan las funcionalidades
- Usar migraciones incrementales: `npx prisma migrate dev --name descripcion-cambio`

### Sprints Sugeridos:

1. **Sprint 1:** `User`, `Employee`, `Organization` (Mi Perfil)
2. **Sprint 2:** `TimeEntry`, `WorkdaySummary` (Fichar)
3. **Sprint 3:** `Calendar`, `CalendarEvent` (Mi Calendario)
4. **Sprint 4:** `PtoRequest`, `PtoBalance`, `AbsenceType` (Mis Vacaciones)
5. **Sprint 5:** Consolidar Mi Espacio
6. **Sprint 6:** Documentos y refinamiento

---

## 🎯 Estado Actual

- [x] Mi Perfil ✅
- [x] Fichar ✅ (Implementación completa)
  - ✅ Modelos de base de datos (TimeEntry, WorkdaySummary, TimeClockTerminal)
  - ✅ Server actions para fichajes del empleado
  - ✅ Store de Zustand para gestión de estado
  - ✅ UI funcional de fichaje con resumen en tiempo real
  - ✅ Permisos por rol
  - ✅ Navegación en sidebar
  - ✅ Dashboard administrativo
  - ✅ Monitor en vivo
- [x] Mi Calendario ✅ (Implementación completa)
  - ✅ Modelos de base de datos (Calendar, CalendarEvent)
  - ✅ Server actions para empleados (getMyCalendars, getMyMonthEvents)
  - ✅ API Routes para CRUD de calendarios y eventos
  - ✅ Vista empleado con calendarios filtrados por centro
  - ✅ Panel administrativo completo con DataTable
  - ✅ **Importación automática de festivos** desde API nager.date
    - ✅ Dialog de importación con preview
    - ✅ Soporte para +15 países
    - ✅ Integrado en listado y detalle de calendarios
  - ✅ Sistema multi-centro funcional
  - ✅ Colores personalizables por calendario
  - ✅ Filtros por tipo de evento
  - ✅ **UI mejorada del calendario del empleado**
    - ✅ Puntos de colores en lugar de texto truncado
    - ✅ Días clicables con modal de detalle de eventos
    - ✅ Navegación mensual fluida
    - ✅ Próximos eventos agrupados por calendario
    - ✅ Leyenda de calendarios visibles
- [x] Mis Vacaciones ✅ (Implementación COMPLETA)
  - ✅ **BASE DE DATOS**
    - ✅ Modelos (AbsenceType, PtoBalance, PtoRequest, PtoNotification)
    - ✅ Enums (PtoRequestStatus, PtoNotificationType)
    - ✅ Índices y relaciones optimizadas
    - ✅ Migración aplicada correctamente
  - ✅ **SERVER ACTIONS**
    - ✅ pto-balance.ts: Cálculo proporcional de días disponibles
    - ✅ notifications.ts: Sistema completo de notificaciones
    - ✅ employee-pto.ts:
      - Cálculo de días hábiles (excluye festivos y fines de semana)
      - Validaciones (balance, solapamientos, anticipación)
      - Crear y cancelar solicitudes
      - Asignación automática de aprobador (manager > HR_ADMIN)
    - ✅ approver-pto.ts:
      - Aprobar y rechazar solicitudes
      - Ver solicitudes pendientes y del equipo
      - Calendario del equipo
  - ✅ **ZUSTAND STORES**
    - ✅ pto-store.tsx: Gestión completa de solicitudes y balance
    - ✅ notifications-store.tsx: Con estrategia eficiente de actualización
  - ✅ **SISTEMA DE NOTIFICACIONES**
    - ✅ NotificationBell con badge contador
    - ✅ NotificationDropdown con últimas notificaciones
    - ✅ Estrategia eficiente: cambio de ruta + foco ventana + 30min
    - ✅ Integrado en navbar del dashboard
  - ✅ **UI EMPLEADO** (/dashboard/me/pto)
    - ✅ Cards de balance (4 métricas con diseño profesional)
    - ✅ DataTable con tabs (Activas, Pendientes, Todas)
    - ✅ Dialog de nueva solicitud con:
      - Cálculo en tiempo real de días hábiles
      - Validación de días disponibles
      - Preview de festivos en el rango
      - Selector de tipo de ausencia
    - ✅ Cancelación de solicitudes pendientes
  - ✅ **UI APROBADOR** (/dashboard/approvals/pto)
    - ✅ Tabla profesional con solicitudes pendientes
    - ✅ Acciones de aprobar/rechazar en la tabla
    - ✅ Dialog de aprobación/rechazo con validaciones
    - ✅ Información completa de la solicitud
  - ✅ **NAVEGACIÓN**
    - ✅ "Mis Vacaciones" en sección Mi Espacio
    - ✅ "Aprobaciones" en sección RRHH (con permisos)
  - ✅ **DATOS INICIALES**
    - ✅ Script de inicialización de tipos de ausencia
    - ✅ 6 tipos predefinidos: Vacaciones, Asuntos personales, Baja médica, Maternidad/Paternidad, Permiso no retribuido, Formación
    - ✅ Ejecutado correctamente en la BD
- [x] Mi Espacio ✅ (Implementación completa)
  - ✅ Server action `getMySpaceDashboard()`
  - ✅ Dashboard consolidado con métricas de:
    - Fichajes (hoy y semana)
    - Balance de vacaciones
    - Próximos eventos del calendario
    - Notificaciones recientes
  - ✅ Cards de métricas con diseño profesional
  - ✅ Acciones rápidas a todas las secciones
  - ✅ Integrado en sidebar como "Mi Espacio"
- [x] Mis Documentos ✅ (Implementación COMPLETA)
  - ✅ **API COMPLETA** (`/api/me/documents`)
    - ✅ GET: Ver documentos propios con filtros
    - ✅ POST: Subir documentos permitidos (MEDICAL, CERTIFICATE, OTHER)
    - ✅ DELETE: Eliminar solo documentos propios
    - ✅ Validaciones de límites por tipo (50 médicos, 50 certificados, 100 otros)
    - ✅ Validación de archivos (10MB máx, tipos permitidos)
  - ✅ **SERVER ACTIONS**
    - ✅ `getMyDocuments()`: Obtiene documentos con filtros y estadísticas
    - ✅ `getMyDocumentsStats()`: Estadísticas de documentos
  - ✅ **STORAGE AGNÓSTICO**
    - ✅ Patrón factoría (Local + Azure)
    - ✅ Fácil agregar nuevos providers (AWS S3, etc.)
    - ✅ Configuración por variable de entorno
  - ✅ **UI EMPLEADO**
    - ✅ Vista agrupada por categorías
    - ✅ Filtros por tipo y búsqueda
    - ✅ Dialog de subida con drag & drop
    - ✅ Ver, descargar y eliminar documentos
    - ✅ Botón eliminar solo en documentos propios
    - ✅ Estados de carga y error
  - ✅ **PERMISOS**
    - ✅ Empleados solo pueden subir: MEDICAL, CERTIFICATE, OTHER
    - ✅ Solo pueden eliminar lo que ellos subieron
    - ✅ Límites configurables por tipo de documento

---

**Estado actual:** ✅ ÁREA PERSONAL DEL EMPLEADO COMPLETA

## 🎉 Sistema "Mi Espacio" completamente funcional

El área personal del empleado está completamente implementada con todas las funcionalidades:

### ✅ Funcionalidades implementadas:

1. **Mi Espacio** - Dashboard consolidado con métricas en tiempo real
2. **Fichar** - Control de entrada/salida con resumen diario/semanal
3. **Mi Calendario** - Vista de eventos y festivos filtrados por centro
4. **Mis Vacaciones** - Solicitud y seguimiento de vacaciones con sistema de aprobaciones
5. **Mis Documentos** - Subida, descarga y gestión de documentos personales
6. **Mi Perfil** - Información personal y datos del empleado

### 🔧 Infraestructura técnica:

- ✅ Server Actions para todas las funcionalidades
- ✅ Zustand stores para gestión de estado
- ✅ Sistema de notificaciones en tiempo real
- ✅ Storage agnóstico (Local/Azure/futuro S3)
- ✅ Sistema de permisos granular
- ✅ Validaciones completas en cliente y servidor
- ✅ Diseño responsive y profesional
- ✅ Multi-tenancy implementado

### 🚀 Preparado para producción:

- ✅ Fácil migrar entre storage providers (local → Azure → S3)
- ✅ Configurable por variables de entorno
- ✅ Listo para desplegar en Vercel u otra plataforma
- ✅ Base de datos PostgreSQL con migraciones incrementales

**Estado del proyecto:** Todas las funcionalidades del área personal del empleado implementadas y funcionales ✨
