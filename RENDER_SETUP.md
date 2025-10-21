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

---

## 🚀 Post-Deploy: Inicialización de Base de Datos

Después de cada deploy nuevo o cuando migres la base de datos, ejecuta estos comandos en **Render Shell**:

### Acceder al Shell de Render

1. Dashboard de Render → Tu servicio
2. Click en **Shell** (botón superior derecho)
3. Espera a que se abra la terminal

### Comandos a ejecutar

#### Primera vez / Base de datos vacía

```bash
# Aplicar migraciones y crear datos maestros
npx prisma migrate deploy && npm run init:master
```

#### Solo actualizar datos maestros

```bash
# Si las migraciones ya están aplicadas
npm run init:master
```

#### Verificar estructura de la base de datos

```bash
# Ver el schema actual
npx prisma db pull

# Abrir Prisma Studio (interfaz web)
npx prisma studio
```

### 📋 Qué hace `npm run init:master`

Este comando ejecuta (en orden):

1. **Organización por defecto** - Crea organización y centro de coste
2. **Super Admin** - Crea usuario `superadmin@system.com` (password: `Admin123!`)
3. **Tipos de ausencia** - Vacaciones, enfermedad, etc.
4. **Niveles de posición** - Junior, Mid, Senior, Lead, etc.

> ⚠️ **Es idempotente**: Si los datos ya existen, no los duplica

### 🔍 Verificar que todo está bien

```bash
# Ver usuarios creados
npx prisma db execute --stdin <<EOF
SELECT email, role FROM "User" WHERE role = 'SUPER_ADMIN';
EOF
```

### 📝 Credenciales de acceso inicial

Después de ejecutar `init:master`:

- **Email**: `superadmin@system.com`
- **Password**: `Admin123!`
- **Rol**: `SUPER_ADMIN`

> ⚠️ **IMPORTANTE**: El sistema obligará a cambiar la contraseña en el primer login

### ⚡ Comandos útiles adicionales

```bash
# Ver logs en tiempo real (fuera del Shell, en Logs tab)
# Render → Tu servicio → Logs

# Conectar a PostgreSQL directamente
psql $DATABASE_URL

# Ejecutar una query SQL personalizada
npx prisma db execute --stdin <<EOF
SELECT COUNT(*) FROM "Organization";
EOF
```
