# Plan: Validación de Roles en Sistema de Alertas V2

> **Tag de respaldo:** `v2.0-pre-alerts-validation`
> **Fecha:** 2024-11-26
> **Estado:** En implementación

---

## Contexto y Problema

El sistema de alertas permite asignar "responsables de área" a usuarios, pero:

1. **No se validaba el rol del usuario destino** en `assignResponsibility()` - un EMPLOYEE podía ser asignado aunque no tiene acceso a la UI de alertas
2. **La campana de alertas (AlertsBell)** se mostraba sin verificar permisos
3. **Roles hardcodeados** en múltiples lugares dificultando el mantenimiento

---

## Jerarquía de Escalado de Responsables

El sistema usa una jerarquía de escalado para determinar quién recibe las alertas:

```
Responsable Asignado Específico (MANAGER, HR_ADMIN, etc.)
       ↓ (si no hay)
Jefe de Equipo (TEAM_LEAD - FUTURO)
       ↓ (si no hay)
Responsable del Centro
       ↓ (si no hay)
Recursos Humanos
```

---

## Soluciones Implementadas

### 1. Constante Centralizada `ALLOWED_RESPONSIBLE_ROLES`

**Archivo:** `src/lib/role-hierarchy.ts`

```typescript
export const ALLOWED_RESPONSIBLE_ROLES = [
  "MANAGER",
  "HR_ADMIN",
  "ORG_ADMIN",
  "SUPER_ADMIN",
  // TODO: Añadir "TEAM_LEAD" cuando se implemente
] as const;
```

**Beneficios:**
- Un solo lugar para mantener la lista de roles
- Fácil añadir TEAM_LEAD en el futuro
- Documentación inline sobre el propósito

### 2. Validación Server-Side en `assignResponsibility`

**Archivo:** `src/server/actions/area-responsibilities.ts`

Ahora se valida que el usuario destino tenga un rol permitido:

```typescript
// Obtener rol del usuario
const targetUser = await prisma.user.findFirst({
  where: { id: data.userId, orgId: session.user.orgId },
  select: { id: true, name: true, email: true, role: true },
});

// Validar rol permitido
if (!ALLOWED_RESPONSIBLE_ROLES.includes(targetUser.role as AllowedResponsibleRole)) {
  return {
    success: false,
    error: "Solo usuarios con rol Manager o superior pueden ser responsables",
  };
}
```

### 3. Filtro Centralizado en `searchUsersForResponsibility`

Usa la misma constante para filtrar usuarios en la búsqueda:

```typescript
const users = await prisma.user.findMany({
  where: {
    role: { in: [...ALLOWED_RESPONSIBLE_ROLES] },
    // ...
  },
});
```

### 4. Ocultación de AlertsBell por Permisos

**Archivo:** `src/components/alerts/alerts-bell.tsx`

El componente ahora verifica el permiso antes de renderizar:

```typescript
export function AlertsBell() {
  const { hasPermission } = usePermissions();

  // No mostrar campana si no tiene permiso view_time_tracking
  if (!hasPermission("view_time_tracking")) {
    return null;
  }

  // ... resto del componente
}
```

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/lib/role-hierarchy.ts` | + `ALLOWED_RESPONSIBLE_ROLES` constante |
| `src/server/actions/area-responsibilities.ts` | + Validación de rol + Uso de constante |
| `src/components/alerts/alerts-bell.tsx` | + Verificación de permiso |

---

## Preparación para TEAM_LEAD (Futuro)

Cuando se implemente el rol TEAM_LEAD:

### 1. Añadir a Prisma enum

```prisma
enum Role {
  SUPER_ADMIN
  ORG_ADMIN
  HR_ADMIN
  MANAGER
  TEAM_LEAD  // ← Nuevo
  EMPLOYEE
}
```

### 2. Añadir a la constante centralizada

```typescript
export const ALLOWED_RESPONSIBLE_ROLES = [
  "MANAGER",
  "TEAM_LEAD",  // ← Añadir aquí
  "HR_ADMIN",
  "ORG_ADMIN",
  "SUPER_ADMIN",
] as const;
```

### 3. Añadir permisos en `permissions.ts`

```typescript
TEAM_LEAD: [
  "view_employees",      // Ver empleados de su equipo
  "view_time_tracking",  // Ver fichajes de su equipo
  "approve_requests",    // Aprobar solicitudes de su equipo
  // ...
],
```

### 4. Actualizar jerarquía

```typescript
ROLE_HIERARCHY = {
  SUPER_ADMIN: 5,
  ORG_ADMIN: 4,
  HR_ADMIN: 3,
  MANAGER: 2,
  TEAM_LEAD: 1.5,  // ← Entre MANAGER y EMPLOYEE
  EMPLOYEE: 1
}
```

---

## Decisiones de Diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Validación | Lista de roles permitidos | Extensible para futuros roles |
| Protección | Solo UI (sin middleware) | Caso actual es de prueba, sin EMPLOYEEs reales |
| Constante | Exportada desde role-hierarchy.ts | Centralización y reutilización |

---

## Testing Manual

1. **Verificar búsqueda de usuarios:**
   - Solo deben aparecer MANAGER, HR_ADMIN, ORG_ADMIN, SUPER_ADMIN
   - NO deben aparecer EMPLOYEE

2. **Verificar asignación (bypass):**
   - Intentar asignar EMPLOYEE directamente debería fallar con error

3. **Verificar AlertsBell:**
   - Usuario EMPLOYEE: No debe ver la campana
   - Usuario MANAGER+: Debe ver la campana

---

## Rollback

Si hay problemas, restaurar al tag:

```bash
git checkout v2.0-pre-alerts-validation
```
