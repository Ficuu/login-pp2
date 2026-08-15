"use server";

import { redirect } from "next/navigation";

import { codigoDeError, erroresPorCampo, mensajeDeError } from "@/lib/errores";
import type { EstadoFormulario } from "@/lib/formularios";
import { login, registrar } from "@/lib/registro";
import { guardarCookieSesion } from "@/lib/sesion";
import {
  errorDeEmail,
  errorDePassword,
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
  const telefono = String(datosFormulario.get("telefono") ?? "").trim();

  const valores = { nombre, apellido, email, telefono };

  const campos = juntarErrores({
    nombre: errorDeTexto(nombre, "nombre"),
    apellido: errorDeTexto(apellido, "apellido"),
    email: errorDeEmail(email),
    password: errorDePassword(password),
  });
  if (Object.keys(campos).length > 0) {
    return { campos, valores };
  }

  let alta;
  try {
    alta = await registrar({
      nombre,
      apellido,
      email,
      password,
      ...(telefono ? { telefono } : {}),
    });
  } catch (error) {
    return {
      mensaje: mensajeDeError(error),
      // EMAIL_EN_USO no es un fracaso: la persona ya esta en el padrón y con
      // SU contraseña de PP2 este mismo formulario la vincula al proyecto.
      codigo: codigoDeError(error),
      campos: erroresPorCampo(error),
      valores,
    };
  }

  // El alta no devuelve token: pedimos uno con las mismas credenciales para
  // dejarla adentro sin un segundo formulario.
  try {
    const sesionNueva = await login(email, password);
    guardarCookieSesion(sesionNueva.token, sesionNueva.expira_en);
  } catch (error) {
    console.error("[alta] la cuenta se creo pero el login automatico fallo", error);
    redirect(`/login?motivo=alta-ok&email=${encodeURIComponent(email)}`);
  }

  redirect(alta.vinculado ? "/cuenta?bienvenida=vinculado" : "/cuenta?bienvenida=nuevo");
}
