FROM node:18-alpine

# Install Cloud SQL Auth Proxy
RUN apk add --no-cache curl \
    && curl -o /cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.6.1/cloud-sql-proxy.linux.amd64 \
    && chmod +x /cloud-sql-proxy

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Make sure the application listens on the correct port
ENV PORT=8080
EXPOSE 8080

# Start both the proxy and the application
CMD /cloud-sql-proxy --unix-socket /cloudsql "galvanic-vim-464504-n5:us-central1:medicine-shop-db" & node api.js 