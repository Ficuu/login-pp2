"use server";

import { redirect } from "next/navigation";

import { codigoDeError, erroresPorCampo, mensajeDeError } from "@/lib/errores";
import type { EstadoFormulario } from "@/lib/formularios";
import { login } from "@/lib/registro";
import { guardarCookieSesion } from "@/lib/sesion";
import {
  errorDeEmail,
  errorDePassword,
  juntarErrores,
  normalizarEmail,
} from "@/lib/validaciones";

export async function accionLogin(
  _estado: EstadoFormulario,
  datosFormulario: FormData,
): Promise<EstadoFormulario> {
  const email = normalizarEmail(String(datosFormulario.get("email") ?? ""));
  const password = String(datosFormulario.get("password") ?? "");

  const campos = juntarErrores({
    email: errorDeEmail(email),
    password: errorDePassword(password),
  });
  if (Object.keys(campos).length > 0) {
    return { campos, valores: { email } };
  }

  let datos;
  try {
    datos = await login(email, password);
  } catch (error) {
    return {
      mensaje: mensajeDeError(error),
      codigo: codigoDeError(error),
      campos: erroresPorCampo(error),
      valores: { email },
    };
  }

  guardarCookieSesion(datos.token, datos.expira_en);
  // Fuera del try: redirect() corta el flujo lanzando, no es un error.
  redirect("/cuenta");
}
