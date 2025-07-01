FROM node:18-alpine

# Install Cloud SQL Auth Proxy and bash
RUN apk add --no-cache curl bash \
    && curl -o /cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.6.1/cloud-sql-proxy.linux.amd64 \
    && chmod +x /cloud-sql-proxy

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Make sure the application listens on the correct port
ENV PORT=8080
EXPOSE 8080

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Starting Cloud SQL Auth Proxy..."\n\
/cloud-sql-proxy --unix-socket /cloudsql "galvanic-vim-464504-n5:us-central1:medicine-shop-db" & \n\
proxy_pid=$!\n\
echo "Waiting for proxy to start..."\n\
sleep 5\n\
\n\
echo "Starting Node.js application..."\n\
node api.js & \n\
app_pid=$!\n\
\n\
# Wait for either process to exit\n\
wait -n $proxy_pid $app_pid\n\
exit_code=$?\n\
\n\
# Kill the other process\n\
kill $proxy_pid $app_pid 2>/dev/null\n\
\n\
echo "Process exited with code $exit_code"\n\
exit $exit_code' > /app/start.sh && chmod +x /app/start.sh

# Start both services using the startup script
CMD ["/app/start.sh"] 