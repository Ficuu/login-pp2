/**
 * Validaciones que se corren en el servidor antes de viajar al padrón (y en el
 * cliente, para no hacer el viaje al pedo).
 *
 * El máximo de la contraseña es de bcrypt, que no mira más allá de 72 BYTES.
 * Ojo con confundirlo con el VARCHAR(255) de la columna: ahí entra el hash (60
 * caracteres), no la contraseña. Los otros máximos sí salen de las columnas de
 * `database/init.sql`: email VARCHAR(100), nombre y apellido VARCHAR(50).
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72;
export const EMAIL_MAX = 100;
export const NOMBRE_MAX = 50;

/** El padrón guarda el email tal cual llega, así que lo normalizamos nosotros. */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function errorDeEmail(email: string): string | undefined {
  const limpio = normalizarEmail(email);
  if (!limpio) return "Ingresá tu email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return "Ese email no parece válido.";
  if (limpio.length > EMAIL_MAX) return `El email no puede pasar de ${EMAIL_MAX} caracteres.`;
  return undefined;
}

export function bytesDe(texto: string): number {
  return new TextEncoder().encode(texto).length;
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
  if (limpio.length > NOMBRE_MAX) return `El ${etiqueta} no puede pasar de ${NOMBRE_MAX} caracteres.`;
  return undefined;
}

/** El proyecto llega del formulario como string y va al padrón como int. */
export function errorDeProyecto(valor: string): string | undefined {
  return Number.isInteger(Number(valor)) && Number(valor) > 0
    ? undefined
    : "Elegí un proyecto.";
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
