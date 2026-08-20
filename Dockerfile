# Front de login de PP2. No tiene base de datos: le pega al Sistema de
# Registración (el padrón) por HTTP.
#
# La imagen se arma en tres etapas para no arrastrar ni el codigo fuente ni las
# dependencias de desarrollo a lo que termina corriendo.

FROM node:20-alpine AS dependencias

WORKDIR /app

COPY package.json package-lock.json ./

# `npm ci` instala exactamente lo del lock: dos build de la misma imagen dan
# las mismas versiones.
RUN npm ci


FROM node:20-alpine AS build

WORKDIR /app

COPY --from=dependencias /app/node_modules ./node_modules
COPY . .

# PADRON_URL, PADRON_TOKEN y SESION_SECRETO NO se necesitan acá: las paginas
# que hablan con el padron son dinamicas y leen el entorno en cada pedido. Si
# se pasaran como build-arg quedarian escritas dentro de la imagen.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


FROM node:20-alpine AS produccion

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# El server de `output: "standalone"` ya trae adentro las dependencias que usa.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# No corre como root: si alguien se escapa del proceso, no es dueño del
# contenedor.
USER node

EXPOSE 3000

CMD ["node", "server.js"]
