import { Router } from "express";

import { exigirAdmin } from "../autenticacion";
import { db } from "../db";
import { ErrorApi } from "../errores";
import { campoTexto, cuerpoObjeto } from "../validacion";

export const rutasProyectosAdmin = Router();

/**
 * Dónde tiene que aterrizar la persona cuando entra a este proyecto.
 *
 * La fija la cátedra y sale de acá cada vez que se emite un código. Que esté
 * en la base y no en el pedido es el punto: si el que pide el código pudiera
 * elegir a dónde mandarlo, cualquiera se manda el código de otro a un sitio
 * propio y entra como esa persona.
 */
rutasProyectosAdmin.put("/proyectos/:id/url", async (req, res) => {
  exigirAdmin(req.header("authorization") ?? undefined);

  const proyectoId = Number(req.params.id);
  if (!Number.isInteger(proyectoId)) throw new ErrorApi(404, "Ese proyecto no existe");

  const cuerpo = cuerpoObjeto(req.body);
  const url = campoTexto(cuerpo, "url").trim();

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new ErrorApi(422, "La URL tiene que empezar con http:// o https://");
  }

  const proyecto = await db.proyecto.findUnique({ where: { id: proyectoId } });
  if (!proyecto) throw new ErrorApi(404, "Ese proyecto no existe");

  await db.proyecto.update({ where: { id: proyectoId }, data: { url } });

  res.json({ id: proyecto.id, nombre: proyecto.nombre, url });
});
