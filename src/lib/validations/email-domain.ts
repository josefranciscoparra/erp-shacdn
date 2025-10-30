/**
 * Utilidades para validación de dominios de email corporativos
 *
 * Valida que los emails de usuarios pertenezcan a los dominios permitidos por la organización
 */

/**
 * Resultado de validación de email
 */
export interface EmailDomainValidationResult {
  valid: boolean;
  error?: string;
  domain?: string;
}

/**
 * Extrae el dominio de un email
 *
 * @param email - Email del usuario
 * @returns Dominio extraído (ej: "acme.com")
 */
export function extractEmailDomain(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) {
    return "";
  }
  return parts[1].toLowerCase();
}

/**
 * Verifica si la validación de dominios está habilitada globalmente
 *
 * @returns true si la variable de entorno NEXT_PUBLIC_ENFORCE_ORGANIZATION_EMAIL_DOMAINS está activa
 */
export function isEmailDomainEnforcementEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENFORCE_ORGANIZATION_EMAIL_DOMAINS === "true";
}

/**
 * Valida que un email pertenezca a los dominios permitidos de una organización
 *
 * @param email - Email a validar
 * @param allowedDomains - Array de dominios permitidos por la organización
 * @returns Resultado de validación
 */
export function validateEmailDomain(email: string, allowedDomains: string[]): EmailDomainValidationResult {
  // Si no hay dominios configurados, permitir cualquier email
  if (!allowedDomains || allowedDomains.length === 0) {
    return { valid: true };
  }

  // Si la validación global no está activa, permitir
  if (!isEmailDomainEnforcementEnabled()) {
    return { valid: true };
  }

  // Extraer dominio del email
  const emailDomain = extractEmailDomain(email);

  if (!emailDomain) {
    return {
      valid: false,
      error: "Email inválido",
    };
  }

  // Verificar que el dominio esté en la lista permitida
  const isAllowed = allowedDomains.some((domain) => domain.toLowerCase() === emailDomain);

  if (!isAllowed) {
    return {
      valid: false,
      error: `El email debe pertenecer a uno de los siguientes dominios: ${allowedDomains.join(", ")}`,
      domain: emailDomain,
    };
  }

  return { valid: true, domain: emailDomain };
}

/**
 * Valida y normaliza un dominio de email
 *
 * @param domain - Dominio a validar (ej: "acme.com" o "@acme.com")
 * @returns Dominio normalizado o null si es inválido
 */
export function normalizeDomain(domain: string): string | null {
  // Eliminar espacios
  let normalized = domain.trim();

  // Eliminar @ si está al inicio
  if (normalized.startsWith("@")) {
    normalized = normalized.substring(1);
  }

  // Convertir a minúsculas
  normalized = normalized.toLowerCase();

  // Validar formato de dominio (básico)
  // Debe tener al menos un punto y no caracteres especiales
  const domainRegex = /^[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;

  if (!domainRegex.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Valida un array de dominios
 *
 * @param domains - Array de dominios a validar
 * @returns Array de dominios normalizados y válidos
 */
export function validateAndNormalizeDomains(domains: string[]): string[] {
  return domains.map((domain) => normalizeDomain(domain)).filter((domain): domain is string => domain !== null);
}

/**
 * Genera mensaje de ayuda para el usuario sobre dominios permitidos
 *
 * @param allowedDomains - Dominios permitidos por la organización
 * @returns Mensaje de ayuda
 */
export function getEmailDomainHelpText(allowedDomains: string[]): string {
  if (!allowedDomains || allowedDomains.length === 0) {
    return "";
  }

  if (!isEmailDomainEnforcementEnabled()) {
    return "";
  }

  if (allowedDomains.length === 1) {
    return `El email debe pertenecer al dominio: ${allowedDomains[0]}`;
  }

  return `El email debe pertenecer a uno de estos dominios: ${allowedDomains.join(", ")}`;
}
