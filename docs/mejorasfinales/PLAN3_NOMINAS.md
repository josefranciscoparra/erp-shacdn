# PLAN 3 – Subida Masiva de Nóminas

## 🎯 Objetivo
Permitir que RRHH suba todas las nóminas mensuales de forma masiva: ya sea en un único PDF multipágina o un ZIP con PDFs individuales.

---

## 1. Subida de ZIP

### Requisitos
- ZIP contiene PDFs individuales.
- El sistema:
  - Lee cada PDF.
  - Intenta asignar automáticamente al empleado mediante:
    - DNI
    - Código interno
    - Nombre completo
  - Si falla, pasa a estado “No asignado” para resolución manual.

---

## 2. Subida de un PDF Multipágina

### Requisitos
- Dividir por páginas.
- Tareas:
  - OCR para detectar DNI / nombre / código.
  - Mecanismo de fallback si OCR falla.
  - Vista para asignación manual (drag&drop o selector).

---

## 3. Revisión Manual
- Pantalla de revisión que muestre:
  - PDF dividido.
  - Página y empleado detectado.
  - Botón de “Asignar manualmente”.
  - Lista de páginas no asignadas.

---

## 4. Notificaciones y Registro
- Cada empleado recibe notificación cuando su nómina es asignada.
- Crear historial:
  - Fecha de subida.
  - Nº de documentos procesados.
  - Nº fallidos.
  - Responsable de la subida.
