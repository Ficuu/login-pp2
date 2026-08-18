"use client";

import { useFormState } from "react-dom";

import { accionElegirProyecto } from "@/app/elegir-proyecto/acciones";
import { BotonEnviar } from "@/components/boton-enviar";
import { ESTADO_INICIAL } from "@/lib/formularios";
import type { Proyecto } from "@/lib/padron";

type Props = {
  proyectos: Proyecto[];
  /** El que ya tiene elegido, si viene de /cuenta a cambiarlo. */
  seleccionado?: number | null;
  etiquetaBoton?: string;
};

export function SelectorProyecto({ proyectos, seleccionado, etiquetaBoton = "Entrar" }: Props) {
  const [estado, accion] = useFormState(accionElegirProyecto, ESTADO_INICIAL);

  return (
    <form action={accion}>
      {estado.mensaje ? (
        <p className="alerta error" role="alert">
          {estado.mensaje}
        </p>
      ) : null}

      <ul className="proyectos">
        {proyectos.map((proyecto, indice) => (
          <li key={proyecto.id}>
            <label>
              <input
                type="radio"
                name="proyecto_id"
                value={proyecto.id}
                defaultChecked={seleccionado ? proyecto.id === seleccionado : indice === 0}
              />
              <span>{proyecto.nombre}</span>
            </label>
          </li>
        ))}
      </ul>

      <BotonEnviar enviando="Entrando...">{etiquetaBoton}</BotonEnviar>
    </form>
  );
}
