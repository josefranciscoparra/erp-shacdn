# Sistema de Diseño de Formularios TimeNow

**Versión**: 1.0
**Última actualización**: 2025-01-13
**Compatible con**: Safari, Chrome, Firefox

Este documento define el sistema de diseño visual para **todos los formularios** de TimeNow, garantizando:
- ✅ Jerarquía visual clara (nivel Factorial/Linear/Notion)
- ✅ Compatibilidad total con Safari
- ✅ Microinteracciones premium
- ✅ Accesibilidad y focus states
- ✅ Responsive design

---

## 📐 Estructura Base

### 1. Container Principal del Formulario

**Para páginas completas o wizards:**

```tsx
<form className="mx-auto max-w-4xl space-y-8">
  {/* Contenido del formulario */}
</form>
```

**Para dialogs (más compacto):**

```tsx
<form className="space-y-6">
  {/* Contenido del formulario */}
</form>
```

**Claves**:
- `max-w-4xl`: Ancho máximo óptimo para lectura
- `mx-auto`: Centrado horizontal
- `space-y-8`: Espaciado generoso entre secciones

---

### 2. Card Premium

**Estructura completa:**

```tsx
<Card className="overflow-hidden rounded-xl border shadow-sm transition-shadow duration-200 hover:shadow-md">
  <CardContent className="space-y-8 p-6 md:p-8">
    {/* Secciones del formulario */}
  </CardContent>
</Card>
```

**Variantes**:

```tsx
// Sin hover effect (para dialogs pequeños)
<Card className="overflow-hidden rounded-xl border shadow-sm">
  <CardContent className="space-y-6 p-6">
    {/* ... */}
  </CardContent>
</Card>

// Con animación de entrada (para wizards)
<div className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
  <Card className="overflow-hidden rounded-xl border shadow-sm">
    {/* ... */}
  </Card>
</div>
```

**Claves**:
- `overflow-hidden`: Evita desbordamientos en Safari
- `rounded-xl`: Esquinas modernas (12px)
- `shadow-sm` → `hover:shadow-md`: Elevación sutil
- `p-6 md:p-8`: Padding responsivo

---

## 🎨 Secciones con Iconos

### Patrón: Header de Sección

**Código completo:**

```tsx
<div className="space-y-4">
  {/* Header con icono */}
  <div className="flex items-center gap-3 pb-2">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
      <Briefcase className="text-primary h-5 w-5" />
    </div>
    <Label className="text-xl font-semibold tracking-tight">Información del Contrato</Label>
  </div>

  {/* Campos del formulario */}
  <div className="grid gap-3 md:grid-cols-3">
    {/* FormFields aquí */}
  </div>
</div>
```

### Colores de Iconos por Categoría

**Primary (azul/morado) - General:**
```tsx
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
  <Briefcase className="text-primary h-5 w-5" />
</div>
```

**Emerald (verde) - Dinero/Finanzas:**
```tsx
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
  <span className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">€</span>
</div>
```

**Blue (azul claro) - Organización:**
```tsx
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
  <Building2 className="text-blue-600 dark:text-blue-400 h-5 w-5" />
</div>
```

**Amber (naranja) - Alertas/Tiempo:**
```tsx
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
  <Clock className="text-amber-600 dark:text-amber-400 h-5 w-5" />
</div>
```

**Red (rojo) - Peligro/Eliminar:**
```tsx
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
  <Trash2 className="text-red-600 dark:text-red-400 h-5 w-5" />
</div>
```

### Subtítulo Opcional

```tsx
<div className="flex items-baseline gap-2">
  <Label className="text-xl font-semibold tracking-tight">Organización</Label>
  <span className="text-muted-foreground text-sm font-normal">(Opcional)</span>
</div>
```

---

## 📏 Separadores entre Secciones

**Estándar:**

```tsx
<hr className="border-muted-foreground/20 my-6" />
```

**Más sutil (para dialogs):**

```tsx
<hr className="border-muted my-4" />
```

**Claves**:
- `border-muted-foreground/20`: Más sutil que muted
- `my-6`: Espaciado vertical generoso

---

## 📝 Inputs Premium

### Input con Icono

```tsx
<FormField
  control={form.control}
  name="weeklyHours"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Horas Semanales *</FormLabel>
      <FormControl>
        <div className="relative">
          <Clock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
          <Input
            type="number"
            placeholder="40"
            className="pl-9 transition-all duration-150 focus:ring-2 focus:ring-primary/20"
            {...field}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Input Simple con Focus Ring

```tsx
<Input
  type="text"
  placeholder="Escribe aquí..."
  className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
/>
```

### Input de Moneda (Salario)

```tsx
<div className="relative">
  <span className="text-muted-foreground absolute top-3 left-3 text-sm font-medium">€</span>
  <Input
    type="number"
    min="0"
    step="100"
    placeholder="30000"
    className="pl-8 transition-all duration-150 focus:ring-2 focus:ring-primary/20"
    {...field}
  />
