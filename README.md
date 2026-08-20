# Padrón PP2

API del padrón de la materia: acá viven las personas, sus contraseñas y la
tabla que dice a qué proyectos pertenece cada una. Los fronts de los
proyectos de Prácticas Profesionalizantes (Carpooling, Alquiler de Quintas,
Sistema de Reservas) no guardan contraseñas — le preguntan a este servicio.

**Es solo una API.** No sirve páginas ni tiene interfaz: es un servicio REST,
pensado para que cada proyecto lo consuma desde su propio backend.

### Tecnologías

* TypeScript
* Express
* Prisma
* MySQL
* Docker

### Funcionalidades

* Registrar usuarios.
* Asociar usuarios a proyectos.
* Evitar registros duplicados en un mismo proyecto.
* Validar credenciales (login).
* Resetear la contraseña de alguien que la perdió.
* Mandar a cada persona a la plataforma de su proyecto, con un código de un
  solo uso, sin que esa plataforma vea nunca su contraseña.
* Consultar usuarios y los proyectos en los que están registrados.

### Endpoints

```text
GET  /                     estado del servicio
POST /login                valida credenciales -> usuario + sus proyectos
POST /registrar            alta (o vinculación a otro proyecto)
GET  /usuarios             los usuarios de quien pregunta   [token de app]
GET  /proyectos            proyectos disponibles
POST /password/reset       emite un token de reset          [token de la cátedra]
POST /password             canjea el token por una contraseña nueva
POST /aplicaciones         da de alta una app y su token     [token de la cátedra]
GET  /aplicaciones         qué apps hay y qué ve cada una    [token de la cátedra]
DELETE /aplicaciones/{id}  revoca el token de una app        [token de la cátedra]
PUT  /proyectos/{id}/url   dónde vive ese proyecto           [token de la cátedra]
POST /codigos              emite un código de ingreso        [token del login central]
POST /codigos/canjear      código -> quién es la persona     [token del proyecto]
```

#### `POST /login`

```json
{ "email": "lopez@gmail.com", "password": "Secreta123" }
```

Devuelve la persona con **todos** sus proyectos:

```json
{
  "id": 4,
  "nombre": "Fabian",
  "apellido": "Lopez",
  "email": "lopez@gmail.com",
  "proyectos": [
    { "id": 1, "nombre": "Carpooling" },
    { "id": 2, "nombre": "Alquiler de Quintas" }
  ]
}
```

Los proyectos van en la misma respuesta a propósito: con eso quien consume la
API decide si no la deja entrar (cero proyectos), si entra derecho (uno) o si
le muestra un selector (varios), sin un segundo pedido.

Si el email no existe o la contraseña no es la de esa cuenta responde **401**
con `{"detail": "Credenciales invalidas"}` — el mismo error en los dos casos,
para que no se pueda averiguar quién tiene cuenta y quién no.

#### `POST /registrar`

```json
{ "nombre": "Ema", "apellido": "Ortiz", "email": "ortiz@gmail.com",
  "password": "Secreta123", "proyecto_id": 3 }
```

Si el email **no existe**, crea la persona y la vincula al proyecto.

Si el email **ya existe**, no crea nada nuevo: verifica que la contraseña sea
la de esa cuenta y agrega el vínculo con el proyecto nuevo. Si la contraseña
no coincide responde 401 y no toca nada. Así es como alguien que ya está en
la materia se suma a un segundo proyecto sin tener otra cuenta.

Si ya estaba en ese mismo proyecto responde 200 con `{"ok": false}`. Todo el
endpoint corre en una única transacción: si el vínculo con el proyecto
falla, el alta del usuario también se deshace.

#### `GET /usuarios`

Devuelve **los usuarios que le corresponden a la aplicación que pregunta**,
según su token:

```bash
curl -H "Authorization: Bearer $TOKEN_DE_LA_APP" http://localhost:8000/usuarios
```

Si el token es el de un proyecto, salen solo los inscriptos en **ese**
proyecto, y de cada uno solo ese proyecto: que alguien esté además en
Carpooling no es asunto de Alquiler de Quintas. El único que ve el padrón
entero es el login central, que lo necesita para ofrecer "elegí tu proyecto"
antes de saber a cuál va la persona.

Sin el header, con un token que no es, o con uno revocado, responde 401.
**Nunca devuelve `password`**: para validar credenciales está `POST /login`.

### Un token por aplicación

Cada aplicación que le pega a esta API tiene el suyo, en la tabla
`aplicaciones`. Antes había uno solo para todos, y con él cualquier front se
llevaba el padrón entero, incluida la gente de los otros proyectos. Ahora la
API sabe **quién** pregunta.

Las da de alta la cátedra, con su `ADMIN_TOKEN`:

