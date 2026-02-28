# Use the official Bun image
FROM oven/bun:1.2 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
# Note: prisma.config.ts requires DATABASE_URL even for generation
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" bunx prisma generate

# Final production stage
FROM oven/bun:1.2-slim as release
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
