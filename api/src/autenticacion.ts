import type { Aplicacion } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";

import { config } from "./config";
import { hashearToken } from "./crypto";
import { db } from "./db";
import { ErrorApi } from "./errores";

/**
 * Devuelve la aplicación dueña del `Authorization: Bearer`, o corta con 401.
 *
 * Cada aplicación (el login central, o el front de un proyecto) tiene su
 * propio token en la tabla `aplicaciones`. Antes había uno solo, compartido:
 * con él, el front de cualquier proyecto se llevaba el padrón entero,
 * incluida la gente de los otros. Ahora la API sabe QUIÉN pregunta.
 *
 * Se busca por el hash del token y no se compara nada a mano: el token son
 * 256 bits de azar, no hay nada que adivinar probando de a poco.
 */
export async function aplicacionDelToken(authorization: string | undefined): Promise<Aplicacion> {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new ErrorApi(401, "Token invalido");
  }

  const token = authorization.slice("Bearer ".length).trim();

  const aplicacion = await db.aplicacion.findFirst({
    where: { tokenHash: hashearToken(token), revocadaEn: null },
  });

  if (!aplicacion) {
    throw new ErrorApi(401, "Token invalido");
  }

  return aplicacion;
}

/** El token de la cátedra, no el de las aplicaciones. */
export function exigirAdmin(authorization: string | undefined): void {
  if (config.adminToken === config.apiToken) {
    // Si fueran el mismo, el token que tiene cada front alcanzaría para
    // resetear contraseñas ajenas o emitirse aplicaciones nuevas. Mejor no
    // arrancar que dejarlo pasar — esto ya se valida al arrancar el proceso,
    // así que llegar acá con los dos iguales no debería pasar nunca.
    throw new ErrorApi(500, "ADMIN_TOKEN no puede ser igual a API_TOKEN");
  }

  const esperado = `Bearer ${config.adminToken}`;

  if (
    !authorization ||
    authorization.length !== esperado.length ||
    !timingSafeEqual(Buffer.from(authorization), Buffer.from(esperado))
  ) {
    throw new ErrorApi(401, "Token invalido");
  }
}

export function exigirPasswordValida(password: string): void {
  if (password.length < config.passwordMinLargo) {
    throw new ErrorApi(422, `La contraseña necesita al menos ${config.passwordMinLargo} caracteres`);
  }

  if (Buffer.byteLength(password, "utf8") > config.passwordMaxBytes) {
    throw new ErrorApi(422, `La contraseña no puede pasar de ${config.passwordMaxBytes} bytes`);
  }
}
