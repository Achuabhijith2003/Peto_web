# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy user app package files
COPY Peto_user/package*.json ./
RUN npm install

# Copy user app source code
COPY Peto_user/ ./
RUN npm run build

# Stage 2: Nginx Stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
