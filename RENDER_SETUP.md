# Configuración de Variables de Entorno en Render

## 📋 Variables requeridas

Configura estas variables en **Render → Tu Servicio → Environment**:

### 🔐 Base de datos
```
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```
(Render provee esto automáticamente si vinculas una PostgreSQL database)

### 🔑 Autenticación
```
NEXTAUTH_URL=https://tu-app.onrender.com
NEXTAUTH_SECRET=[genera con: openssl rand -base64 32]
```

### 🔒 Encriptación
```
ENCRYPTION_KEY=[genera con: openssl rand -hex 16]
```

### ☁️ Cloudflare R2
```
R2_ACCOUNT_ID=tu-account-id
R2_ACCESS_KEY_ID=tu-access-key
R2_SECRET_ACCESS_KEY=tu-secret-key
R2_BUCKET=nombre-bucket
R2_ENDPOINT=https://account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=
STORAGE_PROVIDER=r2
```

### 🚀 Otras
```
NODE_ENV=production
UPSTASH_REDIS_REST_URL=  (opcional)
UPSTASH_REDIS_REST_TOKEN=  (opcional)
SENTRY_DSN=  (opcional)
```

## 🔧 Cómo configurar en Render

1. Ve a tu servicio en Render
2. Click en **Environment** en el menú lateral
3. Click en **Add Environment Variable**
4. Añade cada variable con su valor
5. Click en **Save Changes**
6. Render redesplegará automáticamente con las nuevas variables

## ⚠️ Importante

- **NUNCA** subas archivos `.env` o `.env.production` a git
- Las variables se inyectan automáticamente en el build de Docker
- No necesitas modificar el `Dockerfile` para añadir nuevas variables

## 🧪 Verificación local

Para desarrollo local, copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Y ajusta los valores para tu entorno local.
