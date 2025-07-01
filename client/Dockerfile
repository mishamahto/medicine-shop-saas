# Build stage
FROM node:18-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM nginx:alpine

# Create nginx temp directories and fix permissions
RUN mkdir -p /tmp/client_temp \
    && mkdir -p /tmp/proxy_temp \
    && mkdir -p /tmp/fastcgi_temp \
    && mkdir -p /tmp/uwsgi_temp \
    && mkdir -p /tmp/scgi_temp \
    && chown -R nginx:nginx /tmp/client_temp \
    && chown -R nginx:nginx /tmp/proxy_temp \
    && chown -R nginx:nginx /tmp/fastcgi_temp \
    && chown -R nginx:nginx /tmp/uwsgi_temp \
    && chown -R nginx:nginx /tmp/scgi_temp \
    && mkdir -p /var/cache/nginx \
    && chown -R nginx:nginx /var/cache/nginx \
    && mkdir -p /var/log/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && mkdir -p /var/run \
    && chown -R nginx:nginx /var/run \
    && chown -R nginx:nginx /etc/nginx

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 