FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json first for cache optimization
COPY package*.json ./

# Install production dependencies inside the container
# Use npm ci for faster, more reliable builds based on package-lock.json
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the correct port
EXPOSE 5001

# The command will be specified in docker-compose.yml, so CMD is optional
# If included, it should match the production start command
# CMD [ "npm", "start" ]
