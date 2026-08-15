import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Login PP2",
  description: "Inicio de sesión contra el registro central de PP2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main className="contenedor">{children}</main>
      </body>
    </html>
  );
}
