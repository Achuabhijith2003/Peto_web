# ===================================================
# Stage 1: Build Stage
# ===================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy package manifests
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy application source code
COPY . .

# Build the production bundle
RUN npm run build

# ===================================================
# Stage 2: Production Nginx Runtime Stage
# ===================================================
FROM nginx:alpine

# Default port for local testing; Render injects its own PORT (e.g. 10000)
ENV PORT=80

# Remove default nginx configurations and static files
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy custom Nginx configuration template for dynamic $PORT substitution and SPA routing
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose default HTTP port and Render default port
EXPOSE 80 10000

# Start Nginx in foreground (entrypoint automatically processes /etc/nginx/templates with envsubst)
CMD ["nginx", "-g", "daemon off;"]
