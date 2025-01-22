FROM node:16-alpine AS build

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json postcss.config.js ./

RUN chown -R appuser:appgroup /app && \
    npm install -g npm@latest && \
    npm ci && \
    npm install -g react-scripts@5.0.1 && \
    npm install postcss@8.4.14 postcss-preset-env@7.0.0 && \
    npm install webpack@4.44.2 webpack-manifest-plugin@2.2.0 workbox-webpack-plugin@5.1.4

COPY . .
RUN chown -R appuser:appgroup /app

USER appuser
RUN npm run build


FROM nginx:alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
