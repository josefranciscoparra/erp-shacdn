# Gestión de Usuarios Administrativos - Documentación Técnica

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Jerarquía de Roles](#jerarquía-de-roles)
4. [Flujos de Creación](#flujos-de-creación)
5. [API Endpoints](#api-endpoints)
6. [Componentes Frontend](#componentes-frontend)
7. [Validación y Schemas](#validación-y-schemas)
8. [Problemas Comunes y Soluciones](#problemas-comunes-y-soluciones)
9. [Ejemplos de Código](#ejemplos-de-código)

---

## Visión General

El sistema de gestión de usuarios administrativos permite a SUPER_ADMIN y ORG_ADMIN crear y gestionar usuarios con roles administrativos (ORG_ADMIN y HR_ADMIN) con dos modalidades distintas:

- **Modo sin empleado**: Para consultores externos, propietarios u otros usuarios que no son empleados de la empresa
- **Modo con empleado**: Para personal de RRHH u otros roles administrativos que sí son empleados de la empresa

### Características Principales

- ✅ Creación dual de usuarios (con/sin perfil de empleado)
- ✅ Validación condicional basada en modo de creación
- ✅ Generación automática de contraseñas temporales (7 días de validez)
- ✅ Sistema de jerarquía de roles estricto
- ✅ Multi-tenancy (aislamiento por organización)
- ✅ Interfaz con formulario condicional reactivo
- ✅ Feedback visual de errores de validación

---

## Arquitectura del Sistema

### Stack Tecnológico

- **Framework**: Next.js 15.5.2 (App Router)
- **ORM**: Prisma con PostgreSQL
- **Validación**: Zod + React Hook Form
- **Autenticación**: NextAuth con cookies
- **UI**: shadcn/ui + Tailwind CSS
- **Hashing**: bcryptjs para contraseñas

### Estructura de Directorios

```
src/
├── app/
│   ├── api/
│   │   └── admin/
│   │       └── users/
│   │           ├── route.ts              # API principal (GET, POST)
│   │           └── [id]/
│   │               └── route.ts          # API por ID (PUT, DELETE)
│   └── (main)/
│       └── dashboard/
│           └── admin/
│               └── users/
│                   ├── page.tsx          # Página principal
│                   └── _components/
│                       ├── create-user-dialog.tsx
│                       ├── users-data-table.tsx
│                       └── users-columns.tsx
├── validators/
│   └── user.ts                           # Schemas Zod
├── lib/
│   ├── role-hierarchy.ts                 # Lógica de jerarquía
│   ├── user-validation.ts                # Validaciones de negocio
│   └── permissions.ts                    # Sistema de permisos
└── navigation/
    └── sidebar/
        └── sidebar-items-translated.tsx  # Menú navegación
```

---

## Jerarquía de Roles

### Niveles de Roles (Mayor a Menor)

```typescript
SUPER_ADMIN     → Nivel 5 (Máximo control global)
ORG_ADMIN       → Nivel 4 (Administrador de organización)
HR_ADMIN        → Nivel 3 (Administrador de RRHH)
MANAGER         → Nivel 2 (Manager de departamento)
EMPLOYEE        → Nivel 1 (Empleado base)
```

### Matriz de Permisos de Creación

| Rol que crea     | Puede crear                    |
| ---------------- | ------------------------------ |
| SUPER_ADMIN      | ORG_ADMIN, HR_ADMIN            |
| ORG_ADMIN        | HR_ADMIN                       |
| HR_ADMIN         | ❌ No puede crear admin roles  |
| MANAGER          | ❌ No puede crear admin roles  |
| EMPLOYEE         | ❌ No puede crear admin roles  |

### Reglas de Negocio

1. **Nadie puede crear un rol igual o superior al suyo**
2. **Solo roles administrativos pueden gestionar usuarios** (`canManageUsers()`)
3. **Los usuarios están aislados por organización** (multi-tenancy estricto)
4. **ORG_ADMIN solo puede crear HR_ADMIN**, no puede crear otro ORG_ADMIN

---

## Flujos de Creación

### Flujo 1: Usuario Sin Empleado

**Caso de uso**: Consultores externos, propietarios, asesores

**Pasos del sistema**:

1. Validar datos básicos (email, nombre, rol)
2. Verificar email único en organización
3. Generar contraseña temporal aleatoria
4. Hash de contraseña con bcrypt
5. **Transacción DB**:
   - Crear registro `User` con `mustChangePassword: true`
   - Crear registro `TemporaryPassword` (válido 7 días)
6. Retornar contraseña temporal al admin

**Datos requeridos**:
- ✅ Email
- ✅ Nombre completo
- ✅ Rol (ORG_ADMIN o HR_ADMIN)

### Flujo 2: Usuario Con Empleado

**Caso de uso**: Personal de RRHH, administradores internos

**Pasos del sistema**:

1. Validar datos completos de empleado (NIF, nombre, apellidos, etc.)
2. Verificar email único y NIF único en organización
3. Validar formato y checksum de NIF/NIE
4. Encriptar IBAN si se proporciona
5. Generar número de empleado si no se proporciona
6. Generar contraseña temporal aleatoria
7. Hash de contraseña con bcrypt
8. **Transacción DB**:
   - Crear registro `Employee`
   - Crear registro `User` con `mustChangePassword: true`
   - Vincular `employee.userId` con `user.id`
   - Crear registro `TemporaryPassword` (válido 7 días)
   - Crear `EmploymentContract` básico (activo, 0 horas)
9. Retornar contraseña temporal al admin

**Datos requeridos**:
- ✅ Email
- ✅ Rol (ORG_ADMIN o HR_ADMIN)
- ✅ Nombre (firstName)
- ✅ Primer apellido (lastName)
- ✅ NIF/NIE (validado con checksum)
- ⚪ Segundo apellido
- ⚪ Teléfono fijo
- ⚪ Teléfono móvil
- ⚪ Dirección completa
- ⚪ Fecha de nacimiento
- ⚪ Nacionalidad
- ⚪ Número de empleado (auto-generado si no se proporciona)
- ⚪ IBAN (encriptado)
- ⚪ Contacto de emergencia
- ⚪ Notas

---

## API Endpoints

### `GET /api/admin/users`

**Autenticación**: Requerida (Cookie `auth-token`)

**Permisos**: `HR_ADMIN`, `ORG_ADMIN`, `SUPER_ADMIN`

**Query Parameters**:
```typescript
page?: number    // Número de página (default: 1)
limit?: number   // Registros por página (default: 10)
status?: string  // 'active' | 'inactive' | 'with-temp-password' | 'all'
```

**Response Success (200)**:
```typescript
{
  users: UserRow[],
  total: number,
  page: number,
  limit: number,
  totalPages: number,
  currentUserRole: Role  // ⚠️ CRÍTICO para determinar roles permitidos
}
```

**Response Error (401)**: No autorizado
**Response Error (403)**: Sin permisos de administrador

### `POST /api/admin/users`

**Autenticación**: Requerida

**Permisos**: `canManageUsers(role)` debe ser `true`

#### Action: `create`

**Request Body (Modo sin empleado)**:
```typescript
{
  action: "create",
  email: string,
  role: "ORG_ADMIN" | "HR_ADMIN",
  isEmployee: false,
  name: string  // Nombre completo
}
```

**Request Body (Modo con empleado)**:
```typescript
{
  action: "create",
  email: string,
  role: "ORG_ADMIN" | "HR_ADMIN",
  isEmployee: true,
  firstName: string,
  lastName: string,
  secondLastName?: string,
  nifNie: string,  // Validado con checksum
  phone?: string,
  mobilePhone?: string,
  address?: string,
  city?: string,
  postalCode?: string,
  province?: string,
  birthDate?: string,  // ISO date string
  nationality?: string,
  employeeNumber?: string,
  iban?: string,       // Será encriptado
  emergencyContactName?: string,
  emergencyContactPhone?: string,
  emergencyRelationship?: string,
  notes?: string
}
```

**Response Success (201)**:
```typescript
{
  message: string,
  user: {
    id: string,
    email: string,
    name: string,
    role: Role,
    active: boolean
  },
  employee?: {  // Solo si isEmployee: true
    id: string,
    employeeNumber: string,
    firstName: string,
    lastName: string
  },
  temporaryPassword: string,  // ⚠️ Mostrar al admin solo una vez
  expiresAt: Date
}
```

**Response Error (400)**: Validación Zod falló
```typescript
{
  error: "Datos de entrada inválidos",
  code: "VALIDATION_ERROR",
  details: ZodError[]
}
```

**Response Error (403)**: Sin permisos o violación de jerarquía
```typescript
{
  error: string,
  code: "PERMISSION_DENIED" | "HIERARCHY_VIOLATION"
}
```

**Response Error (409)**: Conflicto de datos únicos
```typescript
{
  error: string,
  code: "EMAIL_EXISTS" | "NIF_EXISTS" | "EMPLOYEE_NUMBER_EXISTS"
}
```

#### Action: `reset-password`

**Request Body**:
```typescript
{
  action: "reset-password",
  userId: string,
  reason?: string
}
```

**Response Success (200)**:
```typescript
{
  message: "Contraseña reseteada exitosamente",
  temporaryPassword: string,
  expiresAt: Date
}
```

#### Action: `change-role`

**Request Body**:
```typescript
{
  action: "change-role",
  userId: string,
  role: Role
}
```

**Response Success (200)**:
```typescript
{
  message: "Rol actualizado exitosamente",
  user: {
    id: string,
    email: string,
    name: string,
    role: Role,
    employee?: { id, firstName, lastName }
  },
  previousRole: Role,
  newRole: Role
}
```

#### Action: `toggle-active`

**Request Body**:
```typescript
{
  action: "toggle-active",
  userId: string
}
```

**Response Success (200)**:
```typescript
{
  message: string,
  active: boolean
}
```

---

## Componentes Frontend

### 1. `page.tsx` - Página Principal

**Ubicación**: `src/app/(main)/dashboard/admin/users/page.tsx`

**Responsabilidades**:
- Obtener lista de usuarios desde API
- Gestionar estado de diálogo de creación
- Calcular roles permitidos según rol actual
- Manejar estados de carga y error
- Proteger con `PermissionGuard`

**Estado manejado**:
```typescript
const [users, setUsers] = useState<UserRow[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [createDialogOpen, setCreateDialogOpen] = useState(false);
const [userRole, setUserRole] = useState<Role | null>(null);
```

**Función crítica**:
```typescript
const getAllowedRoles = (): Role[] => {
  if (!userRole) return [];

  switch (userRole) {
    case "SUPER_ADMIN":
      return ["ORG_ADMIN", "HR_ADMIN"];
    case "ORG_ADMIN":
      return ["HR_ADMIN"];  // Solo puede crear HR_ADMIN
    default:
      return [];
  }
};
```

### 2. `create-user-dialog.tsx` - Diálogo de Creación

**Props**:
```typescript
interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  allowedRoles: Role[];
}
```

**Características clave**:

1. **Checkbox condicional**: Controla qué campos se muestran
2. **Validación en tiempo real**: Feedback inmediato de errores
3. **Limpieza de campos**: Al cambiar checkbox, limpia campos no usados
4. **Manejo de `undefined`**: Campos no usados se setean a `undefined`

**Hook crítico para reactividad**:
```typescript
const isEmployee = form.watch("isEmployee");

React.useEffect(() => {
  if (isEmployee) {
    // Limpiar campos de modo simple
    form.setValue("name", undefined as any);
    form.clearErrors("name");
  } else {
    // Limpiar campos de modo empleado
    form.setValue("firstName", undefined as any);
    form.setValue("lastName", undefined as any);
    form.setValue("nifNie", undefined as any);
    // ... más campos
    form.clearErrors(["firstName", "lastName", "nifNie", /* ... */]);
  }
}, [isEmployee, form]);
```

**Manejo de envío**:
```typescript
const onSubmit = async (values: FormValues) => {
  setIsLoading(true);
  setGeneralError(null);

  try {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        ...values,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.code === "VALIDATION_ERROR" && data.details) {
        // Mapear errores de Zod a campos del form
        data.details.forEach((error: any) => {
          form.setError(error.path[0], { message: error.message });
        });
      } else {
        setGeneralError(data.error || "Error al crear usuario");
      }
      return;
    }

    // Mostrar contraseña temporal al admin
    alert(`Usuario creado. Contraseña temporal: ${data.temporaryPassword}`);
    onUserCreated();
  } catch (error) {
    setGeneralError("Error de conexión");
  } finally {
    setIsLoading(false);
  }
};
```

### 3. `users-data-table.tsx` - Tabla de Usuarios

**Características**:
- Tabs con badges (Activos, Inactivos, Con contraseña temporal, Todos)
- Búsqueda global
- Filtros por rol
- Ordenamiento por columnas
- Paginación
- Responsive (Select en móvil, Tabs en desktop)

**Estados vacíos**: Mensajes contextuales según tab activa

### 4. `users-columns.tsx` - Definición de Columnas

**Columnas**:
- Nombre (con icono 🔑 si `mustChangePassword: true`)
- Email
- Rol (badge con colores por rol)
- Estado (Activo/Inactivo con badge)
- Acciones (dropdown menú)

**Acciones disponibles**:
- Ver detalles
- Cambiar rol
- Generar contraseña temporal
- Activar/Desactivar usuario

---

## Validación y Schemas

### Schema Principal: `createUserAdminSchema`

**Ubicación**: `src/validators/user.ts`

**Características**:
- Validación condicional con `superRefine`
- Valida NIF/NIE con checksum
- Valida IBAN español
- Maneja campos opcionales correctamente

**Estructura base**:
```typescript
export const createUserAdminSchema = z
  .object({
    // Campos comunes (siempre requeridos)
    email: z.string().email("Email inválido").toLowerCase().trim(),
    role: z.enum(["ORG_ADMIN", "HR_ADMIN"], {
      errorMap: () => ({ message: "Rol inválido. Solo ORG_ADMIN o HR_ADMIN permitidos" }),
    }),

    // Checkbox para determinar flujo
    isEmployee: z.boolean().default(false),

    // Campos solo si NO es empleado
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100).optional(),

    // Campos solo si ES empleado
    firstName: z.string().min(1, "Nombre es obligatorio").max(50).optional(),
    lastName: z.string().min(1, "Primer apellido es obligatorio").max(50).optional(),
    secondLastName: z.string().max(50).optional(),
    nifNie: z.string().optional(),
    phone: z.string().max(20).optional(),
    mobilePhone: z.string().max(20).optional(),
    address: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    postalCode: z.string().max(10).optional(),
    province: z.string().max(100).optional(),
    birthDate: z.string().optional(),
    nationality: z.string().max(50).optional(),
    employeeNumber: z.string().max(20).optional(),
    iban: z.string().optional(),
    emergencyContactName: z.string().max(100).optional(),
    emergencyContactPhone: z.string().max(20).optional(),
    emergencyRelationship: z.string().max(50).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    // Lógica de validación condicional
  });
```

### Lógica de `superRefine`

**Modo NO empleado** (`isEmployee: false`):
```typescript
if (!data.isEmployee) {
  // Requiere solo 'name'
  if (!data.name || (typeof data.name === "string" && data.name.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El nombre es obligatorio",
      path: ["name"],
    });
  }
}
```

**Modo empleado** (`isEmployee: true`):
```typescript
else {
  // 1. Validar firstName
  if (!data.firstName || (typeof data.firstName === "string" && data.firstName.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El nombre es obligatorio",
      path: ["firstName"],
    });
  }

  // 2. Validar lastName
  if (!data.lastName || (typeof data.lastName === "string" && data.lastName.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El primer apellido es obligatorio",
      path: ["lastName"],
    });
  }

  // 3. Validar nifNie (requerido + formato + checksum)
  if (!data.nifNie || (typeof data.nifNie === "string" && data.nifNie.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El NIF/NIE es obligatorio",
      path: ["nifNie"],
    });
  } else if (typeof data.nifNie === "string") {
    // Validar formato y checksum del NIF/NIE
    const nifNieResult = nifNieSchema.safeParse(data.nifNie);
    if (!nifNieResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: nifNieResult.error.errors[0].message,
        path: ["nifNie"],
      });
    }
  }

  // 4. Validar IBAN si se proporciona (opcional pero con formato)
  if (data.iban && typeof data.iban === "string" && data.iban.trim() !== "") {
    const ibanResult = ibanSchema.safeParse(data.iban);
    if (!ibanResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IBAN español inválido",
        path: ["iban"],
      });
    }
  }
}
```

### ⚠️ Importante: Check de tipo antes de métodos string

**Por qué es necesario**:

Cuando un campo se setea a `undefined` (porque no se usa en ese modo), Zod puede llamar a `superRefine` con `data.field === undefined`. Si intentamos hacer `data.field.trim()` directamente, obtenemos un error de runtime.

**Solución**:
```typescript
// ❌ MAL (puede fallar si field es undefined)
if (!data.field || data.field.trim() === "") { /* ... */ }

// ✅ BIEN (primero check de tipo)
if (!data.field || (typeof data.field === "string" && data.field.trim() === "")) { /* ... */ }
```

---

## Problemas Comunes y Soluciones

### Problema 1: Dropdown de roles vacío

**Síntoma**: Al abrir el diálogo de crear usuario, el select de rol aparece vacío.

**Causa raíz**:
- API GET `/api/admin/users` no retornaba `currentUserRole`
- El componente `page.tsx` necesita este dato para calcular `allowedRoles`

**Solución**:
```typescript
// En route.ts, línea 126
return NextResponse.json({
  users,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  currentUserRole: session.user.role,  // ⚠️ Añadir esto
});
```

**Verificación**:
```bash
curl -H "Cookie: auth-token=..." http://localhost:3000/api/admin/users | jq '.currentUserRole'
# Debe retornar: "SUPER_ADMIN" o "ORG_ADMIN"
```

### Problema 2: Botón "Crear usuario" no responde

**Síntoma**:
- Usuario marca checkbox "¿Es empleado?"
- Rellena todos los campos de empleado
- Hace clic en "Crear usuario"
- No pasa nada, sin errores en consola

**Causa raíz**:
El campo oculto `name` (usado en modo NO empleado) contenía una cadena vacía `""`. Cuando el formulario intenta validar:

```typescript
// ❌ Este código fallaba silenciosamente
if (!data.name || data.name.trim() === "") {  // Error: undefined.trim()
  ctx.addIssue({ /* ... */ });
}
```

**Solución completa**:

1. **Setear campos no usados a `undefined`**:
```typescript
React.useEffect(() => {
  if (isEmployee) {
    form.setValue("name", undefined as any);  // ✅ undefined, no ""
    form.clearErrors("name");
  } else {
    form.setValue("firstName", undefined as any);
    form.setValue("lastName", undefined as any);
    form.setValue("nifNie", undefined as any);
    form.clearErrors(["firstName", "lastName", "nifNie"]);
  }
}, [isEmployee, form]);
```

2. **Validar tipo antes de usar métodos string**:
```typescript
if (!data.name || (typeof data.name === "string" && data.name.trim() === "")) {
  ctx.addIssue({ /* ... */ });
}
```

3. **En Input components, manejar `undefined` correctamente**:
```typescript
<Input
  {...field}
  value={field.value || ""}  // ✅ Convertir undefined a "" para React
  disabled={isLoading}
/>
```

4. **Default values en el form**:
```typescript
const form = useForm<FormValues>({
  resolver: zodResolver(createUserAdminSchema),
  defaultValues: {
    email: "",
    role: allowedRoles[0] || "HR_ADMIN",
    isEmployee: false,
    name: "",
    firstName: undefined,  // ✅ undefined por defecto
    lastName: undefined,
    nifNie: undefined,
    // ... resto de campos empleado a undefined
  },
});
```

**Verificación**:
```typescript
// En DevTools Console
console.log(form.getValues());
// Con isEmployee: false → { name: "Juan", firstName: undefined, ... }
// Con isEmployee: true → { name: undefined, firstName: "María", ... }
```

### Problema 3: Warning de componentes no controlados

**Síntoma**:
```
Warning: A component is changing an uncontrolled input to be controlled.
```

**Causa**: Input recibe `value={undefined}` en primera renderización.

**Solución**: Siempre pasar string a `value`:
```typescript
<Input {...field} value={field.value || ""} />
```

### Problema 4: Validación de NIF/NIE falla con formato correcto

**Síntoma**: NIF como "12345678Z" es rechazado aunque es válido.

**Causa**: Schema `nifNieSchema` importado puede estar usando validación estricta.

**Verificación**:
```typescript
// En src/lib/validations/employee.ts
import { nifNieSchema } from "@/lib/validations/employee";

const result = nifNieSchema.safeParse("12345678Z");
console.log(result);  // Verificar si success: true
```

**Solución**: Asegurar que `nifNieSchema` valida correctamente formato y letra de control.

### Problema 5: Error 409 "Email ya existe" al crear usuario

**Síntoma**: API retorna 409 aunque el email sea nuevo.

**Posibles causas**:
1. Email tiene espacios o mayúsculas inconsistentes
2. Ya existe un usuario con ese email en la BD

**Solución**:
```typescript
// ✅ El schema ya hace esto:
email: z.string().email("Email inválido").toLowerCase().trim()

// Verificar en BD:
npx prisma studio
# Buscar en tabla User si existe ese email
```

### Problema 6: Transacción falla sin mensaje claro

**Síntoma**: Error 500 al crear usuario con empleado, sin detalles.

**Debug**:
```typescript
// En route.ts, añadir logging detallado:
try {
  const result = await prisma.$transaction(async (tx) => {
    console.log("1. Creando empleado...");
    const employee = await tx.employee.create({ /* ... */ });
    console.log("✅ Empleado creado:", employee.id);

    console.log("2. Creando usuario...");
    const user = await tx.user.create({ /* ... */ });
    console.log("✅ Usuario creado:", user.id);

    // ... resto de pasos

    return { employee, user };
  });
} catch (error) {
  console.error("❌ Error en transacción:", error);
  throw error;
}
```

**Soluciones comunes**:
- Verificar que `orgId` existe en tabla `Organization`
- Verificar foreign keys están correctas
- Verificar campos requeridos no son `null`

---

## Ejemplos de Código

### Ejemplo 1: Crear ORG_ADMIN sin empleado

**Request**:
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=..." \
  -d '{
    "action": "create",
    "email": "admin@empresa.com",
    "role": "ORG_ADMIN",
    "isEmployee": false,
    "name": "Juan Pérez García"
  }'
```

**Response**:
```json
{
  "message": "Usuario administrativo creado exitosamente",
  "user": {
    "id": "clx1234567890",
    "email": "admin@empresa.com",
    "name": "Juan Pérez García",
    "role": "ORG_ADMIN",
    "active": true
  },
  "temporaryPassword": "TMP-A7K9-X2M5",
  "expiresAt": "2025-10-24T12:00:00.000Z"
}
```

### Ejemplo 2: Crear HR_ADMIN con empleado

**Request**:
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=..." \
  -d '{
    "action": "create",
    "email": "rrhh@empresa.com",
    "role": "HR_ADMIN",
    "isEmployee": true,
    "firstName": "María",
    "lastName": "López",
    "secondLastName": "Fernández",
    "nifNie": "12345678Z",
    "phone": "912345678",
    "mobilePhone": "612345678",
    "address": "Calle Principal 123",
    "city": "Madrid",
    "postalCode": "28001",
    "province": "Madrid",
    "birthDate": "1985-03-15",
    "nationality": "Española",
    "employeeNumber": "EMP001",
    "iban": "ES9121000418450200051332",
    "emergencyContactName": "Pedro López",
    "emergencyContactPhone": "612999888",
    "emergencyRelationship": "Hermano",
    "notes": "Responsable de RRHH"
  }'
```

**Response**:
```json
{
  "message": "Usuario administrativo con empleado creado exitosamente",
  "user": {
    "id": "clx9876543210",
    "email": "rrhh@empresa.com",
    "name": "María López Fernández",
    "role": "HR_ADMIN",
    "active": true
  },
  "employee": {
    "id": "cly1234567890",
    "employeeNumber": "EMP001",
    "firstName": "María",
    "lastName": "López"
  },
  "temporaryPassword": "TMP-B3N7-Y6P2",
  "expiresAt": "2025-10-24T12:00:00.000Z"
}
```

### Ejemplo 3: Resetear contraseña de usuario

**Request**:
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=..." \
  -d '{
    "action": "reset-password",
    "userId": "clx1234567890",
    "reason": "Usuario olvidó su contraseña"
  }'
```

**Response**:
```json
{
  "message": "Contraseña reseteada exitosamente",
  "temporaryPassword": "TMP-C8Q4-Z1M9",
  "expiresAt": "2025-10-24T12:00:00.000Z"
}
```

### Ejemplo 4: Cambiar rol de usuario

**Request**:
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=..." \
  -d '{
    "action": "change-role",
    "userId": "clx9876543210",
    "role": "ORG_ADMIN"
  }'
```

**Response**:
```json
{
  "message": "Rol actualizado exitosamente",
  "user": {
    "id": "clx9876543210",
    "email": "rrhh@empresa.com",
    "name": "María López Fernández",
    "role": "ORG_ADMIN",
    "employee": {
      "id": "cly1234567890",
      "firstName": "María",
      "lastName": "López"
    }
  },
  "previousRole": "HR_ADMIN",
  "newRole": "ORG_ADMIN"
}
```

### Ejemplo 5: Verificar permisos en Prisma

```typescript
// Verificar que un usuario puede gestionar otro
import { canManageUsers } from "@/lib/role-hierarchy";
import { prisma } from "@/lib/prisma";

const adminUser = await prisma.user.findUnique({
  where: { id: "clx1234567890" }
});

if (canManageUsers(adminUser.role)) {
  console.log("✅ Usuario puede gestionar otros usuarios");
} else {
  console.log("❌ Usuario NO tiene permisos");
}
```

### Ejemplo 6: Componente condicional en React

```tsx
// Patrón para mostrar campos condicionalmente
const isEmployee = form.watch("isEmployee");

return (
  <form onSubmit={form.handleSubmit(onSubmit)}>
    {/* Campo siempre visible */}
    <FormField control={form.control} name="email" render={({ field }) => (
      <FormItem>
        <FormLabel>Email *</FormLabel>
        <FormControl>
          <Input {...field} value={field.value || ""} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />

    {/* Checkbox que controla visibilidad */}
    <FormField control={form.control} name="isEmployee" render={({ field }) => (
      <FormItem>
        <div className="flex items-center space-x-2">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isLoading}
            />
          </FormControl>
          <FormLabel className="!mt-0">¿Es empleado de la empresa?</FormLabel>
        </div>
      </FormItem>
    )} />

    {/* Campos condicionales */}
    {!isEmployee ? (
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Nombre completo *</FormLabel>
          <FormControl>
            <Input {...field} value={field.value || ""} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    ) : (
      <>
        <FormField control={form.control} name="firstName" render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre *</FormLabel>
            <FormControl>
              <Input {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="lastName" render={({ field }) => (
          <FormItem>
            <FormLabel>Primer apellido *</FormLabel>
            <FormControl>
              <Input {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </>
    )}
  </form>
);
```

---

## Checklist de Testing

### Tests Manuales

- [ ] **Crear ORG_ADMIN sin empleado** como SUPER_ADMIN
- [ ] **Crear HR_ADMIN sin empleado** como SUPER_ADMIN
- [ ] **Crear HR_ADMIN sin empleado** como ORG_ADMIN
- [ ] **Crear HR_ADMIN con empleado** con todos los campos
- [ ] **Crear HR_ADMIN con empleado** con solo campos requeridos
- [ ] **Intentar crear ORG_ADMIN** como ORG_ADMIN (debe fallar)
- [ ] **Intentar crear con email duplicado** (debe fallar 409)
- [ ] **Intentar crear con NIF duplicado** (debe fallar 409)
- [ ] **Validar NIF con letra incorrecta** (debe fallar)
- [ ] **Validar IBAN inválido** (debe fallar)
- [ ] **Cambiar de modo sin empleado → con empleado** y verificar campos
- [ ] **Cambiar de modo con empleado → sin empleado** y verificar campos
- [ ] **Resetear contraseña de usuario existente**
- [ ] **Cambiar rol de HR_ADMIN → ORG_ADMIN**
- [ ] **Desactivar usuario y verificar que no puede hacer login**
- [ ] **Verificar que contraseña temporal expira a los 7 días**

### Tests de Permisos

- [ ] **HR_ADMIN intenta acceder a /dashboard/admin/users** (debe ver 403)
- [ ] **MANAGER intenta acceder a /dashboard/admin/users** (debe ver 403)
- [ ] **EMPLOYEE intenta acceder a /dashboard/admin/users** (debe ver 403)
- [ ] **Usuario sin sesión intenta acceder** (debe redirigir a login)

### Tests de UI

- [ ] **Tabs muestran contadores correctos**
- [ ] **Búsqueda global funciona** con nombre, email
- [ ] **Filtro por rol funciona** correctamente
- [ ] **Paginación funciona** con más de 10 usuarios
- [ ] **Responsive**: Select visible en móvil, Tabs en desktop
- [ ] **Estados vacíos muestran mensajes correctos**
- [ ] **Errores de validación se muestran en cada campo**
- [ ] **Banner de error general aparece** en errores de servidor
- [ ] **Loading states** durante peticiones API

---

## Notas de Seguridad

### ⚠️ Seguridad de Contraseñas Temporales

1. **Mostrar solo una vez**: La contraseña temporal NUNCA se almacena en texto plano en BD, solo se retorna en el response del POST.

2. **Hash inmediato**: Antes de guardar en BD, se hace hash con bcrypt (10 rounds).

3. **Tabla separada**: Registro en `TemporaryPassword` para auditoría:
   ```typescript
   {
     userId: string,
     password: string,        // ⚠️ Plain text para que admin la comparta
     expiresAt: Date,         // 7 días desde creación
     active: boolean,         // false si se desactiva
     usedAt: Date | null,     // timestamp de primer uso
     createdById: string,     // quién la generó
     reason: string,
     notes: string
   }
   ```

4. **Expiración automática**: Middleware debe verificar `expiresAt` en login.

5. **Obligar cambio**: Flag `mustChangePassword: true` fuerza cambio en primer login.

### 🔐 Protección de Datos Sensibles

1. **IBAN encriptado**:
   ```typescript
   import { encrypt, decrypt } from "@/lib/crypto";
   const encrypted = encrypt(iban);  // AES-256-GCM
   ```

2. **NIF/NIE**: Almacenado en texto plano pero:
   - Validado con checksum
   - Índice único por organización
   - No expuesto en APIs públicas

3. **Multi-tenancy estricto**: TODAS las queries filtran por `orgId`:
   ```typescript
   where: { id: userId, orgId: session.user.orgId }
   ```

### 🛡️ Prevención de Escalada de Privilegios

1. **Validación en backend**: NUNCA confiar en validación frontend.

2. **Doble check de jerarquía**:
   ```typescript
   // En route.ts
   const validation = validateUserCreation(session, targetRole, email, orgId);
   if (!validation.valid) {
     return NextResponse.json({ error: validation.error }, { status: 403 });
   }
   ```

3. **Prevenir auto-promoción**: Usuario NO puede cambiar su propio rol.

4. **Transacciones atómicas**: Si falla un paso, rollback completo.

---

## Mantenimiento y Evolución

### Añadir Nuevo Rol Administrativo

1. **Actualizar enum en Prisma**:
   ```prisma
   enum Role {
     SUPER_ADMIN
     ORG_ADMIN
     HR_ADMIN
     FINANCE_ADMIN  // ⚡ Nuevo
     MANAGER
     EMPLOYEE
   }
   ```

2. **Actualizar jerarquía** en `src/lib/role-hierarchy.ts`:
   ```typescript
   export const ROLE_HIERARCHY = {
     SUPER_ADMIN: 5,
     ORG_ADMIN: 4,
     FINANCE_ADMIN: 3,  // ⚡ Nuevo (mismo nivel que HR_ADMIN)
     HR_ADMIN: 3,
     MANAGER: 2,
     EMPLOYEE: 1,
   };
   ```

3. **Actualizar schemas Zod**:
   ```typescript
   role: z.enum(["ORG_ADMIN", "HR_ADMIN", "FINANCE_ADMIN"])
   ```

4. **Actualizar permisos** en `src/lib/permissions.ts`.

5. **Actualizar UI**: Añadir en `ROLE_DISPLAY_NAMES` y `ROLE_COLORS`.

6. **Migración**:
   ```bash
   npx prisma migrate dev --name add_finance_admin_role
   ```

### Añadir Nuevos Campos al Formulario

1. **Añadir campo opcional al schema**:
   ```typescript
   professionalTitle: z.string().max(100).optional()
   ```

2. **Añadir a `superRefine`** si requiere validación condicional.

3. **Añadir campo al formulario**:
   ```tsx
   <FormField control={form.control} name="professionalTitle" render={({ field }) => (
     <FormItem>
       <FormLabel>Título profesional</FormLabel>
       <FormControl>
         <Input {...field} value={field.value || ""} />
       </FormControl>
       <FormMessage />
     </FormItem>
   )} />
   ```

4. **Actualizar `createUser()` en API** para incluir en insert.

### Añadir Nueva Acción (ej: Exportar Lista)

1. **Añadir acción en `users-columns.tsx`**:
   ```tsx
   <DropdownMenuItem onClick={() => exportUsers()}>
     Exportar a CSV
   </DropdownMenuItem>
   ```

2. **Crear función de exportación**:
   ```typescript
   const exportUsers = async () => {
     const response = await fetch("/api/admin/users/export");
     const blob = await response.blob();
     // ... descargar archivo
   };
   ```

3. **Crear endpoint** en `src/app/api/admin/users/export/route.ts`.

---

## Referencias

### Documentación Externa

- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
- [Zod Documentation](https://zod.dev/)
- [React Hook Form](https://react-hook-form.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TanStack Table](https://tanstack.com/table/latest)

### Archivos Relacionados en el Proyecto

- `prisma/schema.prisma` - Modelo de datos
- `src/lib/auth.ts` - Configuración NextAuth
- `src/middleware.ts` - Protección de rutas
- `src/lib/permissions.ts` - Sistema de permisos
- `src/lib/role-hierarchy.ts` - Lógica de jerarquía
- `src/lib/user-validation.ts` - Validaciones de negocio
- `src/lib/password.ts` - Generación de contraseñas
- `src/lib/crypto.ts` - Encriptación de datos

---

## Historial de Cambios

### v1.0.0 - 2025-10-17

**Implementación inicial**:
- ✅ Sistema completo de gestión de usuarios administrativos
- ✅ Creación dual (con/sin empleado)
- ✅ Validación condicional con Zod
- ✅ Interfaz con checkbox reactivo
- ✅ Sistema de contraseñas temporales
- ✅ Jerarquía de roles estricta
- ✅ Documentación completa

**Issues resueltos**:
- 🐛 Fix: Dropdown de roles vacío (añadido `currentUserRole` a API GET)
- 🐛 Fix: Botón crear no responde (manejo correcto de `undefined` en campos)
- 🐛 Fix: Warning componentes no controlados (`value={field.value || ""}`)

---

**Última actualización**: 2025-10-17
**Autor**: Equipo de Desarrollo ERP
**Versión**: 1.0.0
