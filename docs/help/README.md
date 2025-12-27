# Guía de Generación de Documentación de Ayuda - TimeNow ERP

Este documento contiene las instrucciones maestras para generar documentación de ayuda para usuarios finales del ERP TimeNow.

## Estructura de Carpetas

```
/docs/help/
  README.md                    # Este archivo
  TRACKING.md                  # Estado de cada manual
  /es/
    00-indice.md               # Índice general
    /01-onboarding/            # Configuración inicial
    /02-empleado/              # Mi espacio, perfil
    /03-admin/                 # Gestión de empleados, estructura
    /04-fichajes/              # Control horario (PRIORIDAD 1)
    /05-horarios/              # Sistema de horarios V2.0
    /06-ausencias/             # PTO, vacaciones
    /07-aprobaciones/          # Hub de aprobaciones
    /08-gastos/                # Gestión de gastos
    /09-alertas/               # Sistema de alertas
    /10-nominas/               # Nóminas
    /11-documentos/            # Gestión documental
    /12-firmas/                # Firmas electrónicas
    /13-calendarios/           # Calendarios laborales
    /14-turnos/                # Gestión de turnos
    /99-faq/                   # Preguntas frecuentes
  /assets/
    /img-placeholders/         # Referencias de imágenes
```

---

## Prompt Maestro para Claude Code

Usa este prompt como base. Modifica SOLO las secciones marcadas con `<REEMPLAZAR>`.

```markdown
Eres un redactor técnico senior para TimeNow, un SaaS de RRHH. Vas a generar documentación de ayuda para usuarios finales basándote EXCLUSIVAMENTE en el código del repositorio y en el comportamiento real de la UI. No inventes features ni pantallas: si algo no está claro en el código, indícalo como "⚠️ Pendiente de confirmar" y propón dónde buscarlo.

## OBJETIVO
- Generar el manual "<REEMPLAZAR: Nombre del módulo>" en español, en formato Markdown, listo para un centro de ayuda.
- Debe cubrir: <REEMPLAZAR: lista de funcionalidades principales>
- Debe diferenciar EMPLEADO vs ADMIN/RRHH si hay pantallas distintas.
- Incluir errores típicos SOLO si existen en el código.

## FORMATO Y SALIDA
- Devuelve SOLO un archivo Markdown completo.
- Usa la plantilla obligatoria (ver abajo).
- Usa pasos numerados y nombres exactos de menús y botones.

## IMÁGENES
- Inserta placeholders con esta sintaxis EXACTA:
  ![IMG: <slug-corto> | Pantalla: <nombre> | Elementos clave: <lista> | Acción destacada: <acción>]

## TONO Y ESTILO
- Directo, claro, sin marketing.
- Usa el "tú" (España).
- Evita párrafos largos; prioriza bullets.
- Máximo 7 pasos por flujo; si hay más, dividir en "Opción A / Opción B"

## FORMATO COMPATIBLE CON NOTION (OBLIGATORIO)
- Usa Markdown estándar, compatible con Notion.
- NO uses HTML.
- NO uses bloques personalizados (callouts, tabs, accordions).
- NO uses tablas complejas (máx. 2 columnas; si no, usa listas).
- Usa solo:
  - # ## ### para títulos
  - Listas numeradas para pasos
  - Listas con guiones para bullets
  - **Negrita** y _cursiva_ simples
  - Bloques de código solo si es imprescindible
- El contenido debe poder copiarse y pegarse directamente en Notion sin perder estructura.

## PLANTILLA OBLIGATORIA

# <Título del módulo>

## Qué es y para qué sirve
(1-2 párrafos cortos explicando el propósito)

## Quién puede usarlo
- **Empleados**: (qué pueden hacer)
- **Managers/Supervisores**: (qué pueden hacer)
- **Administradores/RRHH**: (qué pueden hacer)

## Antes de empezar (requisitos)
- Requisito 1
- Requisito 2

## Flujos principales

### 1) <Nombre del flujo>
**Cuándo usarlo**: (1 frase)

**Pasos**:
1. Paso 1
2. Paso 2
3. ...

**Resultado esperado**: (qué debe pasar al completar)

**Errores comunes y solución**:
| Síntoma | Causa | Solución |
|---------|-------|----------|
| ... | ... | ... |

### 2) <Siguiente flujo>
(repetir estructura)

## Pantallas y campos (glosario)
| Campo/Elemento | Descripción |
|----------------|-------------|
| ... | ... |

## Políticas y reglas (validaciones/negocio)
- Regla 1
- Regla 2

## Preguntas frecuentes
**P: ¿Pregunta común?**
R: Respuesta clara.

## Checklist de soporte (para diagnosticar rápido)
- [ ] ¿El usuario tiene permisos de X?
- [ ] ¿La organización tiene habilitado Y?
- [ ] ¿El navegador permite Z?

---
Última revisión: YYYY-MM-DD
Versión del producto: <deducir del código o 'N/A'>
Owner interno: TimeNow Team

## ANÁLISIS DEL REPO (hazlo antes de escribir)
1. Localiza las pantallas del módulo (pages/routes/components) y sus textos visibles.
2. Localiza acciones servidor/handlers/APIs relacionadas.
3. Identifica estados: vacío, cargando, error, éxito.
4. Identifica permisos/roles que habilitan o restringen acciones.
5. Identifica validaciones: fechas, rangos, solapes, límites, etc.
6. Identifica mensajes de error/toast/alert (texto exacto si aparece).

## MÓDULO OBJETIVO
- Nombre: <REEMPLAZAR: Nombre del módulo>
- Alcance: <REEMPLAZAR: qué incluye y qué NO incluye>

## RUTAS A ANALIZAR
<REEMPLAZAR: lista de rutas del código a explorar>
```

