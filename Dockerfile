# syntax=docker/dockerfile:1

# Bun installs and builds, but the image runs on Node: better-sqlite3 links a
# native addon against the Node ABI, so builder and runtime share a Node base.

FROM node:22-bookworm-slim AS bun
COPY --from=oven/bun:1.3-slim /usr/local/bin/bun /usr/local/bin/bun

FROM bun AS deps
WORKDIR /app
COPY package.json bun.lock ./
# better-sqlite3 fetches/compiles its addon in a lifecycle script; bun trusts
# it by default, and `node` is on PATH here so prebuild-install picks the
# binary matching the runtime's ABI.
RUN bun install --frozen-lockfile

FROM bun AS builder
WORKDIR /app
# Next collects page data with a worker per core, and every worker imports the
# db module; pointed at a file they race to create and migrate it (SQLITE_BUSY).
# Nothing is read from the database at build time, so give each worker its own
# throwaway in-memory one.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_PATH=:memory:
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/gira.db

# The SQLite file is the only thing the app writes; mount a volume here to keep
# it across deploys. `node` (uid 1000) comes with the base image.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME /app/data

# `output: "standalone"` traces the server and its node_modules into
# .next/standalone; public/ and .next/static are not traced and come along
# separately.
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

# /login is the one page the auth proxy lets through unauthenticated.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
