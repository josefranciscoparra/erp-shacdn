# 📚 ERP Implementation Guide - Part 2: Modelos y API

## 📊 Schema Prisma Completo

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== CORE MODELS ====================

model Organization {
  id          String   @id @default(cuid())
  name        String
  vat         String?  @unique
  logo        String?
  timezone    String   @default("Europe/Madrid")
  locale      String   @default("es")
  active      Boolean  @default(true)
  settings    Json     @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users         User[]
  costCenters   CostCenter[]
  departments   Department[]
  positions     Position[]
  employees     Employee[]
  workCalendars WorkCalendar[]
  absenceTypes  AbsenceType[]
  shiftPatterns ShiftPattern[]
  auditLogs     AuditLog[]

  @@index([vat])
  @@map("organizations")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(EMPLOYEE)
  emailVerified DateTime?
  image         String?
  active        Boolean   @default(true)
  lastLogin     DateTime?
  failedAttempts Int      @default(0)
  lockedUntil   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  orgId         String
  organization  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  employee      Employee?
  sessions      Session[]
  auditLogs     AuditLog[]

  @@index([email])
  @@index([orgId])
  @@map("users")
}

model Employee {
  id           String   @id @default(cuid())
  employeeCode String
  firstName    String
  lastName     String
  email        String
  phone        String?
  nifNie       String   @db.VarChar(20)
  birthDate    DateTime @db.Date

  // Dirección
  address      String?
  city         String?
  province     String?
  postalCode   String?  @db.VarChar(10)
  country      String   @default("ES")

  // Datos bancarios (encriptados)
  iban         String?
  swiftBic     String?

  // Contacto emergencia
  emergencyName  String?
  emergencyPhone String?
  emergencyRelation String?

  // Archivos
  photoUrl     String?

  // Estado
  status       EmployeeStatus @default(ACTIVE)
  hireDate     DateTime @db.Date
  endDate      DateTime? @db.Date

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Usuario del sistema
  userId       String?  @unique
  user         User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Estructura organizativa
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)

  positionId   String?
  position     Position? @relation(fields: [positionId], references: [id], onDelete: SetNull)

  costCenterId String?
  costCenter   CostCenter? @relation(fields: [costCenterId], references: [id], onDelete: SetNull)

  // Jerarquía
  managerId    String?
  manager      Employee? @relation("EmployeeManager", fields: [managerId], references: [id], onDelete: SetNull)
  subordinates Employee[] @relation("EmployeeManager")

  // Relaciones
  contracts        EmploymentContract[]
  timeEntries      TimeEntry[]
  workdaySummaries WorkdaySummary[]
  ptoBalances      PtoBalance[]
  ptoRequests      PtoRequest[]
  ptoApprovals     PtoRequest[] @relation("PtoApprover")
  documents        EmployeeDocument[]
  rotaAssignments  RotaAssignment[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([orgId, employeeCode])
  @@unique([orgId, nifNie])
  @@index([orgId])
  @@index([email])
  @@index([status])
  @@map("employees")
}

// ==================== ORGANIZATIONAL STRUCTURE ====================

