FROM node:18-alpine

WORKDIR /app

# Install dependencies first (caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p uploads/thumbnails

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "index.js"]
