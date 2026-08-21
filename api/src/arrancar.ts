import { APP_DEL_LOGIN, config } from "./config";
import { hashearToken } from "./crypto";
import { db } from "./db";

/**
 * Registra el token de API_TOKEN como la aplicación del login central.
 *
 * Los tokens viven en la tabla `aplicaciones`, no en el entorno, pero
 * API_TOKEN sigue siendo la fuente de verdad para ESTA fila en particular: se
 * sincroniza en cada arranque, así que cambiar la variable y reiniciar sigue
 * alcanzando para rotar el token del login.
 */
export async function asegurarAppDelLogin(): Promise<void> {
  const tokenHash = hashearToken(config.apiToken);

  const fila = await db.aplicacion.findUnique({ where: { nombre: APP_DEL_LOGIN } });

  if (!fila) {
    await db.aplicacion.create({
      data: { nombre: APP_DEL_LOGIN, proyectoId: null, tokenHash },
    });
    return;
  }

  if (fila.tokenHash !== tokenHash) {
    await db.aplicacion.update({
      where: { id: fila.id },
      data: { tokenHash, revocadaEn: null },
    });
  }
}
