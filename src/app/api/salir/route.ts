import { NextResponse, type NextRequest } from "next/server";

import { NOMBRE_COOKIE } from "@/lib/sesion";

/**
 * Borra la cookie y vuelve a /login.
 *
 * Existe porque un server component no puede borrar cookies: cuando una página
 * protegida descubre que la sesión ya no sirve (venció, la firma no cierra, la
 * persona no está más en el padrón), redirige acá.
 *
 * Con este padrón el logout es solo esto: no hay token que revocar del otro
 * lado, la sesión la emitimos y la cortamos nosotros.
 */
export function GET(request: NextRequest) {
  const motivo = request.nextUrl.searchParams.get("motivo") ?? "expirada";
  const destino = new URL("/login", request.nextUrl.origin);
  destino.searchParams.set("motivo", motivo);

  const respuesta = NextResponse.redirect(destino);
  respuesta.cookies.delete(NOMBRE_COOKIE);

  return respuesta;
}
