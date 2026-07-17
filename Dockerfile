FROM node:alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm i

COPY . .

RUN npm run build

FROM node:alpine

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/dist ./dist

RUN  npm i --omit=dev

CMD ["npm", "start"]

# docker run -d -p 8080:8080 --name=my-server --env-file .env.production test-server