</div>
```

**Claves del Focus Ring**:
- `focus:ring-2`: Anillo de 2px
- `focus:ring-primary/20`: Color primary con 20% opacidad
- `transition-all duration-150`: Transición suave

---

## 🎯 Grids Responsivos

### Grid de 2 columnas

```tsx
<div className="grid gap-3 md:grid-cols-2">
  <FormField ... />
  <FormField ... />
</div>
```

### Grid de 3 columnas

```tsx
<div className="grid gap-3 md:grid-cols-3">
  <FormField ... />
  <FormField ... />
  <FormField ... />
</div>
```

### Grid de 4 columnas (para días de la semana)

```tsx
<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
  {/* Lunes - Domingo */}
</div>
```

**Claves**:
- `gap-3`: 12px entre columnas
- `md:grid-cols-X`: Desktop muestra X columnas
- Mobile siempre 1 columna (por defecto)

---

## 🎛️ Toggles y Switches

### Switch Card (Estilo Premium)

```tsx
<div className="flex items-center justify-between rounded-xl border-2 border-muted bg-muted/30 p-5 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md">
  <div className="flex-1 space-y-1">
    <Label htmlFor="skip-option" className="text-lg font-semibold">
      Configurar más tarde
    </Label>
    <p className="text-muted-foreground text-sm leading-relaxed">
      Usaremos valores por defecto. Podrás editarlo después.
    </p>
  </div>
  <Switch
    id="skip-option"
    checked={skipOption}
    onCheckedChange={setSkipOption}
    className="data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
  />
</div>
```

### Toggle Simple (Dentro de Card)

```tsx
<FormItem className="flex flex-col gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-5 transition-all duration-200 hover:border-primary/40 hover:bg-muted/30 md:flex-row md:items-center md:justify-between">
  <div className="space-y-1">
    <FormLabel className="text-base">Patrón semanal personalizado</FormLabel>
    <FormDescription>
      Activa esta opción para definir horas diferentes para cada día.
    </FormDescription>
  </div>
  <FormControl>
    <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
  </FormControl>
</FormItem>
```

**Claves Switch Visibility**:
- Safari oculta switches con fondo muy claro
- Solución: `data-[state=unchecked]:bg-gray-300`

---

## 🎨 Paneles Condicionales

### Panel con Fondo de Color (Success/Warning)

**Estado Success (verde):**

```tsx
<div className="space-y-5 rounded-xl border-2 p-6 shadow-sm border-emerald-300 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-900/20">
  {/* Contenido cuando todo está bien */}
</div>
```

**Estado Warning (naranja):**

```tsx
<div className="space-y-5 rounded-xl border-2 p-6 shadow-sm border-orange-300 bg-orange-50/60 dark:border-orange-700 dark:bg-orange-900/20">
  {/* Contenido cuando hay advertencia */}
</div>
```

**Condicional:**

```tsx
<div
  className={`space-y-5 rounded-xl border-2 p-6 shadow-sm ${
    isValid
      ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-700 dark:bg-emerald-900/20"
      : "border-orange-300 bg-orange-50/60 dark:border-orange-700 dark:bg-orange-900/20"
  }`}
>
  {/* Contenido */}
</div>
```

---

## 🚨 Alerts Premium

### Info (Azul)

```tsx
<Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
  <Info className="h-4 w-4 text-blue-600" />
  <AlertDescription className="text-blue-800 dark:text-blue-200">
    Se mantendrán los valores por defecto.
  </AlertDescription>
</Alert>
```

### Warning (Naranja)

```tsx
<Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
  <AlertTriangle className="h-4 w-4 text-orange-600" />
  <AlertDescription className="text-orange-800 dark:text-orange-200">
    ⚠️ La jornada diaria supera las 10 horas recomendadas.
  </AlertDescription>
</Alert>
```

### Danger (Rojo)

```tsx
<Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
  <AlertTriangle className="h-4 w-4 text-red-600" />
  <AlertDescription className="text-red-800 dark:text-red-200">
    🚨 La jornada diaria supera las 12 horas.
  </AlertDescription>
</Alert>
```

---

## 🎬 Animaciones y Transiciones

### Entrada de Formulario (Wizards)

```tsx
<div className="animate-in fade-in-50 slide-in-from-top-2 duration-200">
  <FormCard>
    {/* Contenido */}
  </FormCard>
</div>
```

### Hover en Cards

```tsx
className="transition-shadow duration-200 hover:shadow-md"
```

### Focus en Inputs (ya incluido en clases)

```tsx
className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
```

---

## 🧭 Botones de Acción

### Footer con Botones (Páginas completas)

```tsx
<div className="bg-muted/30 flex justify-end gap-3 border-t px-6 py-4">
  <Button type="button" variant="outline" onClick={onCancel}>
    <X className="mr-2 h-4 w-4" />
    Cancelar
  </Button>
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Guardando...
      </>
    ) : (
      <>
        <Save className="mr-2 h-4 w-4" />
        Guardar
      </>
    )}
  </Button>
