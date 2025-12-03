# Documentos y almacenamiento

Esta guía resume cómo controlar el módulo de Documentos y cómo configurar los proveedores de almacenamiento soportados (Local, Azure Blob y Cloudflare R2), así como los aspectos de seguridad a tener en cuenta.

## Flag de características para Documentos

- El módulo se controla con el flag `features.documents` definido en `src/config/features.ts`.
- Por defecto está **activado**. Puedes deshabilitarlo con cualquiera de estas variables de entorno (se evalúan en este orden):
  - `NEXT_PUBLIC_FEATURE_DOCUMENTS_ENABLED`
  - `FEATURE_DOCUMENTS_ENABLED`
- Valores aceptados (sin distinción de mayúsculas): `true`, `1`, `on`, `enabled`, `yes` ⇒ activa. `false`, `0`, `off`, `disabled`, `no` ⇒ desactiva.

### ¿Qué ocurre al desactivar el flag?

- La navegación lateral oculta los accesos a documentos personales y globales.
- Las páginas `/dashboard/me/documents`, `/dashboard/employees/[id]/documents` y `/dashboard/documents` muestran mensajes informativos y evitan ejecutar fetches o mutaciones.
- Las API `GET/POST/DELETE` para documentos responden `503 Service Unavailable`, impidiendo subidas o descargas accidentales.
- Los stores de Zustand y las acciones de servidor retornan colecciones vacías y muestran toasts aclaratorios.

Usa este flag para reducir costes iniciales deshabilitando por completo el módulo hasta disponer de un almacenamiento definitivo.

## Proveedores de almacenamiento disponibles

El provider se selecciona con `STORAGE_PROVIDER` (`local` por defecto). Cada opción requiere variables específicas:

| Provider | Variables obligatorias                                                                          | Notas                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `local`  | `LOCAL_STORAGE_PATH` (ruta en disco), `LOCAL_STORAGE_URL` (prefijo público)                     | Ideal para desarrollo; los archivos quedan en el servidor donde corre la app.                      |
| `azure`  | `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_CONTAINER_PREFIX` (opcional, por defecto `documents`) | Usa Azure Blob Storage. Asegúrate de que el connection string tenga permisos de lectura/escritura. |
| `r2`     | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`                        | Cloudflare R2 compatible con S3; admite `R2_ENDPOINT` y `R2_PUBLIC_URL` opcionales.                |

> **Nota:** El proveedor `aws` (S3 clásico) está reservado y aún no está implementado.

Configura las variables en Vercel (o el hosting que uses) y lanza un redeploy para aplicar los cambios.

## Configuración paso a paso de Cloudflare R2

1. Crea una cuenta en Cloudflare y habilita R2.
2. Desde el dashboard, crea un bucket privado (no habilites acceso público).
3. Genera un token de API con permisos `Edit` sobre R2.
4. Anota:
   - `Account ID`
   - `Access Key ID`
   - `Secret Access Key`
   - Nombre del bucket
5. Añade las variables al entorno de producción y, si lo necesitas, al de preview/dev:
   ```bash
   STORAGE_PROVIDER=r2
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=erp-documents
   # Opcional
   R2_ENDPOINT=https://<id>.r2.cloudflarestorage.com
   R2_PUBLIC_URL=https://files.tu-dominio.com
   ```
6. Redeploy la app.

### Opcionales

- `R2_ENDPOINT`: sólo si usas un endpoint personalizado (por ejemplo, a través de la API de Cloudflare en regiones beta).
- `R2_PUBLIC_URL`: si expones el bucket detrás de un dominio propio; úsalo **sólo** si controlas el acceso (por ejemplo con una Cloudflare Worker o Zero Trust). Si el bucket permanece privado, puedes omitirlo y el SDK generará URLs con el dominio interno de R2.

## Seguridad y control de acceso

- Los buckets deben permanecer privados. R2 bloquea cualquier lectura sin credenciales válidas.
- El frontend nunca recibe credenciales. La app guarda únicamente la ruta (`storageUrl`) y delega en la API para descargar/borrar archivos.
- Cada handler de la API comprueba la sesión, la organización y los permisos antes de acceder a R2 (`src/app/api/me/documents/**`, `src/app/api/employees/**`, `src/app/api/documents/route.ts`).
- Para descargas directas se devuelve el stream desde el servidor o una URL firmada (`documentStorageService.getDocumentUrl`) con caducidad configurable (por defecto 1 hora). Así sólo el usuario autorizado puede abrir el enlace temporal.
- Si expones `R2_PUBLIC_URL`, protégelo con reglas de acceso (Cloudflare Access, Signed Exchanges, etc.) o sigue utilizando URLs firmadas.

## Azure Blob Storage

- Selecciona `STORAGE_PROVIDER=azure`.
- Proporciona el `AZURE_STORAGE_CONNECTION_STRING` completo (incluye `AccountKey`, `AccountName`, etc.).
- Opcionalmente ajusta `AZURE_CONTAINER_PREFIX` para definir el prefijo de los contenedores que se crearán por organización.
- El provider crea contenedores bajo el prefijo indicado (ej. `documents-org-<id>`). Asegúrate de permitir acceso privado y usa SAS o RBAC para limitar quién puede acceder desde Azure Portal.

## Estrategias de despliegue económico

1. **Fase inicial**: deja `NEXT_PUBLIC_FEATURE_DOCUMENTS_ENABLED=false` para validar el resto del SaaS sin costes de almacenamiento.
2. **Piloto**: usa `STORAGE_PROVIDER=local` en un servidor económico (Railway/Render/VPS) si sólo necesitas pruebas internas.
3. **Producción ligera**: activa `STORAGE_PROVIDER=r2` cuando necesites subir documentos reales; pagas sólo por uso y evitas infraestructura adicional.
4. **Escalado**: si ya usas Azure en otros servicios, cambia a `STORAGE_PROVIDER=azure` para centralizar en Blob Storage.

Mantén esta guía actualizada si añades nuevos providers o cambias las políticas de acceso.
