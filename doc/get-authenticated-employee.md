# `getAuthenticatedEmployee`

## Descripción

`getAuthenticatedEmployee` es la función centralizada que utilizamos en el backend para recuperar de forma segura la información del empleado asociado al usuario autenticado. Se apoya en `NextAuth` para validar la sesión actual y en Prisma para obtener los datos del usuario, su empleado y el contrato activo más reciente. Al encapsular esta lógica en un único helper evitamos duplicar queries, mantenemos las mismas reglas de negocio y nos aseguramos de que todas las acciones del portal empleen los mismos checks de seguridad multi‑tenant.

Ruta: `src/server/actions/shared/get-authenticated-employee.ts`

## Firma

```ts
export async function getAuthenticatedEmployee(
  options?: GetAuthenticatedEmployeeOptions,
): Promise<AuthenticatedEmployeeResult>;
```

## Parámetros (`GetAuthenticatedEmployeeOptions`)

- `employeeInclude` _(opcional)_: sub‑árbol `Prisma.EmployeeInclude` que se fusionará en el `include` de la consulta del empleado. Si se pasa `employmentContracts` se ignora, porque la función lo controla internamente.
- `contractInclude` _(opcional)_: relaciones adicionales a incluir sobre el contrato activo localizado (por ejemplo, `position`, `costCenter`).
- `requireActiveContract` _(boolean, opcional)_: si es `true`, lanza un error cuando el empleado no tiene un contrato activo con horas > 0. Útil en flujos que dependen estrictamente de un contrato vigente. Valor por defecto: `false`.
- `defaultWeeklyHours` _(number, opcional)_: horas semanales utilizadas cuando no existe contrato activo o éste no define horas positivas. Por defecto 40.

## Retorno (`AuthenticatedEmployeeResult`)

- `userId`: identificador del usuario autenticado (`users.id`).
- `employeeId`: identificador del empleado asociado (`employees.id`).
- `orgId`: organización activa del usuario, necesaria para queries multi‑tenant.
- `employee`: objeto Prisma `Employee` con el `include` que corresponda.
- `activeContract`: contrato activo encontrado (`EmploymentContract`) o `null` si no existe.
- `hasActiveContract`: bandera booleana cuando se localizó contrato con horas > 0.
- `hasProvisionalContract`: `true` cuando existe un contrato activo con horas <= 0 (caso provisional).
- `weeklyHours`: horas semanales aplicables (contrato o fallback).
- `dailyHours`: horas diarias derivadas de `weeklyHours / 5`.

## Flujo interno

1. Recupera la sesión mediante `auth()` y valida que exista `session.user.id`.
2. Consulta `prisma.user.findUnique` incluyendo al empleado y su último contrato activo.
3. Si el usuario no está vinculado a un empleado, lanza `"Usuario no tiene un empleado asociado"`.
4. Determina el contrato activo con horas positivas; si no encuentra, realiza una búsqueda de respaldo.
5. Calcula banderas (`hasActiveContract`, `hasProvisionalContract`) y horas semanales/diarias.
6. Devuelve el objeto `AuthenticatedEmployeeResult` con todos los datos necesarios para acciones del empleado.

## Ejemplos de uso

### Caso base (Mis Documentos)

```ts
import { getAuthenticatedEmployee } from "./shared/get-authenticated-employee";

export async function getMyDocuments() {
  const { employeeId, orgId, userId } = await getAuthenticatedEmployee();

  // Utiliza employeeId y orgId para filtrar documentos multi-tenant
  // userId sirve para permisos como determinar si el empleado puede borrar el documento
}
```

### Exigir contrato activo

```ts
const { employee, activeContract } = await getAuthenticatedEmployee({
  requireActiveContract: true,
  contractInclude: {
    position: true,
    costCenter: true,
  },
});

// Aquí podemos asumir que activeContract no es null y ya trae las relaciones pedidas.
```

### Cargar datos adicionales del empleado

```ts
const { employee } = await getAuthenticatedEmployee({
  employeeInclude: {
    department: true,
    user: {
      select: { email: true },
    },
  },
});

// `employee` incluirá departamento y el campo email del usuario asociado.
```

## Buenas prácticas

- Utilizar siempre `getAuthenticatedEmployee` en acciones que dependan del contexto del empleado para evitar inconsistencias en los filtros `employeeId`/`orgId`.
- Evitar acceder directamente a `session.user.employeeId`; puede no existir si el usuario aún no está vinculado o la sesión está stale.
- Controlar los errores específicos (`Usuario no autenticado`, `Usuario no tiene un empleado asociado`, `Empleado sin contrato activo`) para ofrecer mensajes claros en la UI.
- Cuando un flujo requiera datos extra del empleado o contrato, preferir pasar `employeeInclude`/`contractInclude` antes que duplicar consultas Prisma.

## Notas

- Si se modifica la estructura de `AuthenticatedEmployeeResult`, revisar las acciones que lo consumen (`My Documents`, PTO, Time Tracking, etc.).
- La función asume una semana laboral de 5 días para el cálculo de `dailyHours`; ajustar en caso de reglas distintas.
