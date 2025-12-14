-- Añade columnas para rastrear invalidaciones de contraseñas temporales
ALTER TABLE "temporary_passwords"
ADD COLUMN "invalidatedAt" TIMESTAMP(3),
ADD COLUMN "invalidatedReason" TEXT;