</div>
```

### Botones en Dialogs (shadcn)

```tsx
<DialogFooter>
  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
    Cancelar
  </Button>
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? "Guardando..." : "Guardar"}
  </Button>
</DialogFooter>
```

---

## 🍎 Compatibilidad Safari

### ⚠️ Reglas Críticas

#### 1. Nunca confiar en backdrop-filter

```css
/* NO funciona siempre en Safari */
.my-glass-effect {
  backdrop-filter: blur(16px);
  background-color: hsl(var(--background) / 0.6);
}
```

**Solución**: Usar fallback sólido (ver `globals.css` línea 302).

#### 2. Elementos visuales pequeños (< 3px)

Safari oculta elementos con opacidad + altura muy pequeña.

```tsx
// ❌ MAL - Invisible en Safari
<div className="h-0.5 w-full bg-muted/30" />

// ✅ BIEN - Visible en Safari
<div
  style={{
    width: "100%",
    height: "2px",
    backgroundColor: "#d1d5db", // hex sólido
  }}
/>
```

#### 3. Fondos de colores en SVGs

Safari oculta backgrounds con clases Tailwind en ciertos contextos.

```tsx
// ❌ MAL - Puede ser invisible
<div className="bg-emerald-500 border-emerald-500">
  <Check className="text-white" />
</div>

// ✅ BIEN - Forzar con inline styles
<div
  className="wizard-step-completed"
  style={{
    backgroundColor: "#10b981",
    borderColor: "#10b981",
    color: "#ffffff",
  }}
>
  <Check style={{ color: "#ffffff", stroke: "#ffffff" }} strokeWidth={2.5} />
</div>
```

#### 4. Overflow y position en containers

Safari no aplica blur si el padre tiene `overflow-hidden` o `transform`.

```tsx
// ❌ MAL
<div className="overflow-hidden">
  <div className="backdrop-blur-lg">...</div>
</div>

// ✅ BIEN
<div className="overflow-visible">
  <div className="backdrop-blur-lg">...</div>
</div>
```

#### 5. Switch visibility

```tsx
// ✅ SIEMPRE añadir colores explícitos para estado unchecked
<Switch
  className="data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600"
/>
```

---

## 📦 Ejemplo Completo: Formulario Premium

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Building2, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  department: z.string().optional(),
  salary: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof schema>;

export function PremiumForm({ onSubmit, onCancel }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      department: "",
      salary: undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-4xl space-y-8">
        {/* Card Principal */}
        <Card className="overflow-hidden rounded-xl border shadow-sm transition-shadow duration-200 hover:shadow-md">
          <CardContent className="space-y-8 p-6 md:p-8">
            {/* Sección 1: Información Básica */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Briefcase className="text-primary h-5 w-5" />
                </div>
                <Label className="text-xl font-semibold tracking-tight">Información Básica</Label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Juan Pérez"
                          className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tecnología"
                          className="transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <hr className="border-muted-foreground/20 my-6" />

            {/* Sección 2: Información Salarial */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">€</span>
                </div>
                <Label className="text-xl font-semibold tracking-tight">Información Salarial</Label>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salario Bruto Anual (€)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="text-muted-foreground absolute top-3 left-3 text-sm font-medium">€</span>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="30000"
                            className="pl-8 transition-all duration-150 focus:ring-2 focus:ring-primary/20"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="bg-muted/30 flex justify-end gap-3 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Guardar
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

---

## 🎓 Guía de Migración

### Para actualizar un formulario existente:

1. **Envolver el form** con `mx-auto max-w-4xl space-y-8`
2. **Actualizar Card**: `rounded-xl`, `overflow-hidden`, `hover:shadow-md`
3. **Aumentar padding**: `p-6 md:p-8`
4. **Añadir iconos** en headers de sección
5. **Actualizar separadores**: `border-muted-foreground/20`
6. **Focus rings** en inputs: `focus:ring-2 focus:ring-primary/20`
7. **Probar en Safari** para verificar visibilidad

---

## 📚 Referencias

- **Implementación real**: `/src/components/contracts/contract-form-simplified.tsx`
- **CSS premium**: `/src/app/globals.css` (líneas 337-421)
- **Safari rules**: `/docs/SAFARI_COMPATIBILITY.md`
- **Componente shadcn**: `/src/components/ui/form.tsx`

---

## ✅ Checklist de Calidad

Antes de considerar un formulario "completo", verificar:

- [ ] Container con `max-w-4xl` centrado
- [ ] Card con `rounded-xl` y `shadow-sm`
- [ ] Padding generoso (`p-6 md:p-8`)
- [ ] Iconos en headers de sección
- [ ] Separadores sutiles entre secciones
- [ ] Focus rings en todos los inputs
- [ ] Grid responsivo para campos
- [ ] Probado en Safari (checks, switches, blur)
- [ ] Transiciones suaves (150-200ms)
- [ ] Estados de loading en botones

---

**Última revisión**: Wizard de empleados completamente implementado con todas estas mejoras (Enero 2025)