```bash
curl -X POST localhost:8000/aplicaciones \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"nombre":"Carpooling","proyecto_id":1}'
```

```json
{ "id": 2, "nombre": "Carpooling", "proyecto_id": 1,
  "token": "d-Bz-m38gy7YhvWs4BP-MvwDfzmQrWMOS5tQwnyyBkM",
  "aviso": "Guardalo ahora: no se vuelve a mostrar" }
```

Ese token es el que usa el backend de ese proyecto. **Se ve una sola vez**:
en la base queda solo su hash, así que un dump no le sirve a nadie para
entrar. Si se pierde, se revoca esa y se crea otra.

Para ver qué hay y cortar una:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" localhost:8000/aplicaciones
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" localhost:8000/aplicaciones/2
```

Revocar no borra la fila: queda el registro de que existió y cuándo se
cortó, y no toca a las demás.

**El login central es un caso aparte.** Su token es `API_TOKEN`, del `.env`,
y el servicio registra esa aplicación solo al arrancar (`proyecto_id` NULL,
o sea: ve todo). Cambiar la variable y reiniciar cambia su token; por eso esa
fila no se revoca desde la API, se maneja desde el `.env`.

`ADMIN_TOKEN` no está en esta tabla y no es el token de ninguna aplicación:
si lo fuera, cualquier proyecto podría emitirse tokens nuevos o resetear
contraseñas ajenas. Los dos valores tienen que ser distintos — la API se
niega a arrancar si coinciden.

### Contraseñas

Se guardan hasheadas con **bcrypt** (cost 12, vía `bcryptjs`). Entran en la
columna `password` (`VARCHAR(255)`) sin cambiar el esquema: un hash bcrypt
son 60 caracteres.

Tiene que tener **al menos 8 caracteres**, y bcrypt no mira más allá de los
**72 bytes**, así que las más largas se rechazan con 422. Ojo con confundir
ese límite con el `VARCHAR(255)`: los 255 son para el hash, no para la
contraseña.

Los emails se guardan y se buscan en minúsculas y sin espacios, para que el
login no dependa de cómo los escriban.

### Entrar a un proyecto

Cada proyecto de la materia tiene su propia plataforma, y la persona entra
**una vez** contra esta API, en el backend que haga de login. Después ese
login la manda a su proyecto con un código de un solo uso, y ese proyecto lo
canjea acá para enterarse de quién es. **Ningún proyecto ve una contraseña
ni guarda una.**

```text
1. El login (con su token, proyecto_id NULL) pide el código:
   POST /codigos  {"usuario_id": 1, "proyecto_id": 1}
   -> {"codigo": "NCicTX...", "volver_a": "https://carpooling.../sesion", "segundos": 60}

2. El navegador va a  https://carpooling.../sesion?codigo=NCicTX...

3. El backend de Carpooling canjea, con SU token:
   POST /codigos/canjear  {"codigo": "NCicTX..."}
   -> {"usuario": {"id": 1, "nombre": "Ema", "apellido": "Ortiz",
                   "email": "ortiz@gmail.com"},
       "proyecto": {"id": 1, "nombre": "Carpooling"}}

4. Carpooling emite SU sesión con eso. Listo.
```

Antes de que ande, la cátedra tiene que decir dónde vive cada proyecto:

```bash
curl -X PUT localhost:8000/proyectos/1/url \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"url":"https://carpooling.../sesion"}'
```

Esa URL es **la que ve el navegador**, no el nombre de un contenedor: el
redirect lo hace el navegador de la persona, no un servidor.

Por qué está armado así:

* **El destino sale de `proyectos.url`, nunca del pedido.** Si el que pide el
  código pudiera elegir a dónde mandarlo, se mandaría el código de otra
  persona a un sitio propio y entraría como ella.
* **Solo el login emite; solo el destinatario canjea.** Emitir un código es
  afirmar "esta persona ya probó quién es", y el único que valida
  contraseñas es el login. Un código solo lo canjea el proyecto al que va:
  con el token de Carpooling no se canjea un código de Alquiler de Quintas.
* **60 segundos y un solo uso** (`SEGUNDOS_DE_CODIGO`). Solo tiene que
  sobrevivir un redirect; cuanto menos vive, menos importa que quede escrito
  en el historial del navegador o en el log de algún servidor. Pedir uno
  nuevo invalida el anterior.
* **Mismo error para todo**: inventado, vencido, usado o de otro proyecto
  responden 400 con `{"detail": "El codigo no sirve o ya vencio"}`.
* **Sin URL no hay salto.** Si un proyecto todavía no tiene plataforma,
  `POST /codigos` responde 409. Los proyectos se van sumando de a uno, sin
  romper a los demás.

### Reset de contraseña

No hay "olvidé mi contraseña" automático: el servicio no manda mails, así
que no tiene forma de comprobar que quien pide el reset sea la persona. Eso
lo comprueba alguien de la cátedra por fuera del sistema, y recién entonces
emite un token.

```bash
# 1. La cátedra pide el token
curl -X POST localhost:8000/password/reset \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"ortiz@gmail.com"}'

