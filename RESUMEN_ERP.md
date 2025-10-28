# TIMENOW - Sistema ERP de Gestión Empresarial

## Información General

**Nombre:** Timenow
**Versión:** 2.0.0
**Descripción:** Sistema de gestión empresarial (ERP) moderno especializado en recursos humanos, nóminas y control de tiempos. Solución completa para la gestión integral de empleados y operaciones empresariales.

---

## Características Principales Implementadas

### Gestión de Recursos Humanos
- **Empleados:** Gestión completa del ciclo de vida de empleados (alta, edición, baja)
- **Departamentos:** Organización jerárquica y estructura organizacional
- **Puestos de Trabajo:** Definición de roles y posiciones
- **Niveles de Posición:** Sistema de jerarquías y escalado profesional
- **Centros de Coste:** Control presupuestario y distribución de gastos
- **Contratos:** Gestión documental de contratos laborales
- **Documentos:** Archivo digital centralizado de documentación

### Control de Tiempos y Asistencia
- **Reloj de Fichaje:** Sistema de registro de entrada/salida en tiempo real
- **Control de Tiempos:** Seguimiento detallado de horas trabajadas
- **Vista en Vivo:** Monitoreo en tiempo real de asistencia
- **Solicitudes de Modificación:** Corrección de registros de tiempo
- **PTO (Paid Time Off):** Gestión de vacaciones y permisos
- **Calendarios Laborales:** Configuración de jornadas y festivos

### Sistema de Aprobaciones
- **Aprobación de Vacaciones:** Flujo de trabajo para solicitudes de PTO
- **Aprobación de Tiempos:** Validación de registros de entrada/salida
- **Notificaciones:** Sistema de alertas y recordatorios en tiempo real

### Gestión Documental y Firmas
- **Firmas Electrónicas:** Sistema de firma digital de documentos
- **Gestión de Firmas:** Panel de administración de firmas pendientes
- **Mis Firmas:** Portal personal para empleados
- **Almacenamiento Seguro:** Repositorio digital de documentos

### Dashboards y Análisis
- **Dashboard Principal:** Vista general con métricas clave
- **CRM Dashboard:** Gestión de relaciones con clientes
- **Finance Dashboard:** Métricas financieras y presupuestos

### Administración
- **Organizaciones:** Gestión multi-empresa
- **Usuarios:** Control de acceso y permisos
- **Configuración:** Personalización del sistema

---

## Módulos y Secciones

### Mi Portal (`/me`)
- Mi Perfil Personal
- Mi Reloj de Fichaje
- Mis Solicitudes de PTO
- Mis Documentos
- Mi Calendario Laboral
- Mis Firmas Pendientes

### Gestión de Personal
- Empleados (listado, ficha individual, edición)
- Departamentos
- Puestos de Trabajo
- Niveles de Posición
- Centros de Coste

### Control Horario
- Time Tracking (seguimiento individual y global)
- Vista en Vivo de Fichajes
- Calendarios Laborales

### Aprobaciones y Flujos
- Aprobación de PTOs
- Aprobación de Registros de Tiempo
- Notificaciones Centralizadas

### Documentación
- Gestión de Contratos
- Documentos Corporativos
- Sistema de Firmas Electrónicas

### Administración
- Usuarios del Sistema
- Organizaciones
- Configuración General

---

## Tecnología y Diseño

### Stack Tecnológico
- **Frontend:** Next.js 15 + React 19 + TypeScript
- **Estilos:** Tailwind CSS v4 (última generación)
- **Componentes:** shadcn/ui (47+ componentes profesionales)
- **Gestión de Estado:** Zustand
- **Tablas:** TanStack Table (ordenación, filtrado, paginación)
- **Formularios:** React Hook Form + Zod
- **Base de Datos:** PostgreSQL + Prisma ORM
- **Autenticación:** NextAuth.js
- **Iconografía:** Lucide React
- **Gráficas:** Recharts

### Temas de Color Disponibles

