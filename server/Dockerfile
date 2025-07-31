# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
FROM base as deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Build the application
FROM base as build
COPY package.json bun.lockb* ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun build src/index.ts --outdir=dist --target=bun

# Production image
FROM base as runtime
WORKDIR /app

# Copy built application
COPY package.json bun.lockb* ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Expose the port your app runs on (adjust if needed)
EXPOSE 8080

# Set the command to run your application
CMD ["bun", "run", "dist/index.js"]