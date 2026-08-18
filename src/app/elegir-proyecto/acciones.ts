"use server";

import { redirect } from "next/navigation";

import type { EstadoFormulario } from "@/lib/formularios";
import { buscarPorId } from "@/lib/padron";
import { guardarCookieSesion, leerCookieSesion } from "@/lib/sesion";

/**
 * Cambia el proyecto de la sesión en curso.
 *
 * No pide la contraseña de nuevo: la identidad ya está probada y sigue firmada
 * en la cookie. Lo único que se valida es que el proyecto pedido esté entre los
 * suyos en el padrón, para que nadie se cambie a uno que no le toca.
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

  // Con el exp de la cookie vieja: elegir proyecto no renueva la sesión.
  guardarCookieSesion(usuario.id, proyectoId, sesion.exp);
  redirect("/cuenta");
}
