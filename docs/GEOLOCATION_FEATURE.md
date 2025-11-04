# Sistema de Geolocalización de Fichajes - TimeNow

**Fecha de inicio:** 2025-01-04
**Estado:** 🚧 En desarrollo
**Rama:** `GEolocalizacion`

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Objetivos](#objetivos)
3. [Requisitos Técnicos](#requisitos-técnicos)
4. [Arquitectura](#arquitectura)
5. [Progreso de Implementación](#progreso-de-implementación)
6. [Configuración](#configuración)
7. [Flujo de Usuario](#flujo-de-usuario)
8. [Privacidad y RGPD](#privacidad-y-rgpd)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Resumen Ejecutivo

Sistema de captura y validación de geolocalización para fichajes laborales. Permite verificar que los empleados fichan desde las ubicaciones autorizadas de la empresa, con cumplimiento total de RGPD.

### Características Principales

- ✅ Captura GPS solo al momento de fichar (NO tracking continuo)
- ✅ Validación automática de área permitida por centro de trabajo
- ✅ Visualización en mapa interactivo (Leaflet + OpenStreetMap)
- ✅ Panel de revisión para RRHH de fichajes fuera de área
- ✅ Consentimiento RGPD obligatorio
- ✅ Configurable por organización (activar/desactivar)
- ✅ Multi-centro de trabajo con radios independientes

---

## Objetivos

### 🎯 Objetivo General

Implementar un sistema de geolocalización de fichajes que permita:
1. Capturar la ubicación del empleado al fichar
2. Validar si está dentro del área permitida del centro de trabajo
3. Visualizar fichajes en un mapa interactivo
4. Gestionar excepciones y revisiones por RRHH
5. Cumplir con normativa RGPD

### 🔹 Objetivos Específicos

#### Para el Empleado
- Fichar con geolocalización de forma transparente
- Ver indicadores de precisión GPS antes de confirmar
- Recibir avisos si está fuera del área permitida
- Gestionar su consentimiento de geolocalización

#### Para RRHH/Admin
- Activar/desactivar geolocalización por organización
- Configurar ubicaciones de centros de trabajo
- Ver fichajes en mapa interactivo con filtros
- Revisar y aprobar fichajes fuera de área
- Exportar datos de fichajes con ubicación

#### Para Super Admin
- Activar funcionalidad de geolocalización para organizaciones
- Ver estadísticas de uso de la funcionalidad
- Gestionar configuración global

---

## Requisitos Técnicos

### Stack Tecnológico

```
Backend:
- Next.js 15 (App Router)
- Prisma ORM
- PostgreSQL
- Server Actions

Frontend:
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Leaflet + react-leaflet (mapas)
- OpenStreetMap (tiles gratuitos)

Geolocalización:
- Navigator Geolocation API (navegador)
- Fórmula de Haversine (cálculo distancias)
```

### Dependencias Nuevas

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@types/leaflet": "^1.9.8",
  "leaflet-defaulticon-compatibility": "^0.1.2"
}
```

---

## Arquitectura

### Modelos de Base de Datos

#### 1. Organization (Extendido)
```prisma
// Configuración de Geolocalización
geolocationEnabled      Boolean @default(false) // Activar/desactivar
geolocationRequired     Boolean @default(false) // Obligatorio para fichar
geolocationMinAccuracy  Int     @default(100)   // Precisión mínima en metros
geolocationMaxRadius    Int     @default(200)   // Radio máximo por defecto
```

#### 2. CostCenter (Extendido)
```prisma
// Geolocalización del centro
latitude             Decimal? @db.Decimal(10, 8) // Latitud
longitude            Decimal? @db.Decimal(11, 8) // Longitud
allowedRadiusMeters  Int?     @default(100)      // Radio permitido
```

#### 3. TimeEntry (Extendido)
```prisma
// Datos de geolocalización del fichaje
latitude              Decimal? @db.Decimal(10, 8) // Latitud del fichaje
longitude             Decimal? @db.Decimal(11, 8) // Longitud del fichaje
accuracy              Decimal? @db.Decimal(10, 2) // Precisión GPS en metros
isWithinAllowedArea   Boolean? // Si está dentro del área permitida
distanceFromCenter    Decimal? @db.Decimal(10, 2) // Distancia al centro en metros
nearestCostCenterId   String?  // Centro más cercano
requiresReview        Boolean  @default(false)    // Si requiere revisión RRHH
```

#### 4. GeolocationConsent (Nuevo)
```prisma
model GeolocationConsent {
  id               String   @id @default(cuid())
  consentGivenAt   DateTime @default(now())
  consentVersion   String   @default("1.0")
  ipAddress        String?
  active           Boolean  @default(true)
  userId           String
  orgId            String

  @@unique([userId, orgId])
}
```

### Algoritmo de Validación

```typescript
1. Usuario pulsa botón de fichar
2. Sistema verifica si la organización tiene geolocalización habilitada
   - NO → Fichar normal sin ubicación
   - SÍ → Continuar
3. Verificar consentimiento del usuario
   - NO → Mostrar dialog de consentimiento RGPD
   - SÍ → Continuar
4. Capturar ubicación GPS del navegador
5. Validar precisión GPS
   - Precisión > umbral → Mostrar warning, permitir reintentar
6. Obtener centros de trabajo con ubicación configurada
7. Calcular distancia al centro más cercano (Haversine)
8. Determinar si está dentro del radio permitido
   - DENTRO → isWithinAllowedArea = true, requiresReview = false
   - FUERA → isWithinAllowedArea = false, requiresReview = true
9. Guardar fichaje con todos los datos de geolocalización
10. Mostrar feedback al usuario sobre el estado
```

---

## Progreso de Implementación

### ✅ Fase 1: Base de Datos (COMPLETADO)

- [x] Extender modelo `Organization` con campos de geolocalización
- [x] Extender modelo `CostCenter` con coordenadas y radio
- [x] Extender modelo `TimeEntry` con datos de ubicación
- [x] Crear modelo `GeolocationConsent` para RGPD
- [x] Sincronizar con `prisma db push` (SIN pérdida de datos)
- [x] Backup del schema original creado

**Archivos modificados:**
- `prisma/schema.prisma`
- `prisma/schema.prisma.backup-pre-geolocation` (backup)

### ✅ Fase 2: Utilidades Core (COMPLETADO)

- [x] Implementar fórmula de Haversine para cálculo de distancias
- [x] Crear validadores de datos GPS
- [x] Crear helpers para encontrar centro más cercano
- [x] Definir textos de consentimiento RGPD versión 1.0

**Archivos creados:**
- `src/lib/geolocation/haversine.ts`
- `src/lib/geolocation/validators.ts`
- `src/lib/geolocation/consent.ts`
- `src/lib/geolocation/index.ts`

**Funciones principales:**
```typescript
// haversine.ts
calculateDistance(point1, point2) → distancia en metros
isWithinRadius(point, center, radius) → boolean
findNearestCenter(point, centers) → { center, distance }
formatDistance(meters) → "150 m" | "1.2 km"

// validators.ts
validateGeolocationData(lat, lon, accuracy) → { isValid, error? }
getAccuracyQuality(accuracy) → "excellent" | "good" | "fair" | "poor" | "very_poor"
getAccuracyMessage(accuracy) → string mensaje descriptivo
```

### ✅ Fase 3: Server Actions (COMPLETADO)

- [x] Crear actions de gestión de consentimiento
- [x] Crear actions de configuración de organización
- [x] Crear actions de validación de ubicación
- [x] Crear actions de revisión de fichajes
- [x] Modificar actions de time-tracking para aceptar geolocalización

**Archivos creados/modificados:**
- `src/server/actions/geolocation.ts` (NUEVO)
- `src/server/actions/time-tracking.ts` (MODIFICADO)

**Server Actions implementadas:**
```typescript
// geolocation.ts
checkGeolocationConsent() → { hasConsent, consent }
saveGeolocationConsent() → { success, consent }
revokeGeolocationConsent() → { success, message }
getOrganizationGeolocationConfig() → OrgConfig
getCostCentersWithLocation() → CostCenter[]
validateClockLocation(lat, lon, accuracy) → ValidationResult
getEntriesRequiringReview(filters?) → TimeEntry[]
approveGeolocationEntry(entryId) → { success, entry }
approveMultipleEntries(entryIds) → { success, count }

// time-tracking.ts (MODIFICADAS)
clockIn(geolocationData?) → { success, entry }
clockOut(geolocationData?) → { success, entry }
startBreak(geolocationData?) → { success, entry }
endBreak(geolocationData?) → { success, entry }
```

### ✅ Fase 4: Componentes Base y Hooks (COMPLETADO)

- [x] Instalar dependencias Leaflet y React Leaflet
- [x] Crear componente de diálogo de consentimiento RGPD
- [x] Crear hook useGeolocation para capturar GPS

**Dependencias instaladas:**
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@types/leaflet": "^1.9.8",
  "leaflet-defaulticon-compatibility": "^0.1.2"
}
```

**Archivos creados:**
- `src/components/geolocation/geolocation-consent-dialog.tsx`
- `src/hooks/use-geolocation.ts`

**Componente GeolocationConsentDialog:**
- Dialog modal con texto de consentimiento RGPD
- Checkbox de aceptación obligatoria
- Manejo de estados de carga y error
- Callbacks para consentimiento dado/denegado

**Hook useGeolocation:**
```typescript
const {
  data,           // { latitude, longitude, accuracy } | null
  error,          // string | null
  loading,        // boolean
  isSupported,    // boolean
  getCurrentPosition, // async () => GeolocationData | null
  clearError      // () => void
} = useGeolocation(options?)
```

### 🚧 Fase 5: Integración UI (EN PROGRESO)

- [ ] Modificar store de time-tracking para geolocalización
- [ ] Integrar geolocalización en QuickClockWidget
- [ ] Crear componente de indicador de precisión GPS
- [ ] Añadir feedback visual de validación de ubicación

**Archivos a modificar:**
- `src/stores/time-tracking-store.tsx`
- `src/components/time-tracking/quick-clock-widget.tsx`

### ⏳ Fase 6: Componentes de Mapa (PENDIENTE)

- [ ] Crear componente base de mapa con Leaflet
- [ ] Crear componente de visualización de fichaje en mapa
- [ ] Crear componente de selección de ubicación para centros
- [ ] Añadir mapa en página de fichajes

**Archivos a crear:**
- `src/components/geolocation/map-display.tsx`
- `src/components/geolocation/time-entry-map.tsx`
- `src/components/geolocation/location-picker.tsx`

### ⏳ Fase 7: Panel de Administración (PENDIENTE)

- [ ] Añadir configuración de geolocalización en panel super admin
- [ ] Crear configuración de ubicaciones en centros de trabajo
- [ ] Crear panel de revisión de fichajes para RRHH
- [ ] Crear página de gestión de privacidad del usuario

**Rutas a crear/modificar:**
- `/dashboard/admin/organizations/[id]` (modificar)
- `/dashboard/settings/cost-centers/[id]` (modificar)
- `/dashboard/hr/geolocation-review` (nueva)
- `/dashboard/settings/privacy` (nueva)

### ⏳ Fase 8: Finalización (PENDIENTE)

- [ ] Ejecutar tests y validaciones
- [ ] Crear migración final de Prisma: `add_geolocation_tracking_system`
- [ ] Actualizar este documento con resultados finales
- [ ] Crear guía de usuario final

---

## Estado Actual del Proyecto

**Última actualización:** 2025-01-04

### ✅ Completado (Fases 1-4)

1. **Base de datos**: Schema extendido y sincronizado ✓
2. **Utilidades**: Haversine, validadores, textos RGPD ✓
3. **Server Actions**: Todas las funciones backend implementadas ✓
4. **Componentes Base**: Dialog de consentimiento y hook useGeolocation ✓

### 🚧 En Progreso (Fase 5)

- Integración con QuickClockWidget y store de time-tracking

### ⏳ Pendiente (Fases 6-8)

- Componentes de mapa interactivo
- Paneles de administración
- Testing y migración final

---

## Visualización en Mapas (PENDIENTE)

- [ ] `components/maps/time-entries-map.tsx` - Mapa con fichajes
- [ ] `components/maps/cost-center-location-picker.tsx` - Configurar ubicación de centro
- [ ] `app/(main)/dashboard/me/clock/page.tsx` - Añadir sección de mapa en fichajes
- [ ] `app/(main)/dashboard/admin/time-tracking/map/page.tsx` - Vista admin con mapa

### 🔜 Fase 7: Configuración de Admin (PENDIENTE)

- [ ] Añadir configuración en panel de super admin (organizaciones)
  - [ ] Switch para activar geolocalización
  - [ ] Configuración de precisión mínima y radio máximo
- [ ] Extender configuración de centros de trabajo
  - [ ] Botón "Configurar ubicación"
  - [ ] Componente de selección en mapa
- [ ] `app/(main)/dashboard/settings/_components/organization-tab.tsx`
  - [ ] Sección de geolocalización para org admins

### 🔜 Fase 8: Panel de Revisión RRHH (PENDIENTE)

- [ ] `app/(main)/dashboard/admin/time-tracking/review/page.tsx`
- [ ] DataTable de fichajes que requieren revisión
- [ ] Acciones: Ver en mapa, Aprobar, Rechazar
- [ ] Filtros por fecha, empleado, centro

### 🔜 Fase 9: Privacidad (PENDIENTE)

- [ ] `app/(main)/dashboard/settings/privacy/page.tsx`
- [ ] Mostrar consentimiento dado
- [ ] Botón para revocar consentimiento
- [ ] Información sobre uso de datos

### 🔜 Fase 10: Testing y Validación (PENDIENTE)

- [ ] Probar captura GPS en diferentes dispositivos
- [ ] Validar cálculos de distancia
- [ ] Probar casos edge (sin GPS, precisión baja, múltiples centros)
- [ ] Verificar flujo de consentimiento

### 🔜 Fase 11: Migración Final (PENDIENTE)

- [ ] Crear migración con nombre descriptivo:
  ```bash
  npx prisma migrate dev --name add_geolocation_tracking_system
  ```
- [ ] Verificar que migración se crea correctamente
- [ ] Commit con migración incluida

---

## Configuración

### Para Super Admin

**Activar geolocalización para una organización:**

1. Ir a Panel de Super Admin → Organizaciones
2. Seleccionar organización
3. En configuración, activar switch "Geolocalización de fichajes"
4. Configurar parámetros:
   - **Geolocalización obligatoria:** Si está activo, no se puede fichar sin ubicación
   - **Precisión mínima:** Umbral de metros (recomendado: 100m)
   - **Radio máximo por defecto:** Para centros sin configurar (recomendado: 200m)

### Para Admin de Organización

**Configurar ubicación de un centro de trabajo:**

1. Ir a Configuración → Centros de Trabajo
2. Seleccionar centro
3. Clic en "Configurar ubicación"
4. Hacer clic en el mapa para establecer coordenadas
5. Ajustar radio permitido (slider de 50m a 500m)
6. Guardar

**Revisar fichajes fuera de área:**

1. Ir a Panel Admin → Control Horario → Revisión
2. Ver listado de fichajes que requieren revisión
3. Hacer clic en "Ver en mapa" para visualizar
4. Aprobar o rechazar según corresponda

### Para Empleados

**Primera vez:**
1. Al intentar fichar, aparecerá dialog de consentimiento RGPD
2. Leer el texto de consentimiento
3. Marcar checkbox de aceptación
4. Hacer clic en "Aceptar"

**Fichar con geolocalización:**
1. Clic en botón "Fichar Entrada" (o Salida/Pausa)
2. El navegador pedirá permiso para acceder a ubicación
3. Permitir acceso
4. Se mostrará indicador de precisión GPS:
   - 🟢 Verde: Excelente (<20m)
   - 🟡 Amarillo: Buena (20-50m)
   - 🟠 Naranja: Aceptable (50-100m)
   - 🔴 Rojo: Pobre (>100m) - Opción de reintentar
5. Confirmar fichaje
6. Se mostrará mensaje si está fuera del área permitida

**Gestionar privacidad:**
1. Ir a Configuración → Privacidad
2. Ver consentimiento de geolocalización dado
3. Si desea revocar: clic en "Revocar consentimiento"
4. Confirmar acción
5. ⚠️ No podrá fichar si la org requiere geolocalización

---

## Flujo de Usuario

### Diagrama de Flujo - Fichaje con Geolocalización

```
[Usuario pulsa "Fichar"]
         ↓
[¿Org tiene geolocalización activada?]
    NO → [Fichar normal] → FIN
    SÍ ↓
[¿Usuario tiene consentimiento activo?]
    NO → [Mostrar dialog RGPD]
         → [Usuario acepta?]
            NO → [Cancelar fichaje] → FIN
            SÍ → [Guardar consentimiento] ↓
    SÍ ↓
[Solicitar ubicación GPS al navegador]
         ↓
[¿Usuario permite acceso GPS?]
    NO → [Error: "Permiso denegado"] → FIN
    SÍ ↓
[Capturar coordenadas + precisión]
         ↓
[Mostrar indicador de precisión]
         ↓
[¿Precisión > umbral organización?]
    SÍ → [Mostrar warning + botón "Reintentar"]
         → [Usuario reintenta?]
            NO → [Continuar con precisión baja]
            SÍ → [Volver a capturar GPS]
    NO ↓
[Obtener centros con ubicación configurada]
         ↓
[¿Hay centros configurados?]
    NO → [Guardar fichaje sin validación de área] → FIN
    SÍ ↓
[Calcular distancia a cada centro (Haversine)]
         ↓
[Encontrar centro más cercano]
         ↓
[¿Distancia <= radio permitido del centro?]
    SÍ → [isWithinAllowedArea = true]
         [requiresReview = false]
         [Guardar fichaje] → FIN ✅
    NO → [isWithinAllowedArea = false]
         [requiresReview = true]
         [Guardar fichaje]
         [Notificar a RRHH]
         [Mostrar mensaje al usuario]
         → FIN ⚠️
```

### Pantallas Principales

#### 1. Dialog de Consentimiento RGPD
```
┌─────────────────────────────────────┐
│ Consentimiento de Geolocalización   │
├─────────────────────────────────────┤
│                                     │
│ TimeNow utilizará tu ubicación...   │
│ [Texto completo RGPD v1.0]          │
│                                     │
│ ☐ He leído y acepto...              │
│                                     │
│ [Cancelar]  [Aceptar]               │
└─────────────────────────────────────┘
```

#### 2. Indicador de Precisión GPS
```
┌─────────────────────────────────────┐
│ 🟢 Precisión excelente (12m)        │
│ [Fichar Entrada]                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔴 Precisión muy baja (185m)        │
│ Intenta salir al exterior o...     │
│ [Reintentar]  [Continuar]           │
└─────────────────────────────────────┘
```

#### 3. Mapa de Fichajes (Vista Empleado)
```
┌─────────────────────────────────────┐
│ Fichajes de hoy                     │
├─────────────────────────────────────┤
│ [Mapa con marcadores de fichajes]   │
│                                     │
│ 🟢 Entrada - 09:00 (dentro)         │
│ 🟡 Salida - 18:05 (requiere rev.)  │
└─────────────────────────────────────┘
```

#### 4. Panel de Revisión RRHH
```
┌─────────────────────────────────────┐
│ Fichajes para revisión              │
├─────────────────────────────────────┤
│ Empleado  | Fecha  | Dist. | Acc.  │
│ Juan P.   | 04/01  | 250m  | [Mapa]│
│ Ana G.    | 04/01  | 180m  | [Mapa]│
│                                     │
│ [Aprobar seleccionados]             │
└─────────────────────────────────────┘
```

---

## Privacidad y RGPD

### Cumplimiento Legal

#### Texto de Consentimiento (Versión 1.0)

```
TimeNow utilizará tu ubicación geográfica únicamente en el momento
de realizar fichajes (entrada, salida, pausas).

Finalidad: Verificar que el fichaje se realiza desde las instalaciones
autorizadas de la empresa.

Datos capturados: Coordenadas GPS (latitud, longitud) y precisión del
dispositivo.

Conservación: Los datos de ubicación se conservan junto con el registro
de fichaje durante el tiempo legalmente establecido para registros laborales.

Tus derechos: Puedes revocar este consentimiento en cualquier momento
desde Configuración > Privacidad. Al revocar, no podrás fichar si tu
organización requiere geolocalización.

Al aceptar este consentimiento, autorizas el tratamiento de tus datos
de ubicación conforme a lo descrito.
```

### Principios de Privacidad

1. **Minimización de datos:** Solo se captura ubicación al fichar, nunca de forma continua
2. **Consentimiento explícito:** Dialog obligatorio antes del primer fichaje
3. **Transparencia:** Texto claro sobre finalidad y uso de datos
4. **Derecho de revocación:** Usuario puede revocar en cualquier momento
5. **Conservación limitada:** Datos se conservan según legislación laboral
6. **No tracking:** NUNCA se rastrea ubicación fuera del momento de fichaje

### Gestión de Consentimientos

**Versiones de consentimiento:**
- v1.0: Versión inicial (actual)
- Si se actualiza el texto, crear v2.0 y solicitar nuevo consentimiento

**Base de datos:**
- Tabla `GeolocationConsent` guarda cada consentimiento
- Campo `consentVersion` permite trazabilidad
- Campo `active` permite revocación sin borrar histórico
- Constraint `@@unique([userId, orgId])` previene duplicados

---

## Testing

### Casos de Prueba

#### ✅ Flujo Normal
- [ ] Usuario sin consentimiento → Muestra dialog → Acepta → Ficha correctamente
- [ ] Usuario con consentimiento → Ficha directamente
- [ ] Fichaje dentro de área → `isWithinAllowedArea = true`
- [ ] Fichaje fuera de área → `requiresReview = true`

#### ⚠️ Casos Edge
- [ ] Usuario deniega permiso GPS → Mostrar error claro
- [ ] GPS no disponible (interiores) → Permitir fichar con warning
- [ ] Precisión muy baja (>200m) → Mostrar opción de reintentar
- [ ] Múltiples centros cercanos → Asignar al más próximo
- [ ] Sin centros configurados → Guardar fichaje sin validación
- [ ] Revocar consentimiento → No puede fichar si es obligatorio

#### 🔧 Validación Técnica
- [ ] Cálculo Haversine correcto (comparar con Google Maps)
- [ ] Precisión del cálculo de distancias (<5m de error)
- [ ] Performance con 1000+ fichajes en mapa
- [ ] Clustering funciona correctamente

---

## Troubleshooting

### Problemas Comunes

#### El usuario no puede fichar por geolocalización

**Síntomas:** Error "No se pudo obtener ubicación"

**Causas posibles:**
1. Usuario denegó permiso GPS en navegador
2. GPS desactivado en el dispositivo
3. Navegador no soporta Geolocation API
4. Conexión HTTPS requerida

**Solución:**
```
1. Verificar permisos del sitio en configuración del navegador
2. Activar GPS/ubicación en el dispositivo
3. Usar navegador moderno (Chrome, Firefox, Safari, Edge)
4. Asegurar que la app está en HTTPS
```

#### Precisión GPS muy baja en interiores

**Síntomas:** Precisión >100m constantemente

**Causas:** Señal GPS débil en interiores

**Solución:**
```
- Salir al exterior o acercarse a una ventana
- Esperar 30 segundos para que GPS se estabilice
- Admin puede aumentar umbral de precisión mínima
- Admin puede aumentar radio permitido del centro
```

#### Fichajes siempre marcados como "fuera de área"

**Síntomas:** Todos los fichajes requieren revisión

**Causas:**
1. Coordenadas del centro mal configuradas
2. Radio permitido muy pequeño
3. GPS del dispositivo descalibrado

**Solución:**
```
1. Admin: Verificar ubicación del centro en mapa
2. Admin: Aumentar radio permitido (100m → 200m)
3. Usuario: Reiniciar GPS del dispositivo
```

#### El mapa no carga

**Síntomas:** Pantalla en blanco donde debería estar el mapa

**Causas:**
1. OpenStreetMap tiles no cargan
2. Error en configuración de Leaflet
3. Bloqueador de ads/scripts

**Solución:**
```
1. Verificar conexión a internet
2. Deshabilitar bloqueadores temporalmente
3. Revisar console del navegador para errores
4. Limpiar caché del navegador
```

---

## Notas de Desarrollo

### Decisiones de Diseño

1. **Leaflet vs Google Maps:** Leaflet elegido por:
   - Gratuito y sin límites de uso
   - RGPD-friendly (sin enviar datos a Google)
   - Más ligero y rápido
   - OpenStreetMap como proveedor de tiles

2. **Fórmula de Haversine vs Vincenty:**
   - Haversine elegida por simplicidad y precisión suficiente
   - Error <0.5% para distancias <1000km
   - Más rápida de calcular

3. **Punto GPS + Radio vs Polígono:**
   - Punto + Radio elegido por simplicidad
   - Más fácil de configurar para el admin
   - Suficiente para el 95% de casos de uso

4. **Permitir vs Bloquear fichajes fuera de área:**
   - Permitir con revisión elegido para flexibilidad
   - Empleados pueden fichar en emergencias
   - RRHH revisa y aprueba/rechaza después

### Próximas Mejoras (Futuro)

- [ ] Soporte para múltiples puntos GPS por centro
- [ ] Delimitación por polígonos personalizados
- [ ] Exportación de datos de geolocalización
- [ ] Informes de cumplimiento de área
- [ ] Notificaciones push al salir del área
- [ ] Integración con sistemas externos de fichaje

---

## Changelog

### [En desarrollo] - 2025-01-04

#### Añadido
- Schema de base de datos extendido con geolocalización
- Modelos: Organization, CostCenter, TimeEntry, GeolocationConsent
- Utilidades: Haversine, validadores, textos RGPD
- Documentación completa de la funcionalidad

#### Cambiado
- TimeEntry ahora soporta datos de ubicación estructurados

#### Próximo
- Server actions de geolocalización
- Componentes de UI y mapas
- Panel de administración

---

## Referencias

- [Geolocation API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Leaflet Documentation](https://leafletjs.com/)
- [RGPD - Guía práctica](https://ec.europa.eu/info/law/law-topic/data-protection_es)
- [OpenStreetMap](https://www.openstreetmap.org/)

---

**Última actualización:** 2025-01-04 23:45
