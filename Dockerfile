FROM node:20-alpine

# su-exec: lightweight privilege-drop tool (standard in Alpine)
RUN apk add --no-cache su-exec

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY public ./public
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
