FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Make sure the application listens on the correct port
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Start the application
CMD ["node", "api.js"]