#### 1. Blue (Principal - Corporativo)
```css
/* Modo Claro */
--primary: oklch(0.6723 0.1606 244.9955);        /* Azul vibrante #6366f1 aprox */
--background: oklch(1 0 0);                       /* Blanco puro */
--foreground: oklch(0.1884 0.0128 248.5103);     /* Gris oscuro #1e293b aprox */
--card: oklch(0.9784 0.0011 197.1387);           /* Gris muy claro #f8fafc aprox */
--border: oklch(0.9317 0.0118 231.6594);         /* Gris claro #e2e8f0 aprox */
--accent: oklch(0.9392 0.0166 250.8453);         /* Azul muy claro */
--destructive: oklch(0.6188 0.2376 25.7658);     /* Rojo #ef4444 aprox */

/* Modo Oscuro */
--background: oklch(0.1333 0.0151 264.6503);     /* Gris muy oscuro */
--foreground: oklch(0.9784 0.0011 197.1387);     /* Blanco/Gris claro */
--primary: oklch(0.6818 0.1584 243.354);         /* Azul brillante ajustado */
```

**Ideal para:** Empresas corporativas, servicios profesionales, consultorías

#### 2. Brutalist (Moderno y Minimalista)
- Bordes marcados y contraste alto
- Sombras pronunciadas para profundidad
- Tipografía bold
- Estilo: Neo-brutalismo contemporáneo

**Ideal para:** Startups tecnológicas, agencias creativas, empresas modernas

#### 3. Soft Pop (Amigable y Colorido)
- Colores suaves y pasteles
- Alta accesibilidad visual
- Bordes redondeados
- Estilo: Moderno y acogedor

**Ideal para:** Empresas de servicios, RRHH, empresas con cultura friendly

#### 4. Brut-Notion (Inspirado en Notion)
- Limpio y funcional
- Enfoque en contenido
- Espacios amplios y respirables
- Minimalismo productivo

**Ideal para:** Equipos de producto, empresas tech-savvy

### Características de Diseño

- **Modo Oscuro/Claro:** Cambio automático según preferencias del usuario
- **Responsive Design:** Optimizado para móvil, tablet y desktop
- **Container Queries:** Adaptación inteligente de componentes
- **Glassmorphism:** Efectos de cristal esmerilado en cards
- **Animaciones Suaves:** Transiciones profesionales con `tw-animate-css`
- **OKLCH Color Space:** Sistema de color perceptualmente uniforme

---

## Filosofía de Diseño UX/UI

### Principios de Diseño
1. **Claridad sobre creatividad:** Información clara y accesible siempre primero
2. **Consistencia absoluta:** Todos los módulos siguen el mismo patrón visual
3. **Eficiencia:** Máximo 3 clics para cualquier acción común
4. **Accesibilidad:** Contraste WCAG AAA, navegación por teclado completa

### Patrones de Interfaz
- **DataTables profesionales:** Con filtros, búsqueda, paginación y exportación
- **Tabs con badges:** Indicadores de cantidad en cada categoría
- **Estados vacíos:** Ilustraciones y mensajes amigables cuando no hay datos
- **Formularios validados:** Feedback inmediato con Zod
- **Notificaciones toast:** Confirmaciones no intrusivas con Sonner
- **Container queries:** Responsive sin media queries tradicionales

### Inspiración Visual
- **Linear:** Gestión de proyectos minimalista
- **Notion:** Organización de información clara
- **Monday.com:** Dashboards empresariales funcionales
- **Stripe Dashboard:** Claridad en datos financieros

---

## Análisis de Funcionalidades

### ✅ Ya Implementadas en Timenow

1. **Control horario** - ✅ Completo (reloj fichaje + time tracking + vista en vivo)
2. **Ausencias y vacaciones** - ✅ Sistema PTO completo con aprobaciones
3. **Expediente digital** - ✅ Documentos + contratos por empleado
4. **Portal del administrador y el empleado** - ✅ Dashboard admin + `/me` portal empleado
5. **Firma avanzada** - ✅ Sistema de firmas electrónicas implementado
6. **Avisos** - ✅ Sistema de notificaciones en tiempo real
7. **Gestor documental** - ✅ Almacenamiento y gestión de documentos
8. **Organigrama** - ⚠️ Parcial (tienes departamentos/puestos, falta visualización gráfica)

---

### 🎯 Funcionalidades FACTIBLES y Prioritarias

#### 1. Preparación de Nóminas 🔥 ALTA PRIORIDAD
- **Factibilidad:** MUY ALTA
- **Razón:** Ya tienes empleados con contratos, control horario, ausencias
- **Falta:** Cálculo de nómina + plantillas + exportación (PDF/A3CON)
- **Complejidad:** Media-Alta (lógica fiscal España)
- **Impacto:** Game changer, justifica precio premium

#### 2. Bolsa de Horas 🔥 ALTA PRIORIDAD
- **Factibilidad:** ALTA
- **Razón:** Extensión natural del control horario existente
- **Implementación:**
  - Acumulación de horas extra/negativas
  - Compensación automática
  - Dashboard de saldo de horas por empleado
