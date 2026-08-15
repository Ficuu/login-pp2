import { NextResponse, type NextRequest } from "next/server";

import { borrarCookieSesion } from "@/lib/sesion";

/**
 * Limpieza de cookie sin revocar nada.
 *
 * Existe porque un server component no puede borrar cookies: cuando una pagina
 * protegida descubre que el token venció, redirige aca y desde aca se borra la
 * cookie y se vuelve a /login. El logout de verdad (que si revoca el token en
 * el registro) es el server action de /cuenta.
 */
export function GET(request: NextRequest) {
  borrarCookieSesion();

  const motivo = request.nextUrl.searchParams.get("motivo") ?? "expirada";
  const destino = new URL("/login", request.nextUrl.origin);
  destino.searchParams.set("motivo", motivo);

  return NextResponse.redirect(destino);
}
