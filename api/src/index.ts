import "express-async-errors";

import express, { type NextFunction, type Request, type Response } from "express";

import { asegurarAppDelLogin } from "./arrancar";
import { config } from "./config";
import { ErrorApi } from "./errores";
import { rutasAplicaciones } from "./rutas/aplicaciones";
import { rutasCodigos } from "./rutas/codigos";
import { rutasPassword } from "./rutas/password";
import { rutasProyectosAdmin } from "./rutas/proyectos-admin";
import { rutasPublicas } from "./rutas/publicas";
import { rutasUsuarios } from "./rutas/usuarios";

// ADMIN_TOKEN y API_TOKEN iguales dejarían a cualquier front resetear
// contraseñas ajenas o emitirse aplicaciones nuevas. Se corta ACÁ, al
// arrancar, en vez de dejar que cada pedido lo descubra por su cuenta.
if (config.adminToken === config.apiToken) {
  console.error("[config] ADMIN_TOKEN no puede ser igual a API_TOKEN");
  process.exit(1);
}

const app = express();

app.use(express.json());

app.use(rutasPublicas);
app.use(rutasUsuarios);
app.use(rutasPassword);
app.use(rutasAplicaciones);
app.use(rutasProyectosAdmin);
app.use(rutasCodigos);

// JSON mal formado: express.json() lanza antes de llegar a ninguna ruta.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(422).json({ detail: "El cuerpo del pedido no es JSON válido" });
    return;
  }

  next(err);
});

// Los `ErrorApi` que lanza cada ruta terminan acá: es lo único que convierte
// un error en la respuesta `{"detail": "..."}` con su status. `express-async
// -errors` (importado arriba) es lo que hace que el rechazo de una ruta
// `async` llegue hasta este middleware — Express 4 por sí solo no lo reenvía.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ErrorApi) {
    res.status(err.status).json({ detail: err.detail });
    return;
  }

  console.error("[error no manejado]", err);
  res.status(500).json({ detail: "Error interno" });
});

asegurarAppDelLogin()
  .then(() => {
    app.listen(config.puerto, () => {
      console.log(`[api] escuchando en el puerto ${config.puerto}`);
    });
  })
  .catch((error) => {
    console.error("[arrancar] no se pudo preparar la aplicacion del login", error);
    process.exit(1);
  });
