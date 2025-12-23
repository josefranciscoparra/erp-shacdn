# PLAN 2 – Justificantes de Ausencias

## 🎯 Objetivo

Añadir aportación documental para justificar ausencias sin alterar el flujo de aprobación ya existente.

---

## Requisitos Funcionales

- Permitir subir justificantes en:
  - PDF
  - JPG/PNG
- Campos:
  - Tipo de ausencia (ya existente en TimeNow).
  - Comentarios del empleado.
  - Archivo justificante.
- Vista de detalle de ausencia con:
  - Justificante adjunto.
  - Historial del estado.
- Auditoría automática:
  - Usuario que sube el justificante.
  - Fecha.
  - Cambios de estado.

---

## Integración

- Respetar flujos existentes:
  - Solicitud → Revisión → Aprobación/Rechazo.
- No cambiar roles actuales.
- Incluir filtro “Con justificante” en la vista general.
