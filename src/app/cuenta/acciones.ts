"use server";

import { redirect } from "next/navigation";

import { borrarCookieSesion } from "@/lib/sesion";

/**
 * Cerrar sesión.
 *
 * El padrón no emite tokens, así que no hay nada que revocar del otro lado:
 * la sesión es la cookie firmada y alcanza con borrarla.
 */
export async function accionSalir(): Promise<void> {
  borrarCookieSesion();
  redirect("/login?motivo=cerrada");
}
