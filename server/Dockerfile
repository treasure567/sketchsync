FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts

USER node
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s \
  CMD wget -q -O /dev/null http://127.0.0.1:3002/api/health || exit 1

CMD ["node", "src/index.ts"]