# 2. Se lo hace llegar a la persona por donde sea. Se ve una sola vez.

# 3. La persona elige su contraseña, sin que nadie más la conozca
curl -X POST localhost:8000/password -H "Content-Type: application/json" \
  -d '{"token":"XyK5...","password":"LaQueEllaElija"}'
```

* **30 minutos y un solo uso** (`MINUTOS_DE_RESET`). Pedir uno nuevo invalida
  el anterior.
* **Las sesiones abiertas no se cortan.** Las emite el login de cada
  consumidor, no esta API, y acá no hay nada que revocar.

### Ejecutar

Todo con Docker. Las contraseñas de la base y los tokens salen de un `.env`
que **no está en el repositorio**:

```bash
cp .env.example .env
docker compose up -d --build
```

Completá antes en el `.env`: `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`,
`API_TOKEN` y `ADMIN_TOKEN`. Sin `.env` el `up` corta con un error de
variable faltante: es a propósito, para que nadie levante esto con las
contraseñas del ejemplo.

| Variable | Para qué | Por defecto |
|---|---|---|
| `DB_NAME`, `DB_USER` | base y usuario que crea mysql | `registracion`, `registracion_user` |
| `DB_PASSWORD` | contraseña de ese usuario, la misma de los dos lados | — (obligatoria) |
| `MYSQL_ROOT_PASSWORD` | root de mysql, para dumps | — (obligatoria) |
| `API_TOKEN` | token del login central, la app que ve todo el padrón | — (obligatoria) |
| `ADMIN_TOKEN` | token de la cátedra: resets y alta de aplicaciones | — (obligatoria) |
| `MINUTOS_DE_RESET` | cuánto vive un token de reset | `30` |
| `SEGUNDOS_DE_CODIGO` | cuánto vive un código de ingreso a un proyecto | `60` |
| `PUERTO_API`, `PUERTO_MYSQL` | puertos de la máquina | `8000`, `3307` |
| `BIND_HOST` | interfaz donde se publican | `127.0.0.1` (solo esta máquina) |

Al arrancar, el contenedor aplica las migraciones de Prisma pendientes y
siembra los tres proyectos de la materia si no existen (es idempotente:
correrlo de nuevo no duplica nada). No hace falta correr nada a mano.

API en `http://localhost:8000`.

### Estructura

```
api/
  prisma/
    schema.prisma        esquema de las 6 tablas
    migrations/           historial de migraciones (se aplican solas al arrancar)
    seed.ts                siembra los 3 proyectos de la materia
  src/
    index.ts                arma la app de Express y la levanta
    config.ts                 variables de entorno, todas leídas acá
    db.ts                      instancia única de PrismaClient
    crypto.ts                   bcrypt, tokens al azar, hash de tokens
    autenticacion.ts             token de aplicación, token de cátedra, largo de contraseña
    validacion.ts                 leer y validar el cuerpo del pedido
    errores.ts                     ErrorApi: status + mensaje, lo atrapa el middleware final
    arrancar.ts                     sincroniza la aplicación del login desde API_TOKEN
    rutas/
      publicas.ts                    /, /login, /registrar, /proyectos
      usuarios.ts                     /usuarios
      password.ts                      /password/reset, /password
      aplicaciones.ts                   /aplicaciones (POST, GET, DELETE)
      proyectos-admin.ts                 /proyectos/{id}/url
      codigos.ts                          /codigos, /codigos/canjear
```

### Cosas del contrato que conviene tener presentes

* **Nunca se guardan contraseñas en texto plano ni se devuelven en ningún
  endpoint.** La única forma de validar credenciales es `POST /login`.
* **Los emails se normalizan** a minúsculas y sin espacios antes de
  guardarse y de buscarse: entrar con MAYÚSCULAS funciona igual.
* **Los límites salen de `prisma/schema.prisma`**: nombre y apellido 50,
  email 100. La contraseña no puede pasar de 72 bytes (límite de bcrypt, no
  de la columna).
* **De los tokens (aplicaciones, códigos, resets) se guarda el hash**, nunca
  el valor: un dump de la base no le sirve a nadie para entrar a ningún
  lado ni cambiarle la contraseña a nadie.
* **Los hashes de contraseña empiezan con `$2a$`**, no `$2b$` como en la
  versión anterior en Python: es una diferencia de librería (`bcryptjs` en
  vez de `bcrypt`), no de algoritmo — los dos son bcrypt cost 12 y se
  verifican igual.