- **Complejidad:** Media
- **Impacto:** Rápido, útil, diferenciador

#### 3. Informes y Estadísticas 📊 ALTA PRIORIDAD
- **Factibilidad:** MUY ALTA
- **Razón:** Ya tienes todos los datos (tiempo, empleados, ausencias)
- **Implementación:**
  - Gráficas con Recharts (ya instalado)
  - Exportación Excel/PDF
  - Informes predefinidos (absentismo, horas, costes)
- **Complejidad:** Media
- **Impacto:** Alta demanda de clientes

#### 4. Reclutamiento (hasta 5 ofertas) 📋
- **Factibilidad:** ALTA
- **Razón:** Módulo independiente, no requiere mucha integración
- **Implementación:**
  - CRUD de ofertas de empleo
  - Portal público de candidatos
  - Pipeline de selección (Kanban con dnd-kit ya instalado)
  - Evaluaciones y comentarios
- **Complejidad:** Media

#### 5. Tareas ✅
- **Factibilidad:** ALTA
- **Razón:** Módulo independiente tipo Trello/Linear
- **Implementación:**
  - CRUD tareas con asignación a empleados
  - Estados (pendiente/en curso/completada)
  - Prioridades y fechas límite
  - Notificaciones automáticas
- **Complejidad:** Media

#### 6. Turnos 🕐
- **Factibilidad:** ALTA
- **Razón:** Complemento perfecto del control horario
- **Implementación:**
  - Definición de turnos (mañana/tarde/noche/custom)
  - Asignación calendario por empleado/departamento
  - Plantillas de rotación automática
  - Vista calendario visual
- **Complejidad:** Media-Alta

#### 7. Comunicación Interna 💬
- **Factibilidad:** ALTA
- **Razón:** Chat/avisos entre empleados y managers
- **Implementación:**
  - Mensajería 1-a-1 o grupos por departamento
  - Tablón de anuncios corporativo
  - Menciones (@usuario) y notificaciones
  - Sistema de "Me gusta" y reacciones
- **Complejidad:** Alta (si es tiempo real con WebSockets)

#### 8. Envío de Nóminas 📧
- **Factibilidad:** MUY ALTA
- **Razón:** Una vez tengas "Preparación de nóminas"
- **Implementación:**
  - Email automático con PDF adjunto cifrado
  - Descarga desde portal empleado (`/me/payslips`)
  - Histórico de nóminas enviadas
  - Confirmación de lectura
- **Complejidad:** Baja (requiere SMTP configurado)

#### 9. Organigrama Visual 🌳
- **Factibilidad:** ALTA
- **Razón:** Ya tienes la estructura (departamentos/jefes/jerarquía)
- **Implementación:**
  - Librería tipo `react-organizational-chart` o `reactflow`
  - Visualización jerárquica interactiva
  - Exportación a imagen PNG/SVG
  - Zoom y navegación
- **Complejidad:** Baja

#### 10. Gestión de Formación 📚
- **Factibilidad:** MEDIA-ALTA
- **Razón:** Módulo relativamente independiente
- **Implementación:**
  - Catálogo de cursos (internos/externos)
  - Asignación por empleado o departamento
  - Seguimiento de completitud y progreso
  - Certificados digitales automáticos
  - Estadísticas de formación
- **Complejidad:** Media

---

### ⚠️ Funcionalidades COMPLEJAS o NO PRIORITARIAS

#### Automatizaciones 🤖
- **Factibilidad:** MEDIA
- **Complejidad:** ALTA (requiere motor de reglas tipo Zapier/n8n)
- **Recomendación:** Dejar para fase avanzada (Fase 5)
- **Alternativa:** Empezar con automatizaciones simples (recordatorios, alertas)

#### Face ID 📱
- **Factibilidad:** BAJA-MEDIA
- **Complejidad:** ALTA (requiere hardware específico, reconocimiento facial, privacidad)
- **Recomendación:** No prioritario, mejor empezar con:
  - QR personal para fichaje
  - PIN de empleado
  - Geolocalización básica
  - Biometría del dispositivo (huella, Face ID nativo móvil)

#### Canal de Denuncias 🔒
- **Factibilidad:** MEDIA
- **Complejidad:** ALTA (requisitos legales Directiva UE 2019/1937, anonimato, LOPD)
- **Recomendación:** **Contratar servicio externo especializado:**
  - **Safecall:** Líder en España
  - **Navex Global:** Internacional
  - **EQS Integrity Line:** Compliance europeo
