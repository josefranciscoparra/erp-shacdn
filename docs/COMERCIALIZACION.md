# Guía de Comercialización - TimeNow

## 1. Legal y Compliance (CRÍTICO)

### RGPD/LOPDGDD

| Requisito                            | Estado          | Notas                                  |
| ------------------------------------ | --------------- | -------------------------------------- |
| Consentimiento GPS                   | ✅ Implementado | Dialog RGPD en fichajes                |
| Política de privacidad pública       | ❌ Pendiente    | Necesaria para web pública             |
| Contrato DPA (Encargado Tratamiento) | ❌ Pendiente    | Obligatorio para cada cliente          |
| Registro actividades tratamiento     | ❌ Pendiente    | Documento interno obligatorio          |
| Derecho al olvido                    | ❌ Pendiente    | Exportación + borrado de datos usuario |
| Portabilidad de datos                | ❌ Pendiente    | Exportación en formato estándar        |

### Cumplimiento Laboral Español

| Requisito                     | Estado          | Base Legal   |
| ----------------------------- | --------------- | ------------ |
| Registro horario obligatorio  | ✅ Implementado | RD 8/2019    |
| Conservación registros 4 años | ⚠️ Verificar    | Art. 34.9 ET |
| Formato exportable Inspección | ❌ Pendiente    | RD 8/2019    |
| Firma del trabajador          | ⚠️ Parcial      | Recomendado  |

## 2. Seguridad

### Checklist de Seguridad para Producción

| Aspecto                      | Estado | Prioridad   | Acción                      |
| ---------------------------- | ------ | ----------- | --------------------------- |
| HTTPS obligatorio            | ✅     | Crítica     | Cloudflare lo gestiona      |
| Backups automáticos          | ❌     | **Crítica** | Configurar backup diario BD |
| Encriptación datos sensibles | ⚠️     | Alta        | Revisar campos sensibles    |
| Auditoría de accesos         | ❌     | Media       | Implementar logging         |
| 2FA para admins              | ❌     | Alta        | Implementar TOTP            |
| Rate limiting                | ⚠️     | Media       | Verificar en API            |
| Sanitización inputs          | ✅     | Alta        | Zod + Prisma                |
| CORS configurado             | ⚠️     | Media       | Revisar config              |

### Plan de Backups Recomendado

```
Frecuencia:
├── Base de datos: Backup diario (retención 30 días)
├── Base de datos: Backup semanal (retención 3 meses)
├── Archivos R2: Versionado activado
└── Configuración: Backup en cada deploy

Ubicación:
├── Primario: Mismo proveedor (automático)
└── Secundario: Proveedor diferente (disaster recovery)
```

## 3. Infraestructura SaaS

### Mínimo Viable para Producción

```
Infraestructura:
├── Base de datos PostgreSQL (managed)
├── Aplicación Next.js (Vercel/Cloudflare Pages)
├── Storage: Cloudflare R2 ✅
├── CDN: Cloudflare ✅
├── DNS: Cloudflare ✅
└── SSL: Automático via Cloudflare

Monitorización:
├── Uptime monitoring (UptimeRobot, Better Stack)
├── Error tracking (Sentry)
├── Logs centralizados (Axiom, LogTail)
└── Alertas (PagerDuty, Slack)

Entornos:
├── Producción: timenow.cloud
├── Staging: staging.timenow.cloud
└── Development: localhost:3000
```

### SLA Recomendado

| Tier       | Uptime | Soporte                | Precio orientativo |
| ---------- | ------ | ---------------------- | ------------------ |
| Básico     | 99.5%  | Email (48h)            | 3-5€/empleado/mes  |
| Pro        | 99.9%  | Email (24h) + Chat     | 5-8€/empleado/mes  |
| Enterprise | 99.95% | Prioritario + Teléfono | Personalizado      |

## 4. Documentación Legal Necesaria

### Documentos Obligatorios

1. **Términos de Servicio (ToS)**
   - Contrato entre TimeNow y la empresa cliente
   - Incluye: uso permitido, limitaciones, pagos, cancelación
   - Requiere: revisión por abogado

2. **Política de Privacidad**
   - Para usuarios finales (empleados)
   - Incluye: qué datos, para qué, retención, derechos
   - Debe ser accesible públicamente

3. **DPA (Data Processing Agreement)**
   - Obligatorio por RGPD art. 28
   - TimeNow = Encargado del tratamiento
   - Cliente = Responsable del tratamiento
   - Incluye: medidas seguridad, subencargados, auditorías

4. **Política de Cookies**
   - Si usas cookies no esenciales
   - Banner de consentimiento

### Documentos Recomendados

