# PLAN – Sistema Multi-Empresa Seguro (Ready sin romper nada)

## 🎯 Objetivo

Permitir que un usuario (ej. RRHH) gestione varias empresas, manteniendo:

- Arquitectura actual basada en `orgId` en casi todas las tablas.
- Server actions funcionando igual (siempre hay un único `orgId` activo).
- Evolución futura sencilla a vistas/acciones multiempresa reales.

**Principio sagrado:** No cambiamos la semántica de `orgId`; solo añadimos capas alrededor y un concepto de “organización activa”.

---

## 1. Modelo de datos (Prisma)

### 1.1. Tabla de vínculo Usuario ↔ Organización

```prisma
model UserOrganization {
  id        String   @id @default(cuid())

  userId    String
  orgId     String

  role      Role     @default(EMPLOYEE)
  isDefault Boolean  @default(false)
  isActive  Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
  @@index([userId])
  @@index([orgId])
  @@map("user_organizations")
}
```

**Relaciones nuevas**

```prisma
model User {
  // ... campos actuales ...
  userOrganizations UserOrganization[]
}

model Organization {
  // ... campos actuales ...
  userOrganizations UserOrganization[]
  groupId           String?
  group             OrganizationGroup? @relation(fields: [groupId], references: [id])
}
```

### 1.2. (Opcional) Grupos de empresas

```prisma
model OrganizationGroup {
  id          String   @id @default(cuid())
  name        String
  description String?
  organizations Organization[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@map("organization_groups")
}
```

Todo es aditivo: `orgId` sigue significando lo mismo.

---

## 2. Migración suave de datos

Script inicial:

```ts
const users = await prisma.user.findMany({
  select: { id: true, orgId: true, role: true },
});

for (const user of users) {
  if (!user.orgId) continue;
  await prisma.userOrganization.create({
    data: {
      userId: user.id,
      orgId: user.orgId,
      role: user.role,
      isDefault: true,
      isActive: true,
    },
  });
}
```

Así mantenemos `User.orgId` y añadimos las filas necesarias.

---

## 3. Auth / Session

Extender el JWT/Session con `activeOrgId` y `accessibleOrgIds`:

```ts
const memberships = await prisma.userOrganization.findMany({
  where: { userId: user.id, isActive: true },
  select: { orgId: true, isDefault: true },
});

const accessibleOrgIds = memberships.map((m) => m.orgId);
const activeOrgId =
  memberships.find((m) => m.isDefault)?.orgId ??
  accessibleOrgIds[0] ??
  user.orgId; // fallback legacy

token.activeOrgId = activeOrgId;
token.accessibleOrgIds = accessibleOrgIds;

session.user.activeOrgId = token.activeOrgId;
session.user.accessibleOrgIds = token.accessibleOrgIds;
session.user.orgId = token.activeOrgId; // compatibilidad
```

---

## 4. Helper central `getOrgContext`

`/src/lib/context/org.ts`

```ts
import { auth } from "@/lib/auth";

export async function getOrgContext() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");

  const accessible = session.user.accessibleOrgIds?.length
    ? session.user.accessibleOrgIds
    : [session.user.orgId];

  const active = session.user.activeOrgId ?? accessible[0];

  return {
    activeOrgId: active,
    accessibleOrgIds: accessible,
    isMultiOrg: accessible.length > 1,
  };
}

export async function getCurrentOrgId() {
  const ctx = await getOrgContext();
  return ctx.activeOrgId;
}
```

Reemplazar los usos de `session.user.orgId` por `await getCurrentOrgId()` en helpers clave.

---

## 5. Acción `switchActiveOrg`

```ts
"use server";

import { auth, updateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function switchActiveOrg(newOrgId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");

  const membership = await prisma.userOrganization.findFirst({
    where: { userId: session.user.id, orgId: newOrgId, isActive: true },
  });
  if (!membership) throw new Error("NO_ACCESS_TO_ORG");

  await updateSession({
    user: {
      activeOrgId: newOrgId,
      orgId: newOrgId, // compatibilidad mientras haya código legacy
    },
  });

  return { success: true };
}
```

Integrarlo con `UserActiveContext` si queremos cachear el orgId activo.

---

## 6. UI – OrgSwitcher

Solo visible si `accessibleOrgIds.length > 1`.

```tsx
export function OrgSwitcher() {
  const { data: session } = useSession();
  const orgs = session?.user?.orgMemberships ?? [];
  const activeOrgId = session?.user?.activeOrgId;

  if (!orgs || orgs.length <= 1) return null;

  return (
    <Select
      value={activeOrgId}
      onValueChange={async (orgId) => {
        await switchActiveOrg(orgId);
        window.location.reload();
      }}
    >
      {/* options con nombre de empresa */}
    </Select>
  );
}
```

---

## 7. Regla funcional clave

- Aunque un usuario tenga acceso a varias empresas, **solo tiene Employee** en su empresa principal.
- Al cambiar a otra org sin Employee, bloquear `/dashboard/me/*` (fichajes, PTO, gastos) o mostrar aviso.
- `getAuthenticatedEmployee()` devuelve datos solo cuando la org activa coincide con la del employee.

---

## 8. Multiempresa real futura: `resolveScope` + orquestadores

```ts
type OrgScope =
  | { type: "org"; orgIds: [string] }
  | { type: "group"; orgIds: string[] };

export async function resolveScope(kind: "org" | "group"): Promise<OrgScope> {
  const { activeOrgId, accessibleOrgIds } = await getOrgContext();
  if (kind === "org") return { type: "org", orgIds: [activeOrgId] };

  const org = await prisma.organization.findUnique({
    where: { id: activeOrgId },
    include: { group: { include: { organizations: true } } },
  });

  const groupOrgIds = org?.group?.organizations.map((o) => o.id) ?? [activeOrgId];
  const allowed = groupOrgIds.filter((id) => accessibleOrgIds.includes(id));

  return { type: "group", orgIds: allowed.length ? allowed : [activeOrgId] };
}
```

Orquestador de ejemplo:

```ts
export async function createSignatureBatchForScope(scopeKind, input) {
  const scope = await resolveScope(scopeKind);
  for (const orgId of scope.orgIds) {
    await createSignatureBatchForOrg(input, orgId); // acción actual
  }
}
```

No se toca la acción core, solo se “envuelve”.

---

## 9. Orden recomendado de ejecución

1. **Prisma**: modelos + migración suave (`UserOrganization`, `OrganizationGroup` opcional).
2. **Auth/Session**: exponer `activeOrgId` y `accessibleOrgIds`.
3. **Contexto**: `getOrgContext` / `getCurrentOrgId` en helpers clave.
4. **switchActiveOrg + OrgSwitcher UI**.
5. **Bloqueo /me** si no hay Employee en esa org.
6. **Futuro**: `resolveScope` + orquestadores multi-org.

Con esto, multiempresa queda soportado sin romper nada: solo un ~10 % de clientes lo necesitará, siempre con una organización principal para su ficha, PTO y gastos, y el resto son capacidades de gestión multiempresa alrededor del `orgId` existente.
