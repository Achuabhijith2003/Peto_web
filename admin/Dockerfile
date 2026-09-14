# ===================================================
# Stage 1: Build Stage
# ===================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copy source files (supports both repository root and admin/ build contexts)
COPY . ./temp_context/

# Detect context: if built from repo root, extract admin/ directory; otherwise use context root
RUN if [ -f "./temp_context/admin/package.json" ]; then \
        echo "Detected repository root context. Extracting admin directory..."; \
        cp -a ./temp_context/admin/. ./; \
    else \
        echo "Detected admin directory context."; \
        cp -a ./temp_context/. ./; \
    fi && \
    rm -rf ./temp_context

# Install dependencies using admin/package.json
RUN npm ci || npm install

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

# Create custom Nginx configuration template directly in image for dynamic $PORT and SPA routing
RUN mkdir -p /etc/nginx/templates && \
    printf '%s\n' \
    'server {' \
    '    listen ${PORT};' \
    '    server_name localhost;' \
    '' \
    '    root /usr/share/nginx/html;' \
    '    index index.html index.htm;' \
    '' \
    '    gzip on;' \
    '    gzip_vary on;' \
    '    gzip_min_length 1024;' \
    '    gzip_proxied any;' \
    '    gzip_types text/plain text/css text/xml text/javascript application/javascript application/x-javascript application/xml application/json image/svg+xml;' \
    '    gzip_disable "MSIE [1-6]\\.";' \
    '' \
    '    add_header X-Frame-Options "SAMEORIGIN" always;' \
    '    add_header X-XSS-Protection "1; mode=block" always;' \
    '    add_header X-Content-Type-Options "nosniff" always;' \
    '    add_header Referrer-Policy "strict-origin-when-cross-origin" always;' \
    '' \
    '    location ~* \\.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff|woff2|ttf)$ {' \
    '        expires 1y;' \
    '        access_log off;' \
    '        add_header Cache-Control "public, max-age=31536000, immutable";' \
    '    }' \
    '' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '' \
    '    error_page 500 502 503 504 /50x.html;' \
    '    location = /50x.html {' \
    '        root /usr/share/nginx/html;' \
    '    }' \
    '}' > /etc/nginx/templates/default.conf.template

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose default HTTP port and Render default port
EXPOSE 80 10000

# Start Nginx in foreground (entrypoint automatically processes /etc/nginx/templates with envsubst)
CMD ["nginx", "-g", "daemon off;"]
