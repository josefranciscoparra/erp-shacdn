# Documentación del Proyecto ERP

Esta carpeta contiene toda la documentación técnica y de desarrollo del proyecto.

## 📁 Estructura

```
docs/
├── README.md                           # Este archivo
├── CLAUDE.md                          # Guía para Claude Code
└── technical/                         # Documentación técnica
    ├── CALENDARIO_ORGANIZACION.md    # Sistema de calendarios y festivos
    ├── DEPLOY.md                     # Guía de despliegue
    ├── ORDEN-IMPLEMENTACION.md       # Orden de implementación de features
    ├── PLAN_GASTOS.md                # Plan de implementación de gastos
    ├── README-DB.md                  # Documentación de base de datos
    ├── RENDER_SETUP.md               # Configuración en Render
    ├── RESUMEN_ERP.md                # Resumen general del ERP
    ├── SENTRY_SETUP.md               # Configuración de Sentry
    ├── SIGNATURES_IMPLEMENTATION.md  # Sistema de firmas digitales
    ├── STYLE_GUIDE.md                # Guía de estilo de código
    ├── TECHNICAL.md                  # Documentación técnica detallada
    └── errores.md                    # Log de errores y soluciones
```

## 📚 Guías Principales

### Para Desarrolladores
- **[CLAUDE.md](./CLAUDE.md)** - Guía completa para desarrollo con Claude Code
- **[technical/STYLE_GUIDE.md](./technical/STYLE_GUIDE.md)** - Convenciones de código y estilo
- **[technical/TECHNICAL.md](./technical/TECHNICAL.md)** - Documentación técnica detallada

### Para Deployment
- **[technical/DEPLOY.md](./technical/DEPLOY.md)** - Guía general de despliegue
- **[technical/RENDER_SETUP.md](./technical/RENDER_SETUP.md)** - Configuración específica de Render
- **[technical/README-DB.md](./technical/README-DB.md)** - Setup de base de datos

### Para Features Específicos
- **[technical/PLAN_GASTOS.md](./technical/PLAN_GASTOS.md)** - Sistema de gastos
- **[technical/SIGNATURES_IMPLEMENTATION.md](./technical/SIGNATURES_IMPLEMENTATION.md)** - Firmas digitales
- **[technical/CALENDARIO_ORGANIZACION.md](./technical/CALENDARIO_ORGANIZACION.md)** - Gestión de calendarios
- **[technical/SENTRY_SETUP.md](./technical/SENTRY_SETUP.md)** - Monitorización con Sentry

## 🔍 Documentación de Código

La documentación inline del código se encuentra en:
- `/src/` - Comentarios JSDoc en componentes y funciones
- `/prisma/schema.prisma` - Documentación del modelo de datos

## 📝 Notas

- Esta estructura fue reorganizada para mantener la raíz del proyecto limpia
- Todos los archivos `.md` se ignoran en Docker (ver `.dockerignore`)
- Para contribuir, seguir las guías en [CLAUDE.md](./CLAUDE.md)
