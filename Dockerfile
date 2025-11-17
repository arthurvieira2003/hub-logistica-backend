FROM node:18-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 4010

CMD ["node", "app.js"]

