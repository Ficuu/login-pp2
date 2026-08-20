import { redirect } from "next/navigation";

import { SelectorProyecto } from "@/components/selector-proyecto";
import { buscarPorId } from "@/lib/padron";
import { leerCookieSesion } from "@/lib/sesion";

export const dynamic = "force-dynamic";

/**
 * El paso intermedio del login para quien está en más de un proyecto.
 *
 * No es una pantalla de identidad: acá la contraseña ya se validó. Lo único que
 * se define es el alcance de la sesión.
 */
const AVISOS: Record<string, string> = {
  "sin-ese-proyecto":
    "No estás registrado en el proyecto desde el que venías. Elegí uno de los tuyos.",
};

type Props = {
  searchParams: { motivo?: string };
};

export default async function PaginaElegirProyecto({ searchParams }: Props) {
  const sesion = leerCookieSesion();
  if (!sesion) redirect("/login");

  const usuario = await buscarPorId(sesion.uid);
  if (!usuario) redirect("/api/salir?motivo=expirada");

  // Sin proyectos no hay nada que elegir ni a dónde entrar.
  if (usuario.proyectos.length === 0) redirect("/api/salir?motivo=sin-proyectos");

  // Con uno solo tampoco: se resuelve solo y no se le muestra esta pantalla.
  if (usuario.proyectos.length === 1) {
    redirect(`/elegir-proyecto/entrar?id=${usuario.proyectos[0].id}`);
  }

  return (
    <>
      <div className="tarjeta">
        <h1>Elegí un proyecto</h1>

        {searchParams.motivo && AVISOS[searchParams.motivo] ? (
          <p className="alerta aviso" role="status">
            {AVISOS[searchParams.motivo]}
          </p>
        ) : null}

        <p className="bajada">
          Hola {usuario.nombre}. Estás registrado en {usuario.proyectos.length} proyectos de
          la materia. Elegí con cuál querés trabajar; podés cambiarlo cuando quieras sin
          volver a ingresar la contraseña.
        </p>

        <SelectorProyecto
          proyectos={usuario.proyectos}
          seleccionado={sesion.pid}
          etiquetaBoton="Entrar"
        />
      </div>

      <p className="pie">
        ¿No es tu cuenta? <a href="/api/salir?motivo=cerrada">Cerrar sesión</a>
      </p>
    </>
  );
}
