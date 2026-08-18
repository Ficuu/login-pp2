"use server";

import { redirect } from "next/navigation";

import { codigoDeError, erroresPorCampo, mensajeDeError } from "@/lib/errores";
import type { EstadoFormulario } from "@/lib/formularios";
import { login, registrar } from "@/lib/padron";
import { guardarCookieSesion } from "@/lib/sesion";
import {
  errorDeEmail,
  errorDePassword,
  errorDeProyecto,
  errorDeTexto,
  juntarErrores,
  normalizarEmail,
} from "@/lib/validaciones";

export async function accionAlta(
  _estado: EstadoFormulario,
  datosFormulario: FormData,
): Promise<EstadoFormulario> {
  const nombre = String(datosFormulario.get("nombre") ?? "").trim();
  const apellido = String(datosFormulario.get("apellido") ?? "").trim();
  const email = normalizarEmail(String(datosFormulario.get("email") ?? ""));
  const password = String(datosFormulario.get("password") ?? "");
  const proyecto = String(datosFormulario.get("proyecto_id") ?? "");

  const valores = { nombre, apellido, email, proyecto_id: proyecto };

  const campos = juntarErrores({
    nombre: errorDeTexto(nombre, "nombre"),
    apellido: errorDeTexto(apellido, "apellido"),
    email: errorDeEmail(email),
    password: errorDePassword(password),
    proyecto_id: errorDeProyecto(proyecto),
  });
  if (Object.keys(campos).length > 0) {
    return { campos, valores };
  }

  try {
    await registrar({
      nombre,
      apellido,
      email,
      password,
      proyecto_id: Number(proyecto),
    });
  } catch (error) {
    return {
      mensaje: mensajeDeError(error),
      codigo: codigoDeError(error),
      campos: erroresPorCampo(error),
      valores,
    };
  }

  // El alta no devuelve sesión: validamos las mismas credenciales para dejar a
  // la persona adentro sin un segundo formulario. Esto además confirma que la
  // contraseña que mandó es la de esa cuenta: el padrón reusa por email y, si
  // el email ya existía, la contraseña que viajó en el alta se descarta.
  let usuario;
  try {
    usuario = await login(email, password);
  } catch (error) {
    console.error("[alta] la cuenta quedó registrada pero el login automático falló", error);
    redirect(`/login?motivo=alta-ok&email=${encodeURIComponent(email)}`);
  }

  // Entra derecho al proyecto que acaba de elegir en el alta.
  const yaEstaba = usuario.proyectos.length > 1;
  guardarCookieSesion(usuario.id, Number(proyecto));

  redirect(yaEstaba ? "/cuenta?bienvenida=vinculado" : "/cuenta?bienvenida=nuevo");
}
