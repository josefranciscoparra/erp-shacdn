# ERP RRHH Básico (Multi‑tenant) — Plan en Markdown

> **Objetivo**: entregar la versión mínima viable para **gestión de empleados, control horario, vacaciones/ausencias, exportación a nómina y notificaciones**, sin biometría ni funcionalidades avanzadas.

---

## 1) Alcance funcional (MVP)

### 1.1 Gestión de Empleados

- Ficha completa: datos personales, contacto, dirección, emergencia.
- Datos contractuales: tipo contrato, jornada semanal, centro, departamento, puesto, responsable.
- Estructura organizativa: **multi‑empresa**, **multi‑centro**, departamentos, puestos.
- Importación masiva **CSV**.
- Documentos básicos por empleado: contrato, nómina (subida y descarga).
- Validaciones mínimas: NIF/NIE, email, IBAN.

### 1.2 Control Horario / Fichajes

- **Fichaje Web**: Entrada / Salida / Pausa.
- **Modo Kiosco** por centro: PIN de 4 dígitos.
- Reglas básicas: tolerancia ±N minutos configurable por centro.
- Cálculo automático por día: horas trabajadas, horas extra, nocturnas (22:00–06:00) y festivos.
- Cuadrantes simples (asignación de turnos fijos/rotativos y publicación básica).
- Incidencias: IN sin OUT, solapes, fuera de horario.

> _Sin biometría, sin reconocimiento facial. Geolocalización/IP opcional (solo registro informativo)._

### 1.3 Vacaciones y Ausencias (PTO)

- Tipos configurables: vacaciones, enfermedad, asuntos propios, médico.
- **Saldos**: devengo anual/prorrata y arrastre con límite.
- **Flujo de aprobación** simple: Empleado → Manager (→ HR opcional).
- Validaciones: saldo suficiente, antelación mínima, solapes en equipo.
- Calendario de equipo (lectura). Adjuntos/justificantes en solicitudes.

### 1.4 Exportación a Nómina

- Export **CSV/Excel** por periodo/centro/empleado.
- Totales: **normales**, **nocturnas**, **festivos**, **extras**; días de ausencia por tipo.
- **Mapeo configurable** de conceptos (códigos de nómina).

### 1.5 Notificaciones

- **In‑app** + **Email** (SMTP).
- Eventos: creación/aprobación PTO, incidencias de fichaje, publicación de cuadrante.
- Plantillas sencillas con variables (ES/EN).

---

## 2) Arquitectura mínima

- **Frontend**: Next.js (App Router), shadcn/ui + Tailwind, TanStack Query, React Hook Form + Zod.
- **Auth**: NextAuth (OIDC opcional), sesiones JWT.
- **API**: tRPC (o REST con rutas Next API) con validaciones Zod.
- **Datos**: PostgreSQL + Prisma.
- **Almacenamiento**: Azure Blob (o S3 compatible) para documentos/fotos.
- **Jobs**: cron en server (p.ej. `node-cron` o colas ligeras) para devengos PTO y exports.
- **Observabilidad**: logs estructurados + audit log básico.

**No requerido en MVP**: colas distribuidas, BI avanzado, ETL, firma electrónica, SSO enterprise, ATS/LMS, biometría.

---

## 3) Modelo de datos (mínimo)

```mermaid
erDiagram
  Organization ||--o{ CostCenter : has
  Organization ||--o{ Department : has
  Organization ||--o{ User : has
  User ||--|| Employee : may_link
  Employee ||--o{ EmploymentContract : has
  Employee ||--o{ TimeEntry : records
  Employee ||--o{ WorkdaySummary : consolidates
  Employee ||--o{ PtoBalance : has
  Employee ||--o{ PtoRequest : submits
  WorkdaySummary }o--o{ PayrollExport : aggregates
```

**Tablas clave (campos esenciales):**

- `organization(id, name, vat)`
- `cost_center(id, org_id, name, timezone)`
- `department(id, org_id, name, cost_center_id)`
- `user(id, org_id, email, password_hash, role, status)`
- `employee(id, org_id, user_id?, first_name, last_name, nif_nie, iban_enc, photo_url)`
- `employment_contract(id, employee_id, type, start_date, end_date?, weekly_hours, position, manager_employee_id, cost_center_id)`
- `work_calendar(id, org_id, scope, scope_ref_id?, name)`
- `holiday(id, work_calendar_id, date, label, region_code)`
- `time_entry(id, employee_id, type: IN|OUT|BREAK_IN|BREAK_OUT, ts_utc, source: WEB|KIOSK, ip?)`
- `workday_summary(id, employee_id, date, worked_min, overtime_min, night_min, holiday_min, incidents_json)`
- `absence_type(id, org_id, name, requires_proof, color)`
- `pto_policy(id, org_id, accrual: ANNUAL|PRORATA, carryover_limit_days)`
- `pto_balance(id, employee_id, type_id, year, accrued_days, used_days, carryover_days)`
- `pto_request(id, employee_id, type_id, start_date, end_date, days, status, approver_id, attachments_json)`
- `employee_document(id, employee_id, kind: CONTRACT|PAYSLIP|JUSTIFICATION, storage_url, version)`
- `notification(id, org_id, recipient_user_id, channel: INAPP|EMAIL, template_key, payload_json, status, created_at)`
- `audit_log(id, org_id, actor_user_id, action, entity, entity_id, ts, ip, meta_json)`

