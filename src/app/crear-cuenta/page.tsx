import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioAlta } from "@/components/formulario-alta";
import { leerIngresoPendiente } from "@/lib/ingreso";
import { listarProyectos } from "@/lib/padron";
import { obtenerSesion } from "@/lib/sesion";
import { normalizarEmail } from "@/lib/validaciones";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { email?: string };
};

export default async function PaginaAlta({ searchParams }: Props) {
  if (await obtenerSesion()) redirect("/cuenta");

  // El alta del padrón exige un proyecto: no hay cuenta sin al menos uno.
  const proyectos = await listarProyectos();
  const emailInicial = searchParams.email ? normalizarEmail(searchParams.email) : "";

  // Si llegó desde la plataforma de un proyecto, ese viene elegido: es al que
  // quiere entrar, y elegir otro la dejaría afuera de donde estaba yendo.
  const pendiente = leerIngresoPendiente();

  return (
    <>
      <div className="tarjeta">
        <h1>Crear cuenta</h1>
        <p className="bajada">
          La cuenta es del Sistema de Registración de PP2: la misma para todos los proyectos
          de la materia. Si ya tenés una, este formulario te suma al proyecto que elijas.
        </p>

        <FormularioAlta
          proyectos={proyectos}
          emailInicial={emailInicial}
          proyectoInicial={pendiente?.proyectoId ?? null}
        />
      </div>

      <p className="pie">
        ¿Ya tenés cuenta? <Link href="/login">Iniciar sesión</Link>
      </p>
    </>
  );
}
