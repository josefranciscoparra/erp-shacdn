# Guía de Compatibilidad Safari

Este documento detalla problemas comunes de Safari y sus soluciones probadas en este proyecto.

---

## Problema 1: Footer Sticky con Backdrop Blur

### ❌ Síntoma
- **Chrome**: Footer con efecto glass/blur perfecto
- **Safari**: Footer con caja blanca rara, sin difuminado, zona inferior mal posicionada

### 🔍 Diagnóstico
Safari tiene problemas históricos con `backdrop-filter`:
- No soporta `backdrop-filter` sin el prefijo `-webkit-backdrop-filter`
- A veces no aplica el blur incluso con el prefijo
- Problemas con `overflow`, `transform`, `perspective` en contenedores padre

### ❌ Soluciones Intentadas (NO funcionaron)
1. **Clase custom con `-webkit-backdrop-filter`**:
   ```css
   .wizard-glass-footer {
     backdrop-filter: blur(16px);
     -webkit-backdrop-filter: blur(16px);
     background-color: hsl(var(--background) / 0.75);
   }
   ```
   **Resultado**: Safari seguía sin aplicar el blur correctamente

2. **@supports con detección de Safari**:
   ```css
   @supports (-webkit-backdrop-filter: blur(1px)) and (not (backdrop-filter: blur(1px))) {
     .wizard-action-bar {
       backdrop-filter: none;
       background-color: hsl(var(--background));
     }
   }
   ```
   **Resultado**: Mejora parcial pero seguía viéndose mal

### ✅ Solución Final (SÍ funcionó)
**Fondo sólido para Safari, glass para Chrome**:

```css
/* globals.css */
.wizard-action-bar {
  backdrop-filter: blur(16px);
  background-color: hsl(var(--background) / 0.95);
}

@supports (backdrop-filter: blur(1px)) {
  .wizard-action-bar {
    backdrop-filter: blur(16px);
    background-color: hsl(var(--background) / 0.6);
  }
}

@supports (-webkit-backdrop-filter: blur(1px)) and (not (backdrop-filter: blur(1px))) {
  .wizard-action-bar {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background-color: hsl(var(--background));
  }
}
```

```tsx
// Component
<div className="wizard-action-bar bg-background border-t">
  {/* Contenido del footer */}
</div>
```

**Resultado**:
- ✅ Chrome: Efecto glass bonito
- ✅ Safari: Fondo sólido limpio (sin efectos raros)
- ✅ Dark mode compatible
- ✅ Todos los temas funcionan

---

## Problema 2: Líneas Conectoras del Wizard Invisibles en Safari

### ❌ Síntoma
- **Chrome**: Líneas conectoras entre pasos 1→2→3 visibles
- **Safari**: Líneas completamente invisibles

### 🔍 Diagnóstico
Safari tiene problemas renderizando elementos con:
- `background-color` con opacidad (`bg-gray-300/30` de Tailwind)
- Alturas muy pequeñas (`h-0.5` = 2px)
- Colores con `hsl()` y opacidades

### ❌ Soluciones Intentadas (NO funcionaron)

#### 1. Aumentar grosor con Tailwind
```tsx
<div className="h-1 w-full bg-muted-foreground/30" />
```
**Resultado**: Más grueso en Chrome, INVISIBLE en Safari

#### 2. Colores sólidos en CSS con clases custom
```css
.wizard-connector-line {
  background-color: #e5e7eb; /* gray-200 */
}
```
**Resultado**: INVISIBLE en Safari

#### 3. Usar `border-top` en lugar de `background`
```css
.wizard-connector-line {
  height: 0;
  border-top: 2px solid #d1d5db;
}
```
**Resultado**: INVISIBLE en Safari

#### 4. Usar elemento `<hr>`
```tsx
<hr className="w-24 border-0 border-t-2 border-gray-300" />
```
**Resultado**: INVISIBLE en Safari

### ✅ Solución Final (SÍ funcionó)
**Estilos inline con colores hex sólidos**:

```tsx
{/* Desktop */}
{!isLast && (
  <div
    style={{
      width: "96px",
      height: "2px",
      backgroundColor: isCompleted ? "#10b981" : "#d1d5db",
      transition: "all 300ms",
    }}
  />
)}

{/* Mobile */}
{index < steps.length - 1 && (
  <div
    style={{
      width: "24px",
      height: "2px",
      backgroundColor: "#d1d5db",
      margin: "0 4px",
    }}
  />
)}
```

**Por qué funciona**:
- ✅ Estilos inline (Safari no puede ignorarlos)
- ✅ Colores hex sólidos sin opacidad (`#d1d5db` en lugar de `hsl()` o Tailwind)
- ✅ Dimensiones explícitas en `px`
- ✅ Sin clases de Tailwind que Safari pueda malinterpretar
- ✅ Chrome no cambia (mismas dimensiones y colores)

