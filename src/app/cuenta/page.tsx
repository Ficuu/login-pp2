import { BotonSalir } from "@/components/boton-salir";
import { FormularioPassword } from "@/components/formulario-password";
import { FormularioPerfil } from "@/components/formulario-perfil";
import { requerirSesion } from "@/lib/sesion";

// Sin cache: la sesion se valida contra el registro en cada visita.
export const dynamic = "force-dynamic";

const BIENVENIDAS: Record<string, string> = {
  vinculado: "Usamos la cuenta que ya tenías en PP2 y la vinculamos a este proyecto.",
  nuevo: "Listo, tu cuenta quedó creada.",
};

type Props = {
  searchParams: { bienvenida?: string };
};

function fecha(iso: string): string {
  const valor = new Date(iso);
  return Number.isNaN(valor.getTime())
    ? iso
    : valor.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default async function PaginaCuenta({ searchParams }: Props) {
  // Si el token no sirve, esto redirige solo: no sigue renderizando.
  const { usuario, sesion } = await requerirSesion();

  const bienvenida = searchParams.bienvenida
    ? BIENVENIDAS[searchParams.bienvenida]
    : undefined;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>
            Hola, {usuario.nombre} {usuario.apellido}
          </h1>
          <p className="bajada" style={{ margin: 0 }}>
            Estás dentro de Login PP2 con tu cuenta del registro central.
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
            <dt>UID en el padrón</dt>
            <dd>{usuario.uid}</dd>
          </div>
          {usuario.registro ? (
            <div>
              <dt>Estado en este proyecto</dt>
              <dd>
                {usuario.registro.estado}
                {usuario.registro.rol_externo ? ` - ${usuario.registro.rol_externo}` : ""}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>La sesión vence</dt>
            <dd>{fecha(sesion.expira_en)}</dd>
          </div>
        </dl>
      </div>

      <div className="tarjeta">
        <h2>Editar mis datos</h2>
        <FormularioPerfil
          nombre={usuario.nombre}
          apellido={usuario.apellido}
          telefono={usuario.telefono}
          documento={usuario.documento}
        />
      </div>

      <div className="tarjeta">
        <h2>Cambiar contraseña</h2>
        <p className="bajada">
          Cambiarla cierra tus otras sesiones abiertas en este proyecto.
        </p>
        <FormularioPassword />
      </div>
    </>
  );
}
