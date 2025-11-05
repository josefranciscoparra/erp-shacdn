/**
 * Rate limiter simple en memoria para el módulo de chat
 * Límite: 10 mensajes por 10 segundos por usuario
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 10000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Limpiar entradas expiradas cada minuto
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Verifica si una petición está permitida
   */
  check(userId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.limits.get(userId);

    if (!entry || now > entry.resetAt) {
      // Nueva ventana o ventana expirada
      this.limits.set(userId, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return { allowed: true };
    }

    if (entry.count < this.maxRequests) {
      // Incrementar contador
      entry.count++;
      return { allowed: true };
    }

    // Límite excedido
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  /**
   * Limpia entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(userId);
      }
    }
  }

  /**
   * Reinicia el límite para un usuario (útil para testing)
   */
  reset(userId: string): void {
    this.limits.delete(userId);
  }

  /**
   * Obtiene estadísticas actuales
   */
  getStats() {
    return {
      totalUsers: this.limits.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
    };
  }
}

// Instancia singleton
export const chatRateLimiter = new RateLimiter(10, 10000);
