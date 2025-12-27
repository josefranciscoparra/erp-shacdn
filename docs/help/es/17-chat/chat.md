# Chat Empresarial

## Qué es y para qué sirve

El **Chat Empresarial** es un sistema de mensajería 1:1 integrado en TimeNow que permite la comunicación directa entre empleados de tu organización. Es una herramienta de colaboración rápida y eficiente para:

- **Comunicación inmediata**: Intercambia mensajes en tiempo real con tus colegas
- **Notificaciones**: Recibe alertas cuando tienes mensajes sin leer
- **Historial completo**: Todos los mensajes quedan registrados en la conversación
- **Información de contacto**: Accede rápidamente a datos de teléfono y departamento de tu contacto

## Quién puede usarlo

- **Empleados activos**: Todos los empleados registrados y activos en la organización
- **Dentro de la organización**: Solo puedes chatear con compañeros de tu misma empresa
- **Requiere autenticación**: Debes estar logeado en TimeNow

**Nota**: El módulo debe estar habilitado por el administrador de tu organización para ser visible.

## Flujos principales

### 1) Iniciar conversación

#### Opción A: Desde el sidebar
1. Dirígete a **Dashboard > Chat**
2. Haz clic en el botón **"+"** en la esquina superior derecha
3. Se abrirá un diálogo con búsqueda de usuarios
4. Escribe el nombre o email del compañero que deseas contactar
5. Selecciona al usuario de la lista
6. Se creará automáticamente la conversación

#### Detalles del flujo
- **Búsqueda**: Se busca por nombre o email (insensible a mayúsculas)
- **Creación automática**: Si es la primera vez, la conversación se crea automáticamente
- **Rápido**: El chat se abre inmediatamente después de seleccionar al usuario
- **No se permite**: No puedes chatear contigo mismo

### 2) Enviar mensaje

#### Pasos
1. Selecciona la conversación de tu lista de chats
2. Verás el histórico de mensajes en la parte central
3. En la parte inferior hay un campo de entrada: **"Escribe un mensaje..."**
4. Escribe tu mensaje (máximo 2KB, aproximadamente 2000 caracteres)
5. Presiona **Enter** o haz clic en el botón **"Enviar"**

#### Estados del mensaje
- **Enviando (spinner)**: El mensaje se está transmitiendo al servidor
- **Enviado (palomita)**: El mensaje fue entregado correctamente
- **Error (cruz roja)**: Hubo un error al enviar → Haz clic en **"Reintentar"**

#### Características
- **Tiempo real**: Los mensajes llegan instantáneamente
- **Timestamp**: Cada mensaje muestra la hora exacta de envío (formato HH:MM)
- **Avatar**: Puedes ver el avatar del compañero que envía cada mensaje
- **Scroll automático**: Se desplaza automáticamente al último mensaje

### 3) Ver conversaciones

#### Página principal
- **URL**: `/dashboard/chat`
- **Ubicación**: En el menú lateral de navegación

#### Componentes principales

**Sidebar izquierdo (Lista de chats)**
- Muestra todas tus conversaciones activas
- **Ordenadas** por mensaje más reciente (arriba)
- Cada item muestra:
  - Avatar del contacto
  - Nombre del contacto
  - Último mensaje (preview)
  - Hora/fecha del último mensaje
  - Badge rojo con número de mensajes no leídos (si los hay)

**Área central (Conversación abierta)**
- Muestra el histórico completo de la conversación
- **Header**: Nombre, email y foto del contacto
- **Mensajes**: Ordenados cronológicamente de antiguo a nuevo
  - Mensajes tuyos: Alineados a la derecha, fondo azul
  - Mensajes del contacto: Alineados a la izquierda, fondo gris
- **Input**: Campo para escribir nuevo mensaje en la parte inferior

**Información del contacto**
- Haz clic en el nombre o avatar en el header para ver:
  - Nombre completo
  - Email
  - Teléfono (si está registrado)
  - Departamento actual

---

## Pantallas y campos

