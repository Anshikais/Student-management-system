# Production Dockerfile for Joineazy Backend
FROM node:22-alpine AS runtime

# Set working directory
WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source code
COPY config/ ./config/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY routes/ ./routes/
COPY database/ ./database/
COPY utils/ ./utils/
COPY server.js ./

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose backend port
EXPOSE 5000

# Start server
CMD ["npm", "start"]