5. **SLA (Service Level Agreement)**
   - Niveles de servicio garantizados
   - Compensaciones por incumplimiento

6. **Política de Seguridad**
   - Medidas técnicas y organizativas
   - Para clientes enterprise

## 5. Funcionalidades Comerciales Clave

### Para Mercado Español

| Funcionalidad                  | Prioridad | Estado | Notas                    |
| ------------------------------ | --------- | ------ | ------------------------ |
| Registro horario               | Crítica   | ✅     | Cumple RD 8/2019         |
| Exportación Inspección Trabajo | Crítica   | ❌     | PDF/Excel firmado        |
| Calendario laboral por CCAA    | Alta      | ❌     | 17 calendarios + locales |
| Gestión vacaciones             | Alta      | ✅     | PTO implementado         |
| Gestión ausencias/IT           | Alta      | ✅     | Tipos de ausencia        |
| Integración nóminas (A3, Sage) | Media     | ❌     | Exportación CSV/XML      |
| Partes SEPE                    | Media     | ❌     | Para bajas IT            |
| Multi-idioma (cat, eus, gal)   | Media     | ❌     | Para AAPP                |
| Firma digital fichajes         | Media     | ⚠️     | Parcial                  |
| Geolocalización                | Media     | ✅     | Con consentimiento RGPD  |
| Informes automáticos           | Media     | ⚠️     | Básicos implementados    |

### Para Escalar a Otros Mercados

| Mercado  | Requisitos específicos               |
| -------- | ------------------------------------ |
| Portugal | Código do Trabalho, idioma PT        |
| Latam    | Legislación local variable, timezone |
| EU       | RGPD ya cumplido, idiomas locales    |

## 6. Modelo de Negocio

### Pricing Típico HR SaaS España

```
Estructura recomendada:

BÁSICO - 4€/empleado/mes (mín. 40€/mes)
├── Registro horario
├── Gestión ausencias
├── App móvil
└── Soporte email

PRO - 6€/empleado/mes (mín. 60€/mes)
├── Todo lo anterior +
├── Geolocalización
├── Informes avanzados
├── Integraciones básicas
└── Soporte prioritario

ENTERPRISE - Personalizado
├── Todo lo anterior +
├── SSO/SAML
├── API completa
├── SLA garantizado
├── Gestor de cuenta dedicado
└── Onboarding personalizado
```

### Métricas Clave a Seguir

| Métrica                         | Objetivo inicial       |
| ------------------------------- | ---------------------- |
| MRR (Monthly Recurring Revenue) | Crecimiento 10-15%/mes |
| Churn rate                      | < 5% mensual           |
| CAC (Coste adquisición cliente) | < 3x precio mensual    |
| LTV (Lifetime value)            | > 12x precio mensual   |
| NPS (Net Promoter Score)        | > 30                   |

## 7. Roadmap de Prioridades

### Fase 1: MVP Comercializable (1-2 meses)

```
Crítico para vender:
├── [ ] Política de privacidad
├── [ ] Términos de servicio
├── [ ] Exportación para Inspección Trabajo
├── [ ] Backups automáticos configurados
├── [ ] Landing page comercial
└── [ ] Proceso de onboarding básico
```

### Fase 2: Producto Competitivo (2-4 meses)

```
Para competir en mercado:
├── [ ] 2FA para administradores
├── [ ] Calendario laboral por CCAA
├── [ ] App móvil (PWA o nativa)
├── [ ] Integraciones nóminas
├── [ ] Auditoría de accesos
└── [ ] Multi-idioma básico
```

### Fase 3: Escalado (4-6 meses)

```
Para clientes enterprise:
├── [ ] SSO/SAML
├── [ ] API pública documentada
├── [ ] Certificación ISO 27001 (proceso)
├── [ ] SLA con compensaciones
└── [ ] White-label option
```

## 8. Competencia en España

### Principales Competidores

| Producto  | Pricing   | Fortaleza      | Debilidad       |
| --------- | --------- | -------------- | --------------- |
| Factorial | 4-8€/emp  | UX, marca      | Caro para pymes |
| Sesame    | 4-6€/emp  | Integraciones  | Complejidad     |
| Bizneo    | 3-7€/emp  | Completo       | Anticuado       |
| a3innuva  | Variable  | Integración A3 | Solo A3         |
| Personio  | 8-12€/emp | Enterprise     | Muy caro        |

### Diferenciación Posible

- Precio más competitivo para pymes (< 50 empleados)
- UX moderna y simple
- Soporte en español real (no chatbot)
- Flexibilidad y personalización
- Sin permanencia / mes a mes

---

_Última actualización: Enero 2025_
