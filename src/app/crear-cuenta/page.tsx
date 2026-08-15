import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioAlta } from "@/components/formulario-alta";
import { obtenerSesion } from "@/lib/sesion";
import { normalizarEmail } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { email?: string };
};

export default async function PaginaAlta({ searchParams }: Props) {
  if (await obtenerSesion()) redirect("/cuenta");

  const emailInicial = searchParams.email ? normalizarEmail(searchParams.email) : "";

  return (
    <>
      <div className="tarjeta">
        <h1>Crear cuenta</h1>
        <p className="bajada">
          Una sola identidad para toda la materia. Si ya te registraste en otro proyecto de
          PP2, usá ese mismo email: te vinculamos a este sin crear una cuenta nueva.
        </p>

        <FormularioAlta emailInicial={emailInicial} />
      </div>

      <p className="pie">
        ¿Ya tenés cuenta acá? <Link href="/login">Iniciar sesión</Link>
      </p>
    </>
  );
}
