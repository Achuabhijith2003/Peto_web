# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root & backend package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install

# Copy backend source code & tsconfig
COPY backend/ ./backend/

# Build TypeScript output to backend/dist
WORKDIR /app/backend
RUN npm run build

# Stage 2: Production Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=5000

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm install --only=production

# Copy compiled dist from builder stage
COPY --from=builder /app/backend/dist ./dist

# Create uploads directory
RUN mkdir -p uploads temp

# Expose backend port
EXPOSE 5000

# Start backend server
CMD ["node", "dist/server.js"]
