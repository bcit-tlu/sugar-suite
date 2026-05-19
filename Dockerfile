## Build stage
FROM node:24.15.0-alpine3.23 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . /app

RUN npm run build


## Release/production
FROM nginxinc/nginx-unprivileged:alpine3.23-perl

LABEL maintainer=courseproduction@bcit.ca
LABEL org.opencontainers.image.source="https://github.com/bcit-ltc/sugar-suite"
LABEL org.opencontainers.image.description="Sugar-Suite is a \"Framework Factory\" used to produce customized stylesheets designed for building online courses in HTML."

COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist/ ./
