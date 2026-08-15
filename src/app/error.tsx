"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Último colchon: si el registro no responde, la página no explota en blanco.
 * Los errores esperables (credenciales, sesion vencida) se manejan antes.
 */
export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[login] error no manejado", error);
  }, [error]);

  return (
    <div className="tarjeta">
      <h1>Algo se rompió</h1>
      <p className="bajada">
        Puede que el registro de PP2 no esté disponible en este momento. Probá de nuevo en
        un rato.
      </p>
      <button onClick={reset}>Reintentar</button>
      <p className="pie">
        <Link href="/login">Volver a iniciar sesión</Link>
      </p>
    </div>
  );
}
