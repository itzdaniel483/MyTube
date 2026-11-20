# MyTube on Coolify (claude, 20 Nov 2026). Two stages: build the React client, then run the Express server with it.
# All runtime data (db.json, session.secret, uploads) lives in /data -> mount a persistent volume there.
# Environments: test / production / demo differ only by env vars (AUTH_MODE, APP_DOMAIN, ...) and their own /data volume.
FROM node:22-bookworm-slim AS client
WORKDIR /client
COPY client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY client/ .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3260 HOST=0.0.0.0 DB_PATH=/data/db.json UPLOADS_DIR=/data/uploads
COPY server/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server/ .
RUN rm -rf public uploads && mkdir -p /data/uploads && chown -R node:node /data
COPY --from=client /client/dist ./public
USER node
EXPOSE 3260
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "require('http').get('http://127.0.0.1:3260/api/auth/config',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "index.js"]
