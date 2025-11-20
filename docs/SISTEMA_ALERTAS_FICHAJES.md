# Sistema de Alertas de Fichajes - Documentación Técnica

## Estado de Implementación

**Última actualización:** 2025-11-19

### ✅ Completado (MVP V1)

- [x] **Fase 1: Modelo de Datos**
  - Modelos de Prisma: `AreaResponsible`, `AlertSubscription`, `Alert`
  - Configuración en `Organization`: umbrales de alertas
  - Sincronización con base de datos
  - Relaciones bidireccionales con modelos existentes

- [x] **Fase 2: Lógica de Detección**
  - Server action completo: `/src/server/actions/alert-detection.ts`
  - Detección en tiempo real (`detectAlertsForTimeEntry`)
  - Detección batch diaria (`detectAlertsForDate`)
  - Sistema de deduplicación con upsert
  - 8 tipos de alertas implementados

- [x] **Fase 3: Integración con Fichajes**
  - Integración completa en `clockIn()` y `clockOut()`
  - Detección automática al fichar entrada/salida
  - Retorno de alertas al cliente
  - Manejo de errores graceful (no falla fichaje si falla detección)

- [x] **Fase 4: Dashboard de Alertas** ✅ COMPLETADO
  - Página `/dashboard/time-tracking/alerts` con DataTable profesional
  - Tabs: Activas, Resueltas, Descartadas con badges de conteo
  - Cards con estadísticas (total, activas, resueltas, descartadas)
  - Columnas: Severidad, Tipo, Empleado, Centro, Título, Desviación, Fecha, Estado
  - Acciones por fila: Ver detalles, Resolver, Descartar
  - Modals para resolver/descartar/ver detalles con formularios
  - Responsive: Select en móvil, Tabs en desktop
  - DataTableViewOptions para mostrar/ocultar columnas
  - Paginación completa
  - Añadido a navegación en "Tiempo y presencia" con badge "NEW"
  - Feedback con `alert()` nativo (toast system pendiente de implementar globalmente)
  - Compilación exitosa verificada en Turbopack

- [x] **Fase 5: Indicadores Visuales** ✅ COMPLETADO
  - Badges de alerta en DayCard del calendario con agregación por fecha
  - Server action `getEmployeeAlertsByDateRange()` para obtener alertas por rango
  - Colores según severidad máxima (CRITICAL=rojo, WARNING=ámbar, INFO=azul)
  - Contador de alertas por día visible en vista de calendario
  - Integración completa en `/dashboard/time-tracking/[employeeId]`

- [x] **Fase 6: Sistema de Notificaciones** ✅ COMPLETADO
  - Componente `AlertsBell` en navbar (`/src/components/alerts/alerts-bell.tsx`)
  - Contador de alertas activas con badge rojo
  - Auto-refresh cada 5 minutos + refresh al cambiar ruta + refresh al hacer foco
  - Click navega a `/dashboard/time-tracking/alerts`
  - Server action `getActiveAlertsCount()` optimizado
  - Integrado en `/src/app/(main)/dashboard/layout.tsx`

### 🟡 Pendiente (Opcional)

- [ ] **Columna de alertas en tabla de empleados**
  - Mostrar conteo de alertas activas por empleado
  - Filtro/ordenación por número de alertas

- [ ] **Notificaciones por email**
  - Sistema de suscripciones (AlertSubscription)
  - Envío de emails a RRHH/managers cuando se generan alertas
  - Modo digest diario/semanal

---

## 1. Arquitectura del Sistema

### 1.1 Separación de Conceptos

El sistema distingue claramente entre:

1. **AreaResponsible** - Permisos para VER y GESTIONAR datos
   - Define qué usuarios pueden acceder a qué ámbitos (ORGANIZATION, COST_CENTER)
   - Permisos: `VIEW_EMPLOYEES`, `MANAGE_SCHEDULES`, `RESOLVE_ALERTS`, `VIEW_ALERTS`
   - Solo usuarios con responsabilidad tienen acceso al dashboard

