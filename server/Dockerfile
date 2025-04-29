# Use a smaller base image for better performance and security
FROM node:23-alpine

# Create a non-root user with a specific UID and GID to run the application
RUN addgroup -S appuser -g 1001 && adduser -S appuser -u 1001 -G appuser

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production

# Add health check to ensure the container is running properly
HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:4000/health || exit 1

EXPOSE 4000

# Switch to the non-root user
USER appuser

CMD ["node", "index.js"]