"use client";

import { useFormState } from "react-dom";

import { accionEditarPerfil } from "@/app/cuenta/acciones";
import { BotonEnviar } from "@/components/boton-enviar";
import { Campo } from "@/components/campo";
import { ESTADO_INICIAL } from "@/lib/formularios";

type Props = {
  nombre: string;
  apellido: string;
  telefono?: string | null;
  documento?: string | null;
};

export function FormularioPerfil({ nombre, apellido, telefono, documento }: Props) {
  const [estado, accion] = useFormState(accionEditarPerfil, ESTADO_INICIAL);
  const valores = estado.valores ?? {};

  return (
    <form action={accion} noValidate>
      {estado.mensaje ? (
        <p className="alerta error" role="alert">
          {estado.mensaje}
        </p>
      ) : null}
      {estado.exito ? (
        <p className="alerta exito" role="status">
          {estado.exito}
        </p>
      ) : null}

      <div className="fila">
        <Campo
          nombre="nombre"
          etiqueta="Nombre"
          autoComplete="given-name"
          valorInicial={valores.nombre ?? nombre}
          error={estado.campos?.nombre}
        />
        <Campo
          nombre="apellido"
          etiqueta="Apellido"
          autoComplete="family-name"
          valorInicial={valores.apellido ?? apellido}
          error={estado.campos?.apellido}
        />
      </div>

      <div className="fila">
        <Campo
          nombre="telefono"
          etiqueta="Teléfono"
          tipo="tel"
          autoComplete="tel"
          requerido={false}
          valorInicial={valores.telefono ?? telefono ?? ""}
          error={estado.campos?.telefono}
        />
        <Campo
          nombre="documento"
          etiqueta="Documento"
          requerido={false}
          valorInicial={valores.documento ?? documento ?? ""}
          error={estado.campos?.documento}
        />
      </div>

      <BotonEnviar enviando="Guardando...">Guardar cambios</BotonEnviar>
    </form>
  );
}
