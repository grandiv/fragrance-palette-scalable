# backend/Dockerfile

# ---- Builder Stage ----
    FROM node:18-alpine AS builder
    WORKDIR /app
    
    # Copy package files
    COPY package*.json ./
    
    # Install dependencies (as root, then we'll copy with correct ownership)
    RUN npm install --omit=dev # Or npm install if devDependencies are needed for build steps
    
    # Copy the rest of the application code
    COPY . .
    
    # Generate Prisma Client as part of the build, still as root for now
    # This ensures it's built with all necessary native binaries for the alpine env
    RUN npx prisma generate
    
    # ---- Production Stage ----
    FROM node:18-alpine AS production
    WORKDIR /app
    
    # Set the user to 'node' (default for this image, but explicit for clarity)
    # USER node # This is often already the default user for CMD/ENTRYPOINT
    
    # Copy built node_modules and Prisma client from builder stage with correct ownership
    COPY --chown=node:node --from=builder /app/node_modules ./node_modules
    COPY --chown=node:node --from=builder /app/prisma ./prisma
    COPY --chown=node:node --from=builder /app/package*.json ./
    COPY --chown=node:node --from=builder /app/src ./src
    # If you have other source files/directories, copy them too with --chown
    
    # If your .env file is not part of the image (recommended),
    # it will be supplied by docker-compose environment variables.
    
    EXPOSE 3001
    
    # The command in docker-compose.yml will handle db push, seed, and start
    # No CMD needed here if overridden by docker-compose, but good practice:
    # CMD ["npm", "start"]