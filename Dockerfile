# ============================================
# Ultron API — Production Dockerfile
# Multi-stage build for monorepo with shared package
# ============================================

# ---------- Stage 1: Build ----------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build deps for native modules (Prisma, etc.)
RUN apk add --no-cache python3 make g++ openssl

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

# Install all workspace dependencies (including dev)
RUN npm ci --workspaces

# Copy source
COPY packages/shared packages/shared
COPY apps/api apps/api

# Build shared package
RUN npm run build --workspace=@ultron/shared

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build NestJS API (compiles src + prisma via tsconfig include)
RUN cd apps/api && npm run build

# ---------- Stage 2: Runtime ----------
FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app

# Copy only production deps + built output
COPY --from=builder --chown=app:app /app/package.json /app/package.json
COPY --from=builder --chown=app:app /app/package-lock.json /app/package-lock.json
COPY --from=builder --chown=app:app /app/node_modules /app/node_modules
COPY --from=builder --chown=app:app /app/apps/api/package.json /app/apps/api/package.json
COPY --from=builder --chown=app:app /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=builder --chown=app:app /app/apps/api/dist /app/apps/api/dist
COPY --from=builder --chown=app:app /app/apps/api/prisma /app/apps/api/prisma
COPY --from=builder --chown=app:app /app/apps/api/src /app/apps/api/src
COPY --from=builder --chown=app:app /app/packages/shared /app/packages/shared

# Prisma needs the generated client at runtime
COPY --from=builder --chown=app:app /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder --chown=app:app /app/apps/api/node_modules/.prisma /app/apps/api/node_modules/.prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=builder --chown=app:app /app/apps/api/node_modules/@prisma /app/apps/api/node_modules/@prisma

# Deployment entrypoint: push schema → seed → start API
COPY --chown=app:app deploy.sh /app/deploy.sh
RUN chmod +x /app/deploy.sh

USER app

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Runs HTTP server + BullMQ worker + scheduler in one process
CMD ["sh", "/app/deploy.sh"]