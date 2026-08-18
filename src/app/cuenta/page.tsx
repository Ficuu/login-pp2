import Link from "next/link";

import { BotonSalir } from "@/components/boton-salir";
import { requerirSesion } from "@/lib/sesion";

// Sin cache: la sesión y los proyectos se releen del padrón en cada visita.
export const dynamic = "force-dynamic";

const BIENVENIDAS: Record<string, string> = {
  vinculado: "Listo, te sumamos a este proyecto con la cuenta que ya tenías.",
  nuevo: "Listo, tu cuenta quedó creada.",
};

type Props = {
  searchParams: { bienvenida?: string };
};

function fecha(valor: Date): string {
  return valor.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default async function PaginaCuenta({ searchParams }: Props) {
  // Si la sesión no sirve o no hay proyecto elegido, esto redirige solo.
  const { usuario, proyecto, vence } = await requerirSesion();

  const otros = usuario.proyectos.filter((otro) => otro.id !== proyecto.id);
  const bienvenida = searchParams.bienvenida ? BIENVENIDAS[searchParams.bienvenida] : undefined;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>
            Hola, {usuario.nombre} {usuario.apellido}
          </h1>
          <p className="bajada" style={{ margin: 0 }}>
            Estás trabajando en <strong>{proyecto.nombre}</strong>.
          </p>
        </div>
        <BotonSalir />
      </div>

      {bienvenida ? (
        <p className="alerta exito" role="status">
          {bienvenida}
        </p>
      ) : null}

      <div className="tarjeta">
        <h2>Tu cuenta</h2>
        <dl className="datos">
          <div>
            <dt>Email</dt>
            <dd>{usuario.email}</dd>
          </div>
          <div>
            <dt>Id en el padrón</dt>
            <dd>{usuario.id}</dd>
          </div>
          <div>
            <dt>Proyecto activo</dt>
            <dd>{proyecto.nombre}</dd>
          </div>
          <div>
            <dt>La sesión vence</dt>
            <dd>{fecha(vence)}</dd>
          </div>
        </dl>
      </div>

      <div className="tarjeta">
        <h2>Tus proyectos</h2>
        {otros.length > 0 ? (
          <>
            <p className="bajada">
              Estás registrado en {usuario.proyectos.length} proyectos. Cambiar de proyecto no
              te pide la contraseña de nuevo: sos la misma persona, cambia el alcance.
            </p>
            <ul className="proyectos lista">
              {usuario.proyectos.map((otro) => (
                <li key={otro.id}>
                  <span>{otro.nombre}</span>
                  {otro.id === proyecto.id ? <span className="etiqueta">activo</span> : null}
                </li>
              ))}
            </ul>
            <p>
              <Link href="/elegir-proyecto">Cambiar de proyecto</Link>
            </p>
          </>
        ) : (
          <p className="bajada">
            Por ahora estás en un solo proyecto: {proyecto.nombre}. Si te suman a otro, va a
            aparecer acá la próxima vez que entres.
          </p>
        )}
      </div>

      <div className="tarjeta">
        <h2>Tus datos</h2>
        <p className="bajada">
          El nombre, el email y la contraseña los administra el Sistema de Registración de
          PP2, que todavía no expone endpoints para editarlos. Cuando los tenga, se editan
          desde acá.
        </p>
      </div>
    </>
  );
}
