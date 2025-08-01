# Build stage - Frontend
FROM oven/bun:1 as frontend-builder
WORKDIR /app

# Copy workspace files
COPY package.json bun.lock ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN bun install --frozen-lockfile

# Build frontend
COPY client ./client
RUN cd client && bun run build

# Build stage - Backend
FROM oven/bun:1 as backend-builder
WORKDIR /app

# Copy workspace files
COPY package.json bun.lock ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN bun install --frozen-lockfile

# Build backend
COPY server ./server
RUN cd server && bun build src/index.ts --outdir=dist --target=bun

# Production stage
FROM oven/bun:1-slim
WORKDIR /app

# Copy built backend
COPY --from=backend-builder /app/server/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY server/package.json ./

# Copy built frontend to be served
COPY --from=frontend-builder /app/client/dist ./public

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "run", "dist/index.js"]