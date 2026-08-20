import "server-only";

import { NextResponse } from "next/server";

/**
 * Redirección con `Location` relativo, para los route handlers.
 *
 * `NextResponse.redirect()` exige una URL absoluta, y armarla con
 * `request.nextUrl.origin` devuelve lo que el servidor cree que es su origen:
 * adentro del contenedor eso es `http://0.0.0.0:3000`, que desde el navegador
 * no existe. Un `Location` relativo lo resuelve el navegador contra la
 * dirección que realmente pidió, así funciona igual detrás del mapeo de
 * puertos de docker o de un proxy.
 */
export function redirigirA(ruta: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: ruta },
  });
}
