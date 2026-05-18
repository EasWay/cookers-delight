FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy main nginx.conf (sets worker_processes, gzip, etc.)
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443
