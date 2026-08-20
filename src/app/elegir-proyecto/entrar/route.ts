import { type NextRequest } from "next/server";

import { buscarPorId, destinoDelProyecto } from "@/lib/padron";
import { redirigirA } from "@/lib/redirecciones";
import { cookieDeSesion, leerCookieSesion } from "@/lib/sesion";

/**
 * Fija el proyecto de la sesión cuando no hubo nada que elegir.
 *
 * Existe porque un server component no puede escribir cookies: cuando alguien
 * tiene un solo proyecto, la página del selector no se muestra y manda acá,
 * que sella el proyecto y lo deja donde corresponda: la plataforma de ese
 * proyecto si tiene una, o /cuenta si no.
 */
export async function GET(request: NextRequest) {
  const sesion = leerCookieSesion();
  const aLogin = redirigirA("/login");
  if (!sesion) return aLogin;

  const proyectoId = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(proyectoId)) return aLogin;

  const usuario = await buscarPorId(sesion.uid);
  if (!usuario?.proyectos.some((proyecto) => proyecto.id === proyectoId)) return aLogin;

  const respuesta = redirigirA(await destinoDelProyecto(usuario.id, proyectoId));
  // Conserva el exp original: pasar por acá no renueva la sesión.
  const { nombre, valor, opciones } = cookieDeSesion(usuario.id, proyectoId, sesion.exp);
  respuesta.cookies.set(nombre, valor, opciones);

  return respuesta;
}
