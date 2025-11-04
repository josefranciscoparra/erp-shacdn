/**
 * Textos de consentimiento de geolocalización para cumplimiento RGPD
 */

export const CONSENT_VERSION = "1.0";

export const CONSENT_TEXT_V1 = `TimeNow utilizará tu ubicación geográfica únicamente en el momento de realizar fichajes (entrada, salida, pausas).

**Finalidad:** Verificar que el fichaje se realiza desde las instalaciones autorizadas de la empresa.

**Datos capturados:** Coordenadas GPS (latitud, longitud) y precisión del dispositivo.

**Conservación:** Los datos de ubicación se conservan junto con el registro de fichaje durante el tiempo legalmente establecido para registros laborales.

**Tus derechos:** Puedes revocar este consentimiento en cualquier momento desde Configuración > Privacidad. Al revocar, no podrás fichar si tu organización requiere geolocalización.

Al aceptar este consentimiento, autorizas el tratamiento de tus datos de ubicación conforme a lo descrito.`;

/**
 * Obtiene el texto de consentimiento según la versión
 *
 * @param version - Versión del consentimiento (por defecto "1.0")
 * @returns Texto de consentimiento
 */
export function getConsentText(version: string = "1.0"): string {
  switch (version) {
    case "1.0":
      return CONSENT_TEXT_V1;
    default:
      return CONSENT_TEXT_V1;
  }
}

/**
 * Título del dialog de consentimiento
 */
export const CONSENT_DIALOG_TITLE = "Consentimiento de Geolocalización";

/**
 * Texto del checkbox de aceptación
 */
export const CONSENT_CHECKBOX_LABEL =
  "He leído y acepto el tratamiento de mis datos de ubicación conforme a lo descrito";

/**
 * Información adicional sobre la revocación
 */
export const REVOCATION_INFO = `Si revocas este consentimiento:

- No podrás fichar desde la aplicación si tu organización requiere geolocalización
- Los datos de ubicación previamente capturados se conservarán según la legislación laboral
- Deberás contactar con Recursos Humanos para gestionar tus fichajes de otra forma`;
