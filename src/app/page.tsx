import { redirect } from "next/navigation";

import { leerToken } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default function Inicio() {
  // La validacion de verdad la hace /cuenta contra GET /sesion; acá solo
  // miramos si hay cookie para no pegarle al registro de gusto.
  redirect(leerToken() ? "/cuenta" : "/login");
}
