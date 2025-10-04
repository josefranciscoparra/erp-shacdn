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
- [x] Fichar ✅ (Implementación básica completada)
  - ✅ Modelos de base de datos (TimeEntry, WorkdaySummary, TimeClockTerminal)
  - ✅ Server actions para fichajes del empleado
  - ✅ Store de Zustand para gestión de estado
  - ✅ UI funcional de fichaje con resumen en tiempo real
  - ✅ Permisos por rol
  - ✅ Navegación en sidebar
  - ⏳ Pendiente: Dashboard administrativo y monitor en vivo
- [ ] Mi Calendario
- [ ] Mis Vacaciones
- [ ] Mi Espacio
- [ ] Mis Documentos

---

**Próximo paso:** Completar **Fichar** (Dashboard Admin + Monitor en Vivo)
