"use client";

type Props = {
  nombre: string;
  etiqueta: string;
  tipo?: string;
  error?: string;
  pista?: string;
  valorInicial?: string;
  requerido?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
};

/** Un input con su label, su error y su pista. Nada mas. */
export function Campo({
  nombre,
  etiqueta,
  tipo = "text",
  error,
  pista,
  valorInicial,
  requerido = true,
  autoComplete,
  autoFocus,
}: Props) {
  const idError = `${nombre}-error`;
  const idPista = `${nombre}-pista`;
  const descripto = [error ? idError : null, pista ? idPista : null].filter(Boolean).join(" ");

  return (
    <div className="campo">
      <label htmlFor={nombre}>{etiqueta}</label>
      <input
        id={nombre}
        name={nombre}
        type={tipo}
        defaultValue={valorInicial}
        required={requerido}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={descripto || undefined}
      />
      {pista ? (
        <span className="pista" id={idPista}>
          {pista}
        </span>
      ) : null}
      {error ? (
        <span className="error-campo" id={idError}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