2. **AlertSubscription** - Notificaciones SOLO (quién recibe alertas)
   - Cualquier usuario puede suscribirse a alertas de un ámbito
   - Configuración flexible: tipos de alerta, severidad, canales (app/email)
   - Control de volumen: máximo alertas/día, modo digest, solo primera ocurrencia

3. **Alert** - Alertas generadas automáticamente
   - Detectadas por el sistema al fichar o en batch diario
   - Deduplicadas por `[employeeId, date, type]`
   - Estados: `ACTIVE`, `RESOLVED`, `DISMISSED`
   - Tracking histórico: `originalCostCenterId` (inmutable) vs `costCenterId` (actual)

### 1.2 Modelo de Datos

```prisma
// Responsabilidades por ámbito (permisos)
model AreaResponsible {
  id        String   @id @default(cuid())
  userId    String
  orgId     String
  scope     String   // "ORGANIZATION" | "COST_CENTER"
  costCenterId String?
  permissions String[] // ["VIEW_EMPLOYEES", "MANAGE_SCHEDULES", "RESOLVE_ALERTS", "VIEW_ALERTS"]
  isActive  Boolean  @default(true)

  @@unique([userId, scope, costCenterId])
}

// Suscripciones a alertas (notificaciones)
model AlertSubscription {
  id        String   @id @default(cuid())
  userId    String
  orgId     String
  scope     String   // "ORGANIZATION" | "COST_CENTER"
  costCenterId String?

  alertTypes     String[] @default([])  // Filtrar por tipos
  severityLevels String[] @default([])  // Filtrar por severidad

  notifyInApp   Boolean @default(true)
  notifyByEmail Boolean @default(false)

  // Control de volumen
  maxAlertsPerDay     Int?
  digestMode          Boolean @default(false)
  digestTime          String?  // "09:00"
  onlyFirstOccurrence Boolean @default(false)

  isUserOverride Boolean @default(false)  // Subscripción personal vs automática
  isDisabled     Boolean @default(false)
  isActive       Boolean @default(true)

  @@unique([userId, scope, costCenterId])
}

// Alertas detectadas automáticamente
model Alert {
  id          String   @id @default(cuid())
  orgId       String
  employeeId  String

  type        String   // "LATE_ARRIVAL", "CRITICAL_LATE_ARRIVAL", etc.
  severity    String   // "INFO", "WARNING", "CRITICAL"

  title       String
  description String?
  date        DateTime

  deviationMinutes Int?  // Minutos de desviación

  // Tracking histórico
  costCenterId         String?
  originalCostCenterId String?  // Inmutable, registro histórico

  status String @default("ACTIVE")  // "ACTIVE", "RESOLVED", "DISMISSED"

  resolvedAt        DateTime?
  resolvedBy        String?
  resolutionComment String?

  notifiedUsers String[] @default([])  // IDs de usuarios notificados

  @@unique([employeeId, date, type])  // Deduplicación
}
```

### 1.3 Configuración en Organization

```typescript
// Campos en model Organization
clockInToleranceMinutes       Int     @default(15)   // Tolerancia entrada (warning)
clockOutToleranceMinutes      Int     @default(15)   // Tolerancia salida (warning)
earlyClockInToleranceMinutes  Int     @default(30)   // Entrada anticipada permitida
lateClockOutToleranceMinutes  Int     @default(30)   // Salida tardía permitida
nonWorkdayClockInAllowed      Boolean @default(false) // Permitir fichaje día no laboral
nonWorkdayClockInWarning      Boolean @default(true)  // Alertar si ficha día no laboral

criticalLateArrivalMinutes    Int     @default(30)   // Umbral crítico entrada
criticalEarlyDepartureMinutes Int     @default(30)   // Umbral crítico salida
alertsEnabled                 Boolean @default(true)  // ON/OFF sistema alertas
alertNotificationsEnabled     Boolean @default(false) // Enviar notificaciones
alertNotificationRoles        String[] @default(["RRHH"]) // Roles notificados
```

---

## 2. Detección de Alertas

### 2.1 Tipos de Alertas

