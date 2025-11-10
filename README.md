# ERP TimeNow

Sistema ERP completo para gestión de Recursos Humanos, construido con Next.js 15, TypeScript y shadcn/ui.

## 🚀 Características Principales

### 👥 Gestión de Empleados
- Sistema multi-tenant con organizaciones independientes
- Numeración automática de empleados (ej: `TMNW00001`)
- Gestión completa de datos personales y profesionales
- Estructura jerárquica (departamentos, centros de coste, posiciones)
- Documentación digital por empleado

### ⏰ Control de Horario
- Fichaje de entrada/salida con soporte web y móvil
- Gestión de pausas y descansos
- Geolocalización GPS opcional (cumplimiento RGPD/LOPDGDD)
- Visualización en mapa con Leaflet
- Validación automática de ubicación por centro de trabajo
- Solicitudes de fichaje manual con sistema de aprobación

### 🏖️ Gestión de Ausencias (PTO)
- Múltiples tipos de ausencia configurables
- Calendarios personalizados por organización
- Importación de festivos (API Nager.Date)
- Balance automático de días disponibles
- Flujo de aprobación configurable
- Ajustes manuales y automáticos de balance
- Notificaciones en tiempo real

### 💰 Gestión de Gastos
- Creación de gastos con soporte de archivos adjuntos
- Categorías configurables
- Sistema de aprobación multinivel
- OCR para extracción automática de datos (R2 + Cloudflare AI)
- Integración con proveedores (facturas automáticas)
- Dashboard de estadísticas y reportes

### ✍️ Firmas Digitales
- Sistema completo de firmas electrónicas
- Múltiples firmantes por documento
- Estados: pendiente, firmado, rechazado, expirado
- Notificaciones automáticas
- Tokens únicos de firma
- Trazabilidad completa

### 📋 Sistema de Notificaciones
- Notificaciones en tiempo real
- Badge reactivo con Zustand
- Múltiples tipos: PTO, gastos, firmas, fichajes
- Panel completo de gestión
- Responsive y optimizado para móvil

### 🎨 Interfaz de Usuario
- Diseño profesional con shadcn/ui
- Tema claro/oscuro con múltiples presets
- Totalmente responsive
- DataTables con TanStack Table
- Container queries para layouts adaptativos

## 🛠️ Stack Tecnológico

### Core
- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4
- **Componentes**: shadcn/ui (new-york style)

### Base de Datos
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL
- **Migraciones**: Prisma Migrate

### Autenticación
- **Sistema**: Cookie-based authentication
- **Sesiones**: Base de datos con expiración automática

### Storage
- **Provider**: Cloudflare R2
- **SDK**: AWS S3 compatible
- **Uso**: Documentos, archivos adjuntos, facturas

### AI & OCR
- **Provider**: Cloudflare AI Workers
- **Modelos**: OCR para extracción de datos de facturas

### Monitorización
- **Errores**: Sentry (cliente, servidor, edge)
- **Performance**: Sentry Performance Monitoring
- **Session Replay**: Sentry Session Replay

### Mapas
- **Librería**: Leaflet + React-Leaflet
- **Uso**: Visualización de fichajes con GPS

### Formularios y Validación
- **Formularios**: React Hook Form
- **Validación**: Zod
- **Estado**: Zustand

### Tablas
- **Librería**: TanStack Table
- **Features**: Sorting, filtering, paginación, column visibility

### Tooling
- **Linting**: ESLint
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged
- **Package Manager**: npm

## 📦 Requisitos Previos

- Node.js 18.19+ o 20.6+
- PostgreSQL 14+
- npm 9+

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/josefranciscoparra/erp-shacdn.git
cd erp-shacdn
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

Variables críticas:
```env
# Base de datos
DATABASE_URL="postgresql://erp_user:erp_pass@localhost:5432/erp_dev"

# Cloudflare R2 (Storage)
R2_ACCOUNT_ID="tu-account-id"
R2_ACCESS_KEY_ID="tu-access-key"
R2_SECRET_ACCESS_KEY="tu-secret-key"
R2_BUCKET_NAME="erp-documents"
R2_PUBLIC_URL="https://tu-dominio.r2.dev"

# Cloudflare AI (OCR)
CLOUDFLARE_API_TOKEN="tu-api-token"

# Sentry (Opcional)
NEXT_PUBLIC_SENTRY_DSN="https://tu-dsn@sentry.io/proyecto-id"
```

