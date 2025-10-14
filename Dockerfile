# Stage 1: Dependencies
FROM node:22.17.0-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar package files
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:22.17.0-alpine AS builder
WORKDIR /app

# Copiar dependencias desde deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copiar .env.production como .env para producción
COPY .env.production .env

# Variables de entorno necesarias para el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generar Prisma Client
RUN npx prisma generate

# Build de Next.js
RUN npm run build

# Stage 3: Runner
FROM node:22.17.0-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos públicos
COPY --from=builder /app/public ./public

# Copiar archivos de build
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

USER nextjs

EXPOSE 3000

CMD ["sh", "scripts/docker-entrypoint.sh"]
