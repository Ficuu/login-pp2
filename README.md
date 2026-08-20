# Login PP2

Front de inicio de sesión contra el **Sistema de Registración de PP2**
([DennisMejia21/SistemaRegistracion](https://github.com/DennisMejia21/SistemaRegistracion),
rama `servicio-registracion`), el padrón de usuarios común a todos los proyectos
de la materia.

Este repo **no tiene base de datos**: las personas, sus contraseñas y la tabla
`usuario_proyecto` viven en el padrón. Acá está el front y su backend propio.

## Qué hace

- `/login` — email + contraseña.
- `/elegir-proyecto` — para quien está en más de un proyecto.
- `/crear-cuenta` — alta en el padrón, ya vinculada a un proyecto.
- `/cuenta` — página protegida: sus datos, sus proyectos y con cuál está trabajando.

## Una persona, varios proyectos

En el padrón `usuarios.email` es UNIQUE y `usuario_proyecto` es N:M: **la identidad
es una sola y el proyecto es un vínculo**. Por eso la contraseña se valida una vez
y el proyecto se resuelve después:

```
POST /login (email + password)
        │
        ▼
  identidad OK -> el padrón devuelve sus proyectos
        │
        ├── 0 proyectos -> no entra, se le explica por qué
        ├── 1 proyecto  -> se sella solo, nunca ve el selector
        └── N proyectos -> /elegir-proyecto
```

El proyecto elegido queda en la cookie de sesión. Cambiarlo (`/elegir-proyecto`,
enlazado desde `/cuenta`) **no vuelve a pedir la contraseña**: la identidad ya está
probada y firmada, lo único que cambia es el alcance. Sí se verifica contra el
padrón que el proyecto pedido esté entre los suyos, y el vencimiento original se
conserva para que ir y volver no estire la sesión.

Si a alguien lo sacan del proyecto que tenía elegido, la próxima navegación lo
manda de vuelta al selector: los proyectos se releen del padrón en cada request,
no se confía en lo que diga la cookie.

## La sesión la emitimos nosotros

El padrón no entrega tokens ni tiene un `GET /sesion` contra el cual validar. Así
que después del login firmamos una cookie **httpOnly** (`sesion_pp2`) con
HMAC-SHA256 y `SESION_SECRETO`.

Adentro va lo mínimo — `uid`, `pid` y vencimiento — y **nada más**: el nombre, el
email y los proyectos salen del padrón en cada request, porque pueden haber
cambiado. Una cookie con la firma rota, vencida, o de alguien que ya no está en el
padrón se descarta y vuelve a `/login`.

## Por qué hay backend

El `PADRON_TOKEN` identifica al proyecto entero, no a la persona: quien lo tenga
lee el padrón completo. Por eso nunca puede estar en el navegador (nada de
`NEXT_PUBLIC_`, nada de `fetch` al padrón desde un componente cliente).

```
navegador ──(form, cookie httpOnly)──▶ backend del front ──(Bearer)──▶ padrón
                                       (server actions y
                                        route handlers)
```

## El contrato con el padrón

El padrón expone lo que este front necesita (rama `claude/login-multiple-projects-5496rr`
del [Sistema de Registración](https://github.com/DennisMejia21/SistemaRegistracion)):

```text
GET  /             estado del servicio
POST /login        valida credenciales -> usuario + TODOS sus proyectos
POST /registrar    alta, o vinculación a otro proyecto (pide la contraseña)
GET  /usuarios     padrón completo          [Authorization: Bearer]
GET  /proyectos    proyectos disponibles    [sin token, lo usa el alta]
```

```text
POST /login   { "email": "lopez@gmail.com", "password": "..." }

200 { "id": 4, "nombre": "Fabian", "apellido": "Lopez", "email": "lopez@gmail.com",
      "proyectos": [ { "id": 1, "nombre": "Carpooling" }, ... ] }
401 { "detail": "Credenciales invalidas" }
```

Que `proyectos` venga en la misma respuesta es lo que permite resolver el selector sin
un segundo pedido.

Las contraseñas viven hasheadas allá (bcrypt) y la comparación pasa entera del lado del
padrón: **este front no sabe ni tiene que saber qué algoritmo se usa**, y nunca guarda
una contraseña.

### El respaldo, si le pegás a un padrón viejo

Si `POST /login` devuelve 404, el cliente cae a comparar contra el `password` que venga
en `GET /usuarios`. **Es un respaldo, no el diseño**: manda la tabla de contraseñas
entera por la red en cada login, y deja de funcionar en cuanto estén hasheadas (el
cliente lo detecta y lo dice en el log). Sirve para no quedar bloqueado, nada más.

Lo mismo con `GET /proyectos`: si no contesta, el alta usa los proyectos de la semilla
de `database/init.sql`, pisables con la variable `PROYECTOS`.

## Levantarlo

Todo con docker: son dos stacks, primero el padrón (que crea la red) y después este.

### 1. El padrón

```bash
git clone -b servicio-registracion https://github.com/DennisMejia21/SistemaRegistracion
cd SistemaRegistracion
cp .env.example .env           # completá DB_PASSWORD, MYSQL_ROOT_PASSWORD y API_TOKEN
docker compose up -d --build   # API en :8000, phpMyAdmin en :8081
```

### 2. Este repo

```bash
cp .env.example .env           # PADRON_TOKEN = el API_TOKEN de arriba, y un SESION_SECRETO
docker compose up -d --build
```

Queda en `http://localhost:3001`.

`.env`:

```text
PADRON_URL=http://mock-service:8000    # nombre del servicio en la red de docker
RED_PADRON=sistemaregistracion_default # la red que crea el compose del padrón
PADRON_TOKEN=...                       # el API_TOKEN del padrón
SESION_SECRETO=...                     # 32+ caracteres
PUERTO_FRONT=3001
```

`PADRON_URL` no es `localhost`: adentro del contenedor `localhost` es el contenedor
mismo. El padrón se resuelve por el nombre del servicio dentro de la red compartida, y
por eso hay que levantarlo primero.

Un secreto de sesión nuevo:

```bash
docker run --rm node:20-alpine node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Antes de tocar el front

Si esto no responde, el problema no está acá:

```bash
curl -H "Authorization: Bearer $PADRON_TOKEN" http://localhost:8000/usuarios
```

Y para ver qué le pasa a este:

```bash
docker compose logs -f login
```

## Estructura

```
src/
  lib/
    padron.ts         cliente del Sistema de Registración (solo servidor, lleva el Bearer)
    sesion.ts         cookie httpOnly firmada + resolver la sesión actual
    errores.ts        código de error -> mensaje en pantalla
    validaciones.ts   email, contraseña y proyecto, con los límites de las columnas
    formularios.ts    estado compartido entre server actions y formularios
    redirecciones.ts  redirect con Location relativo (funciona detrás del puerto de docker)
  app/
    login/            página + server action
    elegir-proyecto/  selector + `entrar/` (sella el proyecto cuando hay uno solo)
    crear-cuenta/     página + server action (alta en un proyecto)
    cuenta/           página protegida + salir
    api/salir/        borra la cookie
  components/         formularios de cliente
```

## Cosas del contrato que conviene tener presentes

- **Se mira `error.codigo`, nunca el mensaje.** El mapeo está en `src/lib/errores.ts`.
- **El email se normaliza** a minúsculas y sin espacios antes de mandarlo. El padrón
  hace lo mismo de su lado, así que entrar con MAYÚSCULAS funciona igual.
- **Los límites salen de `database/init.sql`**: nombre y apellido 50, email 100.
  La contraseña no puede pasar de 72 bytes (es el límite de bcrypt, no el de la
  columna). Se validan de este lado para no hacer el viaje al pedo.
- **La sesión dura 24 h** y se corta de este lado: no hay token que revocar.
- **`GET /usuarios` trae el padrón entero** y se lo consulta en cada página
  protegida. Alcanza para la materia; si crece, lo que hay que pedir es
  `GET /usuarios/{id}` y cambiar solo `buscarPorId` en `src/lib/padron.ts`.
- **Nunca se guardan contraseñas ni hashes en este repo.** La fuente de verdad es
  el padrón.
