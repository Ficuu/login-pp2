import { Router } from "express";

import { exigirAdmin } from "../autenticacion";
import { generarToken, hashearToken } from "../crypto";
import { db } from "../db";
import { ErrorApi } from "../errores";
import { campoEnteroOpcional, campoTexto, cuerpoObjeto } from "../validacion";
import { APP_DEL_LOGIN } from "../config";

export const rutasAplicaciones = Router();

/**
 * Da de alta una aplicación y le emite su token. Solo la cátedra.
 *
 * Una por proyecto: así la API sabe quién le pregunta y cada uno ve solo a su
 * gente. Si una filtra su token, se revoca esa sola y las demás siguen
 * andando; con el token único de antes había que cambiarlo en todos.
 *
 * El token se ve UNA vez, acá. En la base queda solo su hash.
 */
rutasAplicaciones.post("/aplicaciones", async (req, res) => {
  exigirAdmin(req.header("authorization") ?? undefined);

  const cuerpo = cuerpoObjeto(req.body);
  const nombre = campoTexto(cuerpo, "nombre").trim();
  const proyectoId = campoEnteroOpcional(cuerpo, "proyecto_id");

  if (proyectoId !== null) {
    const proyecto = await db.proyecto.findUnique({ where: { id: proyectoId } });
    if (!proyecto) throw new ErrorApi(404, "Ese proyecto no existe");
  }

  const yaExiste = await db.aplicacion.findUnique({ where: { nombre } });
  if (yaExiste) throw new ErrorApi(409, "Ya hay una aplicacion con ese nombre");

  const token = generarToken();

  const aplicacion = await db.aplicacion.create({
    data: { nombre, proyectoId, tokenHash: hashearToken(token) },
  });

  res.json({
    id: aplicacion.id,
    nombre: aplicacion.nombre,
    proyecto_id: aplicacion.proyectoId,
    token,
    aviso: "Guardalo ahora: no se vuelve a mostrar",
  });
});

/** Qué aplicaciones hay y qué ve cada una. Nunca los tokens: no los tenemos. */
rutasAplicaciones.get("/aplicaciones", async (req, res) => {
  exigirAdmin(req.header("authorization") ?? undefined);

  const aplicaciones = await db.aplicacion.findMany({
    include: { proyecto: true },
    orderBy: { id: "asc" },
  });

  res.json(
    aplicaciones.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      proyecto_id: a.proyectoId,
      proyecto: a.proyecto?.nombre ?? null,
      creada_en: a.creadaEn.toISOString(),
      revocada_en: a.revocadaEn ? a.revocadaEn.toISOString() : null,
    })),
  );
});

/**
 * Deja de aceptar el token de esa aplicación. No se borra la fila: queda el
 * registro de que existió y cuándo se cortó.
 */
rutasAplicaciones.delete("/aplicaciones/:id", async (req, res) => {
  exigirAdmin(req.header("authorization") ?? undefined);

  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ErrorApi(404, "No existe esa aplicacion");

  const aplicacion = await db.aplicacion.findUnique({ where: { id } });
  if (!aplicacion) throw new ErrorApi(404, "No existe esa aplicacion");

  if (aplicacion.nombre === APP_DEL_LOGIN) {
    // Revocarla dejaría al login sin entrar, y al reiniciar el servicio
    // volvería igual desde API_TOKEN: se cambia ahí, no por acá.
    throw new ErrorApi(409, "La aplicacion del login se maneja con API_TOKEN");
  }

  if (!aplicacion.revocadaEn) {
    await db.aplicacion.update({ where: { id }, data: { revocadaEn: new Date() } });
  }

  res.json({ ok: true, mensaje: `La aplicacion ${aplicacion.nombre} ya no entra` });
});