---

## Problema 3: Layout con `h-screen` y Footer Fixed

### ❌ Síntoma
- **Chrome**: Layout correcto, footer pegado abajo
- **Safari**: Footer fuera del viewport, botones no accesibles, scroll raro

### 🔍 Diagnóstico
Safari calcula `100vh` diferente que Chrome:
- En Safari, `100vh` incluye la barra de navegación del navegador
- `position: fixed` con `bottom: 0` se posiciona fuera del viewport visible
- `overflow` y `h-screen` causan conflictos

### ✅ Solución Final
**Usar `min-h-screen` + flexbox + `sticky`**:

```tsx
<div className="flex min-h-screen flex-col gap-4 md:gap-6">
  {/* Header */}
  <div className="space-y-2">
    <WizardSteps />
  </div>

  {/* Contenido - flex-1 empuja el footer al final */}
  <div className="flex-1">
    {/* Formularios */}
  </div>

  {/* Footer - sticky en lugar de fixed */}
  <StickyActionBar />
</div>
```

```tsx
// StickyActionBar.tsx
<div className="sticky bottom-0 z-50 mt-auto">
  <div className="wizard-action-bar bg-background border-t">
    {/* Botones */}
  </div>
</div>
```

**Por qué funciona**:
- ✅ `min-h-screen` permite crecer más allá del viewport
- ✅ `flex-1` en contenido empuja el footer al final
- ✅ `sticky` mantiene el footer en el flujo del documento (no fixed)
- ✅ `mt-auto` empuja el footer al final del contenedor flex
- ✅ Safari y Chrome funcionan igual

### ❌ Padding Incorrecto
**Antes**: `pb-40` en formularios para compensar el footer fixed
**Después**: `pb-6` porque el footer está en el flujo del documento

---

## Reglas Generales para Safari

### 1. **Backdrop Filter / Blur**
- ❌ NUNCA confíes en que `backdrop-filter` funcione en Safari
- ✅ SIEMPRE tener fallback con fondo sólido
- ✅ Usar `@supports` para detectar soporte
- ✅ Aceptar que Safari tendrá fondo sólido si el blur no funciona

### 2. **Elementos Visuales Pequeños (líneas, bordes, etc.)**
- ❌ NUNCA usar Tailwind con opacidades para elementos críticos (`bg-gray-300/30`)
- ❌ NUNCA usar `hsl()` con opacidades en elementos pequeños
- ❌ NUNCA confiar en que Safari renderice `h-0.5` o `h-1`
- ✅ SIEMPRE usar estilos inline con colores hex sólidos
- ✅ SIEMPRE usar dimensiones explícitas en `px` (ej: `height: "2px"`)
- ✅ Elementos críticos con `height` >= 2px

### 3. **Componentes Interactivos (Switch, Checkbox, etc.)**
- ❌ NUNCA confiar en Tailwind para fondos condicionales (`data-[state=unchecked]:bg-gray-300`)
- ❌ NUNCA usar variables CSS en elementos interactivos pequeños
- ✅ SIEMPRE usar clases CSS custom con colores hex + `!important`
- ✅ SIEMPRE aplicar GPU acceleration (`translateZ(0)`)
- ✅ SIEMPRE usar `backface-visibility: hidden` para elementos con animaciones
- ✅ SIEMPRE probar estados checked/unchecked en Safari

### 4. **Layout Viewport**
- ❌ NUNCA usar `h-screen` + `position: fixed` para footers
- ❌ NUNCA usar `overflow-hidden` en contenedores con sticky/fixed
- ✅ SIEMPRE usar `min-h-screen` + flexbox
- ✅ SIEMPRE usar `position: sticky` en lugar de `fixed` cuando sea posible
- ✅ SIEMPRE usar `flex-1` en el contenido y `mt-auto` en el footer

### 5. **Testing Cross-Browser**
- ✅ SIEMPRE probar en Safari cuando uses:
  - `backdrop-filter`
  - Elementos pequeños (`< 2px`)
  - Opacidades en elementos visuales
  - `position: fixed` con viewport units
  - Layouts complejos con scroll
  - Componentes interactivos (Switch, Checkbox, Toggle)
  - Elementos con fondos condicionales basados en estados

### 6. **Estrategia de Fallback**
```css
/* Patrón recomendado */
.elemento {
  /* Base: comportamiento por defecto */
}

@supports (propiedad-moderna: valor) {
  .elemento {
    /* Chrome/Firefox: efecto premium */
  }
}

@supports not (propiedad-moderna: valor) {
  .elemento {
    /* Safari: versión sólida/simple */
  }
}
```

---

## Problema 4: Iconos Check del Wizard con Fondo Verde Invisible

