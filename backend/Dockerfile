# Multi-stage build: compile TypeScript + generate the Prisma client in a
# full node image, then ship only the production deps + compiled output.
# The same final image serves both the API and the worker — Coolify (or
# docker-compose) picks which process to run via CMD/command override, so
# there's one image to build and deploy, not two.

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prisma's generated client + query engine binaries live in node_modules —
# regenerate against the production install rather than copying the
# builder's node_modules wholesale (keeps the engine binary matched to
# this stage's platform).
COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 4000

# Default process is the API server. The worker service overrides this
# (see docker-compose.yml / Coolify service command) with:
#   node dist/queues/worker.js
CMD ["node", "dist/server.js"]
