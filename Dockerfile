FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache su-exec
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY . .
RUN chmod +x /app/scripts/docker-entrypoint.sh && mkdir -p /app/data && chown -R node:node /app
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health || exit 1
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["npm", "start"]
