FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

RUN mkdir -p tmp

EXPOSE 5001

CMD ["node", "server.js"]