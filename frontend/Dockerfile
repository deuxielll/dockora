# Use an official Node.js runtime as a parent image
FROM node:18-alpine as builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and pnpm-lock.yaml (if exists) from the frontend context
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code from the frontend context
COPY . .

# Build the React app
RUN pnpm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Copy the built React app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (if any)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]