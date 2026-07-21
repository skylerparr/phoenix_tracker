FROM node:18-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Clean install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build with production settings. REACT_APP_API_BASE_URL is inlined into the
# bundle at build time (create-react-app only bakes REACT_APP_* vars present
# during `npm run build`); default to the dev fallback if not supplied.
ARG REACT_APP_API_BASE_URL=http://localhost:3001
ENV NODE_ENV=production
ENV CI=true
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Non-root user setup
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]