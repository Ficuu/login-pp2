import { Router } from "express";

import { aplicacionDelToken } from "../autenticacion";
import { db } from "../db";

export const rutasUsuarios = Router();

/**
 * Los usuarios que le corresponden a la aplicación que pregunta.
 *
 * Pide `Authorization: Bearer <token de la aplicación>`. Si ese token es el de
 * un proyecto, devuelve solo a los inscriptos en ESE proyecto, y de cada uno
 * solo ese proyecto: que alguien esté además en Carpooling no es asunto de
 * Alquiler de Quintas. El único que ve el padrón entero es el login central,
 * porque tiene que ofrecer "elegí tu proyecto" antes de saber a cuál va.
 *
 * Nunca devuelve `password`: para validar credenciales está POST /login.
 */
rutasUsuarios.get("/usuarios", async (req, res) => {
  const aplicacion = await aplicacionDelToken(req.header("authorization") ?? undefined);

  const usuarios =
    aplicacion.proyectoId === null
      ? await db.usuario.findMany({
          include: { proyectos: { include: { proyecto: true }, orderBy: { proyectoId: "asc" } } },
          orderBy: { id: "asc" },
        })
      : await db.usuario.findMany({
          where: { proyectos: { some: { proyectoId: aplicacion.proyectoId } } },
          include: {
            proyectos: {
              where: { proyectoId: aplicacion.proyectoId },
              include: { proyecto: true },
            },
          },
          orderBy: { id: "asc" },
        });

  res.json(
    usuarios.map((usuario) => ({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      proyectos: usuario.proyectos.map((up) => ({ id: up.proyecto.id, nombre: up.proyecto.nombre })),
    })),
  );
});
