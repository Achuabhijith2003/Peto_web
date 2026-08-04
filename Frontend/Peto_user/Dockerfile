# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code and build Vite app
COPY . .
RUN npm run build

# Stage 2: Nginx Production Stage
FROM nginx:alpine

# Copy built dist files to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP Port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
