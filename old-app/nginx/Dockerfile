FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
#COPY --from=build /app/build /usr/share/nginx/html
# Add health check to ensure the container is running properly
#HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:4999/ || exit 1
