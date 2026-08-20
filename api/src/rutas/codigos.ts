import { Router } from "express";

import { aplicacionDelToken } from "../autenticacion";
import { config } from "../config";
import { generarToken, hashearToken } from "../crypto";
import { db } from "../db";
import { ErrorApi } from "../errores";
import { campoEntero, campoTexto, cuerpoObjeto } from "../validacion";

export const rutasCodigos = Router();

/**
 * Emite un código de un solo uso para mandar a alguien a su proyecto.
 *
 * Lo pide el login central, DESPUÉS de haber validado la contraseña: emitir
 * un código es decir "esta persona ya probó quién es". Por eso solo lo puede
 * pedir una aplicación sin proyecto (el login), y no el front de un proyecto:
 * si no, Carpooling podría emitirse un código para cualquiera y entrar como
 * esa persona sin saber su contraseña.
 *
 * Devuelve también `volver_a`, que sale de `proyectos.url`. El navegador va
 * ahí con `?codigo=...` y el backend de ese proyecto lo canjea.
 */
rutasCodigos.post("/codigos", async (req, res) => {
  const aplicacion = await aplicacionDelToken(req.header("authorization") ?? undefined);

  if (aplicacion.proyectoId !== null) {
    throw new ErrorApi(403, "Solo el login central puede emitir codigos");
  }

  const cuerpo = cuerpoObjeto(req.body);
  const usuarioId = campoEntero(cuerpo, "usuario_id");
  const proyectoId = campoEntero(cuerpo, "proyecto_id");

  const usuario = await db.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new ErrorApi(404, "Ese usuario no existe");

  const proyecto = await db.proyecto.findUnique({ where: { id: proyectoId } });
  if (!proyecto) throw new ErrorApi(404, "Ese proyecto no existe");

  const vinculo = await db.usuarioProyecto.findUnique({
    where: { usuarioId_proyectoId: { usuarioId, proyectoId } },
  });

  if (!vinculo) {
    // No es "no encontrado": la persona existe y el proyecto también, pero no
    // está anotada ahí, así que no tiene por qué entrar. Se pregunta antes que
    // por la URL para no contar cómo está configurado un proyecto al que esta
    // persona no entra igual.
    throw new ErrorApi(403, "Esa persona no esta en ese proyecto");
  }

  if (!proyecto.url) {
    throw new ErrorApi(409, "Ese proyecto todavia no tiene URL: falta PUT /proyectos/{id}/url");
  }

  const codigo = generarToken();
  const venceEn = new Date(Date.now() + config.segundosDeCodigo * 1000);

  await db.$transaction([
    // Los códigos anteriores que sigan vivos dejan de servir: si alguien
    // vuelve al selector, el de la vuelta pasada no tiene que seguir andando.
    db.codigoLogin.updateMany({
      where: { usuarioId, proyectoId, usadoEn: null },
      data: { usadoEn: new Date() },
    }),
    db.codigoLogin.create({
      data: { usuarioId, proyectoId, codigoHash: hashearToken(codigo), venceEn },
    }),
  ]);

  res.json({ codigo, volver_a: proyecto.url, segundos: config.segundosDeCodigo });
});

/**
 * Cambia el código por quién es la persona. Lo llama el backend del proyecto.
 *
 * Va con el token de ESE proyecto, y el código solo se canjea si fue emitido
 * para él: con el token de Carpooling no se canjea un código de Alquiler de
 * Quintas.
 *
 * Mismo error para código inventado, vencido, ya usado y de otro proyecto: no
 * hay nada que averiguar probando.
 */
rutasCodigos.post("/codigos/canjear", async (req, res) => {
  const aplicacion = await aplicacionDelToken(req.header("authorization") ?? undefined);

  if (aplicacion.proyectoId === null) {
    throw new ErrorApi(403, "Los codigos los canjea el proyecto al que van dirigidos");
  }

  const cuerpo = cuerpoObjeto(req.body);
  const codigo = campoTexto(cuerpo, "codigo");

  const fila = await db.codigoLogin.findFirst({
    where: {
      codigoHash: hashearToken(codigo),
      proyectoId: aplicacion.proyectoId,
      usadoEn: null,
      venceEn: { gt: new Date() },
    },
  });

  if (!fila) throw new ErrorApi(400, "El codigo no sirve o ya vencio");

  // Se marca usado en la misma transacción que la lectura de la persona: dos
  // pedidos con el mismo código no pueden entrar los dos.
  const [, usuario, proyecto] = await db.$transaction([
    db.codigoLogin.update({ where: { id: fila.id }, data: { usadoEn: new Date() } }),
    db.usuario.findUniqueOrThrow({
      where: { id: fila.usuarioId },
      select: { id: true, nombre: true, apellido: true, email: true },
    }),
    db.proyecto.findUniqueOrThrow({
      where: { id: fila.proyectoId },
      select: { id: true, nombre: true },
    }),
  ]);

  res.json({ usuario, proyecto });
});
