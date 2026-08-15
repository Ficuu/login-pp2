# Login PP2

Front de inicio de sesión contra el **registro central de PP2**
([Ficuu/register-pp2](https://github.com/Ficuu/register-pp2)), el padrón de usuarios
común a todos los proyectos de la materia.

Este repo **no tiene base de datos**: las identidades, las contraseñas y las sesiones
viven en el registro. Acá solo está el front y su backend propio.

## Qué hace

- `/login` — email + contraseña.
- `/crear-cuenta` — alta, resolviendo el caso "esta persona ya tiene cuenta en PP2".
- `/cuenta` — página protegida: datos del usuario, editar perfil, cambiar contraseña.
- Logout que **revoca el token** en el registro y borra la cookie.

## Por qué hay backend

La **API key identifica al proyecto entero**, no al usuario: quien la tenga puede dar de
alta usuarios y leer el padrón. Por eso nunca puede estar en el navegador (nada de
`NEXT_PUBLIC_`, nada de `fetch` al registro desde un componente cliente).

```
navegador  ──(form, con cookie httpOnly)──▶  backend del front  ──(X-API-Key)──▶  registro central
                                             (server actions y
                                              route handlers)
```

- La API key vive en `REGISTRO_API_KEY`, variable de entorno del servidor.
- El token que devuelve el registro se guarda en una cookie **httpOnly** (`sesion_pp2`),
  no en `localStorage`: ahí lo lee cualquier script.
- Cada página protegida valida esa cookie contra `GET /api/registro/sesion`.

## Setup local

Son dos servicios a la vez.

### Terminal 1 — el registro

```bash
git clone https://github.com/Ficuu/register-pp2 && cd register-pp2
cp .env.example .env && npm install
docker compose up -d mysql
npx prisma migrate deploy
npm run dev                                    # queda en :3000

# API key de este front (se imprime UNA sola vez)
npm run registro:app -- "Login PP2" --responsable="Facu"
```

### Terminal 2 — este repo

```bash
npm install
cp .env.example .env.local     # y pegá ahí la API key del paso anterior
npm run dev -- -p 3001         # el front en :3001
```

`.env.local`:

```
REGISTRO_URL="http://localhost:3000/api/registro"
REGISTRO_API_KEY="pp2_..."
```

### Antes de tocar el front

Si esto no responde, el problema no está acá:

```bash
curl -H "X-API-Key: pp2_..." http://localhost:3000/api/registro/salud
```

Y el flujo completo, en crudo:

```bash
# alta
curl -X POST http://localhost:3000/api/registro/usuarios \
  -H "X-API-Key: pp2_..." -H "Content-Type: application/json" \
  -d '{"nombre":"Facundo","apellido":"Paez","email":"facu@isft177.edu.ar","password":"Secreta123!"}'

# login -> token
curl -X POST http://localhost:3000/api/registro/login \
  -H "X-API-Key: pp2_..." -H "Content-Type: application/json" \
  -d '{"email":"facu@isft177.edu.ar","password":"Secreta123!"}'

# sesion
curl http://localhost:3000/api/registro/sesion \
  -H "X-API-Key: pp2_..." -H "Authorization: Bearer reg_..."
```

## Estructura

```
src/
  lib/
    registro.ts       cliente tipado del registro (solo servidor, lleva la API key)
    sesion.ts         cookie httpOnly + resolver el usuario actual
    errores.ts        código del registro -> mensaje en pantalla
    validaciones.ts   email y contraseña, mismas reglas que el padrón
    formularios.ts    estado compartido entre server actions y formularios
  app/
    login/            página + server action
    crear-cuenta/     página + server action (alta y vinculación)
    cuenta/           página protegida + acciones (salir, perfil, contraseña)
    api/salir/        borra la cookie cuando el token ya venció
  components/         formularios de cliente
```

## Cosas del contrato que conviene tener presentes

- **Se mira `error.codigo`, nunca el mensaje.** El mapeo está en `src/lib/errores.ts`.
- **`EMAIL_EN_USO` no es un fracaso del alta**: la persona ya está en el padrón por otro
  proyecto. El formulario le pide *esa* contraseña y al reenviar queda vinculada
  (`vinculado: true`).
- **El token dura 24 h y solo sirve para esta aplicación.** Ante `TOKEN_EXPIRADO` o
  `TOKEN_INVALIDO` se borra la cookie y se vuelve a `/login`.
- **Se guarda el `uid`, no el email**: el email lo puede cambiar la persona, el uid no.
- **La contraseña** va de 8 caracteres a 72 **bytes** (límite de bcrypt). Se valida
  también de este lado para no hacer el viaje al pedo.
- **El email se normaliza** a minúsculas y sin espacios antes de mandarlo.
- **Hay rate limit** (60 pedidos/min por API key + IP, y bloqueo de 15 min tras 8 logins
  fallidos con el mismo email): no hay polling contra `/sesion`.
- **Nunca se guardan contraseñas ni hashes en este repo.** La fuente de verdad es el padrón.
