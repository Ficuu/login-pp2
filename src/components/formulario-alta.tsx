"use client";

import Link from "next/link";
import { useFormState } from "react-dom";

import { accionAlta } from "@/app/crear-cuenta/acciones";
import { BotonEnviar } from "@/components/boton-enviar";
import { Campo } from "@/components/campo";
import { ESTADO_INICIAL } from "@/lib/formularios";
import type { Proyecto } from "@/lib/padron";
import { PASSWORD_MIN } from "@/lib/validaciones";

type Props = {
  proyectos: Proyecto[];
  emailInicial?: string;
};

export function FormularioAlta({ proyectos, emailInicial = "" }: Props) {
  const [estado, accion] = useFormState(accionAlta, ESTADO_INICIAL);
  const valores = estado.valores ?? {};
  const email = valores.email ?? emailInicial;

  // El padrón reusa la persona por email: si ya existe, el alta no crea una
  // cuenta nueva, solo la agrega al proyecto elegido.
  const yaEstaEnEseProyecto = estado.codigo === "YA_REGISTRADO_EN_PROYECTO";

  return (
    <form action={accion} noValidate>
      {estado.mensaje ? (
        <p className="alerta error" role="alert">
          {estado.mensaje}
          {yaEstaEnEseProyecto ? (
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
        nombre="password"
        etiqueta="Contraseña"
        tipo="password"
        autoComplete="new-password"
        pista={`Mínimo ${PASSWORD_MIN} caracteres. Si ya tenés cuenta en PP2, poné esa misma.`}
        error={estado.campos?.password}
      />

      <div className="campo">
        <label htmlFor="proyecto_id">Proyecto</label>
        <select
          id="proyecto_id"
          name="proyecto_id"
          defaultValue={valores.proyecto_id ?? ""}
          required
          aria-invalid={estado.campos?.proyecto_id ? "true" : undefined}
          aria-describedby={estado.campos?.proyecto_id ? "proyecto_id-error" : "proyecto_id-pista"}
        >
          <option value="" disabled>
            Elegí un proyecto
          </option>
          {proyectos.map((proyecto) => (
            <option key={proyecto.id} value={proyecto.id}>
              {proyecto.nombre}
            </option>
          ))}
        </select>
        <span className="pista" id="proyecto_id-pista">
          Después te pueden sumar a otros; con la misma cuenta entrás a todos.
        </span>
        {estado.campos?.proyecto_id ? (
          <span className="error-campo" id="proyecto_id-error">
            {estado.campos.proyecto_id}
          </span>
        ) : null}
      </div>

      <BotonEnviar enviando="Creando...">Crear cuenta</BotonEnviar>
    </form>
  );
}