> Fechas/horas siempre en **UTC** en BD. Timezone por _centro_ para mostrar y clasificar nocturnidad.

---

## 4) API mínima (tRPC/REST)

- **Org/Estructura**: `org/*`, `cost-centers/*`, `departments/*`
- **Empleados**: `employees/*` (CRUD, import CSV), `contracts/*`, `documents/*`
- **Calendarios**: `calendars/*`, `holidays/*`
- **Fichaje**: `time-clock/in`, `time-clock/out`, `time-clock/break-in`, `time-clock/break-out`, `workdays/:date` (GET)
- **Cuadrantes**: `shifts/*` (asignar/publicar básico)
- **PTO**: `pto/types/*`, `pto/policies/*`, `pto/balances/*`, `pto/requests/*`
- **Nómina**: `payroll/exports` (POST: generar; GET: descargar)
- **Notificaciones**: `notifications/*` (listar, marcar leído)

Validar **org_id** en todas las rutas.

---

## 5) Reglas de negocio (esenciales)

### Fichaje y jornada

- Secuencias válidas: `IN → (BREAK_IN → BREAK_OUT)* → OUT`.
- Redondeo configurable (p.ej., 5 min). Incidencia si falta OUT al finalizar el día.
- Clasificación: nocturnas (22:00–06:00 local), festivo por calendario, extras = worked – jornada pactada.
- Corrección manual permitida (si rol Manager/HR) con audit log.

### PTO

- Devengo: anual o prorrata mensual; arrastre con tope.
- Aprobación: manager (HR opcional). Bloqueos por solape en equipo y antelación mínima.
- Saldos se recalculan en job diario (madrugada).

### Export a nómina

- Considera **solo días consolidados** (workday_summary).
- Mapeo a conceptos configurable por organización.
- Genera CSV/Excel para rango de fechas y centro.

### Notificaciones

- In‑app para eventos clave

---

## 6) Tenancy y Seguridad

### Aislamiento por organización (RLS)

```sql
-- Habilitar RLS por tabla multi-tenant
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee
USING (org_id = current_setting('app.current_org_id')::uuid);
```

En cada request/middleware:

```ts
await prisma.$executeRawUnsafe(`SET app.current_org_id = '${orgId}'`);
```

> Mantén **guardas en app** (middleware) además de RLS.

### Otras medidas mínimas

- **RBAC**: SuperAdmin, OrgAdmin, HR, Manager, Employee.
- **Cifrado** de datos sensibles (IBAN) a nivel de app (AES‑256; clave en Key Vault).
- **Rate limiting** por usuario y endpoint sensible (login, fichaje, export).
- **Audit log** para cambios críticos y correcciones de fichaje.
- **Backups** automáticos (PITR) + prueba de restauración mensual.

---

## 7) Roadmap (4 sprints / ~5–6 semanas)

- **Sprint 0 — Fundaciones (1 sem):**
  - Tenancy + RBAC + Auth. Esquema BD + migraciones. Upload a Blob. Audit log.

- **Sprint 1 — RRHH (1.5 sem):**
  - CRUD Empleados + Contratos + Estructura (Org/Centros/Deptos). Import CSV.
  - Calendarios y festivos.

- **Sprint 2 — Fichajes (1.5 sem):**
  - Reloj web + Kiosco PIN. Cálculo de jornada + incidencias. Cuadrantes básicos.

- **Sprint 3 — PTO + Nómina + Notifs (1–2 sem):**
  - Saldos/devengos, solicitudes y aprobaciones, calendario equipo.
  - Export CSV/Excel.
  - Notificaciones in‑app + email.

---

## 8) Variables de entorno (mínimas)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/erp_dev
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=xxxx
ENCRYPTION_KEY=32_chars_random_secret
SMTP_URL=smtp://user:pass@smtp.host:587
BLOB_CONNECTION_STRING=
```

---

## 9) Checklist pre‑deploy

- [ ] Migraciones Prisma aplicadas y seeds de demo.
- [ ] Auth + RBAC + RLS verificados.
- [ ] Upload/descarga de documentos OK.
- [ ] Jobs de devengo y consolidación ejecutándose.
- [ ] Export nómina valida dataset de prueba.
- [ ] Logs y audit log visibles.
- [ ] Backups y restore probados.

---

## 10) KPIs básicos

- **Puntualidad** (% entradas dentro de tolerancia).
- **Horas extra** por centro/depto.
- **Uso PTO** (usado vs devengado).
- **SLA aprobaciones** (tiempo medio).

---

## 11) Fuera de alcance (v1)

Biometría/face‑match, liveness, geofencing obligatorio, SSO enterprise, firma electrónica, ATS/LMS, BI avanzado, apps móviles nativas, plantillas complejas de workflows, integraciones de nómina por API propietaria.
