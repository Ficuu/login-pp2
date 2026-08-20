import "server-only";

import { NextResponse } from "next/server";

/**
 * Redirección para los route handlers, con el `Location` tal cual se le pasa.
 *
 * Para las rutas de este front se le pasa una ruta relativa a propósito.
 * `NextResponse.redirect()` exige una URL absoluta, y armarla con
 * `request.nextUrl.origin` devuelve lo que el servidor cree que es su origen:
 * adentro del contenedor eso es `http://0.0.0.0:3000`, que desde el navegador
 * no existe. Un `Location` relativo lo resuelve el navegador contra la
 * dirección que realmente pidió, así funciona igual detrás del mapeo de
 * puertos de docker o de un proxy.
 *
 * También acepta una URL absoluta, que es como se sale hacia la plataforma de
 * un proyecto. Esa URL sale del padrón (`proyectos.url`, que fija la cátedra),
 * nunca de la query: si viniera de afuera, esto sería un redirect abierto.
 */
export function redirigirA(destino: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: destino },
  });
}
