# Use a smaller base image for better performance and security
FROM node:23-alpine AS build

# Create a non-root user with a specific UID and GID to run the application
#RUN addgroup -S appuser -g 1001 && adduser -S appuser -u 1001 -G appuser

# Add health check to ensure the container is running properly
#HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:3000/ || exit 1

# Switch to the non-root user
#USER appuser

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]

#ENV DANGEROUSLY_DISABLE_HOST_CHECK=true
#ENV HOST=0.0.0.0
#ENV HTTPS=true
#CMD ["npm", "start"]
