# Production image for the CLM Directory web app.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies first so Docker can cache this layer.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY public ./public

USER node
EXPOSE 3000
CMD ["node", "server/index.js"]
