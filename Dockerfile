# Build Stage for Client
FROM node:18-slim as client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build && \
    echo "=== Build completed ===" && \
    ls -la dist/ && \
    echo "=== Files in dist ===" && \
    find dist -type f

# Production Stage for Server
FROM node:18-slim
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server code
COPY server/ .

# Copy built client assets to server's public directory
COPY --from=client-build /app/client/dist ./public

# Create uploads directory and verify public exists
RUN mkdir -p uploads/thumbnails && \
    echo "=== Checking public directory ===" && \
    ls -la public/ && \
    echo "=== Files in public ===" && \
    find public -type f | head -20 || echo "WARNING: public directory empty or missing files"

EXPOSE 5000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
