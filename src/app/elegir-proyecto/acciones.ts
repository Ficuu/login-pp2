"use server";

import { redirect } from "next/navigation";

import type { EstadoFormulario } from "@/lib/formularios";
import { buscarPorId, destinoDelProyecto } from "@/lib/padron";
import { guardarCookieSesion, leerCookieSesion } from "@/lib/sesion";

/**
 * Elegir proyecto es entrar a ese proyecto.
 *
 * No pide la contraseña de nuevo: la identidad ya está probada y sigue firmada
 * en la cookie. Lo único que se valida es que el proyecto pedido esté entre los
 * suyos en el padrón, para que nadie se cambie a uno que no le toca.
 *
 * Si ese proyecto tiene plataforma propia, de acá se sale hacia allá con un
 * código de un solo uso; si no, se queda en este front.
 */
export async function accionElegirProyecto(
  _estado: EstadoFormulario,
  datosFormulario: FormData,
): Promise<EstadoFormulario> {
  const sesion = leerCookieSesion();
  if (!sesion) redirect("/login");

  const proyectoId = Number(datosFormulario.get("proyecto_id"));
  if (!Number.isInteger(proyectoId)) {
    return { mensaje: "Elegí un proyecto para continuar." };
  }

  const usuario = await buscarPorId(sesion.uid);
  if (!usuario) redirect("/api/salir?motivo=expirada");

  if (!usuario.proyectos.some((proyecto) => proyecto.id === proyectoId)) {
    return { mensaje: "No estás registrado en ese proyecto." };
  }

  // Con el exp de la cookie vieja: elegir proyecto no renueva la sesión. La
  // cookie se guarda igual aunque el salto lleve a otra plataforma: la persona
  // sigue con sesión acá, para volver y cambiar de proyecto sin la contraseña.
  guardarCookieSesion(usuario.id, proyectoId, sesion.exp);

  const destino = await destinoDelProyecto(usuario.id, proyectoId);

  // Fuera de cualquier try: redirect() corta el flujo lanzando.
  redirect(destino);
}
