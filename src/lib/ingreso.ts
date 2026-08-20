import "server-only";

import { cookies } from "next/headers";

import { abrirFirmado, firmarContenido } from "./firma";

/**
 * Ingreso pendiente: alguien llegó desde la plataforma de un proyecto.
 *
 * El circuito puede arrancar en dos lados. Si arranca acá, la persona entra,
 * elige proyecto y se va. Si arranca en un proyecto —el caso normal: hace clic
 * en "Ingresar" adentro de Carpooling— ese proyecto la manda a `/entrar` con su
 * `proyecto_id`, y lo que quiere es volver **ahí**, no quedarse en este front.
 *
 * Entre esos dos momentos hay un login de por medio, así que la intención se
 * guarda en una cookie firmada y se consume cuando la identidad queda probada.
 *
 * Va firmada por lo mismo que la de sesión: si se pudiera editar, alguien
 * cambiaría el `pid` y saldría hacia un proyecto que no le toca. (Igual no
 * alcanzaría: antes de emitir el código se verifica contra el padrón que la
 * persona esté en ese proyecto. Son dos puertas, no una.)
 */

export const NOMBRE_COOKIE_INGRESO = "ingreso_pp2";

/** Lo que puede tardar alguien en poner mail y contraseña, con margen. */
const MINUTOS_DE_VIDA = 15;

/** El `state` del proyecto se devuelve tal cual; no lo miramos ni lo usamos. */
const LARGO_MAXIMO_STATE = 200;

type Contenido = {
  /** id del proyecto al que hay que volver. */
  pid: number;
  /** lo que mandó el proyecto para reconocer su propia ida. */
  state: string | null;
  /** vencimiento, en segundos desde época. */
  exp: number;
};

export type IngresoPendiente = {
  proyectoId: number;
  state: string | null;
};

/** La cookie armada, para setearla sobre un `NextResponse` propio. */
export function cookieDeIngreso(proyectoId: number, state: string | null) {
  const vence = new Date(Date.now() + MINUTOS_DE_VIDA * 60 * 1000);

  return {
    nombre: NOMBRE_COOKIE_INGRESO,
    valor: firmarContenido({
      pid: proyectoId,
      state: state ? state.slice(0, LARGO_MAXIMO_STATE) : null,
      exp: Math.floor(vence.getTime() / 1000),
    } satisfies Contenido),
    opciones: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      expires: vence,
      path: "/",
    },
  };
}

/** Devuelve la intención si la firma cierra y no venció. */
export function leerIngresoPendiente(): IngresoPendiente | null {
  const valor = cookies().get(NOMBRE_COOKIE_INGRESO)?.value;
  if (!valor) return null;

  const contenido = abrirFirmado<Contenido>(valor);
  if (!contenido) return null;

  if (!Number.isInteger(contenido.pid) || !Number.isFinite(contenido.exp)) return null;
  if (contenido.exp * 1000 <= Date.now()) return null;

  return {
    proyectoId: contenido.pid,
    state: typeof contenido.state === "string" ? contenido.state : null,
  };
}

/** Solo desde un server action. En un route handler: `respuesta.cookies.delete(...)`. */
export function borrarIngresoPendiente(): void {
  cookies().delete(NOMBRE_COOKIE_INGRESO);
}
