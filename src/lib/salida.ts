import "server-only";

import { leerIngresoPendiente } from "./ingreso";
import { destinoDelProyecto, type Usuario } from "./padron";

/**
 * A dónde va la persona apenas queda probada su identidad, si llegó desde la
 * plataforma de un proyecto.
 *
 * Devuelve `null` cuando no hay nada pendiente, o cuando lo que quedó pendiente
 * no le corresponde a esta persona: llegó pidiendo entrar a Carpooling pero no
 * está en Carpooling. En los dos casos el flujo sigue como si hubiera empezado
 * acá (selector, o su único proyecto).
 *
 * NO borra la cookie: quien la consume sabe si está en un server action
 * (`borrarIngresoPendiente()`) o armando su propia respuesta
 * (`respuesta.cookies.delete(...)`), y son dos formas distintas.
 */
export async function destinoDelIngresoPendiente(
  usuario: Usuario,
): Promise<{ destino: string; proyectoId: number } | null> {
  const pendiente = leerIngresoPendiente();
  if (!pendiente) return null;

  // El padrón lo verifica igual antes de emitir el código; esto es para no
  // pedirle un código que ya sabemos que va a rechazar.
  if (!usuario.proyectos.some((proyecto) => proyecto.id === pendiente.proyectoId)) {
    console.warn(
      `[ingreso] ${usuario.email} llegó desde el proyecto ${pendiente.proyectoId} ` +
        "pero no está en ese proyecto",
    );
    return null;
  }

  return {
    destino: await destinoDelProyecto(
      usuario.id,
      pendiente.proyectoId,
      "/cuenta",
      pendiente.state,
    ),
    proyectoId: pendiente.proyectoId,
  };
}
