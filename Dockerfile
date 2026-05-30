FROM node:20-alpine

WORKDIR /app

# Install dependencies for both workspaces
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci

# Copy source files
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build frontend
RUN npm run build --workspace=frontend

# Build backend
RUN npm run build --workspace=backend

# Generate Prisma client
RUN cd backend && npx prisma generate

# Expose port
EXPOSE 3000

# Working directory for runtime
WORKDIR /app/backend

# Start with migration + server
CMD ["npm", "run", "start:prod"]
