# Stage 1: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json ./
# Adding a dummy argument to force cache invalidation for pnpm install
ARG CACHE_BUST=1 
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]