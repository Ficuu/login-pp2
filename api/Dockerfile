# API del padrón de PP2: registro, login, tokens por proyecto, ingreso a
# proyectos y reset de contraseña. Express + TypeScript + Prisma. Sin vistas,
# sin páginas: es solo la API.

FROM node:20-alpine AS base

# Prisma necesita openssl en Alpine; sin esto el motor de consultas falla en
# tiempo de ejecución con un error críptico de "libssl no encontrada".
RUN apk add --no-cache openssl

FROM base AS dependencias

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

FROM base AS build

WORKDIR /app

COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

# El cliente de Prisma se genera a partir del schema, no de una conexión a la
# base: no hace falta DATABASE_URL para este paso.
RUN npx prisma generate
RUN npm run build

FROM base AS produccion

WORKDIR /app

ENV NODE_ENV=production

COPY --from=dependencias /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

RUN npx prisma generate

# No corre como root.
USER node

EXPOSE 8000

# Aplica las migraciones pendientes, siembra los proyectos si hace falta (el
# seed es idempotente: no duplica si ya están) y recién ahí arranca el
# servidor. Así el contenedor nunca atiende un pedido contra un esquema
# desactualizado o sin los proyectos base.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/index.js"]
