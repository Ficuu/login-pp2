import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Los tres proyectos de la materia. Coincide con la semilla que traía el
// servicio original (database/init.sql). Es idempotente: si un proyecto con
// ese nombre ya existe, no lo duplica.
const PROYECTOS = ["Carpooling", "Alquiler de Quintas", "Sistema de Reservas"];

async function main() {
  for (const nombre of PROYECTOS) {
    const existente = await db.proyecto.findFirst({ where: { nombre } });
    if (!existente) {
      await db.proyecto.create({ data: { nombre } });
      console.log(`  creado: ${nombre}`);
    }
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
