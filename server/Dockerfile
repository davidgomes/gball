# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
FROM base as deps
# Copy root package files
COPY package.json bun.lock ./
# Copy workspace package.json files (needed for workspaces)
COPY server/package.json ./server/
COPY client/package.json ./client/
# Install dependencies
RUN bun install --frozen-lockfile

# Build the application
FROM base as build
COPY package.json bun.lock ./
COPY --from=deps /app/node_modules ./node_modules
# Copy only the server directory for building
COPY server ./server
RUN cd server && bun build src/index.ts --outdir=dist --target=bun

# Production image
FROM base as runtime
WORKDIR /app

# Copy server package.json and dependencies
COPY server/package.json ./
COPY --from=deps /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist

# Expose the port your app runs on
EXPOSE 8080

# Set the command to run your application
CMD ["bun", "run", "dist/index.js"]