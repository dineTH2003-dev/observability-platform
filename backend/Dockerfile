FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests first (Docker layer caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose the backend port
EXPOSE 9000

# Health check — hit the root endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:9000/ || exit 1

CMD ["node", "src/server.js"]
