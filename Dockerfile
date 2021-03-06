FROM node:alpine as build

WORKDIR /yandex2mqtt
COPY src src/
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci && npm run build

FROM node:alpine

WORKDIR /yandex2mqtt
COPY --from=build /yandex2mqtt/dist dist/
COPY package.json package-lock.json ./
RUN npm ci --production

ENV BROKER_URL=mqtt://localhost:1883
ENV PIN=123-45-678
ENV DEBUG=1

CMD [ "npm", "start" ]
