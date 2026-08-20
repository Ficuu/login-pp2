import { ErrorApi } from "./errores";

/** Exige que el campo venga y sea un string no vacío (después de trim). */
export function campoTexto(cuerpo: Record<string, unknown>, campo: string): string {
  const valor = cuerpo[campo];

  if (typeof valor !== "string" || valor.trim().length === 0) {
    throw new ErrorApi(422, `Falta el campo "${campo}"`);
  }

  return valor;
}

/** Como `campoTexto`, pero sin exigir que no esté vacío (la contraseña se
 * valida aparte, con su propio mensaje). */
export function campoString(cuerpo: Record<string, unknown>, campo: string): string {
  const valor = cuerpo[campo];

  if (typeof valor !== "string") {
    throw new ErrorApi(422, `Falta el campo "${campo}"`);
  }

  return valor;
}

export function campoEntero(cuerpo: Record<string, unknown>, campo: string): number {
  const valor = cuerpo[campo];

  if (typeof valor !== "number" || !Number.isInteger(valor)) {
    throw new ErrorApi(422, `El campo "${campo}" tiene que ser un entero`);
  }

  return valor;
}

/** Como `campoEntero`, pero admite que no venga (queda `null`). */
export function campoEnteroOpcional(cuerpo: Record<string, unknown>, campo: string): number | null {
  const valor = cuerpo[campo];

  if (valor === undefined || valor === null) return null;

  if (typeof valor !== "number" || !Number.isInteger(valor)) {
    throw new ErrorApi(422, `El campo "${campo}" tiene que ser un entero`);
  }

  return valor;
}

/** El cuerpo del pedido como objeto, nunca `null`/`undefined`/un array. */
export function cuerpoObjeto(cuerpo: unknown): Record<string, unknown> {
  if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) {
    throw new ErrorApi(422, "El cuerpo del pedido tiene que ser un objeto JSON");
  }

  return cuerpo as Record<string, unknown>;
}
