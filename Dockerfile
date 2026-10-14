FROM node:20-alpine

WORKDIR /app

# Copy package definition
COPY package*.json ./

# Install dependencies (if any)
RUN npm install --omit=dev || true

# Copy application source
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV PORT=10000

# Expose port 10000 (Render default)
EXPOSE 10000

# Run native server
CMD ["node", "server.js"]
