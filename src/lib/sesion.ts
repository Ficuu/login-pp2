import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { abrirFirmado, firmarContenido } from "./firma";
import { buscarPorId, type Proyecto, type Usuario } from "./padron";

/**
 * La sesión la emitimos NOSOTROS.
 *
 * El Sistema de Registración no entrega tokens ni tiene un `GET /sesion` contra
 * el cual validar, así que después del login firmamos una cookie httpOnly con
 * HMAC-SHA256 y la verificamos en cada request. Adentro va lo mínimo: quién es
 * (`uid`) y en qué proyecto está parado (`pid`). El nombre, el email y los
 * proyectos NO se guardan en la cookie: salen del padrón, que es la fuente de
 * verdad y puede haber cambiado desde que la persona entró.
 */

export const NOMBRE_COOKIE = "sesion_pp2";

const HORAS_DE_VIDA = 24;

type Contenido = {
  /** id del usuario en el padrón. */
  uid: number;
  /** id del proyecto elegido. null = todavía no eligió. */
  pid: number | null;
  /** vencimiento, en segundos desde época. */
  exp: number;
};

export type Sesion = {
  usuario: Usuario;
  /** null mientras la persona no haya elegido proyecto. */
  proyecto: Proyecto | null;
  vence: Date;
};

/** Devuelve el contenido solo si la firma cierra y no venció. */
function abrirValor(valor: string): Contenido | null {
  const contenido = abrirFirmado<Contenido>(valor);
  if (!contenido) return null;

  if (!Number.isInteger(contenido.uid) || !Number.isFinite(contenido.exp)) return null;
  if (contenido.exp * 1000 <= Date.now()) return null;

  return contenido;
}

/**
 * La cookie ya armada y firmada, sin escribirla.
 *
 * Se expone así porque un route handler que devuelve su propio `NextResponse`
 * tiene que setearla sobre esa respuesta (`respuesta.cookies.set(...)`); las
 * escrituras vía `cookies()` no siempre viajan en un redirect propio.
 *
 * `expSegundos` sirve para reescribirla sin correr el vencimiento: al cambiar
 * de proyecto se conserva el de la sesión original, así ir y volver entre
 * proyectos no la estira para siempre.
 */
export function cookieDeSesion(uid: number, pid: number | null, expSegundos?: number) {
  const vence = expSegundos
    ? new Date(expSegundos * 1000)
    : new Date(Date.now() + HORAS_DE_VIDA * 60 * 60 * 1000);

  return {
    nombre: NOMBRE_COOKIE,
    valor: firmarContenido({ uid, pid, exp: Math.floor(vence.getTime() / 1000) }),
    opciones: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      expires: vence,
      path: "/",
    },
  };
}

/** Solo desde un server action: Next no deja escribir cookies en un page. */
export function guardarCookieSesion(uid: number, pid: number | null, expSegundos?: number): void {
  const { nombre, valor, opciones } = cookieDeSesion(uid, pid, expSegundos);
  cookies().set(nombre, valor, opciones);
}

/** Idem: solo desde server action. */
export function borrarCookieSesion(): void {
  cookies().delete(NOMBRE_COOKIE);
}

/** El contenido crudo de la cookie, sin ir al padrón. */
export function leerCookieSesion(): Contenido | null {
  const valor = cookies().get(NOMBRE_COOKIE)?.value;
  return valor ? abrirValor(valor) : null;
}

/**
 * Resuelve la sesión actual contra el padrón.
 *
 * Devuelve null si no hay cookie, si la firma no cierra, si venció o si esa
 * persona ya no está en el padrón. El proyecto se vuelve a chequear contra sus
 * proyectos actuales: si la sacaron del que tenía elegido, queda `proyecto:
 * null` y el flujo la manda de vuelta al selector.
 */
export async function obtenerSesion(): Promise<Sesion | null> {
  const contenido = leerCookieSesion();
  if (!contenido) return null;

  const usuario = await buscarPorId(contenido.uid);
  if (!usuario) return null;

  return {
    usuario,
    proyecto: usuario.proyectos.find((proyecto) => proyecto.id === contenido.pid) ?? null,
    vence: new Date(contenido.exp * 1000),
  };
}

/**
 * Para páginas protegidas: devuelve la sesión con proyecto elegido, o corta el
 * render con un redirect. Sin cookie válida va a /login; con cookie pero sin
 * proyecto vigente, al selector.
 */
export async function requerirSesion(): Promise<Sesion & { proyecto: Proyecto }> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/api/salir?motivo=expirada");
  if (!sesion.proyecto) redirect("/elegir-proyecto");

  return { ...sesion, proyecto: sesion.proyecto };
}
