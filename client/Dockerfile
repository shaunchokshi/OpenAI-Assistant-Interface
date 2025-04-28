FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm install -g serve

# Install curl for healthcheck
RUN apk add --no-cache curl

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl --fail http://localhost:3000/ || exit 1

# Create and use a non-root user, and set ownership of /app
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
RUN chown -R nodeapp:nodeapp /app
USER nodeapp

CMD ["serve", "-s", "build", "-l", "3000"]
