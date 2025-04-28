FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN apt-get update && apt-get install -y curl
RUN chown -R node:node /app
ENV NODE_ENV=production
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD curl -f http://localhost:4000/ || exit 1
USER node
CMD ["node", "index.js"]
