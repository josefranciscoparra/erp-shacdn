📘 Documento para Gemini – Implementación del Módulo de Horarios
(Versión Alta Nivel, Reutilizable y Basada en el Código Existente)
🎯 Objetivo del Módulo

Extender el sistema actual de horarios de TimeNow para cubrir todas las necesidades reales del sector público y privado, manteniendo compatibilidad con el código existente y priorizando reutilización, buenas prácticas y escalabilidad.

El módulo debe:

Ser flexible para soportar horarios fijos, intensivos, turnos, rotaciones y planning manual.

Usar la arquitectura actual como capa base sin duplicar lógica.

Prepararse para futuras UIs como drag & drop, vista por centros, estadísticas, cobertura, etc.

Ser determinista: dado un empleado + fecha → retornar siempre un único horario efectivo.

🧱 1. Reutilización del Sistema Actual

Gemini debe partir del modelo ya implementado en backend, que incluye:

ScheduleTemplate

SchedulePeriod

DayPattern

TimeSlot

ExceptionDayOverride

Este núcleo ya funciona correctamente para horarios fijos e intensivos.
➡ No debe reescribirse ni reemplazarse, solo ampliarse.

🔀 2. Nuevos Bloques que Deben Añadirse

Para cubrir todos los escenarios reales, Gemini debe implementar dos capas nuevas complementarias:

A. Turnos Rotativos (Shift Rotation)
Qué son

Patrones repetitivos para colectivos como:

Policía

Bomberos

Fábricas

Sanidad

Call centers

Ejemplos:

6x6 (6 día trabajo / 6 descanso)

M → T → N → Libranza

24h → 3 días libres

Qué debe implementar Gemini

ShiftRotationPattern (representa el ciclo completo)

ShiftRotationStep (cada paso del ciclo: duración y turno asociado)

EmployeeRotationAssignment (asignar el patrón a un empleado con rotationStartDate)

Importante

Cada paso referencia ScheduleTemplates ya existentes, no crea horarios nuevos.

B. Turnos Planificables Manualmente (Planning / Rostering)

Necesario para:

Tiendas

Hostelería

Supermercados

Hospitales/residencias

Centros multicentro

Equipos con planificación semanal o mensual

Qué debe implementar Gemini

ShiftTemplate

Definición reutilizable de un turno: mañana, tarde, cierre, partido, etc.

ManualShiftAssignment

Asignación manual: empleado + fecha + tipo de turno

Opcional: override de horas en caso puntual

Compatibilidad con UI futura

Debe prepararse para vistas:

Semanal/mensual

Drag & drop estilo Factorial/Sesame

Vista por centros (multicentro)

Vista de cobertura: cuántas personas hay por franja

Gemini no debe implementar la UI, pero sí dejar listo el backend.

🧮 3. Jerarquía de Resolución de Horario Efectivo

Para cualquier consulta del estilo:

“¿Qué horario tiene este empleado el 14 de abril?”

Gemini debe programar esta jerarquía determinista:

ManualShiftAssignment

ExceptionDayOverride

EmployeeRotationAssignment + ShiftRotationPattern

Horario fijo (ScheduleTemplate)

Descanso

Esta jerarquía debe estar centralizada y ser reutilizada.

🧩 4. Buenas Prácticas y Principios Técnicos

1. Reutilización

Ni turnos rotativos ni manuales deben duplicar lógica de ScheduleTemplate.

Siempre referenciar plantillas existentes.

2. Composición

Un turno es simplemente un ScheduleTemplate + un paso de la rotación o un assignment manual.

3. Extensibilidad

La estructura debe permitir añadir nuevos tipos de turnos o pasos sin tocar el motor.

4. Eficiencia

Las consultas de planificación semanal deben ser optimizadas (batch queries).

5. Separación de responsabilidades

Motor de cálculo (qué turno aplica)

Persistencia (qué se guardó)

Lógica UI-ready (qué se muestra)

🏗️ 5. Enfoque para Gemini (No técnico en exceso)

Gemini debe:

Leer el código actual y encontrar el punto donde se calcula el horario efectivo.

Añadir nuevos modelos (rotación + planificación).

Implementar función única:

getEffectiveSchedule(employeeId, date)

con la jerarquía establecida.

Añadir endpoints para:

obtener planificación semanal,

obtener turnos disponibles,

gestionar rotaciones y asignaciones,

sobrescrituras manuales.

Mantener compatibilidad con PTO basado en minutos.

🌐 6. Consideraciones para Multicentro

Añadir locationId opcional en turnos manuales y plantillas.

Permitir filtrar vistas por centro.

Preparar para validar que un centro tenga suficiente personal asignado.

📦 7. Resultado Esperado

Al finalizar, el backend debe poder:

Resolver cualquier tipo de turno (fijo, rotativo, manual).

Servir datos para UI drag & drop sin cambios posteriores.

Ser compatible con sector privado (tiendas/oficinas) y público (turnos complejos).

Mantener la lógica de horarios actual sin romper nada.
