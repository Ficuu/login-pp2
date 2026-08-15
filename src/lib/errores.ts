import { ErrorRegistro } from "./registro";

/**
 * Traduce un error del registro a lo que se le muestra a la persona.
 * Siempre miramos `error.codigo`, nunca el mensaje.
 */

/** Códigos que significan "esta sesion ya no sirve": borrar cookie y a /login. */
export const CODIGOS_DE_SESION_MUERTA = [
  "TOKEN_EXPIRADO",
  "TOKEN_INVALIDO",
  "NO_REGISTRADO_EN_APP",
  "USUARIO_INACTIVO",
  "REGISTRO_SUSPENDIDO",
] as const;

export function esSesionMuerta(error: unknown): boolean {
  return (
    error instanceof ErrorRegistro &&
    (CODIGOS_DE_SESION_MUERTA as readonly string[]).includes(error.codigo)
  );
}

/** Códigos que son problema de configuración nuestra: se loguean, no se muestran. */
const CODIGOS_DE_CONFIGURACION = ["API_KEY_FALTANTE", "API_KEY_INVALIDA"];

const MENSAJES: Record<string, string> = {
  CREDENCIALES_INVALIDAS: "Email o contraseña incorrectos.",
  EMAIL_EN_USO:
    "Ese email ya tiene cuenta en PP2. Ingresá esa misma contraseña para usarla en este proyecto.",
  USUARIO_YA_REGISTRADO: "Ya tenés cuenta en este proyecto. Iniciá sesión.",
  NO_REGISTRADO_EN_APP: "Tenés cuenta en PP2 pero todavía no en este proyecto.",
  DATOS_INVALIDOS: "Revisá los datos ingresados.",
  LIMITE_EXCEDIDO: "Demasiados intentos. Esperá un momento y volvé a probar.",
  USUARIO_INACTIVO: "Tu cuenta está dada de baja. Contactate con la cátedra.",
  REGISTRO_SUSPENDIDO: "Tu acceso a este proyecto está suspendido.",
  TOKEN_EXPIRADO: "Tu sesión venció. Iniciá sesión de nuevo.",
  TOKEN_INVALIDO: "Tu sesión no es válida. Iniciá sesión de nuevo.",
  DOCUMENTO_EN_USO: "Ese documento ya está cargado con otro email.",
  REGISTRO_INACCESIBLE: "El registro de PP2 no está disponible, probá más tarde.",
  ERROR_INTERNO: "El registro de PP2 no está disponible, probá más tarde.",
};

/** Mensaje genérico para el usuario a partir de cualquier error. */
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof ErrorRegistro)) {
    console.error("[login] error inesperado", error);
    return "Ocurrió un error inesperado. Probá de nuevo.";
  }

  if (CODIGOS_DE_CONFIGURACION.includes(error.codigo)) {
    console.error(`[login] error de configuración: ${error.codigo} - ${error.message}`);
    return "El proyecto no está bien configurado contra el registro. Avisale a quien lo mantiene.";
  }

  if (error.codigo === "LIMITE_EXCEDIDO" && error.reintentarEn) {
    return `Demasiados intentos. Volvé a probar en ${error.reintentarEn} segundos.`;
  }

  return MENSAJES[error.codigo] ?? "Ocurrió un error. Probá de nuevo.";
}

/** Errores por campo, tal como vienen en `error.detalles`. */
export function erroresPorCampo(error: unknown): Record<string, string> {
  if (error instanceof ErrorRegistro && error.detalles) return error.detalles;
  return {};
}

/** Codigo del error, para que el formulario decida que ofrecer. */
export function codigoDeError(error: unknown): string | undefined {
  return error instanceof ErrorRegistro ? error.codigo : undefined;
}
