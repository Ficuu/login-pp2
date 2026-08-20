import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma y verifica los datos que este front le confía al navegador.
 *
 * Lo usan la cookie de sesión y la de ingreso pendiente. Las dos guardan algo
 * chico y legible del lado del cliente, así que lo que importa no es esconderlo
 * sino que no se pueda cambiar: la firma es lo que impide que alguien se edite
 * el `uid` de la cookie y entre como otra persona.
 */

const SECRETO = process.env.SESION_SECRETO ?? "";

function exigirSecreto(): string {
  if (SECRETO.length < 32) {
    // Sin secreto largo la firma no protege nada: cortamos antes de emitir.
    console.error(
      "[firma] falta SESION_SECRETO (o es muy corto: mínimo 32 caracteres). " +
        "Generá uno con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
    throw new Error("SESION_SECRETO no está configurado");
  }

  return SECRETO;
}

function firmar(cuerpo: string): string {
  return createHmac("sha256", exigirSecreto()).update(cuerpo).digest("base64url");
}

/** `<contenido en base64url>.<firma>` */
export function firmarContenido(contenido: unknown): string {
  const cuerpo = Buffer.from(JSON.stringify(contenido)).toString("base64url");
  return `${cuerpo}.${firmar(cuerpo)}`;
}

/**
 * Devuelve el contenido solo si la firma cierra. Nunca tira: un valor que no
 * cierra es un valor que no vale, y quien llama decide qué hacer con el null.
 *
 * Lo que NO valida es el vencimiento ni la forma del contenido: eso lo sabe
 * cada cookie, así que lo chequea cada una.
 */
export function abrirFirmado<T>(valor: string): T | null {
  const corte = valor.lastIndexOf(".");
  if (corte < 1) return null;

  const cuerpo = valor.slice(0, corte);
  const firmaRecibida = Buffer.from(valor.slice(corte + 1), "base64url");
  const firmaEsperada = Buffer.from(firmar(cuerpo), "base64url");

  // Longitudes distintas hacen explotar timingSafeEqual, así que se chequean antes.
  if (firmaRecibida.length !== firmaEsperada.length) return null;
  if (!timingSafeEqual(firmaRecibida, firmaEsperada)) return null;

  try {
    return JSON.parse(Buffer.from(cuerpo, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
