import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioLogin } from "@/components/formulario-login";
import { obtenerSesion } from "@/lib/sesion";
import { normalizarEmail } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

const AVISOS: Record<string, string> = {
  expirada: "Tu sesión venció. Volvé a ingresar.",
  cerrada: "Cerraste sesión.",
  "alta-ok": "Cuenta creada. Ingresá con tu email y contraseña.",
  "sin-proyectos": "Tu cuenta no está asignada a ningún proyecto. Pedile a la cátedra que te sume.",
  "desde-proyecto": "Ingresá con tu cuenta de PP2 y volvés al proyecto.",
  "proyecto-invalido": "Ese enlace no traía un proyecto válido. Ingresá y elegí uno.",
};

type Props = {
  searchParams: { email?: string; motivo?: string };
};

export default async function PaginaLogin({ searchParams }: Props) {
  // Si la sesion sigue viva no tiene sentido mostrar el formulario.
  if (await obtenerSesion()) redirect("/cuenta");

  const aviso = searchParams.motivo ? AVISOS[searchParams.motivo] : undefined;
  const emailInicial = searchParams.email ? normalizarEmail(searchParams.email) : "";

  return (
    <>
      <div className="tarjeta">
        <h1>Iniciar sesión</h1>
        <p className="bajada">
          Se ingresa con la cuenta del Sistema de Registración de PP2: la misma para
          todos los proyectos de la materia. Si estás en más de uno, después elegís
          con cuál trabajar.
        </p>

        {aviso ? (
          <p className="alerta aviso" role="status">
            {aviso}
          </p>
        ) : null}

        <FormularioLogin emailInicial={emailInicial} />
      </div>

      <p className="pie">
        ¿Primera vez acá? <Link href="/crear-cuenta">Crear cuenta</Link>
      </p>
    </>
  );
}
