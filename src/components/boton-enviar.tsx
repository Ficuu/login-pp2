"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  enviando?: string;
  className?: string;
};

/** Boton de submit que se deshabilita solo mientras corre el server action. */
export function BotonEnviar({ children, enviando = "Enviando...", className }: Props) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? enviando : children}
    </button>
  );
}
