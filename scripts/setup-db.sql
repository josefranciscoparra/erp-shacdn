-- Script de configuración inicial de la base de datos ERP
-- Ejecutar como superusuario de PostgreSQL

-- Crear usuario si no existe
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_user
      WHERE usename = 'erp_user') THEN
      CREATE USER erp_user WITH PASSWORD 'erp_pass';
   END IF;
END
$do$;

-- Crear base de datos si no existe
SELECT 'CREATE DATABASE erp_dev OWNER erp_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'erp_dev')\gexec

-- Conectar a la base de datos erp_dev
\c erp_dev;

-- Dar todos los privilegios al usuario
GRANT ALL PRIVILEGES ON DATABASE erp_dev TO erp_user;
GRANT ALL ON SCHEMA public TO erp_user;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas fuzzy

-- Mensaje de confirmación
\echo 'Base de datos ERP configurada correctamente!'
\echo 'Usuario: erp_user'
\echo 'Base de datos: erp_dev'
\echo 'Puerto: 5432'