# Production Stage for Server
FROM node:18-slim
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server code
COPY server/ .

# Copy pre-built client assets to server's public directory
COPY client/dist ./public

# Verify files were copied
RUN echo "=== Checking public directory ===" && \
    ls -la public/ && \
    echo "=== Files in public ===" && \
    find public -type f | head -20

# Create uploads directory
RUN mkdir -p uploads/thumbnails

EXPOSE 5000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:5000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]
