import { ErrorPadron } from "./padron";

/**
 * Traduce un error del padrón a lo que se le muestra a la persona.
 * Siempre se mira `error.codigo`, nunca el mensaje.
 */

/** Códigos que son problema nuestro (o del padrón): se loguean, no se explican. */
const CODIGOS_DE_CONFIGURACION = ["LOGIN_NO_DISPONIBLE", "TOKEN_PADRON_RECHAZADO"];

const MENSAJES: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "Email o contraseña incorrectos.",
  YA_REGISTRADO_EN_PROYECTO: "Ya estás registrado en ese proyecto. Iniciá sesión.",
  SIN_PROYECTOS:
    "Tu cuenta existe pero no está asignada a ningún proyecto. Pedile a la cátedra que te sume.",
  DATOS_INVALIDOS: "Revisá los datos ingresados.",
  PADRON_INACCESIBLE: "El sistema de registración no está disponible, probá más tarde.",
  ERROR_INTERNO: "El sistema de registración no está disponible, probá más tarde.",
};

/** Mensaje genérico para la persona a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof ErrorPadron)) {
    console.error("[login] error inesperado", error);
    return "Ocurrió un error inesperado. Probá de nuevo.";
  }

  if (CODIGOS_DE_CONFIGURACION.includes(error.codigo)) {
    return "El login todavía no está conectado al sistema de registración. Avisale a quien lo mantiene.";
  }

  return MENSAJES[error.codigo] ?? "Ocurrió un error. Probá de nuevo.";
}

/** Errores por campo, tal como vienen del padrón. */
export function erroresPorCampo(error: unknown): Record<string, string> {
  if (error instanceof ErrorPadron && error.campos) return error.campos;
  return {};
}

/** Código del error, para que el formulario decida qué ofrecer. */
export function codigoDeError(error: unknown): string | undefined {
  return error instanceof ErrorPadron ? error.codigo : undefined;
}
