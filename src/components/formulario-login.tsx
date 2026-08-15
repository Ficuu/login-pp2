"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { accionLogin } from "@/app/login/acciones";
import { BotonEnviar } from "@/components/boton-enviar";
import { Campo } from "@/components/campo";
import { ESTADO_INICIAL } from "@/lib/formularios";

export function FormularioLogin({ emailInicial = "" }: { emailInicial?: string }) {
  const [estado, accion] = useFormState(accionLogin, ESTADO_INICIAL);
  const email = estado.valores?.email ?? emailInicial;

  return (
    <form action={accion} noValidate>
      {estado.mensaje ? (
        <p className="alerta error" role="alert">
          {estado.mensaje}
          {estado.codigo === "NO_REGISTRADO_EN_APP" ? (
            <>
              {" "}
              <Link href={`/crear-cuenta?email=${encodeURIComponent(email)}`}>
                Sumate a este proyecto
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : null}

      <Campo
        nombre="email"
        etiqueta="Email"
        tipo="email"
        autoComplete="email"
        valorInicial={email}
        error={estado.campos?.email}
        autoFocus
      />

      <Campo
        nombre="password"
        etiqueta="Contraseña"
        tipo="password"
        autoComplete="current-password"
        error={estado.campos?.password}
      />

      <BotonEnviar enviando="Ingresando...">Ingresar</BotonEnviar>
    </form>
  );
}
