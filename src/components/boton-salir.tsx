"use client";

import { accionSalir } from "@/app/cuenta/acciones";
import { BotonEnviar } from "@/components/boton-enviar";

export function BotonSalir() {
  return (
    <form action={accionSalir}>
      <BotonEnviar className="secundario" enviando="Saliendo...">
        Cerrar sesión
      </BotonEnviar>
    </form>
  );
}
