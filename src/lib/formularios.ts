/**
 * Estado que comparten los server actions con los formularios de cliente.
 * Este archivo NO importa nada de servidor: lo lee el navegador.
 */
export type EstadoFormulario = {
  /** Mensaje de error general (arriba del formulario). */
  mensaje?: string;
  /** Codigo crudo del registro, para que el formulario ofrezca la salida correcta. */
  codigo?: string;
  /** Errores por campo, tal como llegan en `error.detalles`. */
  campos?: Record<string, string>;
  /** Valores a reponer en el formulario tras un error. */
  valores?: Record<string, string>;
  /** Mensaje de exito (por ejemplo, "datos guardados"). */
  exito?: string;
};

export const ESTADO_INICIAL: EstadoFormulario = {};
