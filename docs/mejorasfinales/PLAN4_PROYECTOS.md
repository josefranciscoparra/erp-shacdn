# PLAN 4 – Proyectos en Fichajes

## 🎯 Objetivo

Mejorar el módulo de fichajes permitiendo asignar proyectos, abiertos o restringidos a determinadas personas.

---

## Requisitos

### Creación de Proyectos

- Campos:
  - Nombre del proyecto.
  - Estado.
  - Activación/desactivación.
  - Tipo:
    - Proyecto abierto (para todos).
    - Proyecto asignado solo a X trabajadores.

### Asignación

- Si el proyecto está asignado a personas:
  - Solo esos usuarios ven el proyecto en el selector de fichaje.
- Si es abierto:
  - Todos lo ven.

---

## Integración con Fichajes

- En un fichaje debe poder seleccionarse:
  - Proyecto
  - (Opcional) Tarea o subcategoría si existe

---

## Informes

- Horas por proyecto.
- Horas por persona dentro del proyecto.
- Vista semanal agrupada.
- Exportación.
