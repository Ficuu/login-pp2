import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

/**
 * En la base hay filas cargadas como `Carnero@gmail.com`. Se guarda y se
 * busca siempre en minúsculas para que el login no dependa de cómo lo
 * escriban.
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashear(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verificar(password: string, guardado: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, guardado);
  } catch {
    // La fila todavía tiene la contraseña en texto plano, o el hash no es
    // válido por otro motivo: no es algo que bcrypt pueda comparar, así que
    // no valida.
    return false;
  }
}

/** Token de un solo uso: 256 bits de azar, en base64url (sin +, / ni =). */
export function generarToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Del token se guarda el hash, no el token: con un dump de la base no se
 * entra a ningún lado. Es SHA-256 y no bcrypt porque el token lo generamos
 * nosotros con 256 bits de azar — no hay nada que adivinar a fuerza bruta,
 * que es contra lo que sirve bcrypt.
 */
export function hashearToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
