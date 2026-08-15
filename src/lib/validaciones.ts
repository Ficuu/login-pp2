/**
 * Validaciones que se corren en el servidor antes de viajar al registro
 * (y en el cliente, para no hacer el viaje al pedo). Comparten reglas con
 * el padrón: mínimo 8 caracteres, máximo 72 BYTES por el límite de bcrypt.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72;

/** El padrón normaliza el email a minúsculas y sin espacios: hacemos lo mismo. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function bytesDe(texto: string): number {
  return new TextEncoder().encode(texto).length;
}

export function errorDeEmail(email: string): string | undefined {
  const limpio = normalizarEmail(email);
  if (!limpio) return "Ingresá tu email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return "Ese email no parece válido.";
  return undefined;
}

export function errorDePassword(password: string): string | undefined {
  if (!password) return "Ingresá tu contraseña.";
  if (password.length < PASSWORD_MIN) return `La contraseña necesita al menos ${PASSWORD_MIN} caracteres.`;
  if (bytesDe(password) > PASSWORD_MAX_BYTES) return "La contraseña es demasiado larga (máximo 72 bytes).";
  return undefined;
}

export function errorDeTexto(valor: string, etiqueta: string, minimo = 2): string | undefined {
  const limpio = valor.trim();
  if (!limpio) return `Ingresá tu ${etiqueta}.`;
  if (limpio.length < minimo) return `El ${etiqueta} es demasiado corto.`;
  return undefined;
}

/** Junta los errores no vacíos en un objeto campo -> mensaje. */
export function juntarErrores(
  entradas: Record<string, string | undefined>,
): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const [campo, mensaje] of Object.entries(entradas)) {
    if (mensaje) campos[campo] = mensaje;
  }
  return campos;
}
