import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * Cliente del Sistema de Registración de PP2
 * (https://github.com/DennisMejia21/SistemaRegistracion).
 *
 * Ese servicio es el padrón: ahí viven las personas, sus contraseñas y la
 * tabla `usuario_proyecto` que dice a qué proyectos pertenece cada una. Este
 * repo no tiene base de datos ni copia de contraseñas: solo le pregunta.
 *
 * SOLO se importa desde código de servidor (server actions, route handlers,
 * server components). El navegador nunca le pega al padrón directamente.
 */

const BASE = (process.env.PADRON_URL ?? "http://localhost:8000").replace(/\/+$/, "");

/**
 * Token del padrón, en `Authorization: Bearer`.
 *
 * Identifica a ESTA aplicación, no a la persona que entra: con él se lee el
 * padrón entero. Por eso vive en el entorno del servidor y nunca se prefija con
 * NEXT_PUBLIC_ ni viaja al navegador.
 */
const TOKEN = process.env.PADRON_TOKEN ?? "";

export type Proyecto = {
  id: number;
  nombre: string;
};

/** Un usuario del padrón, con TODOS los proyectos en los que está. */
export type Usuario = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  proyectos: Proyecto[];
};

/**
 * Lo mismo, pero como puede venir del padrón: si `GET /usuarios` está protegido
 * con el Bearer de la app, devuelve además `password`. Ese campo no sale de
 * este módulo: se usa para comparar y se descarta.
 */
type UsuarioCrudo = Usuario & { password?: string };

export type DatosAlta = {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  proyecto_id: number;
};

export type CodigoError =
  /** El padrón dijo que ese email + contraseña no son válidos. */
  | "CREDENCIALES_INVALIDAS"
  /** El alta pisaba una fila de `usuario_proyecto` que ya existía. */
  | "YA_REGISTRADO_EN_PROYECTO"
  /** La persona existe pero no está en ningún proyecto: no tiene dónde entrar. */
  | "SIN_PROYECTOS"
  /** El padrón todavía no expone POST /login. Ver el README. */
  | "LOGIN_NO_DISPONIBLE"
  /** PADRON_TOKEN falta, venció o no es el que espera el padrón. */
  | "TOKEN_PADRON_RECHAZADO"
  | "DATOS_INVALIDOS"
  /** No lo devuelve el padrón: lo generamos si no se lo puede alcanzar. */
  | "PADRON_INACCESIBLE"
  | "ERROR_INTERNO";

export class ErrorPadron extends Error {
  constructor(
    readonly codigo: CodigoError | string,
    mensaje: string,
    readonly campos?: Record<string, string>,
  ) {
    super(mensaje);
    this.name = "ErrorPadron";
  }
}

type Respuesta = {
  estado: number;
  cuerpo: unknown;
};

async function pedir(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown } = {},
): Promise<Respuesta> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      cache: "no-store",
    });
  } catch (causa) {
    console.error(`[padron] no se pudo alcanzar ${BASE}${ruta}`, causa);
    throw new ErrorPadron("PADRON_INACCESIBLE", "No se pudo contactar al padrón de PP2");
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    // 404 de FastAPI y errores de gateway pueden no traer JSON: el estado alcanza.
    cuerpo = null;
  }

  return { estado: respuesta.status, cuerpo };
}

/** FastAPI manda los detalles de validación en `detail`; los aplanamos a campo -> mensaje. */
function camposDeFastapi(cuerpo: unknown): Record<string, string> | undefined {
  const detalle = (cuerpo as { detail?: unknown } | null)?.detail;
  if (!Array.isArray(detalle)) return undefined;

  const campos: Record<string, string> = {};
  for (const item of detalle) {
    const ubicacion = (item as { loc?: unknown }).loc;
    const mensaje = (item as { msg?: unknown }).msg;
    if (Array.isArray(ubicacion) && typeof mensaje === "string") {
      const campo = String(ubicacion[ubicacion.length - 1]);
      campos[campo] = mensaje;
    }
  }

  return Object.keys(campos).length > 0 ? campos : undefined;
}

function normalizarProyectos(valor: unknown): Proyecto[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((item) => {
    const id = Number((item as { id?: unknown }).id);
    const nombre = (item as { nombre?: unknown }).nombre;
    if (!Number.isInteger(id) || typeof nombre !== "string") return [];
    return [{ id, nombre }];
  });
}

/**
 * El padrón puede devolver el usuario suelto o envuelto en `{ usuario: ... }`.
 * Aceptamos las dos formas para no atarnos a un detalle del endpoint nuevo.
 */