| Tipo | Severidad | Descripción |
|------|-----------|-------------|
| `LATE_ARRIVAL` | WARNING | Llegada tarde dentro de tolerancia (15-30min) |
| `CRITICAL_LATE_ARRIVAL` | CRITICAL | Llegada tarde fuera de tolerancia (>30min) |
| `EARLY_DEPARTURE` | WARNING | Salida temprana dentro de tolerancia (15-30min) |
| `CRITICAL_EARLY_DEPARTURE` | CRITICAL | Salida temprana fuera de tolerancia (>30min) |
| `MISSING_CLOCK_IN` | CRITICAL | Falta fichaje de entrada en día laborable |
| `MISSING_CLOCK_OUT` | WARNING | Falta fichaje de salida |
| `EXCESSIVE_HOURS` | WARNING | Más de 12 horas trabajadas en un día |
| `NON_WORKDAY_CLOCK_IN` | WARNING | Fichaje en día no laborable |

### 2.2 Detección en Tiempo Real

**Función:** `detectAlertsForTimeEntry(timeEntryId)`

Se ejecuta automáticamente al hacer clockIn/clockOut:

```typescript
// Flujo de detección
1. Obtener configuración de validaciones (getOrganizationValidationConfig)
2. Verificar si alertas están activadas (alertsEnabled)
3. Obtener fichaje (timeEntry) con employee y costCenter
4. Obtener horario efectivo del día (getEffectiveSchedule)
5. Validar si es día no laborable → Alerta NON_WORKDAY_CLOCK_IN
6. Calcular desviación de entrada vs horario esperado
   - Si >30min tarde → CRITICAL_LATE_ARRIVAL
   - Si 15-30min tarde → LATE_ARRIVAL
7. Si hay clockOut, calcular desviación de salida
   - Si >30min temprano → CRITICAL_EARLY_DEPARTURE
   - Si 15-30min temprano → EARLY_DEPARTURE
8. Si >12h trabajadas → EXCESSIVE_HOURS
9. Guardar alertas con deduplicación (saveDetectedAlerts)
```

**Ejemplo de uso:**
```typescript
// En clockOut() después de guardar fichaje
const alerts = await detectAlertsForTimeEntry(timeEntry.id);
// alerts contiene array de alertas detectadas
```

### 2.3 Detección Batch Diaria

**Función:** `detectAlertsForDate(employeeId, date)`

Se ejecutará en cron job a las 23:00 para validar día completo:

```typescript
// Flujo de detección batch
1. Obtener configuración de validaciones
2. Verificar si alertas están activadas
3. Obtener workdaySummary del día
4. Obtener horario efectivo del día
5. Validar casos:
   - Día laborable sin fichajes → MISSING_CLOCK_IN
   - Tiene entrada pero no salida → MISSING_CLOCK_OUT
   - Desviación total del día → LATE_ARRIVAL/CRITICAL según minutos
   - Horas excesivas → EXCESSIVE_HOURS
6. Guardar alertas con deduplicación
```

**Nota:** Solo alerta por días pasados, no futuros.

### 2.4 Sistema de Deduplicación

```typescript
// Unique constraint en Prisma
@@unique([employeeId, date, type])

// Uso de upsert en lugar de create
await prisma.alert.upsert({
  where: {
    employeeId_date_type: {
      employeeId,
      date: normalizedDate,
      type: alert.type,
    },
  },
  create: { /* datos nuevos */ },
  update: { /* actualizar si existe */ },
});
```

**Ventajas:**
- Evita alertas duplicadas si se ejecuta detección múltiples veces
- Permite actualizar alertas existentes con nueva información
- Mantiene historial limpio y consistente

---

## 3. Funciones de Gestión de Alertas

### 3.1 Obtener Alertas Activas

```typescript
const alerts = await getActiveAlerts({
  employeeId: "...",       // Filtrar por empleado
  costCenterId: "...",     // Filtrar por centro de coste
  severity: "CRITICAL",    // Filtrar por severidad
  type: "LATE_ARRIVAL",    // Filtrar por tipo
  dateFrom: new Date(),    // Desde fecha
  dateTo: new Date(),      // Hasta fecha
});

// Retorna: Alert[] con employee y costCenter incluidos
```

### 3.2 Resolver Alerta

```typescript
await resolveAlert(alertId, "Justificado por cita médica");

// Actualiza:
// - status → "RESOLVED"
// - resolvedAt → new Date()
// - resolvedBy → session.user.id
// - resolutionComment → comentario
```

