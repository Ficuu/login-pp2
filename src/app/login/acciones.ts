"use server";

import { redirect } from "next/navigation";

import { codigoDeError, erroresPorCampo, mensajeDeError } from "@/lib/errores";
import type { EstadoFormulario } from "@/lib/formularios";
import { login } from "@/lib/padron";
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

  let usuario;
  try {
    usuario = await login(email, password);
  } catch (error) {
    return {
      mensaje: mensajeDeError(error),
      codigo: codigoDeError(error),
      campos: erroresPorCampo(error),
      valores: { email },
    };
  }

  // La contraseña ya quedó probada. Lo único que falta es en qué proyecto se
  // para: la identidad es una sola, el proyecto es el alcance de la sesión.
  if (usuario.proyectos.length === 0) {
    return {
      mensaje:
        "Tu cuenta existe pero no está asignada a ningún proyecto. Pedile a la cátedra que te sume.",
      codigo: "SIN_PROYECTOS",
      valores: { email },
    };
  }

  // Con un solo proyecto no hay nada que elegir: se entra derecho.
  const unico = usuario.proyectos.length === 1 ? usuario.proyectos[0].id : null;
  guardarCookieSesion(usuario.id, unico);

  // Fuera del try: redirect() corta el flujo lanzando, no es un error.
  redirect(unico ? "/cuenta" : "/elegir-proyecto");
}
