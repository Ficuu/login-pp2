import { PrismaClient } from "@prisma/client";

// Instancia única del cliente. En dev con recarga en caliente esto evitaría
// abrir un pool nuevo por cada reinicio del módulo, pero acá no usamos
// recarga en caliente (tsx watch reinicia el proceso entero), así que alcanza
// con esto.
export const db = new PrismaClient();