### 3.3 Descartar Alerta

```typescript
await dismissAlert(alertId, "Falso positivo");

// Actualiza:
// - status → "DISMISSED"
// - resolvedAt → new Date()
// - resolvedBy → session.user.id
// - resolutionComment → comentario
```

### 3.4 Estadísticas de Alertas

```typescript
const stats = await getAlertStats(dateFrom, dateTo);

// Retorna:
{
  total: 156,
  active: 23,
  resolved: 120,
  dismissed: 13,
  bySeverity: [
    { severity: "CRITICAL", count: 45 },
    { severity: "WARNING", count: 89 },
    { severity: "INFO", count: 22 }
  ],
  byType: [
    { type: "LATE_ARRIVAL", count: 67 },
    { type: "CRITICAL_LATE_ARRIVAL", count: 23 },
    // ...
  ]
}
```

---

## 4. Integración con Sistema de Fichajes

### 4.1 Integración en clockIn()

```typescript
// En /src/server/actions/time-tracking.ts
export async function clockIn(...) {
  // ... lógica existente de clockIn ...

  // DESPUÉS de crear timeEntry
  const timeEntry = await prisma.timeEntry.create({ ... });

  // Detectar alertas en tiempo real
  const alerts = await detectAlertsForTimeEntry(timeEntry.id);

  return {
    success: true,
    timeEntry,
    alerts, // Retornar alertas al cliente
  };
}
```

### 4.2 Integración en clockOut()

```typescript
// En /src/server/actions/time-tracking.ts
export async function clockOut(...) {
  // ... lógica existente de clockOut ...

  // DESPUÉS de actualizar timeEntry
  const timeEntry = await prisma.timeEntry.update({ ... });

  // Detectar alertas en tiempo real
  const alerts = await detectAlertsForTimeEntry(timeEntry.id);

  return {
    success: true,
    timeEntry,
    alerts, // Retornar alertas al cliente
  };
}
```

### 4.3 Mostrar Alertas en UI (Futuro)

```typescript
// En componente de fichaje
const handleClockIn = async () => {
  const result = await clockIn();

  if (result.alerts && result.alerts.length > 0) {
    // Mostrar toast con alertas generadas
    result.alerts.forEach(alert => {
      toast({
        title: alert.title,
        description: alert.description,
        variant: alert.severity === "CRITICAL" ? "destructive" : "default",
      });
    });
  }
};
```

---

## 5. Cron Job para Detección Batch (Futuro)

### 5.1 Configuración del Cron

```typescript
// /src/app/api/cron/detect-alerts/route.ts
export async function GET(request: Request) {
  // Verificar API key para seguridad
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Obtener todos los empleados activos
  const employees = await prisma.employee.findMany({
    where: { active: true },
    select: { id: true },
  });

  // Detectar alertas para ayer (día completo)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  for (const employee of employees) {
    await detectAlertsForDate(employee.id, yesterday);
  }

  return new Response('OK', { status: 200 });
}
```

### 5.2 Configuración en Vercel Cron

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/detect-alerts",
    "schedule": "0 23 * * *"  // 23:00 todos los días
  }]
}
```

---

## 6. Sistema de Permisos y Ámbitos

### 6.1 Contexto Activo para Usuarios Multi-Ámbito

Un usuario puede tener múltiples responsabilidades:
- RRHH → Ámbito ORGANIZATION (ve todo)
- Manager Centro A → Ámbito COST_CENTER (ve solo su centro)
- Manager Centro B → Ámbito COST_CENTER (ve solo su centro)

**Solución: Dropdown selector en navbar**

```typescript
// Estado en cliente
const [activeContext, setActiveContext] = useState({
  scope: "ORGANIZATION",  // o "COST_CENTER"
  costCenterId: null,     // o "cuid123" si es COST_CENTER
});

// Al cambiar contexto, recargar datos del dashboard
useEffect(() => {
  loadAlerts(activeContext);
}, [activeContext]);
```

### 6.2 Reglas de Acceso al Dashboard

```typescript
// Verificar permisos antes de mostrar dashboard
const canViewAlerts = await checkPermission(
  userId,
  "VIEW_ALERTS",
  activeContext.scope,
  activeContext.costCenterId
);

