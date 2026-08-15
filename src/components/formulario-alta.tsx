"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { accionAlta } from "@/app/crear-cuenta/acciones";
import { BotonEnviar } from "@/components/boton-enviar";
import { Campo } from "@/components/campo";
import { ESTADO_INICIAL } from "@/lib/formularios";
import { PASSWORD_MIN } from "@/lib/validaciones";

export function FormularioAlta({ emailInicial = "" }: { emailInicial?: string }) {
  const [estado, accion] = useFormState(accionAlta, ESTADO_INICIAL);
  const valores = estado.valores ?? {};
  const email = valores.email ?? emailInicial;

  // El caso importante del alta: la persona ya existe en el padrón de PP2 por
  // otro proyecto. No hay que crearle nada nuevo, hay que pedirle LA contraseña
  // que ya tenía y reenviar el mismo formulario: eso la vincula a este proyecto.
  const yaEstaEnPP2 = estado.codigo === "EMAIL_EN_USO";
  const yaEstaAcá = estado.codigo === "USUARIO_YA_REGISTRADO";

  return (
    <form action={accion} noValidate>
      {yaEstaEnPP2 ? (
        <p className="alerta aviso" role="alert">
          <strong>Ya tenés cuenta en PP2 con ese email.</strong> No hace falta crear otra:
          escribí abajo la contraseña de esa cuenta y te sumamos a este proyecto.
        </p>
      ) : null}

      {estado.mensaje && !yaEstaEnPP2 ? (
        <p className="alerta error" role="alert">
          {estado.mensaje}
          {yaEstaAcá ? (
            <>
              {" "}
              <Link href={`/login?email=${encodeURIComponent(email)}`}>Iniciar sesión</Link>.
            </>
          ) : null}
        </p>
      ) : null}

      <div className="fila">
        <Campo
          nombre="nombre"
          etiqueta="Nombre"
          autoComplete="given-name"
          valorInicial={valores.nombre}
          error={estado.campos?.nombre}
          autoFocus
        />
        <Campo
          nombre="apellido"
          etiqueta="Apellido"
          autoComplete="family-name"
          valorInicial={valores.apellido}
          error={estado.campos?.apellido}
        />
      </div>

      <Campo
        nombre="email"
        etiqueta="Email"
        tipo="email"
        autoComplete="email"
        valorInicial={email}
        error={estado.campos?.email}
      />

      <Campo
        nombre="telefono"
        etiqueta="Teléfono (opcional)"
        tipo="tel"
        autoComplete="tel"
        requerido={false}
        valorInicial={valores.telefono}
        error={estado.campos?.telefono}
      />

      <Campo
        nombre="password"
        etiqueta={yaEstaEnPP2 ? "Tu contraseña de PP2" : "Contraseña"}
        tipo="password"
        autoComplete={yaEstaEnPP2 ? "current-password" : "new-password"}
        pista={
          yaEstaEnPP2
            ? "La que usás en el otro proyecto de la materia."
            : `Mínimo ${PASSWORD_MIN} caracteres.`
        }
        error={estado.campos?.password}
      />

      <BotonEnviar enviando="Creando...">
        {yaEstaEnPP2 ? "Usar mi cuenta de PP2" : "Crear cuenta"}
      </BotonEnviar>
    </form>
  );
}