### 1) Dialog: Nuevo Chat

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|------------|-------------|
| Búsqueda | Text | Sí | Busca por nombre o email. Mínimo 1 carácter |
| Usuario (resultado) | Card | - | Clickeable. Muestra nombre, email y avatar |

### 2) Conversaciones List

| Elemento | Tipo | Función |
|----------|------|---------|
| Header "Chats" | Text | Título con botón "+" para nuevo chat |
| Input búsqueda | Text | Filtra conversaciones por nombre |
| Conversación (item) | Card | Clickeable para abrir conversación |
| Badge no leídos | Badge | Número en rojo (solo si hay > 0) |

### 3) Conversation View

| Elemento | Tipo | Función |
|----------|------|---------|
| Header | Header | Nombre, email, foto del contacto |
| Botón info | Button | Muestra teléfono, departamento |
| Área mensajes | Scroll | Historial de conversación |
| Input mensaje | Text | Campo para escribir mensajes |
| Botón Enviar | Button | Envía o "Enter" |

---

## Preguntas frecuentes

**P: ¿Cuántas conversaciones puedo tener?**
R: Ilimitadas. Puedes chatear con todos los empleados activos de tu organización.

**P: ¿Los mensajes se eliminan en algún momento?**
R: No, los mensajes son permanentes. El administrador puede vaciar una conversación si es necesario.

**P: ¿Puedo ver a qué hora fue enviado cada mensaje?**
R: Sí, cada mensaje muestra la hora exacta en formato HH:MM.

**P: ¿Mi contacto sabe que leí su mensaje?**
R: No hay confirmación de lectura visual. Pero el sistema registra internamente si fue leído.

**P: ¿Qué es el número rojo junto al nombre en la lista?**
R: Es el contador de mensajes no leídos. Se resetea cuando abres el chat.

**P: ¿Puedo ocultar un chat?**
R: Sí, haz clic en el menú de opciones (⋯) → Ocultar.

**P: ¿Funciona en móvil?**
R: Sí, completamente optimizado. El chat se adapta al tamaño de pantalla.

**P: ¿Hay límite de caracteres por mensaje?**
R: Sí, máximo 2KB (aproximadamente 2000 caracteres).

**P: ¿Qué pasa si pierdo la conexión de internet?**
R: Si intentas enviar, recibirás error y podrás reintentar cuando vuelva la conexión.

**P: ¿Por qué no veo a algunos compañeros en la búsqueda?**
R: Posibles razones: usuario inactivo, otra organización, o el chat está deshabilitado para la organización.

**P: ¿Los mensajes son privados?**
R: Entre usuarios sí, pero recuerda que los administradores pueden ver el contenido. Es una herramienta empresarial, no privada.

---

## Checklist de soporte

### Para el usuario final

- [ ] ¿Tienes un usuario activo en TimeNow?
- [ ] ¿El módulo Chat está habilitado en tu organización?
- [ ] ¿Tienes acceso a la sección Dashboard > Chat?
- [ ] ¿Ves el icono de Chat en el menu lateral?
- [ ] ¿Puedes buscar compañeros de tu organización?
- [ ] ¿Se crean automáticamente las conversaciones?
- [ ] ¿Ves la notificación de mensajes no leídos (badge rojo)?

### Para el administrador

- [ ] **Habilitar/Deshabilitar Chat**: Configuración > Organización > Chat
- [ ] **Ver estadísticas de uso**: Total de conversaciones, mensajes enviados
- [ ] **Verificar usuarios activos**: Solo empleados con estado "activo" aparecen

### Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| No veo el Chat en el menu | Módulo deshabilitado | Administrador habilita en Configuración |
| No puedo enviar mensajes | Rate limit | Espera 1-2 minutos |
| Mensaje dice "Reintentar" | Error de conexión | Verifica internet y haz clic en "Reintentar" |
| No recibo notificaciones | SSE caído | Recarga la página |
| No veo al usuario en búsqueda | Usuario inactivo | Administrador activa al usuario |

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team
