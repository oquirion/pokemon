FROM node:18-alpine AS build-frontend

# Set working directory for frontend build
WORKDIR /app

# Step 3: Copy package.json and package-lock.json (if available) to the container
COPY package*.json ./

# Step 4: Install dependencies
RUN npm ci --prefer-offline --no-audit --progress=false

# Step 5: Copy only the `src` folder and other required files
COPY ./src ./src
COPY ./public ./public
COPY tsconfig.json ./
COPY .env ./

RUN npm run build

# Step 2: Build backend (Node.js server)
FROM node:18-alpine AS build-backend

# Set working directory for backend
WORKDIR /server

# Copy backend source code
COPY ./server /server

# Install backend dependencies
RUN npm ci --prefer-offline --no-audit --progress=false
#RUN npm install

# Transpile TypeScript to JavaScript for the backend
RUN npx tsc  # Make sure your tsconfig.json points to the correct output folder (e.g., dist)

# Step 3: Create final image
FROM node:18-alpine

RUN npm install -g serve

# Set working directory
WORKDIR /app

# Copy the built frontend static files from the build-frontend stage
COPY --from=build-frontend /app/build /app/public

# Copy the compiled backend files from the build-backend stage
COPY --from=build-backend /server/dist /server/dist

# Install production dependencies for backend (if separate dependencies are needed)
COPY ./server/package.json ./server/package-lock.json /server/
WORKDIR /server
RUN npm install --production

# Expose the port your backend will run on
EXPOSE 8080 3000

# Set environment variables (if necessary, for example, for the backend)
ENV NODE_ENV=production
ENV ORGANIZATION_ID=olivierquirionpokemonchallengegz2hprx2
ENV API_KEY=xx53b8c154-032d-4246-9bce-01539394e314
ENV USER_EMAIL=olivierquirion@gmail.com

# Start the frontend + backend server
CMD serve -s /app/public -l 8080 & node ./dist/server.js