### 4. Configurar la base de datos

```bash
# Crear base de datos PostgreSQL
createdb erp_dev

# Ejecutar migraciones
npx prisma migrate deploy

# Opcional: Seed de datos de prueba
npx prisma db seed
```

### 5. Generar cliente de Prisma

```bash
npx prisma generate
```

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## 📖 Documentación

Toda la documentación técnica está organizada en la carpeta `/docs`:

- **[docs/CLAUDE.md](./docs/CLAUDE.md)** - Guía completa para desarrollo
- **[docs/README.md](./docs/README.md)** - Índice de documentación
- **[docs/technical/](./docs/technical/)** - Documentación técnica detallada

Documentación específica:
- [Setup de Base de Datos](./docs/technical/README-DB.md)
- [Despliegue](./docs/technical/DEPLOY.md)
- [Configuración de Sentry](./docs/technical/SENTRY_SETUP.md)
- [Sistema de Firmas](./docs/technical/SIGNATURES_IMPLEMENTATION.md)
- [Guía de Estilo](./docs/technical/STYLE_GUIDE.md)

## 🏗️ Arquitectura del Proyecto

```
erp-shacdn/
├── docs/                      # Documentación
│   ├── CLAUDE.md             # Guía de desarrollo
│   ├── README.md             # Índice de docs
│   └── technical/            # Docs técnicas
├── prisma/                   # Schema y migraciones
│   ├── schema.prisma
│   └── migrations/
├── public/                   # Assets estáticos
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (main)/          # Rutas autenticadas
│   │   └── (external)/      # Rutas públicas
│   ├── components/           # Componentes React
│   │   ├── ui/              # shadcn/ui components
│   │   └── [feature]/       # Feature-specific
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilidades
│   ├── server/              # Server actions
│   ├── stores/              # Zustand stores
│   └── styles/              # Estilos globales
├── instrumentation.ts        # Sentry instrumentation
├── next.config.mjs          # Configuración de Next.js
├── tailwind.config.ts       # Configuración de Tailwind
└── tsconfig.json            # Configuración de TypeScript
```

## 🐳 Docker

### Desarrollo

```bash
docker-compose up
```

### Producción

```bash
docker build -t erp-shacdn .
docker run -p 3000:3000 erp-shacdn
```

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev                    # Servidor de desarrollo (Turbopack)

# Build
npm run build                  # Build de producción
npm run start                  # Servidor de producción

# Base de datos
npm run db:push                # Sincronizar schema (desarrollo)
npm run db:migrate             # Crear migración
npm run db:studio              # Abrir Prisma Studio
npm run db:seed                # Seed de datos

# Linting y Formatting
npm run lint                   # ESLint
npm run format                 # Prettier (write)
npm run format:check           # Prettier (check)

# Theme
npm run generate:presets       # Generar presets de tema
```

## 🔐 Seguridad

- Autenticación basada en cookies seguras
- Validación de datos con Zod en cliente y servidor
- Sanitización de inputs
- Headers de seguridad configurados
- CSRF protection
- Rate limiting en endpoints críticos
- Encriptación de contraseñas con bcrypt
- Tokens únicos para firmas digitales
- Cumplimiento RGPD/LOPDGDD para geolocalización

## 🚢 Despliegue

El proyecto está preparado para desplegarse en:

- **Vercel** (recomendado)
- **Render** (configurado)
- **Docker** (cualquier proveedor)
- **AWS/GCP/Azure** (con contenedores)

Ver [Guía de Despliegue](./docs/technical/DEPLOY.md) para más detalles.

## 🤝 Contribución

Este es un proyecto privado. Si tienes acceso:

1. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
2. Commit con mensajes descriptivos
3. Push a la rama: `git push origin feature/nueva-funcionalidad`
4. Abre un Pull Request

### Convenciones de Commits

```
feat: nueva funcionalidad
fix: corrección de bug
docs: cambios en documentación
style: cambios de formato
refactor: refactorización de código
test: añadir tests
chore: tareas de mantenimiento
```

## 📄 Licencia

Este proyecto es privado y propietario.

## 👨‍💻 Desarrollado por

**Jose Francisco Parra Fernández**

---

**¿Necesitas ayuda?** Consulta la [documentación completa](./docs/README.md) o abre un issue.
