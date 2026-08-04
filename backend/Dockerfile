# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root, backend & frontend package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY Frontend/Peto_user/package*.json ./Frontend/Peto_user/

# Install dependencies
RUN npm install

# Copy frontend source code & build frontend dist
COPY Frontend/Peto_user/ ./Frontend/Peto_user/
WORKDIR /app/Frontend/Peto_user
RUN npm install && npm run build

# Copy backend source code & tsconfig
WORKDIR /app
COPY backend/ ./backend/
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

# Copy built frontend dist from builder stage
COPY --from=builder /app/Frontend/Peto_user/dist ./Frontend/Peto_user/dist

WORKDIR /app/backend

# Create uploads directory
RUN mkdir -p uploads temp

# Expose backend port
EXPOSE 5000

# Start backend server
CMD ["npm", "start"]
