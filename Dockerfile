# Build stage
FROM node:24.16.0-alpine3.23 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . /app

RUN npm run build


# Runtime stage
FROM nginxinc/nginx-unprivileged:alpine3.23-perl

# Pull latest Alpine security patches so scans aren't blocked by the gap between
# upstream Alpine package fixes and the next nginx-unprivileged image rebuild.
# Switches to root only for apk, then restores the upstream numeric UID 101 so
# the running container stays unprivileged (and passes runAsNonRoot in k8s).
USER root
RUN apk --no-cache upgrade
USER 101

LABEL maintainer=courseproduction@bcit.ca
LABEL org.opencontainers.image.source="https://github.com/bcit-ltc/sugar-suite"
LABEL org.opencontainers.image.description="Sugar-Suite is a \"Framework Factory\" used to produce customized stylesheets designed for building online courses in HTML."

COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist/ ./
