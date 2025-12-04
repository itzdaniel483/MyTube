# Build Stage for Client
FROM node:18-alpine as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Production Stage for Server
FROM node:18-alpine
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server code
COPY server/ .

# Copy built client assets to server's public directory
COPY --from=client-build /app/client/dist ./public

# Create uploads directory
RUN mkdir -p uploads/thumbnails

EXPOSE 5000

CMD ["node", "index.js"]