model CostCenter {
  id           String   @id @default(cuid())
  code         String   @db.VarChar(20)
  name         String   @db.VarChar(100)
  description  String?
  location     String?
  address      String?
  timezone     String   @default("Europe/Madrid")
  active       Boolean  @default(true)

  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  employees    Employee[]
  departments  Department[]
  terminals    TimeClockTerminal[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([orgId, code])
  @@index([orgId])
  @@map("cost_centers")
}

model Department {
  id           String   @id @default(cuid())
  code         String   @db.VarChar(20)
  name         String   @db.VarChar(100)
  description  String?
  active       Boolean  @default(true)

  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  costCenterId String?
  costCenter   CostCenter? @relation(fields: [costCenterId], references: [id], onDelete: SetNull)

  parentId     String?
  parent       Department? @relation("DepartmentHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  children     Department[] @relation("DepartmentHierarchy")

  employees    Employee[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([orgId, code])
  @@index([orgId])
  @@map("departments")
}

model Position {
  id           String   @id @default(cuid())
  code         String   @db.VarChar(20)
  name         String   @db.VarChar(100)
  description  String?
  level        Int?
  minSalary    Decimal? @db.Decimal(10, 2)
  maxSalary    Decimal? @db.Decimal(10, 2)
  active       Boolean  @default(true)

  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  employees    Employee[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([orgId, code])
  @@index([orgId])
  @@map("positions")
}

// ==================== CONTRACTS & CALENDARS ====================

model EmploymentContract {
  id            String   @id @default(cuid())
  contractNumber String?

  employeeId    String
  employee      Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  type          ContractType
  startDate     DateTime @db.Date
  endDate       DateTime? @db.Date
  probationEndDate DateTime? @db.Date

  weeklyHours   Decimal  @db.Decimal(4, 2)
  annualSalary  Decimal? @db.Decimal(10, 2)

  workSchedule  Json?    // {"monday": {"start": "09:00", "end": "18:00"}, ...}

  shiftPatternId String?
  shiftPattern   ShiftPattern? @relation(fields: [shiftPatternId], references: [id], onDelete: SetNull)

  vacationDays  Int      @default(22)

  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([employeeId])
  @@index([active])
  @@map("employment_contracts")
}

model WorkCalendar {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(100)
  year        Int
  scope       CalendarScope
  scopeRefId  String?

  orgId       String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  holidays    Holiday[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([orgId, year, scope, scopeRefId])
  @@index([orgId])
  @@index([year])
  @@map("work_calendars")
}

model Holiday {
  id           String   @id @default(cuid())
  date         DateTime @db.Date
  name         String   @db.VarChar(100)
  type         HolidayType
  recurring    Boolean  @default(false)

  calendarId   String
  calendar     WorkCalendar @relation(fields: [calendarId], references: [id], onDelete: Cascade)

  @@unique([calendarId, date])
  @@index([calendarId])
  @@index([date])
  @@map("holidays")
}

// ==================== TIME TRACKING ====================

model TimeClockTerminal {
  id           String   @id @default(cuid())
  name         String   @db.VarChar(100)
  description  String?
  mode         TerminalMode
  pinRequired  Boolean  @default(false)
  photoRequired Boolean @default(false)

  ipWhitelist  String[] @default([])
  geoFence     Json?    // {lat, lng, radius}

  costCenterId String
  costCenter   CostCenter @relation(fields: [costCenterId], references: [id], onDelete: Cascade)

  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  timeEntries  TimeEntry[]

  @@index([costCenterId])
  @@map("time_clock_terminals")
}

model TimeEntry {
  id          String   @id @default(cuid())

  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  type        TimeEntryType
  timestamp   DateTime
  source      EntrySource

  terminalId  String?
  terminal    TimeClockTerminal? @relation(fields: [terminalId], references: [id], onDelete: SetNull)

  ipAddress   String?
  userAgent   String?
  geoLocation Json?
  photoUrl    String?

  isValid     Boolean  @default(true)
  validationErrors String[] @default([])

  notes       String?
  editedBy    String?
  editedAt    DateTime?

  createdAt   DateTime @default(now())

  antiFraudChecks AntiFraudCheck[]

  @@index([employeeId, timestamp])
  @@index([timestamp])
  @@index([type])
  @@map("time_entries")
}

model WorkdaySummary {
  id             String   @id @default(cuid())

  employeeId     String
  employee       Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  date           DateTime @db.Date

  scheduledMinutes Int    @default(0)
  workedMinutes    Int    @default(0)
  breakMinutes     Int    @default(0)
  overtimeMinutes  Int    @default(0)
  nightMinutes     Int    @default(0)
  holidayMinutes   Int    @default(0)

  firstEntry     DateTime?
  lastExit       DateTime?

  status         WorkdayStatus
  incidents      Json[]   @default([])

  approved       Boolean  @default(false)
  approvedBy     String?
  approvedAt     DateTime?

  exported       Boolean  @default(false)
  exportedAt     DateTime?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([employeeId, date])
  @@index([employeeId])
  @@index([date])
  @@index([status])
  @@map("workday_summaries")
}

model AntiFraudCheck {
  id          String   @id @default(cuid())

  timeEntryId String
  timeEntry   TimeEntry @relation(fields: [timeEntryId], references: [id], onDelete: Cascade)

  checkType   FraudCheckType
  result      CheckResult
  score       Decimal? @db.Decimal(3, 2)
  details     Json

  createdAt   DateTime @default(now())

  @@index([timeEntryId])
  @@index([checkType])
  @@map("antifraud_checks")
}

// ==================== SHIFTS & SCHEDULES ====================

model ShiftPattern {
  id          String   @id @default(cuid())
  code        String   @db.VarChar(20)
  name        String   @db.VarChar(100)
  description String?
  type        ShiftType

  rotationDays Int?    @default(7)

  orgId       String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  slots       ShiftPatternSlot[]
  contracts   EmploymentContract[]

  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([orgId, code])
  @@index([orgId])
  @@map("shift_patterns")
}

model ShiftPatternSlot {
  id           String   @id @default(cuid())

  patternId    String
  pattern      ShiftPattern @relation(fields: [patternId], references: [id], onDelete: Cascade)

  dayOfWeek    Int
  startTime    String   @db.VarChar(5)
  endTime      String   @db.VarChar(5)
  breakMinutes Int      @default(0)

  @@index([patternId])
  @@map("shift_pattern_slots")
}

model RotaAssignment {
  id          String   @id @default(cuid())

  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  date        DateTime @db.Date
  startTime   DateTime
  endTime     DateTime
  breakMinutes Int     @default(0)

  published   Boolean  @default(false)
  publishedAt DateTime?

  swapRequestedWith String?
  swapApproved Boolean @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([employeeId, date])
  @@index([employeeId])
  @@index([date])
  @@map("rota_assignments")
}

// ==================== PTO & ABSENCES ====================

model AbsenceType {
  id             String   @id @default(cuid())
  code           String   @db.VarChar(20)
  name           String   @db.VarChar(100)
  description    String?

  requiresProof  Boolean  @default(false)
  affectsSalary  Boolean  @default(false)
  isPaid         Boolean  @default(true)
  isVacation     Boolean  @default(false)

  maxDaysPerYear Int?
  minNoticeDays  Int      @default(0)

  color          String   @default("#6B7280")
  icon           String?

  orgId          String
  organization   Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  ptoRequests    PtoRequest[]

  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([orgId, code])
  @@index([orgId])
  @@map("absence_types")
}

model PtoBalance {
  id          String   @id @default(cuid())

  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  year        Int
  typeId      String

  accruedDays   Decimal  @default(0) @db.Decimal(5, 2)
  usedDays      Decimal  @default(0) @db.Decimal(5, 2)
  pendingDays   Decimal  @default(0) @db.Decimal(5, 2)
  carryoverDays Decimal  @default(0) @db.Decimal(5, 2)
  adjustmentDays Decimal @default(0) @db.Decimal(5, 2)

  lastAccrualDate DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([employeeId, year, typeId])
  @@index([employeeId])
  @@index([year])
  @@map("pto_balances")
}

model PtoRequest {
  id           String   @id @default(cuid())
  requestNumber String

  employeeId   String
  employee     Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  typeId       String
  type         AbsenceType @relation(fields: [typeId], references: [id])

  startDate    DateTime @db.Date
  endDate      DateTime @db.Date
  startPeriod  PtoPeriod @default(FULL_DAY)
  endPeriod    PtoPeriod @default(FULL_DAY)

  totalDays    Decimal  @db.Decimal(5, 2)

  reason       String?  @db.Text
  attachments  String[] @default([])

  status       PtoStatus @default(PENDING)

  approverId   String?
  approver     Employee? @relation("PtoApprover", fields: [approverId], references: [id], onDelete: SetNull)
  approvedAt   DateTime?
  approverNotes String?

  cancelledBy  String?
  cancelledAt  DateTime?
  cancelReason String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([employeeId, requestNumber])
  @@index([employeeId])
  @@index([status])
  @@index([startDate, endDate])
  @@map("pto_requests")
}

// ==================== DOCUMENTS & FILES ====================

model EmployeeDocument {
  id          String   @id @default(cuid())

  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  type        DocumentType
  category    String?
  name        String   @db.VarChar(255)
  description String?

  storageUrl  String
  size        Int
  mimeType    String   @db.VarChar(100)

  validFrom   DateTime? @db.Date
  validUntil  DateTime? @db.Date

  isConfidential Boolean @default(false)

  uploadedBy  String
  createdAt   DateTime @default(now())

  @@index([employeeId])
  @@index([type])
  @@map("employee_documents")
}

// ==================== AUDIT & SECURITY ====================

model AuditLog {
  id          String   @id @default(cuid())

  action      String   @db.VarChar(100)
  entityType  String?  @db.VarChar(50)
  entityId    String?

  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  orgId       String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  metadata    Json?

  ip          String?
  userAgent   String?

  timestamp   DateTime @default(now())

  @@index([orgId])
  @@index([userId])
  @@index([action])
  @@index([timestamp])
  @@map("audit_logs")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

// ==================== ENUMS ====================

enum Role {
  SUPER_ADMIN
  ORG_ADMIN
  HR_ADMIN
  MANAGER
  EMPLOYEE
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE
  TERMINATED
}

enum ContractType {
  PERMANENT
  TEMPORARY
  INTERNSHIP
  FREELANCE
  CONTRACTOR
}

enum CalendarScope {
  ORGANIZATION
  COST_CENTER
  DEPARTMENT
  TEAM
  PERSON
}

enum HolidayType {
  NATIONAL
  REGIONAL
  LOCAL
  COMPANY
  FLOATING
}

enum TerminalMode {
  KIOSK
  WEB
  MOBILE
  BIOMETRIC
}

enum TimeEntryType {
  IN
  OUT
  BREAK_START
  BREAK_END
}

enum EntrySource {
  WEB
  KIOSK
  MOBILE
  MANUAL
  IMPORT
  API
}

enum WorkdayStatus {
  COMPLETE
  INCOMPLETE
  MISSING_IN
  MISSING_OUT
  HOLIDAY
  ABSENCE
  ERROR
}

enum FraudCheckType {
  SELFIE
  IP_CHECK
  GEO_FENCE
  TOLERANCE
  DUPLICATE
  PATTERN
}

enum CheckResult {
  PASS
  FAIL
  WARNING
  SKIP
}

enum ShiftType {
  FIXED
  ROTATING
  FLEXIBLE
  NIGHT
  SPLIT
}

enum PtoStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum PtoPeriod {
  FULL_DAY
  MORNING
  AFTERNOON
}

enum DocumentType {
  CONTRACT
  PAYSLIP
  ID_DOCUMENT
  TAX_FORM
  CERTIFICATE
  MEDICAL
  DISCIPLINARY
  OTHER
}
```

## 🔌 API con tRPC - Routers Completos

### Root Router

```typescript
// src/server/api/root.ts
import { createTRPCRouter } from "@/server/api/trpc";
import { organizationRouter } from "./routers/organization";
import { employeeRouter } from "./routers/employee";
import { timeclockRouter } from "./routers/timeclock";
import { ptoRouter } from "./routers/pto";
import { shiftRouter } from "./routers/shift";
import { payrollRouter } from "./routers/payroll";
import { reportRouter } from "./routers/report";
import { settingsRouter } from "./routers/settings";

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  employee: employeeRouter,
  timeclock: timeclockRouter,
  pto: ptoRouter,
  shift: shiftRouter,
  payroll: payrollRouter,
  report: reportRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
```

### Employee Router

```typescript
// src/server/api/routers/employee.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, withPermission } from "@/server/api/trpc";
import { createEmployeeSchema, updateEmployeeSchema } from "@/lib/validations/employee";
import { TRPCError } from "@trpc/server";

export const employeeRouter = createTRPCRouter({
  // Listar empleados con paginación y filtros
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        departmentId: z.string().optional(),
        costCenterId: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]).optional(),
        sortBy: z.enum(["name", "code", "hireDate", "department"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, ...filters } = input;

      const where = {
        orgId: ctx.orgId,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { employeeCode: { contains: search, mode: "insensitive" } },
          ],
        }),
        ...(filters.departmentId && { departmentId: filters.departmentId }),
        ...(filters.costCenterId && { costCenterId: filters.costCenterId }),
        ...(filters.status && { status: filters.status }),
      };

      const [total, employees] = await ctx.prisma.$transaction([
        ctx.prisma.employee.count({ where }),
        ctx.prisma.employee.findMany({
          where,
          include: {
            department: true,
            position: true,
            costCenter: true,
            user: {
              select: { email: true, role: true },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: {
            [input.sortBy]: input.sortOrder,
          },
        }),
      ]);

      return {
        employees,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Obtener empleado por ID
  getById: protectedProcedure.input(z.string().cuid()).query(async ({ ctx, input }) => {
    const employee = await ctx.prisma.employee.findFirst({
      where: {
        id: input,
        orgId: ctx.orgId,
      },
      include: {
        department: true,
        position: true,
        costCenter: true,
        manager: true,
        subordinates: true,
        contracts: {
          orderBy: { startDate: "desc" },
          take: 1,
        },
        user: {
          select: { email: true, role: true, lastLogin: true },
        },
      },
    });

    if (!employee) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Empleado no encontrado",
      });
    }

    // Verificar permisos
    const canViewAll = await ctx.can("EMPLOYEE_VIEW_ALL");
    const canViewOwn = await ctx.can("EMPLOYEE_VIEW_OWN");

    if (!canViewAll && (!canViewOwn || employee.userId !== ctx.session.user.id)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Sin permisos para ver este empleado",
      });
    }

    return employee;
  }),

  // Crear empleado
  create: protectedProcedure
    .use(withPermission("EMPLOYEE_CREATE"))
    .input(createEmployeeSchema)
    .mutation(async ({ ctx, input }) => {
      // Verificar duplicados
      const existing = await ctx.prisma.employee.findFirst({
        where: {
          orgId: ctx.orgId,
          OR: [{ nifNie: input.nifNie }, { email: input.email }, { employeeCode: input.employeeCode }],
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un empleado con ese NIF/NIE, email o código",
        });
      }

      // Crear empleado con transacción
      const employee = await ctx.prisma.$transaction(async (tx) => {
        // Crear empleado
        const emp = await tx.employee.create({
          data: {
            ...input,
            orgId: ctx.orgId,
            iban: input.iban ? encrypt(input.iban) : null,
          },
        });

        // Crear usuario si se proporciona
        if (input.createUser) {
          const hashedPassword = await hashPassword(input.password || generatePassword());

          await tx.user.create({
            data: {
              email: input.email,
              password: hashedPassword,
              name: `${input.firstName} ${input.lastName}`,
              role: input.role || "EMPLOYEE",
              orgId: ctx.orgId,
              employee: {
                connect: { id: emp.id },
              },
            },
          });
        }

        // Crear contrato inicial si se proporciona
        if (input.contract) {
          await tx.employmentContract.create({
            data: {
              ...input.contract,
              employeeId: emp.id,
            },
          });
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            action: "EMPLOYEE_CREATED",
            entityType: "Employee",
            entityId: emp.id,
            userId: ctx.session.user.id,
            orgId: ctx.orgId,
            metadata: { employeeCode: emp.employeeCode },
          },
        });

        return emp;
      });

      return employee;
    }),

  // Actualizar empleado
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        data: updateEmployeeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar que existe y pertenece a la org
      const existing = await ctx.prisma.employee.findFirst({
        where: {
          id: input.id,
          orgId: ctx.orgId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Verificar permisos
      const canUpdateAll = await ctx.can("EMPLOYEE_UPDATE_ALL");
      const canUpdateOwn = await ctx.can("EMPLOYEE_UPDATE_OWN");

      if (!canUpdateAll && (!canUpdateOwn || existing.userId !== ctx.session.user.id)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sin permisos para actualizar este empleado",
        });
      }

      // Actualizar
      const updated = await ctx.prisma.employee.update({
        where: { id: input.id },
        data: {
          ...input.data,
          iban: input.data.iban ? encrypt(input.data.iban) : existing.iban,
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          action: "EMPLOYEE_UPDATED",
          entityType: "Employee",
          entityId: updated.id,
          userId: ctx.session.user.id,
          orgId: ctx.orgId,
          metadata: { changes: input.data },
        },
      });

      return updated;
    }),

  // Eliminar empleado (soft delete)
  delete: protectedProcedure
    .use(withPermission("EMPLOYEE_DELETE"))
    .input(z.string().cuid())
    .mutation(async ({ ctx, input }) => {
      const employee = await ctx.prisma.employee.update({
        where: {
          id: input,
          orgId: ctx.orgId,
        },
        data: {
          status: "TERMINATED",
          endDate: new Date(),
        },
      });

      // Desactivar usuario asociado
      if (employee.userId) {
        await ctx.prisma.user.update({
          where: { id: employee.userId },
          data: { active: false },
        });
      }

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          action: "EMPLOYEE_TERMINATED",
          entityType: "Employee",
          entityId: employee.id,
          userId: ctx.session.user.id,
          orgId: ctx.orgId,
        },
      });

      return { success: true };
    }),

  // Importar empleados desde CSV
  importCSV: protectedProcedure
    .use(withPermission("EMPLOYEE_CREATE"))
    .input(
      z.object({
        data: z.array(createEmployeeSchema),
        skipErrors: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = {
        success: [] as any[],
        errors: [] as any[],
      };

      for (const employee of input.data) {
        try {
          const created = await ctx.prisma.employee.create({
            data: {
              ...employee,
              orgId: ctx.orgId,
            },
          });
          results.success.push(created);
        } catch (error) {
          results.errors.push({
            data: employee,
            error: error.message,
          });

          if (!input.skipErrors) {
            throw error;
          }
        }
      }

      return results;
    }),

  // Obtener organigrama
  getOrgChart: protectedProcedure.query(async ({ ctx }) => {
    const employees = await ctx.prisma.employee.findMany({
      where: {
        orgId: ctx.orgId,
        status: "ACTIVE",
      },
      include: {
        position: true,
        department: true,
      },
    });

    // Construir árbol jerárquico
    const buildTree = (managerId: string | null) => {
      return employees
        .filter((e) => e.managerId === managerId)
        .map((employee) => ({
          ...employee,
          subordinates: buildTree(employee.id),
        }));
    };

    return buildTree(null);
  }),
});
```

---

**Continúa en PART 3: Servicios y Lógica de Negocio →**
