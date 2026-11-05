FROM node:22-alpine

RUN apk add --no-cache socat

WORKDIR /app
COPY app.js .

EXPOSE 9090

CMD ["node", "app.js"]