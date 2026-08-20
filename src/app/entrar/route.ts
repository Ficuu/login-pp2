import { type NextRequest } from "next/server";

import { cookieDeIngreso, NOMBRE_COOKIE_INGRESO } from "@/lib/ingreso";
import { buscarPorId, destinoDelProyecto } from "@/lib/padron";
import { redirigirA } from "@/lib/redirecciones";
import { cookieDeSesion, leerCookieSesion } from "@/lib/sesion";

/**
 * Por acá entra la gente que viene de la plataforma de un proyecto.
 *
 *     https://login.pp2/entrar?proyecto_id=1&state=loQueQuieraCarpooling
 *
 * Es el botón "Ingresar" de Carpooling: manda a la persona acá, se identifica
 * una sola vez, y vuelve allá con un código. El `state` viaja de ida y de
 * vuelta sin que lo miremos, para que el proyecto reconozca su propia ida.
 *
 * Si ya tiene sesión abierta acá, no se le pregunta nada: se identifica sola y
 * vuelve. Eso es lo que hace que entrar al segundo proyecto de la materia no
 * pida la contraseña de nuevo.
 */
export async function GET(request: NextRequest) {
  const proyectoId = Number(request.nextUrl.searchParams.get("proyecto_id"));
  const state = request.nextUrl.searchParams.get("state");

  if (!Number.isInteger(proyectoId) || proyectoId < 1) {
    return redirigirA("/login?motivo=proyecto-invalido");
  }

  const sesion = leerCookieSesion();
  const usuario = sesion ? await buscarPorId(sesion.uid) : null;

  if (sesion && usuario) {
    if (!usuario.proyectos.some((proyecto) => proyecto.id === proyectoId)) {
      // Tiene cuenta, pero no en ese proyecto. Volver a pedirle la contraseña
      // no lo arreglaría: que elija uno de los suyos.
      return redirigirA("/elegir-proyecto?motivo=sin-ese-proyecto");
    }

    const respuesta = redirigirA(
      await destinoDelProyecto(usuario.id, proyectoId, "/cuenta", state),
    );

    // Sella el proyecto en la sesión, igual que el selector, conservando el
    // vencimiento original: pasar por acá no estira la sesión.
    const { nombre, valor, opciones } = cookieDeSesion(usuario.id, proyectoId, sesion.exp);
    respuesta.cookies.set(nombre, valor, opciones);

    // Por si venía de un intento anterior que quedó a medias.
    respuesta.cookies.delete(NOMBRE_COOKIE_INGRESO);

    return respuesta;
  }

  // Todavía no sabemos quién es: se guarda a dónde volver y se la manda a
  // identificarse. El login consume esto apenas la contraseña cierra.
  const respuesta = redirigirA("/login?motivo=desde-proyecto");
  const { nombre, valor, opciones } = cookieDeIngreso(proyectoId, state);
  respuesta.cookies.set(nombre, valor, opciones);

  return respuesta;
}
