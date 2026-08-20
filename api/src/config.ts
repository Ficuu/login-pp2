/**
 * Toda la configuración del servicio, leída una sola vez al arrancar.
 *
 * Las tres que son secretos (DATABASE_URL, API_TOKEN, ADMIN_TOKEN) no tienen
 * valor por defecto a propósito: sin ellas el proceso corta antes de levantar
 * el servidor, en vez de arrancar a medias con una configuración insegura.
 */

function exigir(nombre: string): string {
  const valor = process.env[nombre];

  if (!valor) {
    console.error(`[config] falta la variable ${nombre}. Copiá .env.example a .env.`);
    process.exit(1);
  }

  return valor;
}

export const config = {
  puerto: Number(process.env.PUERTO ?? 8000),

  databaseUrl: exigir("DATABASE_URL"),

  // Token del login central, la única aplicación que ve el padrón entero. Se
  // sincroniza con la tabla `aplicaciones` en cada arranque.
  apiToken: exigir("API_TOKEN"),

  // Token de la cátedra: resets de contraseña y alta de aplicaciones.
  adminToken: exigir("ADMIN_TOKEN"),

  minutosDeReset: Number(process.env.MINUTOS_DE_RESET ?? 30),
  segundosDeCodigo: Number(process.env.SEGUNDOS_DE_CODIGO ?? 60),

  // bcrypt no mira más allá de los 72 bytes de la contraseña. Es un límite del
  // algoritmo, no de la columna: `password` es VARCHAR(255) porque ahí entra
  // el hash (60 caracteres), no porque la contraseña pueda ser tan larga.
  passwordMaxBytes: 72,

  // El front de cada proyecto ya pide 8; que la API acepte menos no tendría
  // sentido, porque el alta y el reset se le pueden pegar directo sin pasar
  // por ningún front.
  passwordMinLargo: 8,
} as const;

export const APP_DEL_LOGIN = "Login central";
