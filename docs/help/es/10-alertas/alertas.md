# Alertas de Tiempo

## Qué es y para qué sirve

El sistema de **Alertas de Tiempo** es una herramienta de supervisión automática de fichajes y cumplimiento horario en TimeNow. Detecta incidencias en tiempo real cuando los empleados fichan fuera de los horarios programados.

Las alertas permiten:

- Detectar llegadas tardías, salidas tempranas o ausencias de fichaje
- Identificar incidencias críticas (desviaciones grandes del horario)
- Mantener un registro auditable de todas las incidencias
- Resolver y documentar cada caso con comentarios

## Quién puede usarlo

- **Administradores** (ORG_ADMIN, HR_ADMIN, SUPER_ADMIN): Ven todas las alertas
- **Responsables de área**: Solo ven alertas de su departamento/centro/equipo
- **Empleados normales**: No ven alertas (a menos que se suscriban)

---

## Flujos principales

### 1) Ver alertas pendientes

**Ubicación**: `/dashboard/time-tracking/alerts`

**Filtros rápidos:**

- Críticas de hoy
- Hoy y ayer
- Últimos 7 días
- Histórico

**Estados de las alertas:**

- **Activas**: Pendientes de resolver
- **Resueltas**: Casos cerrados con justificación
- **Descartadas**: Falsos positivos

### 2) Resolver una alerta

1. Selecciona una alerta con estado Activa
2. Haz clic en Ver Detalles
3. Escribe un comentario obligatorio explicando la acción
4. Haz clic en "Marcar como Resuelta" o "Descartar Alerta"

### 3) Tipos de alertas

| Tipo                  | Severidad | Descripción                          |
| --------------------- | --------- | ------------------------------------ |
| LATE_ARRIVAL          | WARNING   | Llegada tarde (dentro de tolerancia) |
| CRITICAL_LATE_ARRIVAL | CRITICAL  | Llegada tarde crítica                |
| EARLY_DEPARTURE       | WARNING   | Salida temprana                      |
| MISSING_CLOCK_IN      | CRITICAL  | No fichó entrada                     |
| MISSING_CLOCK_OUT     | WARNING   | Fichó entrada pero no salida         |

---

## Pantallas y campos

### Panel de Alertas

**Filtros:**

- Centro de Coste, Equipo, Severidad, Tipo
- Búsqueda por nombre de empleado
- Rango de fechas

**Tabla:**

- Severidad, Empleado, Motivo, Resumen, Desviación, Fecha, Estado

---

## Preguntas frecuentes

**P: ¿Por qué no veo alertas si soy empleado?**
R: Las alertas están diseñadas para supervisores y RRHH.

**P: ¿Qué significa "Descartar" una alerta?**
R: Marca la alerta como falso positivo o error del sistema.

**P: ¿Se pueden recibir notificaciones por email?**
R: Por ahora, las alertas se muestran solo en el panel.

**P: ¿Cómo se generan automáticamente las alertas?**
R: Al fichar, se valida contra el horario efectivo del día. También hay un proceso diario para detectar ausencias.

---

## Checklist de soporte

**Configuración:**

- [ ] Umbrales de alertas configurados en Settings
- [ ] Matriz de Responsabilidades definida
- [ ] Horarios configurados para empleados

**Para usuarios:**

- [ ] Puede acceder al panel de alertas
- [ ] Puede resolver con comentarios
- [ ] Filtros funcionan correctamente

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team
