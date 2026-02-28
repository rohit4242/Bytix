# Use the official Bun image
FROM oven/bun:1.1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Final production stage
FROM oven/bun:1.1-slim as release
WORKDIR /app

# Copy built app and node_modules from base
COPY --from=base /app .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start the server
CMD ["bun", "src/index.ts"]
