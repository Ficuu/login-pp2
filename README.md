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

## Lo que le falta al padrón

El servicio hoy expone `GET /`, `POST /registrar` y `GET /usuarios`. Para que este
front funcione bien hace falta esto, en este orden:

### 1. `POST /login` (imprescindible)

Sin él no hay forma sana de validar credenciales.

```
POST /login   { "email": "lopez@gmail.com", "password": "..." }

200 { "id": 4, "nombre": "Fabian", "apellido": "Lopez", "email": "lopez@gmail.com",
      "proyectos": [ { "id": 1, "nombre": "Carpooling" }, ... ] }
401 { "detail": "Credenciales invalidas" }
```

Que devuelva `proyectos` en la misma respuesta es lo que permite resolver el
selector sin un segundo pedido.

### 2. Hashear las contraseñas

Hoy se guardan en texto plano (`main.py` inserta `datos.password` tal cual). Con
**bcrypt** entran en la columna que ya existe (`VARCHAR(255)`; un hash bcrypt son
60 caracteres), así que no hay que tocar el esquema:

```python
# requirements.txt: bcrypt
import bcrypt

def hashear(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

def verificar(password: str, guardado: str) -> bool:
    return bcrypt.checkpw(password.encode(), guardado.encode())
```

Con `POST /login` andando, **este front no necesita saber qué algoritmo se usa**:
la comparación pasa entera del lado del padrón. Es el motivo principal para tener
ese endpoint.

### 3. `POST /registrar` no verifica identidad

Si el email ya existe, reusa ese `usuario_id` y lo vincula al proyecto nuevo **sin
comprobar la contraseña**. Es decir:

```bash
curl -X POST http://localhost:8000/registrar -H "Content-Type: application/json" \
  -d '{"nombre":"X","apellido":"X","email":"lopez@gmail.com","password":"cualquiera","proyecto_id":2}'
```

deja a quien lo mande vinculado a la cuenta de Fabián. Cuando el email ya existe,
el alta debería exigir la contraseña de esa cuenta antes de agregar la fila en
`usuario_proyecto`. Este front tapa el agujero por su lado (después del alta hace
login con esas mismas credenciales, y si no cierran no deja entrar), pero el
padrón queda expuesto a cualquier otro cliente.

### 4. `GET /proyectos`

Para que el alta ofrezca los proyectos reales. Mientras tanto se usan los de la
semilla de `database/init.sql`, pisables con la variable `PROYECTOS`.

### Mientras tanto

Si `POST /login` devuelve 404, el cliente cae a comparar contra el `password` que
venga en `GET /usuarios`. **Es un respaldo, no el diseño**: manda la tabla de
contraseñas entera por la red en cada login, y deja de funcionar en cuanto se
hasheen (el cliente lo detecta y lo dice en el log). Sirve para no quedar
bloqueado, nada más.

## Setup local

Son dos servicios a la vez.

### Terminal 1 — el padrón

```bash
git clone -b servicio-registracion https://github.com/DennisMejia21/SistemaRegistracion
cd SistemaRegistracion
docker compose up --build      # API en :8000, phpMyAdmin en :8081
```

### Terminal 2 — este repo

```bash
npm install
cp .env.example .env.local     # completá PADRON_TOKEN y SESION_SECRETO
npm run dev -- -p 3001
```

`.env.local`:

```
PADRON_URL="http://localhost:8000"
PADRON_TOKEN="..."
SESION_SECRETO="..."           # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Antes de tocar el front

Si esto no responde, el problema no está acá:

```bash
curl -H "Authorization: Bearer $PADRON_TOKEN" http://localhost:8000/usuarios
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
- **El email se normaliza** a minúsculas y sin espacios antes de mandarlo; el padrón
  lo guarda tal cual llega.
- **Los límites salen de `database/init.sql`**: nombre y apellido 50, email 100,
  contraseña 255. Se validan de este lado para no hacer el viaje al pedo.
- **La sesión dura 24 h** y se corta de este lado: no hay token que revocar.
- **`GET /usuarios` trae el padrón entero** y se lo consulta en cada página
  protegida. Alcanza para la materia; si crece, lo que hay que pedir es
  `GET /usuarios/{id}` y cambiar solo `buscarPorId` en `src/lib/padron.ts`.
- **Nunca se guardan contraseñas ni hashes en este repo.** La fuente de verdad es
  el padrón.