### ❌ Síntoma
- **Chrome**: Check icons con fondo verde circular visible
- **Safari**: Check blanco pero fondo verde invisible/transparente

### 🔍 Diagnóstico
Safari ignoraba las clases Tailwind para background en elementos con animaciones y SVG:
- `bg-emerald-500` no se aplicaba correctamente
- Animaciones interferían con el rendering del background
- SVG dentro del contenedor causaba problemas de z-index

### ✅ Solución Final
**Estilos inline con colores hex + GPU acceleration**:

```tsx
// wizard-steps.tsx
<div
  className={cn(
    "flex h-10 w-10 items-center justify-center rounded-full border-2",
    isCompleted && "wizard-step-completed",
  )}
  style={
    isCompleted
      ? {
          backgroundColor: "#10b981",
          borderColor: "#10b981",
          color: "#ffffff",
        }
      : undefined
  }
>
  {isCompleted ? (
    <Check
      className="h-5 w-5"
      style={{ color: "#ffffff", stroke: "#ffffff" }}
      strokeWidth={2.5}
    />
  ) : (
    <span>{stepNumber}</span>
  )}
</div>
```

```css
/* globals.css */
.wizard-step-completed {
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
```

**Por qué funciona**:
- ✅ Estilos inline tienen máxima prioridad (Safari no puede ignorarlos)
- ✅ Colores hex explícitos sin variables CSS
- ✅ `translateZ(0)` fuerza GPU acceleration
- ✅ `backface-visibility: hidden` elimina bugs de rendering en Safari
- ✅ Check icon con stroke explícito para máxima visibilidad

---

## Problema 5: Switch Component Invisible en Safari

### ❌ Síntoma
- **Chrome**: Switch se ve perfecto, colores claros cuando está `unchecked`
- **Safari**: Switch casi invisible, muy claro, especialmente en estado `unchecked`

### 🔍 Diagnóstico
Safari tiene problemas renderizando el componente Switch cuando usa:
- Clases Tailwind con opacidades (`data-[state=unchecked]:bg-gray-300`)
- Variables CSS en elementos interactivos pequeños
- Background colors condicionales basados en data attributes

**Código problemático**:
```tsx
<Switch
  className="data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
/>
```

### ✅ Solución Final
**Clase CSS custom con colores hex sólidos + GPU acceleration**:

```tsx
// wizard-step-2-contract.tsx & wizard-step-3-schedule.tsx
<Switch
  id="skip-contract"
  checked={skipContract}
  onCheckedChange={setSkipContract}
  className="wizard-switch"
/>
```

```css
/* globals.css */
.wizard-switch[data-state="unchecked"] {
  background-color: #d1d5db !important; /* gray-300 light mode */
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.dark .wizard-switch[data-state="unchecked"] {
  background-color: #4b5563 !important; /* gray-600 dark mode */
}

/* Asegurar que el estado checked también sea visible en Safari */
.wizard-switch[data-state="checked"] {
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
```

**Por qué funciona**:
- ✅ `!important` + colores hex Safari no puede ignorar (solo en `unchecked`)
- ✅ Estado `checked` usa color primary del tema (sin `!important`)
- ✅ Selector específico `[data-state="unchecked"]` para estado sin marcar
- ✅ GPU acceleration con `translateZ(0)` en ambos estados
- ✅ `backface-visibility: hidden` elimina artefactos visuales
- ✅ Dark mode con selector `.dark` separado
- ✅ Chrome mantiene misma apariencia en ambos estados

**Archivos modificados**:
- `/src/app/globals.css` (líneas 423-444)
- `/src/app/(main)/dashboard/employees/new/_components/wizard-step-2-contract.tsx` (línea 126)
- `/src/app/(main)/dashboard/employees/new/_components/wizard-step-3-schedule.tsx` (línea 55)

---

## Checklist Pre-Deploy

Antes de hacer deploy, verificar en Safari:

- [ ] Footer sticky/fixed visible y accesible
- [ ] Efectos blur funcionan o tienen fallback digno
- [ ] Líneas divisoras visibles
- [ ] Bordes de elementos visibles
- [ ] Layout no se rompe en Safari mobile
- [ ] Scroll funciona correctamente
- [ ] Botones accesibles (no fuera del viewport)
- [ ] Elementos pequeños (`< 3px`) son visibles
- [ ] Switch components visibles en ambos estados (checked/unchecked)
- [ ] Iconos con fondos de color visibles (no transparentes)

---

## Referencias Útiles

- [Can I Use: backdrop-filter](https://caniuse.com/css-backdrop-filter)
- [Safari 100vh issue](https://allthingssmitty.com/2020/05/11/css-fix-for-100vh-in-mobile-webkit/)
- [CSS @supports](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports)
