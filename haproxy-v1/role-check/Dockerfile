FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY app.js ./
USER node

EXPOSE 9101 9102 9103 9104
CMD ["node", "app.js"]
