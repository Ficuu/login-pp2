import { redirect } from "next/navigation";

import { leerCookieSesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default function Inicio() {
  // Solo se mira la cookie (firma y vencimiento). Quién es y en qué proyectos
  // está lo resuelve /cuenta contra el padrón.
  const sesion = leerCookieSesion();
  if (!sesion) redirect("/login");

  redirect(sesion.pid ? "/cuenta" : "/elegir-proyecto");
}
