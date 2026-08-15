import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { esSesionMuerta } from "./errores";
import { sesion as pedirSesion, type RespuestaSesion } from "./registro";

/**
 * La sesion vive en una cookie httpOnly: el token nunca lo ve un script del
 * navegador. Guardamos SOLO el token; el uid, el email y el resto salen
 * siempre de `GET /sesion`, que es la fuente de verdad.
 */
export const NOMBRE_COOKIE = "sesion_pp2";

export function leerToken(): string | undefined {
  return cookies().get(NOMBRE_COOKIE)?.value;
}

/** Solo desde un server action o un route handler (Next no deja escribir cookies en un page). */
export function guardarCookieSesion(token: string, expiraEn: string): void {
  const vence = new Date(expiraEn);
  cookies().set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: Number.isNaN(vence.getTime()) ? undefined : vence,
    path: "/",
  });
}

/** Idem: solo desde server action o route handler. */
export function borrarCookieSesion(): void {
  cookies().delete(NOMBRE_COOKIE);
}

/**
 * Resuelve la sesion actual contra el registro.
 * Devuelve null si no hay cookie o si el token ya no sirve (vencido, revocado,
 * usuario dado de baja). No borra la cookie: desde un server component no se
 * puede. De eso se encarga `requerirSesion` mandando a /api/salir.
 */
export async function obtenerSesion(): Promise<RespuestaSesion | null> {
  const token = leerToken();
  if (!token) return null;

  try {
    return await pedirSesion(token);
  } catch (error) {
    if (esSesionMuerta(error)) return null;
    throw error;
  }
}

/**
 * Para páginas protegidas: devuelve la sesion o corta el render con un
 * redirect. Si habia cookie pero ya no sirve, pasa por /api/salir para
 * limpiarla antes de llegar a /login.
 */
export async function requerirSesion(): Promise<RespuestaSesion> {
  const token = leerToken();
  if (!token) redirect("/login");

  const sesionActual = await obtenerSesion();
  if (!sesionActual) redirect("/api/salir?motivo=expirada");

  return sesionActual;
}
