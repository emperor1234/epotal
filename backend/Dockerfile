# Multi-stage build: compile TypeScript + generate the Prisma client in a
# full node image, then ship only the production deps + compiled output.
# server.ts starts the BullMQ search worker in-process alongside the HTTP
# server — one process, one image, one Coolify service.

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

CMD ["node", "dist/server.js"]
