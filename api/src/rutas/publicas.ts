import { Router } from "express";

import { config } from "../config";
import { hashear, normalizarEmail, verificar } from "../crypto";
import { db } from "../db";
import { ErrorApi } from "../errores";
import { exigirPasswordValida } from "../autenticacion";
import { campoEntero, campoString, campoTexto, cuerpoObjeto } from "../validacion";

export const rutasPublicas = Router();

rutasPublicas.get("/", (_req, res) => {
  res.json({ mensaje: "Servicio de registración funcionando" });
});

/**
 * Valida credenciales y devuelve la persona con TODOS sus proyectos.
 *
 * Los proyectos van en esta misma respuesta a propósito: el front decide con
 * eso si no la deja entrar (cero proyectos), si entra derecho (uno) o si le
 * muestra un selector (varios). Mandarlos acá evita un segundo pedido.
 *
 * La contraseña no sale nunca de este servicio: se compara acá y se responde
 * si es correcta o no.
 */
rutasPublicas.post("/login", async (req, res) => {
  const cuerpo = cuerpoObjeto(req.body);
  const email = normalizarEmail(campoTexto(cuerpo, "email"));
  const password = campoString(cuerpo, "password");

  const usuario = await db.usuario.findUnique({ where: { email } });

  // Mismo error para email inexistente y contraseña equivocada: si fueran
  // distintos, se podría averiguar quién tiene cuenta y quién no.
  if (!usuario || !(await verificar(password, usuario.password))) {
    throw new ErrorApi(401, "Credenciales invalidas");
  }

  const proyectos = await db.usuarioProyecto.findMany({
    where: { usuarioId: usuario.id },
    include: { proyecto: true },
    orderBy: { proyectoId: "asc" },
  });

  res.json({
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    proyectos: proyectos.map((up) => ({ id: up.proyecto.id, nombre: up.proyecto.nombre })),
  });
});

/**
 * Alta en el padrón, ya vinculada a un proyecto.
 *
 * Si el email ya existe se reusa esa persona y solo se agrega el vínculo con
 * el proyecto nuevo, PERO exigiendo su contraseña. Antes no se pedía: con
 * mandar un email ajeno y una contraseña inventada se quedaba vinculado a la
 * cuenta de otro.
 */
rutasPublicas.post("/registrar", async (req, res) => {
  const cuerpo = cuerpoObjeto(req.body);
  const nombre = campoTexto(cuerpo, "nombre");
  const apellido = campoTexto(cuerpo, "apellido");
  const email = normalizarEmail(campoTexto(cuerpo, "email"));
  const password = campoString(cuerpo, "password");
  const proyectoId = campoEntero(cuerpo, "proyecto_id");

  exigirPasswordValida(password);

  const passwordHasheada = await hashear(password);

  // Todo en una transacción: si el vínculo con el proyecto falla (por
  // ejemplo, un proyecto_id que no existe), el alta del usuario también se
  // deshace. Sin esto, un usuario nuevo podía quedar creado sin ningún
  // proyecto ante un error a mitad de camino.
  const resultado = await db.$transaction(async (tx) => {
    let usuarioId: number;

    const existente = await tx.usuario.findUnique({ where: { email } });

    if (existente) {
      if (!(await verificar(password, existente.password))) {
        throw new ErrorApi(401, "Credenciales invalidas");
      }

      usuarioId = existente.id;
    } else {
      const nuevo = await tx.usuario.create({
        data: { nombre: nombre.trim(), apellido: apellido.trim(), email, password: passwordHasheada },
      });

      usuarioId = nuevo.id;
    }

    const proyecto = await tx.proyecto.findUnique({ where: { id: proyectoId } });
    if (!proyecto) throw new ErrorApi(404, "Ese proyecto no existe");

    const yaVinculado = await tx.usuarioProyecto.findUnique({
      where: { usuarioId_proyectoId: { usuarioId, proyectoId } },
    });

    if (yaVinculado) {
      return { ok: false as const, usuarioId };
    }

    await tx.usuarioProyecto.create({ data: { usuarioId, proyectoId } });

    return { ok: true as const, usuarioId };
  });

  res.json({
    ok: resultado.ok,
    mensaje: resultado.ok
      ? "Usuario registrado correctamente"
      : "El usuario ya está registrado en este proyecto",
    usuario_id: resultado.usuarioId,
    proyecto_id: proyectoId,
  });
});

/**
 * Los proyectos a los que alguien se puede sumar.
 *
 * Sin token: es información pública y el formulario de alta la necesita para
 * ofrecer la lista antes de que la persona tenga cuenta.
 */
rutasPublicas.get("/proyectos", async (_req, res) => {
  const proyectos = await db.proyecto.findMany({
    select: { id: true, nombre: true },
    orderBy: { id: "asc" },
  });

  res.json(proyectos);
});