- **Razón:** Riesgo legal alto si no se implementa correctamente

#### Apps Externas / Marketplace 🏪
- **Factibilidad:** BAJA (requiere ecosistema maduro)
- **Complejidad:** MUY ALTA (API pública, SDK, documentación, marketplace UI, facturación)
- **Recomendación:** Fase 3-4, cuando el core esté consolidado
- **Pre-requisito:**
  - API REST completa y documentada (OpenAPI/Swagger)
  - Sistema de webhooks
  - OAuth2 para terceros

---

## 🎯 Roadmap Priorizado

### FASE 1 - Completar Core RRHH (0-3 meses)
**Objetivo:** Cerrar funcionalidades básicas imprescindibles

1. ✅ **Bolsa de Horas** - Extiende control horario existente
2. ✅ **Informes y Estadísticas** - Aprovecha datos existentes (absentismo, costes)
3. ✅ **Organigrama Visual** - Usa estructura de departamentos existente

**Beneficio:** Sistema RRHH completo y funcional para lanzar MVP comercial

---

### FASE 2 - Gestión Salarial (3-6 meses)
**Objetivo:** Feature killer que diferencia de competencia

4. ✅ **Preparación de Nóminas** - Cálculo, plantillas, exportación A3CON
5. ✅ **Envío de Nóminas** - Automatización de distribución segura

**Beneficio:** Justifica precio premium, cierra ciclo completo RRHH-Nómina

---

### FASE 3 - Productividad (6-9 meses)
**Objetivo:** Herramientas de gestión diaria

6. ✅ **Tareas** - Gestión de trabajo y asignaciones
7. ✅ **Turnos** - Planificación avanzada de horarios
8. ✅ **Comunicación Interna** - Colaboración sin email

**Beneficio:** Centralización total, empleados no necesitan apps externas

---

### FASE 4 - Talento (9-12 meses)
**Objetivo:** Ciclo de vida completo del empleado

9. ✅ **Reclutamiento** - Captación y selección de talento
10. ✅ **Gestión de Formación** - Desarrollo y upskilling

**Beneficio:** Propuesta de valor 360º desde contratación hasta desarrollo

---

### FASE 5 - Avanzado (12+ meses)
**Objetivo:** Escalabilidad y automatización

11. ⚠️ **Automatizaciones** - Flujos de trabajo sin intervención
12. ⚠️ **Marketplace de Integraciones** - Ecosistema de partners
13. ⚠️ **Canal de Denuncias** - Compliance europeo (considerar servicio externo)

**Beneficio:** Producto enterprise-ready, ventas a grandes cuentas

---

## 🚀 Las 3 Funcionalidades que Implementar YA

Si solo puedes elegir 3 funcionalidades para los próximos 3 meses:

### 1. Bolsa de Horas 🥇
**Por qué:**
- Rápido de implementar (2-3 semanas)
- Útil para el 90% de clientes
- Diferenciador vs. competencia básica
- Retiene a clientes que piden esta funcionalidad

**ROI:** ALTÍSIMO

---

### 2. Informes y Estadísticas 🥈
**Por qué:**
- Aprovecha datos que ya recoges
- Los managers/RRHH lo piden constantemente
- Demuestra valor del sistema
- Facilita toma de decisiones

**ROI:** ALTO

---

### 3. Preparación de Nóminas 🥉
**Por qué:**
- Game changer absoluto
- Justifica precio 2-3x superior
- Fideliza clientes (muy difícil cambiar de sistema de nómina)
- Abre mercado de asesorías laborales

**ROI:** ALTÍSIMO (a medio plazo)

---

## Casos de Uso Principales

1. **Empresas de 10-500 empleados** que necesitan gestión de RRHH integral
2. **Equipos remotos/híbridos** que requieren control horario flexible sin presencialidad
3. **Organizaciones multi-sede** con gestión centralizada desde HQ
4. **Empresas con procesos de aprobación complejos** (vacaciones, gastos, tiempos)
5. **Negocios que requieren firma electrónica** de documentos (contratos, nóminas, políticas)
6. **Startups en crecimiento** que necesitan escalabilidad en RRHH
7. **Asesorías laborales** que gestionan nóminas de múltiples clientes

---

## Ventajas Competitivas

