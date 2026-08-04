# Stage 1: Build stage
FROM node:22-alpine AS builder

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
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy root & backend package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies (including tsx)
RUN npm install --omit=dev

# Copy backend source code & config
COPY backend/ ./backend/

WORKDIR /app/backend

# Create uploads directory
RUN mkdir -p uploads temp

# Expose backend port
EXPOSE 5000

# Start backend server
CMD ["npm", "start"]
