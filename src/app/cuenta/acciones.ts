"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { codigoDeError, erroresPorCampo, esSesionMuerta, mensajeDeError } from "@/lib/errores";
import type { EstadoFormulario } from "@/lib/formularios";
import { editarSesion, logout } from "@/lib/registro";
import { borrarCookieSesion, leerToken } from "@/lib/sesion";
import {
  errorDePassword,
  errorDeTexto,
  juntarErrores,
} from "@/lib/validaciones";

/** Logout de verdad: revoca el token en el registro y borra la cookie. */
export async function accionSalir(): Promise<void> {
  const token = leerToken();

  if (token) {
    try {
      await logout(token);
    } catch (error) {
      // Un token vencido devuelve { cerrada: false } y no es error, pero si el
      // registro esta caido igual cerramos de este lado: lo que importa es que
      // la cookie no siga viva en el navegador.
      console.error("[logout] no se pudo revocar el token en el registro", error);
    }
  }

  borrarCookieSesion();
  redirect("/login?motivo=cerrada");
}

/** El usuario edita sus propios datos (PATCH /sesion, con Bearer). */
export async function accionEditarPerfil(
  _estado: EstadoFormulario,
  datosFormulario: FormData,
): Promise<EstadoFormulario> {
  const token = leerToken();
  if (!token) redirect("/login");

  const nombre = String(datosFormulario.get("nombre") ?? "").trim();
  const apellido = String(datosFormulario.get("apellido") ?? "").trim();
  const telefono = String(datosFormulario.get("telefono") ?? "").trim();
  const documento = String(datosFormulario.get("documento") ?? "").trim();

  const valores = { nombre, apellido, telefono, documento };

  const campos = juntarErrores({
    nombre: errorDeTexto(nombre, "nombre"),
    apellido: errorDeTexto(apellido, "apellido"),
  });
  if (Object.keys(campos).length > 0) {
    return { campos, valores };
  }

  try {
    // Los opcionales solo viajan si tienen algo: el registro valida formato y
    // un string vacío le llega como dato inválido.
    await editarSesion(token, {
      nombre,
      apellido,
      ...(telefono ? { telefono } : {}),
      ...(documento ? { documento } : {}),
    });
  } catch (error) {
    if (esSesionMuerta(error)) redirect("/api/salir?motivo=expirada");
    return {
      mensaje: mensajeDeError(error),
      codigo: codigoDeError(error),
      campos: erroresPorCampo(error),
      valores,
    };
  }

  revalidatePath("/cuenta");
  return { exito: "Listo, guardamos tus datos." };
}

/** Cambio de contraseña. Cierra todas las demás sesiones; esta sigue viva. */
export async function accionCambiarPassword(
  _estado: EstadoFormulario,
  datosFormulario: FormData,
): Promise<EstadoFormulario> {
  const token = leerToken();
  if (!token) redirect("/login");

  const actual = String(datosFormulario.get("password_actual") ?? "");
  const nueva = String(datosFormulario.get("password_nueva") ?? "");
  const repetida = String(datosFormulario.get("password_repetida") ?? "");

  const campos = juntarErrores({
    password_actual: actual ? undefined : "Ingresá tu contraseña actual.",
    password_nueva: errorDePassword(nueva),
    password_repetida: nueva !== repetida ? "Las contraseñas no coinciden." : undefined,
  });
  if (Object.keys(campos).length > 0) {
    return { campos };
  }

  try {
    await editarSesion(token, { password_actual: actual, password_nueva: nueva });
  } catch (error) {
    if (esSesionMuerta(error)) redirect("/api/salir?motivo=expirada");

    const codigo = codigoDeError(error);
    // Acá CREDENCIALES_INVALIDAS significa una sola cosa: erro la actual.
    if (codigo === "CREDENCIALES_INVALIDAS") {
      return { campos: { password_actual: "Esa no es tu contraseña actual." } };
    }

    return {
      mensaje: mensajeDeError(error),
      codigo,
      campos: erroresPorCampo(error),
    };
  }

  return {
    exito: "Cambiaste la contraseña. Se cerraron tus otras sesiones de este proyecto.",
  };
}