function normalizarUsuario(cuerpo: unknown): UsuarioCrudo {
  const crudo = (cuerpo as { usuario?: unknown } | null)?.usuario ?? cuerpo;

  const id = Number((crudo as { id?: unknown })?.id);
  const email = (crudo as { email?: unknown })?.email;

  if (!Number.isInteger(id) || typeof email !== "string") {
    console.error("[padron] respuesta sin id o sin email", cuerpo);
    throw new ErrorPadron("ERROR_INTERNO", "El padrón devolvió un usuario incompleto");
  }

  const password = (crudo as { password?: unknown }).password;

  return {
    id,
    email,
    nombre: String((crudo as { nombre?: unknown }).nombre ?? ""),
    apellido: String((crudo as { apellido?: unknown }).apellido ?? ""),
    proyectos: normalizarProyectos((crudo as { proyectos?: unknown }).proyectos),
    ...(typeof password === "string" ? { password } : {}),
  };
}

/** Saca el password antes de que el usuario salga de este módulo. */
function sinPassword({ password: _password, ...usuario }: UsuarioCrudo): Usuario {
  return usuario;
}

/** Comparación en tiempo constante, para no filtrar la contraseña por timing. */
function coincide(recibida: string, guardada: string): boolean {
  const a = Buffer.from(recibida);
  const b = Buffer.from(guardada);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Valida credenciales contra el padrón.
 *
 * Camino principal: `POST /login` con `{ email, password }`, y el padrón
 * responde si son correctas. Es lo que corresponde, porque así la contraseña
 * no sale nunca de ahí.
 *
 * Si ese endpoint todavía no existe, cae a `verificarContraElPadron`, que
 * compara contra el `password` que devuelve `GET /usuarios`. Funciona, pero es
 * el camino malo: ver el comentario de esa función.
 */
export async function login(email: string, password: string): Promise<Usuario> {
  const { estado, cuerpo } = await pedir("/login", {
    metodo: "POST",
    cuerpo: { email, password },
  });

  if (estado === 404 || estado === 405) {
    return verificarContraElPadron(email, password);
  }

  if (estado === 401 || estado === 403) {
    throw new ErrorPadron("CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos");
  }

  if (estado === 422) {
    throw new ErrorPadron("DATOS_INVALIDOS", "Datos inválidos", camposDeFastapi(cuerpo));
  }

  if (estado >= 400) {
    console.error(`[padron] POST /login devolvió HTTP ${estado}`, cuerpo);
    throw new ErrorPadron("ERROR_INTERNO", "El padrón devolvió un error");
  }

  // El servicio contesta 200 con `{ ok: false }` cuando algo no salió (así lo
  // hace hoy /registrar), así que un 200 no alcanza para dar por buena la clave.
  if ((cuerpo as { ok?: unknown } | null)?.ok === false) {
    throw new ErrorPadron("CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos");
  }

  return sinPassword(normalizarUsuario(cuerpo));
}

/**
 * Respaldo mientras el padrón no tenga `POST /login`: traer el padrón y
 * comparar acá el `password` que viene en `GET /usuarios`.
 *
 * Anda, pero conviene saber qué se está aceptando: la tabla de contraseñas
 * entera viaja por la red en cada login, y cualquiera con el Bearer de una app
 * se la lleva completa. Además solo puede comparar texto contra texto: el día
 * que el padrón hashee las contraseñas (que debería), esto deja de funcionar y
 * hay que usar `POST /login` sí o sí.
 */
async function verificarContraElPadron(email: string, password: string): Promise<Usuario> {
  console.warn(
    "[padron] POST /login no existe: validando contra el password de GET /usuarios. " +
      "Pedile al Sistema de Registración que exponga POST /login.",
  );

  const { estado, cuerpo } = await pedir("/usuarios");

  if (estado === 401 || estado === 403) {
    console.error(`[padron] GET /usuarios rechazó el token (HTTP ${estado}). Revisá PADRON_TOKEN.`);
    throw new ErrorPadron("TOKEN_PADRON_RECHAZADO", "El padrón rechazó el token de la app");
  }

  if (estado >= 400 || !Array.isArray(cuerpo)) {
    console.error(`[padron] GET /usuarios devolvió HTTP ${estado}`, cuerpo);
    throw new ErrorPadron("ERROR_INTERNO", "No se pudo leer el padrón");
  }

  const buscado = email.trim().toLowerCase();
  const usuario = cuerpo
    .map(normalizarUsuario)
    .find((candidato) => candidato.email.trim().toLowerCase() === buscado);

  if (!usuario?.password) {
    if (usuario) {
      console.error(
        "[padron] GET /usuarios no devuelve `password` y POST /login no existe: " +
          "no hay forma de validar credenciales.",
      );
      throw new ErrorPadron("LOGIN_NO_DISPONIBLE", "El padrón no valida credenciales");
    }

    // Email que no está en el padrón: mismo mensaje que una clave errada, para
    // no contar quién tiene cuenta y quién no.
    throw new ErrorPadron("CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos");
  }

  if (usuario.password.startsWith("$2")) {
    console.error(
      "[padron] el password de GET /usuarios viene hasheado (bcrypt): no se puede " +
        "comparar de este lado. Hace falta POST /login.",
    );
    throw new ErrorPadron("LOGIN_NO_DISPONIBLE", "El padrón no valida credenciales");
  }

  if (!coincide(password, usuario.password)) {
    throw new ErrorPadron("CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos");
  }

  return sinPassword(usuario);
}

/**
 * Alta en el padrón, ya vinculada a un proyecto.
 *
 * Si el email ya existe el servicio reusa esa persona y solo agrega la fila en
 * `usuario_proyecto`: por eso el alta sirve tanto para alguien nuevo como para
 * alguien que ya está en otro proyecto de la materia.
 */
export async function registrar(datos: DatosAlta): Promise<{ usuarioId: number }> {
  const { estado, cuerpo } = await pedir("/registrar", { metodo: "POST", cuerpo: datos });

  // El email ya existe en el padrón y la contraseña que mandó no es la de esa
  // cuenta. No es "no se pudo crear": es "esa cuenta no es tuya".
  if (estado === 401 || estado === 403) {
    throw new ErrorPadron("CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos");
  }

  if (estado === 422) {
    throw new ErrorPadron("DATOS_INVALIDOS", "Datos inválidos", camposDeFastapi(cuerpo));
  }

  if (estado >= 400) {
    console.error(`[padron] POST /registrar devolvió HTTP ${estado}`, cuerpo);
    throw new ErrorPadron("ERROR_INTERNO", "El padrón devolvió un error");
  }

  const datosOk = cuerpo as { ok?: boolean; usuario_id?: number } | null;

  if (datosOk?.ok === false) {
    throw new ErrorPadron(
      "YA_REGISTRADO_EN_PROYECTO",
      "Esa persona ya está registrada en este proyecto",
    );
  }

  return { usuarioId: Number(datosOk?.usuario_id) };
}

/**
 * Padrón completo. Es el único read que expone el servicio hoy, y va con el
 * Bearer de PADRON_TOKEN.
 */
export async function listarUsuarios(): Promise<Usuario[]> {
  const { estado, cuerpo } = await pedir("/usuarios");

  if (estado === 401 || estado === 403) {
    console.error(
      `[padron] GET /usuarios rechazó el token (HTTP ${estado}). ` +
        `Revisá PADRON_TOKEN${TOKEN ? "" : ": está vacío"}.`,
    );
    throw new ErrorPadron("TOKEN_PADRON_RECHAZADO", "El padrón rechazó el token de la app");
  }

  if (estado >= 400 || !Array.isArray(cuerpo)) {
    console.error(`[padron] GET /usuarios devolvió HTTP ${estado}`, cuerpo);
    throw new ErrorPadron("ERROR_INTERNO", "No se pudo leer el padrón");
  }

  return cuerpo.map((crudo) => sinPassword(normalizarUsuario(crudo)));
}

/**
 * Un usuario por id.
 *
 * Se resuelve filtrando `GET /usuarios` porque el padrón no tiene un endpoint
 * por id. Sirve para el volumen de la materia; si el padrón crece, lo que hay
 * que pedir es `GET /usuarios/{id}` y cambiar solo esta función.
 */
export async function buscarPorId(id: number): Promise<Usuario | null> {
  const usuarios = await listarUsuarios();
  return usuarios.find((usuario) => usuario.id === id) ?? null;
}

/**
 * Los proyectos de la semilla de `database/init.sql`.
 *
 * El padrón tiene la tabla `proyectos` pero no la expone. Deducirlos de
 * `GET /usuarios` no alcanza: con la base recién levantada nadie está
 * registrado todavía, la lista saldría vacía y el alta no tendría a dónde
 * anotar a nadie. Se puede pisar con PROYECTOS, y lo que corresponde pedirle
 * al padrón es un `GET /proyectos`.
 */
const PROYECTOS_SEMILLA: Proyecto[] = [
  { id: 1, nombre: "Carpooling" },
  { id: 2, nombre: "Alquiler de Quintas" },
  { id: 3, nombre: "Sistema de Reservas" },
];

/** PROYECTOS="1:Carpooling,2:Alquiler de Quintas" */
function proyectosDelEntorno(): Proyecto[] | null {
  const crudo = process.env.PROYECTOS?.trim();
  if (!crudo) return null;

  const proyectos = crudo.split(",").flatMap((parte) => {
    const corte = parte.indexOf(":");
    if (corte < 1) return [];

    const id = Number(parte.slice(0, corte).trim());
    const nombre = parte.slice(corte + 1).trim();
    if (!Number.isInteger(id) || !nombre) return [];

    return [{ id, nombre }];
  });

  return proyectos.length > 0 ? proyectos : null;
}

/**
 * Proyectos a los que alguien se puede sumar.
 *
 * Sale de `GET /proyectos`, que no lleva token porque el formulario de alta lo
 * necesita antes de que la persona tenga cuenta. Si el padrón no responde se
 * usan los de la semilla: es preferible pintar el formulario y que el alta
 * falle después con su mensaje, a mostrar una lista vacía.
 */
export async function listarProyectos(): Promise<Proyecto[]> {
  try {
    const { estado, cuerpo } = await pedir("/proyectos");

    if (estado < 400 && Array.isArray(cuerpo)) {
      const proyectos = normalizarProyectos(cuerpo);
      if (proyectos.length > 0) return proyectos;
    }

    console.error(`[padron] GET /proyectos devolvió HTTP ${estado}`, cuerpo);
  } catch (error) {
    console.error("[padron] no se pudo leer GET /proyectos", error);
  }

  return proyectosDelEntorno() ?? PROYECTOS_SEMILLA;
}

/**
 * Lo que hace falta para mandar a alguien a la plataforma de su proyecto.
 *
 * `volverA` sale de `proyectos.url` en el padrón, no de acá: si el destino lo
 * eligiera quien pide el código, cualquiera se mandaría el código de otra
 * persona a un sitio propio.
 */
export type Lanzamiento = {
  codigo: string;
  volverA: string;
};

/**
 * Pide al padrón un código de un solo uso para entrar a un proyecto.
 *
 * Solo lo puede pedir el login central (es su token el que va en PADRON_TOKEN),
 * y solo después de haber validado la contraseña: emitir un código es afirmar
 * que esta persona ya probó quién es.
 *
 * Devuelve `null` cuando ese proyecto todavía no tiene a dónde mandar a nadie
 * (el padrón responde 409). No es un error: hay proyectos de la materia que
 * todavía no tienen plataforma, y para esos la persona se queda en este front.
 */
export async function pedirCodigo(
  usuarioId: number,
  proyectoId: number,
): Promise<Lanzamiento | null> {
  const { estado, cuerpo } = await pedir("/codigos", {
    metodo: "POST",
    cuerpo: { usuario_id: usuarioId, proyecto_id: proyectoId },
  });

  // 409: el proyecto no tiene URL. 404/405: padrón viejo, sin este endpoint.
  if (estado === 409 || estado === 404 || estado === 405) return null;

  if (estado >= 400) {
    // Se avisa y se sigue: es preferible que la persona quede adentro del login
    // a que no pueda entrar a ningún lado porque falló el salto.
    console.error(`[padron] POST /codigos devolvió HTTP ${estado}`, cuerpo);
    return null;
  }

  const codigo = (cuerpo as { codigo?: unknown } | null)?.codigo;
  const volverA = (cuerpo as { volver_a?: unknown } | null)?.volver_a;

  if (typeof codigo !== "string" || typeof volverA !== "string") {
    console.error("[padron] POST /codigos devolvió una respuesta incompleta", cuerpo);
    return null;
  }

  return { codigo, volverA };
}

/**
 * A dónde mandar a la persona cuando entra a un proyecto.
 *
 * La plataforma del proyecto, con el código en la query, si el proyecto tiene
 * una. Si no, `/cuenta`, que es la pantalla de este front.
 */
export async function destinoDelProyecto(
  usuarioId: number,
  proyectoId: number,
  siNoHayProyecto = "/cuenta",
  state: string | null = null,
): Promise<string> {
  const lanzamiento = await pedirCodigo(usuarioId, proyectoId);
  if (!lanzamiento) return siNoHayProyecto;

  const destino = new URL(lanzamiento.volverA);
  destino.searchParams.set("codigo", lanzamiento.codigo);

  // El `state` es del proyecto: lo mandó él cuando empezó el circuito y se le
  // devuelve tal cual, para que reconozca su propia ida y no acepte una vuelta
  // que nunca empezó. Acá no se mira ni se usa para nada.
  if (state) destino.searchParams.set("state", state);

  return destino.toString();
}
