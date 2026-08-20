import { Router } from "express";

import { exigirAdmin, exigirPasswordValida } from "../autenticacion";
import { config } from "../config";
import { generarToken, hashear, hashearToken, normalizarEmail } from "../crypto";
import { db } from "../db";
import { ErrorApi } from "../errores";
import { campoString, campoTexto, cuerpoObjeto } from "../validacion";

export const rutasPassword = Router();

/**
 * Emite un token de un solo uso para que alguien elija contraseña nueva.
 *
 * Pide `Authorization: Bearer <ADMIN_TOKEN>`, que es el de la cátedra y NO el
 * que tienen los fronts: quien pide un reset está diciendo "esta persona es
 * quien dice ser", y eso lo comprueba alguien de la materia por fuera del
 * sistema. El servicio no tiene con qué comprobarlo: no manda mails.
 *
 * El token se devuelve UNA vez y después no se puede volver a ver, porque en
 * la base queda solo su hash.
 */
rutasPassword.post("/password/reset", async (req, res) => {
  exigirAdmin(req.header("authorization") ?? undefined);

  const cuerpo = cuerpoObjeto(req.body);
  const email = normalizarEmail(campoTexto(cuerpo, "email"));

  const usuario = await db.usuario.findUnique({ where: { email } });

  if (!usuario) {
    // Acá sí se puede decir que no existe: del otro lado hay alguien de la
    // cátedra, no cualquiera.
    throw new ErrorApi(404, "No hay nadie con ese email");
  }

  const resultado = await db.$transaction(async (tx) => {
    // Un pedido nuevo invalida los anteriores: si no, cada uno que se emitió
    // y quedó dando vueltas sigue sirviendo hasta que vence.
    await tx.resetPassword.updateMany({
      where: { usuarioId: usuario.id, usadoEn: null },
      data: { usadoEn: new Date() },
    });

    const token = generarToken();
    const venceEn = new Date(Date.now() + config.minutosDeReset * 60_000);

    await tx.resetPassword.create({
      data: { usuarioId: usuario.id, tokenHash: hashearToken(token), venceEn },
    });

    return { token, venceEn };
  });

  res.json({
    token: resultado.token,
    email: usuario.email,
    vence_en: resultado.venceEn.toISOString(),
    minutos: config.minutosDeReset,
  });
});

/**
 * Canjea el token por una contraseña nueva. La elige la persona.
 *
 * Sin token: el token ES la credencial. Por eso el mismo error para uno
 * inventado, uno vencido y uno ya usado: no hay nada que averiguar probando.
 *
 * Las sesiones que el front haya abierto antes siguen vivas: las emite el
 * front, no este servicio, y acá no hay nada que revocar.
 */
rutasPassword.post("/password", async (req, res) => {
  const cuerpo = cuerpoObjeto(req.body);
  const token = campoTexto(cuerpo, "token");
  const password = campoString(cuerpo, "password");

  exigirPasswordValida(password);

  const reset = await db.resetPassword.findFirst({
    where: { tokenHash: hashearToken(token), usadoEn: null, venceEn: { gt: new Date() } },
  });

  if (!reset) {
    throw new ErrorApi(400, "El token no sirve o ya vencio");
  }

  const passwordHash = await hashear(password);

  // Se marca usado en la misma transacción que el cambio: o pasan las dos
  // cosas o no pasa ninguna, así el token no puede quedar servido dos veces.
  await db.$transaction([
    db.usuario.update({ where: { id: reset.usuarioId }, data: { password: passwordHash } }),
    db.resetPassword.update({ where: { id: reset.id }, data: { usadoEn: new Date() } }),
  ]);

  res.json({ ok: true, mensaje: "Contraseña actualizada" });
});