✅ **Interfaz moderna y profesional** - No parece software del 2010 (vs. A3, Meta4)
✅ **Instalación on-premise o cloud** - PostgreSQL sin vendor lock-in
✅ **Multi-idioma preparado** - i18n con next-intl configurado
✅ **Sistema de temas personalizables** - White-label para revendedores
✅ **Código abierto y extensible** - Customización sin límites
✅ **Rendimiento optimizado** - Next.js 15 + Turbopack (build 5x más rápido)
✅ **Mobile-first responsive** - App web que parece app nativa
✅ **Arquitectura escalable** - Colocation pattern, fácil mantenimiento
✅ **Stack moderno** - React 19, TypeScript, Prisma ORM
✅ **Sin legacy tech debt** - Built from scratch en 2024

---

## Propuestas de Valor (Taglines)

### Para Landing Page Principal
- **"Gestión empresarial que no parece del siglo pasado"**
- **"El ERP que tus empleados querrán usar"**
- **"RRHH moderno para empresas modernas"**

### Para Secciones Específicas
- **Control Horario:** "Olvídate del Excel. Fichaje en 2 toques."
- **Nóminas:** "De las horas trabajadas a la nómina en un clic"
- **Portal Empleado:** "Toda tu info laboral en tu bolsillo"
- **Aprobaciones:** "Aprobar vacaciones desde el móvil. Así de simple."

### Para Página "Sobre Nosotros"
- **"Tu empresa organizada, finalmente"**
- **"Control total, interfaz simple"**
- **"Software de RRHH que no da vergüenza enseñar"**

---

## Arquitectura Técnica (para Desarrolladores)

### Estructura de Proyecto
```
/src
  /app
    /(main)/dashboard    # Rutas protegidas admin
    /(external)          # Landing pública
  /components
    /ui                  # shadcn/ui components
    /hr                  # Componentes RRHH custom
  /lib
    /db                  # Prisma client
    /utils               # Helpers
  /stores                # Zustand stores
  /server
    /actions             # Server actions
  /styles
    /presets             # Temas de color
```

### Base de Datos (PostgreSQL + Prisma)
**Modelos principales:**
- Organization (multi-tenant)
- User (autenticación)
- Employee (datos RRHH)
- Department, Position, PositionLevel
- TimeEntry, WorkdaySummary
- PtoRequest, PtoBalance
- Contract, Document
- Calendar, CalendarEvent
- Notification, SignatureRequest

### Autenticación
- **NextAuth.js** con adapter Prisma
- Cookie-based sessions
- Middleware para rutas protegidas
- RBAC pendiente (roles: admin, manager, employee)

### Deployment
- **Docker:** docker-compose.yml incluido
- **PostgreSQL:** Puerto 5432
- **Next.js:** Puerto 3000 (Turbopack en dev)
- **Migraciones:** `npx prisma migrate deploy` en entrypoint

---

## Próximos Pasos Recomendados

### Técnicos
1. ✅ Implementar Bolsa de Horas (sprint de 2 semanas)
2. ✅ Crear módulo de Informes básicos (absentismo, horas)
3. ✅ Integrar librería de organigramas (reactflow o react-organizational-chart)
4. 🔄 Diseñar schema Prisma para nóminas
5. 🔄 Investigar exportación A3CON (formato SEPA XML)

### Negocio
1. 📋 Definir pricing (freemium vs. por empleado vs. flat)
2. 📋 Crear landing page con estos highlights
3. 📋 Preparar demos grabados por módulo
4. 📋 Estrategia de lanzamiento (beta privada → público)
5. 📋 Identificar early adopters (startups 10-50 empleados)

---

## Recursos Útiles

### Documentación Técnica
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma ORM](https://www.prisma.io/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Table](https://tanstack.com/table)
- [Zustand](https://zustand-demo.pmnd.rs)

### Compliance y Legal (España)
- [Estatuto de los Trabajadores](https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430)
- [Directiva Whistleblowing UE 2019/1937](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32019L1937)
- [SEPA A3CON Specs](https://www.seg-social.es/wps/portal/wss/internet/Trabajadores)

### Inspiración Competencia
- **Factorial HR:** factorial.com (líder en España)
- **BambooHR:** bamboohr.com (referente internacional)
- **Personio:** personio.com (alemán, muy completo)
- **Kenjo:** kenjo.io (español, enfoque moderno)

---

**Documento generado:** 2024-10-28
**Versión Timenow analizada:** 2.0.0
**Autor:** Análisis completo del ERP existente + roadmap estratégico
