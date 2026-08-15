import "server-only";

/**
 * Cliente del registro central de PP2.
 *
 * SOLO se importa desde código de servidor (server actions, route handlers,
 * server components). La API key identifica al proyecto entero, así que nunca
 * puede viajar al navegador.
 */

const BASE = process.env.REGISTRO_URL ?? "http://localhost:3000/api/registro";
const KEY = process.env.REGISTRO_API_KEY ?? "";

/** Códigos de error que devuelve el registro (ver §5 del contexto). */
export type CodigoError =
  | "CREDENCIALES_INVALIDAS"
  | "EMAIL_EN_USO"
  | "USUARIO_YA_REGISTRADO"
  | "NO_REGISTRADO_EN_APP"
  | "DATOS_INVALIDOS"
  | "LIMITE_EXCEDIDO"
  | "USUARIO_INACTIVO"
  | "REGISTRO_SUSPENDIDO"
  | "TOKEN_EXPIRADO"
  | "TOKEN_INVALIDO"
  | "DOCUMENTO_EN_USO"
  | "API_KEY_FALTANTE"
  | "API_KEY_INVALIDA"
  | "ERROR_INTERNO"
  // no lo devuelve el registro: lo generamos nosotros si no se lo puede alcanzar
  | "REGISTRO_INACCESIBLE";

export class ErrorRegistro extends Error {
  constructor(
    readonly codigo: CodigoError | string,
    mensaje: string,
    readonly detalles?: Record<string, string>,
    readonly reintentarEn?: number,
  ) {
    super(mensaje);
    this.name = "ErrorRegistro";
  }
}

export type Usuario = {
  uid: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  documento?: string | null;
  registro?: {
    rol_externo: string | null;
    estado: string;
  } | null;
};

export type DatosAlta = {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  telefono?: string;
  rol_externo?: string;
  id_externo?: string;
  datos_extra?: Record<string, unknown>;
};

export type RespuestaAlta = {
  vinculado: boolean;
  usuario: Usuario;
};

export type RespuestaLogin = {
  token: string;
  expira_en: string;
  usuario: Usuario;
};

export type RespuestaSesion = {
  usuario: Usuario;
  sesion: {
    expira_en: string;
    created_at: string;
  };
};

export type DatosPerfil = {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  documento?: string;
  password_actual?: string;
  password_nueva?: string;
};

type Sobre<T> =
  | { ok: true; datos: T }
  | {
      ok: false;
      error: { codigo: string; mensaje: string; detalles?: Record<string, string> };
    };

type Opciones = {
  metodo?: string;
  cuerpo?: unknown;
  token?: string;
};

async function pedir<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  if (!KEY) {
    // Error de configuración nuestro, no del usuario.
    console.error("[registro] falta REGISTRO_API_KEY en el entorno del servidor");
    throw new ErrorRegistro("API_KEY_FALTANTE", "El front no tiene API key configurada");
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: {
        "X-API-Key": KEY,
        "Content-Type": "application/json",
        ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
      },
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
      cache: "no-store",
    });
  } catch (causa) {
    console.error(`[registro] no se pudo alcanzar ${BASE}${ruta}`, causa);
    throw new ErrorRegistro("REGISTRO_INACCESIBLE", "No se pudo contactar al registro de PP2");
  }

  let json: Sobre<T>;
  try {
    json = (await respuesta.json()) as Sobre<T>;
  } catch {
    console.error(`[registro] respuesta no-JSON en ${ruta} (HTTP ${respuesta.status})`);
    throw new ErrorRegistro("ERROR_INTERNO", "El registro devolvió una respuesta inválida");
  }

  if (!json.ok) {
    const reintentar = Number(respuesta.headers.get("Retry-After"));
    throw new ErrorRegistro(
      json.error.codigo,
      json.error.mensaje,
      json.error.detalles,
      Number.isFinite(reintentar) && reintentar > 0 ? reintentar : undefined,
    );
  }

  return json.datos;
}

/** Alta de usuario. `vinculado: true` = ya existía en el padrón de PP2. */
export const registrar = (datos: DatosAlta) =>
  pedir<RespuestaAlta>("/usuarios", { metodo: "POST", cuerpo: datos });

/** Credenciales -> token de sesion de ESTA aplicación. */
export const login = (email: string, password: string) =>
  pedir<RespuestaLogin>("/login", { metodo: "POST", cuerpo: { email, password } });

/** Quién es este token. Se llama en cada página protegida. */
export const sesion = (token: string) => pedir<RespuestaSesion>("/sesion", { token });

/** El usuario edita sus propios datos (o cambia la contraseña). */
export const editarSesion = (token: string, datos: DatosPerfil) =>
  pedir<RespuestaSesion>("/sesion", { metodo: "PATCH", cuerpo: datos, token });

/** Revoca el token. Con uno vencido devuelve `{ cerrada: false }` y no es error. */
export const logout = (token: string) =>
  pedir<{ cerrada: boolean }>("/logout", { metodo: "POST", token });

/** Ping de configuración, útil para el README y para diagnosticar. */
export const salud = () => pedir<Record<string, unknown>>("/salud");
