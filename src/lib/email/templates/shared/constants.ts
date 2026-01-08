/**
 * Estilos "Factorial-like" para emails
 * Paleta minimalista, premium, business-level
 */

// Colores
export const EMAIL_COLORS = {
  background: "#F6F7FB",
  cardBorder: "#E9ECF2",
  cardBackground: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#374151",
  muted: "#6B7280",
  footerMuted: "#9CA3AF",
  divider: "#EEF0F4",
  ctaButton: "#2563EB",
  ctaButtonHover: "#1D4ED8",
  link: "#2563EB",
} as const;

// Border radius
export const EMAIL_RADIUS = {
  card: "16px",
  button: "12px",
} as const;

// Shadows
export const EMAIL_SHADOWS = {
  card: "0 8px 24px rgba(17, 24, 39, 0.06)",
} as const;

// Font stack (system fonts para mejor rendering en email clients)
export const EMAIL_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

// Estilos base reutilizables (inline styles para emails)
export const EMAIL_STYLES = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: EMAIL_COLORS.background,
    fontFamily: EMAIL_FONT_FAMILY,
  },
  container: {
    width: "100%",
    maxWidth: "560px",
    margin: "0 auto",
    padding: "24px 16px 40px",
  },
  card: {
    backgroundColor: EMAIL_COLORS.cardBackground,
    borderRadius: EMAIL_RADIUS.card,
    padding: "28px 24px",
    border: `1px solid ${EMAIL_COLORS.cardBorder}`,
    boxShadow: EMAIL_SHADOWS.card,
  },
  heading: {
    margin: "0 0 12px",
    fontSize: "18px",
    lineHeight: "26px",
    color: EMAIL_COLORS.textPrimary,
    fontWeight: 700,
  },
  text: {
    margin: "0 0 12px",
    fontSize: "14px",
    lineHeight: "22px",
    color: EMAIL_COLORS.textSecondary,
  },
  textSmall: {
    margin: "18px 0 0",
    fontSize: "12px",
    lineHeight: "18px",
    color: EMAIL_COLORS.muted,
  },
  button: {
    backgroundColor: EMAIL_COLORS.ctaButton,
    borderRadius: EMAIL_RADIUS.button,
    color: "#FFFFFF",
    fontSize: "14px",
    padding: "12px 18px",
    textDecoration: "none",
    fontWeight: 700,
    display: "inline-block",
  },
  link: {
    color: EMAIL_COLORS.link,
    textDecoration: "underline",
    wordBreak: "break-word" as const,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${EMAIL_COLORS.divider}`,
    margin: "20px 0",
  },
  footer: {
    padding: "14px 6px 0",
    textAlign: "center" as const,
  },
  footerText: {
    margin: "6px 0 0",
    fontSize: "11px",
    lineHeight: "16px",
    color: EMAIL_COLORS.footerMuted,
  },
} as const;

// Defaults
export const EMAIL_DEFAULTS = {
  productName: "Timenow",
  supportEmail: "soporte@timenow.cloud",
} as const;
