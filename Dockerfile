FROM node:20-alpine

# Docker socket GID (default 999 — check yours with: stat -c '%g' /var/run/docker.sock)
ARG DOCKER_GID=999
RUN addgroup -g ${DOCKER_GID} -S docker 2>/dev/null || true \
 && adduser node docker 2>/dev/null || true

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY public ./public
EXPOSE 8080
USER node
CMD ["node", "src/index.js"]
