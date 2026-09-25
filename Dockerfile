# syntax=docker/dockerfile:1.7
# Multi-stage build: compile SPA + server bundle, then ship a slim runtime
# with production dependencies only. Runs as a non-root user.

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/data
WORKDIR /app
RUN groupadd --system tutor && useradd --system --gid tutor --home /app tutor \
  && mkdir -p /data && chown tutor:tutor /data
COPY --from=build --chown=tutor:tutor /app/node_modules ./node_modules
COPY --from=build --chown=tutor:tutor /app/dist ./dist
COPY --from=build --chown=tutor:tutor /app/package.json ./package.json
USER tutor
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.mjs"]
