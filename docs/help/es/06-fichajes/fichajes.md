# Fichajes (Control Horario)

## Qué es y para qué sirve

El sistema de **Fichajes** es tu herramienta para registrar tu asistencia y jornada laboral en TimeNow. Te permite:

- **Registrar tu entrada** al iniciar la jornada
- **Registrar tu salida** al finalizar
- **Marcar pausas y descansos** durante el día
- **Ver historial completo** de todos tus fichajes
- **Registrar ubicación GPS** (si está habilitado)
- **Conocer tu desviación** comparando horas esperadas vs trabajadas

## Quién puede usarlo

- **Todos los empleados** pueden fichar entrada, salida y pausas
- **Supervisores** pueden ver fichajes de su equipo
- **Administradores** pueden crear fichajes manuales

## Antes de empezar

**Requisitos:**
- Horario asignado (si no tienes, contacta a tu administrador)
- Contrato activo
- Geolocalización habilitada en navegador (si se requiere GPS)

**Navegadores compatibles:** Chrome, Firefox, Edge, Safari

---

## Flujos principales

### 1) Fichar entrada

1. Ve a **Mi día a día** → **Fichar**
2. Verás tu horario del día
3. Haz clic en **Fichar entrada** (botón verde)
4. Si hay GPS activo:
   - Permite acceso a ubicación cuando lo pida
   - Confirma consentimiento RGPD (primera vez)
5. El sistema registra:
   - Hora exacta
   - Ubicación GPS (si disponible)
   - Si estás dentro del área permitida

![IMG: fichar-entrada | Pantalla: Reloj de fichaje | Elementos clave: botón entrada, hora actual | Acción destacada: Click en Fichar entrada]

### 2) Fichar salida

1. El botón ahora muestra **Fichar salida** (rojo)
2. Haz clic para registrar tu salida
3. Si estabas en pausa, se cierra automáticamente
4. Aparece el **Resumen del Día**:
   - Estado: COMPLETADO / INCOMPLETO
   - Horas esperadas vs trabajadas
   - Desviación (+/- minutos)

### 3) Registrar pausa

**Pausa manual:**
1. Mientras estás fichado, aparece botón **Iniciar pausa**
2. Haz clic para comenzar la pausa
3. Cuando termines, haz clic en **Finalizar pausa**

**Pausa automática:**
- Según tu horario, pueden crearse pausas automáticas
- Aparecen con badge "Auto"
- No necesitas hacer nada

### 4) Ver mis fichajes

En la misma pantalla verás:

**Fichajes de hoy:**
- Lista cronológica de todos tus fichajes
- Tipo (entrada, salida, pausa)
- Ubicación GPS si está disponible

**Tu horario hoy:**
- Franjas horarias esperadas
- Total de horas del día

**Resumen del día** (después de salir):
- Estado de cumplimiento
- Comparativa de horas
- Desviación total

### 5) Geolocalización (GPS)

**Activar GPS:**
1. Ve a **Configuración** → **Geolocalización**
2. Activa el toggle
3. Permite acceso a ubicación en el navegador
4. Confirma consentimiento RGPD

**Qué se registra:**
- Coordenadas GPS
- Precisión (±metros)
- Si estás dentro del área permitida

**Vista en mapa:**
- Si hay fichajes con GPS, aparece botón "Mapa"
- Muestra todos tus fichajes en mapa interactivo
- Marcadores de colores según tipo de fichaje

---

## Pantallas y campos

### Pantalla de Fichaje

**Sección "Tu Horario Hoy":**
- Franjas horarias (trabajo/pausa)
- Horas esperadas
- Período activo (Regular, Intensivo, etc.)

**Sección de botones:**
- Fichar entrada / Fichar salida
- Iniciar pausa / Finalizar pausa
- Tiempo trabajado actual
- Tiempo en pausa

**Sección "Fichajes de hoy":**
- Lista con hora, tipo, ubicación
- Toggle Lista/Mapa (si hay GPS)

**Sección "Resumen del Día":**
- Estado: COMPLETADO (verde) / INCOMPLETO (rojo)
- Horas esperadas vs trabajadas
- Desviación con color

---

## Políticas y reglas

**Máquina de estados:**
- Entrada → Pausa → Salida: Válido
- Entrada → Salida (sin pausa): Válido
- Doble entrada: Inválido
- Salida sin entrada: Inválido

**Tolerancias:**
- La organización define tolerancias de horario
- Fichajes fuera de tolerancia generan avisos

**Validación GPS:**
- Si estás dentro del radio permitido: ✅
- Si estás fuera: ⚠️ Requiere revisión

---

## Preguntas frecuentes

**P: ¿Qué pasa si no puedo fichar?**

R: Contacta a tu supervisor. Puede crear un fichaje manual.

**P: ¿Se pierden los fichajes si cierro el navegador?**

R: No. Se guardan en el servidor al instante.

**P: ¿Por qué me pide permiso de ubicación?**

R: La primera vez con GPS activado. El navegador lo recordará después.

**P: ¿Qué significa desviación negativa?**

R: Trabajaste menos horas de las esperadas. Se reporta a RRHH.

**P: ¿Qué es "Requiere revisión"?**

R: Algo inusual en tu fichaje (GPS fuera de área, fuera de horario). Tu supervisor lo revisará.

**P: ¿Puedo fichar en día no laborable?**

R: Sí, pero aparece aviso. Se registra como potencial horas extra.

---

## Checklist de soporte

**No puedo fichar:**
- [ ] ¿Tienes contrato activo?
- [ ] ¿Tienes horario asignado?
- [ ] ¿Intentas acción válida? (ej: no doble entrada)

**Problemas GPS:**
- [ ] ¿Permitiste acceso a ubicación?
- [ ] ¿GPS del dispositivo activo?
- [ ] ¿Usas Chrome? (Safari localhost no soporta GPS)

**Desviación incorrecta:**
- [ ] ¿Ya fichaste salida?
- [ ] ¿Horario configurado correctamente?
- [ ] ¿Hay excepciones o ausencias?

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team