if (!canViewAlerts) {
  return <UnauthorizedPage />;
}
```

### 6.3 Filtrado Automático por Ámbito

```typescript
// Al obtener alertas, filtrar automáticamente por ámbito activo
const alerts = await getActiveAlerts({
  ...(activeContext.scope === "COST_CENTER" && {
    costCenterId: activeContext.costCenterId,
  }),
});
```

---

## 7. Sistema de Notificaciones (Futuro)

### 7.1 Modelo de Notificación In-App

```typescript
// Extender modelo existente PtoNotification o crear AlertNotification
model AlertNotification {
  id        String   @id @default(cuid())
  userId    String
  alertId   String
  isRead    Boolean  @default(false)
  readAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  alert Alert @relation(fields: [alertId], references: [id])

  @@unique([userId, alertId])
}
```

### 7.2 Lógica de Notificación

```typescript
// Después de crear alerta
async function notifySubscribers(alert: Alert) {
  // 1. Obtener subscripciones activas para el ámbito
  const subscriptions = await prisma.alertSubscription.findMany({
    where: {
      orgId: alert.orgId,
      isActive: true,
      isDisabled: false,
      scope: alert.costCenterId ? "COST_CENTER" : "ORGANIZATION",
      ...(alert.costCenterId && { costCenterId: alert.costCenterId }),

      // Filtrar por tipo y severidad
      OR: [
        { alertTypes: { isEmpty: true } },  // Sin filtro = todas
        { alertTypes: { has: alert.type } },
      ],
    },
  });

  // 2. Aplicar reglas de prioridad (ver doc SISTEMA_PERMISOS_Y_AMBITOS.md)
  const prioritizedUsers = applySubscriptionPriority(subscriptions);

  // 3. Crear notificaciones in-app
  for (const userId of prioritizedUsers) {
    await prisma.alertNotification.create({
      data: { userId, alertId: alert.id },
    });
  }

  // 4. Enviar emails si configurado
  const emailSubscriptions = subscriptions.filter(s => s.notifyByEmail);
  for (const sub of emailSubscriptions) {
    await sendAlertEmail(sub.user.email, alert);
  }
}
```

### 7.3 Contador en Navbar

```typescript
// Hook para obtener alertas no leídas
export function useUnreadAlertCount() {
  const { data } = useSWR('/api/alerts/unread-count', fetcher, {
    refreshInterval: 60000, // Actualizar cada minuto
  });

  return data?.count ?? 0;
}

// En navbar
<Bell className="h-5 w-5" />
{unreadCount > 0 && (
  <Badge variant="destructive" className="absolute -top-1 -right-1">
    {unreadCount}
  </Badge>
)}
```

---

## 8. Colores y Severidad en UI

### 8.1 Esquema de Colores

```typescript
const severityConfig = {
  INFO: {
    color: "blue",
    icon: InfoIcon,
    badge: "default",
  },
  WARNING: {
    color: "yellow",
    icon: AlertTriangleIcon,
    badge: "warning",
  },
  CRITICAL: {
    color: "red",
    icon: AlertCircleIcon,
    badge: "destructive",
  },
};
```

### 8.2 Badges en Componentes

```tsx
// Badge de severidad
<Badge variant={severityConfig[alert.severity].badge}>
  {alert.severity}
</Badge>

// Badge de tipo
<Badge variant="outline">{alert.type.replace(/_/g, ' ')}</Badge>

// Badge de estado
<Badge variant={alert.status === "ACTIVE" ? "default" : "secondary"}>
  {alert.status}
</Badge>
```

---

## 9. Archivado y Performance

### 9.1 Estrategia de Archivado

```sql
-- Crear tabla de archivo (ejecutar manualmente)
CREATE TABLE alerts_archive AS SELECT * FROM alerts WHERE 1=0;

-- Cron mensual para archivar alertas resueltas >90 días
INSERT INTO alerts_archive
SELECT * FROM alerts
WHERE status IN ('RESOLVED', 'DISMISSED')
  AND resolved_at < NOW() - INTERVAL '90 days';