---

## Prompts Pre-configurados por Módulo

### Fichajes (Control Horario) - PRIORIDAD 1

```markdown
## MÓDULO OBJETIVO
- Nombre: Fichajes (Control Horario)
- Alcance:
  - INCLUYE: fichar entrada/salida, pausas, fichajes manuales, historial, geolocalización, resumen del día
  - NO INCLUYE: horarios (ver módulo Horarios), alertas (ver módulo Alertas)

## RUTAS A ANALIZAR
- src/app/(main)/dashboard/me/clock/ (página principal de fichaje)
- src/app/(main)/dashboard/me/clock/_components/ (componentes)
- src/server/actions/time-tracking.ts
- src/server/actions/time-clock-validations.ts
- src/server/actions/clock-bootstrap.ts
- src/server/actions/geolocation.ts
- src/server/actions/employee-schedule.ts
- src/hooks/use-geolocation.ts
- src/components/time-clock/ (widgets)
```

### Ausencias/PTO - PRIORIDAD 2

```markdown
## MÓDULO OBJETIVO
- Nombre: Ausencias y Vacaciones (PTO)
- Alcance:
  - INCLUYE: solicitar ausencia, ver saldo, tipos de ausencia, aprobar/rechazar
  - NO INCLUYE: calendarios laborales (ver módulo Calendarios)

## RUTAS A ANALIZAR
- src/app/(main)/dashboard/me/pto/ (empleado)
- src/app/(main)/dashboard/employees/[id]/pto/ (admin)
- src/server/actions/employee-pto.ts
- src/server/actions/admin-pto.ts
- src/server/actions/approver-pto.ts
- src/server/actions/pto-balance.ts
- src/server/actions/absence-types.ts
```

### Aprobaciones - PRIORIDAD 3

```markdown
## MÓDULO OBJETIVO
- Nombre: Hub de Aprobaciones
- Alcance:
  - INCLUYE: aprobar PTO, aprobar gastos, aprobar alertas, aprobar tiempo manual
  - NO INCLUYE: configuración de flujos de aprobación

## RUTAS A ANALIZAR
- src/app/(main)/dashboard/approvals/ (hub principal)
- src/server/actions/approvals.ts
- src/server/actions/approver-pto.ts
- src/server/actions/expense-approvals.ts
- src/server/actions/approver-manual-time-entry.ts
```

### Gastos - PRIORIDAD 4

```markdown
## MÓDULO OBJETIVO
- Nombre: Gestión de Gastos
- Alcance:
  - INCLUYE: crear gasto, expedientes, aprobar, reembolsar, políticas
  - NO INCLUYE: contabilidad/facturación

## RUTAS A ANALIZAR
- src/app/(main)/dashboard/expenses/ (admin)
- src/app/(main)/dashboard/me/expenses/ (empleado)
- src/server/actions/expenses.ts
- src/server/actions/expense-approvals.ts
- src/server/actions/expense-analytics.ts
- src/server/actions/expense-policies.ts
- src/server/actions/expense-reimbursements.ts
```

---

## Reglas de Estilo

### Formato de Errores Comunes
```markdown
| Síntoma | Causa | Solución |
|---------|-------|----------|
| "Ya has fichado entrada hoy" | Intento de fichaje duplicado | Espera a fichar salida primero |
| GPS no disponible | Permisos denegados | Activar ubicación en ajustes del navegador |
```

### Formato de Placeholder de Imagen
```markdown
![IMG: fichaje-entrada | Pantalla: Reloj de fichaje | Elementos clave: botón Entrada, hora actual, historial | Acción destacada: Click en botón Entrada]
```

### Checklist de Soporte (ejemplo)
```markdown
## Checklist de soporte
- [ ] ¿Qué usuario/email tiene el problema?
- [ ] ¿En qué organización está?
- [ ] ¿Qué fecha/hora intentó la acción?
- [ ] ¿Qué navegador y versión usa?
- [ ] ¿Tiene permisos de geolocalización activos?
- [ ] ¿Hay capturas de pantalla del error?
```

---

## Flujo de Trabajo

1. **Antes de empezar**: Revisa `TRACKING.md` para ver qué módulos están pendientes
2. **Ejecutar prompt**: Copia el prompt maestro + la sección del módulo específico
3. **Revisar output**: Verifica que no haya features inventadas
4. **Guardar archivo**: En la carpeta correspondiente de `/docs/help/es/`
5. **Actualizar tracking**: Marca como "Completado" en `TRACKING.md`

---

## Convenciones de Nombres de Archivo

- Usar kebab-case: `fichajes.md`, `aprobar-ausencias.md`
- Sin acentos ni caracteres especiales
- Nombres descriptivos y cortos
- Un archivo por flujo principal (si es complejo, dividir)

---

## Notas Importantes

1. **NUNCA inventar features** - Si no está en el código, no lo documentes
2. **Textos exactos** - Usa los labels reales de la UI
3. **Errores reales** - Solo documenta errores que existan en el código
4. **Safari** - Mencionar limitaciones de Safari (GPS, etc.) cuando aplique
5. **RGPD** - Incluir notas de consentimiento cuando hay datos sensibles (GPS)
