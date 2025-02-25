# Build stage
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Install pnpm
RUN npm install -g pnpm@latest typescript

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source files
COPY . .

# Build TypeScript
RUN pnpm exec tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache python3 make g++

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@latest && \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built files
COPY --from=builder /app/build ./build

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "build/index.js"]