DELETE FROM alerts
WHERE status IN ('RESOLVED', 'DISMISSED')
  AND resolved_at < NOW() - INTERVAL '90 days';
```

### 9.2 Índices para Performance

Ya implementados en schema:

```prisma
@@index([orgId])
@@index([employeeId])
@@index([costCenterId])
@@index([status])
@@index([severity])
@@index([type])
@@index([date])
@@index([createdAt])

// Composite indices para queries comunes
@@index([orgId, status, severity])
@@index([costCenterId, status, date])
@@index([employeeId, date, type])  // Deduplicación
```

---

## 10. Testing y Validación

### 10.1 Test de Detección en Tiempo Real

```typescript
// test/alert-detection.test.ts
describe('detectAlertsForTimeEntry', () => {
  it('debe detectar LATE_ARRIVAL cuando llegada >15min tarde', async () => {
    // Crear horario: entrada a 09:00
    // Crear fichaje: entrada a 09:20
    // Ejecutar detección
    const alerts = await detectAlertsForTimeEntry(timeEntryId);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('LATE_ARRIVAL');
    expect(alerts[0].severity).toBe('WARNING');
    expect(alerts[0].deviationMinutes).toBe(20);
  });

  it('debe detectar CRITICAL_LATE_ARRIVAL cuando >30min tarde', async () => {
    // Similar pero con 35min de retraso
    expect(alerts[0].type).toBe('CRITICAL_LATE_ARRIVAL');
    expect(alerts[0].severity).toBe('CRITICAL');
  });
});
```

### 10.2 Test de Deduplicación

```typescript
it('no debe crear alerta duplicada en segunda ejecución', async () => {
  // Primera ejecución
  await detectAlertsForTimeEntry(timeEntryId);
  const count1 = await prisma.alert.count();

  // Segunda ejecución (mismo fichaje)
  await detectAlertsForTimeEntry(timeEntryId);
  const count2 = await prisma.alert.count();

  expect(count1).toBe(count2); // Mismo número de alertas
});
```

---

## 11. Próximos Pasos

### Fase 3: Integración con Fichajes
- [ ] Modificar `clockIn()` para llamar `detectAlertsForTimeEntry()`
- [ ] Modificar `clockOut()` para llamar `detectAlertsForTimeEntry()`
- [ ] Retornar alertas al cliente en respuesta
- [ ] Mostrar toasts con alertas generadas

### Fase 4: Dashboard de Alertas
- [ ] Crear página `/dashboard/time-tracking/alerts`
- [ ] DataTable con TanStack Table
- [ ] Tabs: Activas, Resueltas, Descartadas
- [ ] Filtros: severidad, tipo, empleado, centro, fecha
- [ ] Acciones: resolver, descartar, ver detalles
- [ ] Modal de detalle de alerta

### Fase 5: Indicadores Visuales
- [ ] Badge de alerta en DayCard del calendario
- [ ] Columna de alertas en tabla de empleados
- [ ] Iconos de severidad con colores

### Fase 6: Notificaciones
- [ ] Contador en navbar
- [ ] Lista desplegable de alertas no leídas
- [ ] Marcar como leída
- [ ] Opcional: emails

### Fase 7: Permisos y Ámbitos
- [ ] Middleware de permisos para dashboard
- [ ] Dropdown selector de contexto activo
- [ ] Filtrado automático por ámbito

### Fase 8: Cron Job
- [ ] Endpoint `/api/cron/detect-alerts`
- [ ] Configurar Vercel Cron
- [ ] Logging y monitoreo

---

## 12. Referencias

- **Prisma Schema:** `/prisma/schema.prisma` (líneas 2038-2201)
- **Server Actions:** `/src/server/actions/alert-detection.ts`
- **Configuración:** `/src/server/actions/time-clock-validations.ts`
- **Documentación Arquitectura:** `/docs/SISTEMA_PERMISOS_Y_AMBITOS.md`
- **Motor de Horarios:** `/src/lib/schedule-engine.ts`

---

**Autor:** Sistema ERP TimeNow
**Versión:** 1.0.0 (MVP V1)
**Fecha:** 2025-11-19
