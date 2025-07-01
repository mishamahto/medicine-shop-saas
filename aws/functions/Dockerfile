FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache bash curl \
    && curl -o /cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.6.1/cloud-sql-proxy.linux.amd64 \
    && chmod +x /cloud-sql-proxy

WORKDIR /app

# Copy and install Node modules
COPY package*.json ./
RUN npm install --production

# Copy application files
COPY . .

# Set required env vars
ENV PORT=8080
ENV NODE_ENV=production

# Ensure container listens on right port
EXPOSE 8080

# Use simplified startup script
RUN echo '#!/bin/sh\n\
set -ex\n\
\n\
echo "Starting Cloud SQL Auth Proxy..."\n\
/cloud-sql-proxy --unix-socket /cloudsql "galvanic-vim-464504-n5:us-central1:medicine-shop-db" &\n\
sleep 5\n\
\n\
echo "Starting Node.js app..."\n\
node api.js\n' > /app/start.sh \
&& chmod +x /app/start.sh

CMD ["/app/start.sh"]
