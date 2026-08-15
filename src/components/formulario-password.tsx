"use client";

import { useFormState } from "react-dom";

import { accionCambiarPassword } from "@/app/cuenta/acciones";
import { BotonEnviar } from "@/components/boton-enviar";
import { Campo } from "@/components/campo";
import { ESTADO_INICIAL } from "@/lib/formularios";
import { PASSWORD_MIN } from "@/lib/validaciones";

export function FormularioPassword() {
  const [estado, accion] = useFormState(accionCambiarPassword, ESTADO_INICIAL);

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

      <Campo
        nombre="password_actual"
        etiqueta="Contraseña actual"
        tipo="password"
        autoComplete="current-password"
        error={estado.campos?.password_actual}
      />

      <div className="fila">
        <Campo
          nombre="password_nueva"
          etiqueta="Contraseña nueva"
          tipo="password"
          autoComplete="new-password"
          pista={`Mínimo ${PASSWORD_MIN} caracteres.`}
          error={estado.campos?.password_nueva}
        />
        <Campo
          nombre="password_repetida"
          etiqueta="Repetila"
          tipo="password"
          autoComplete="new-password"
          error={estado.campos?.password_repetida}
        />
      </div>

      <BotonEnviar enviando="Cambiando...">Cambiar contraseña</BotonEnviar>
    </form>
  );
}
