<!-- SPDX-License-Identifier: MPL-2.0 -->

# Sugar Suite

Sugar Suite is a framework used to design and style online courses. It is built using Sass/Compass which provides an expressive and programmatic method for authoring the CSS. In order to produce the CSS, the Sass files (.scss) are "pre-processed".

## Quick Start

### Requirements

- Docker

### Developing

The default `docker-compose.yml` runs the `builder` stage with Vite in preview/watch mode against your local source (bind-mounted into `/app`). Use this for day-to-day work.

```bash
docker compose up --build

# open http://localhost:9000
```

### Production preview

`docker-compose.prod.yml` builds the final multi-stage image (nginx serving the compiled `/dist`) and runs it locally. Use this to validate the exact artifact that ships to the cluster — no source bind mount, no dev server, `NODE_ENV=production`.

```bash
docker compose -f docker-compose.prod.yml up --build

# open http://localhost:8080
```

### Updating dependencies

After changing `dependencies` in `package.json`, regenerate `package-lock.json` inside the builder image rather than with your local npm. `packageManager` is pinned to the npm bundled in the Dockerfile's `node:` image, and Renovate resolves with the same — a different local npm produces lockfile drift.

```bash
# image tag must match the builder stage in Dockerfile (node X.Y.Z-alpineA.B)
docker run --rm -v "${PWD}:/app" -w /app node:24.22.1-alpine3.24 npm install --package-lock-only

# on Windows (Git Bash / MSYS2 / UCRT64) — MSYS rewrites /app to a Windows path;
# suppress conversion and pass the mount source as a Windows path
MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker run --rm -v "$(pwd -W):/app" -w /app node:24.22.1-alpine3.24 npm install --package-lock-only
```

The production preview (`docker compose -f docker-compose.prod.yml up --build`) runs `npm ci` in the builder stage, so it doubles as the lockfile reproducibility check — no separate `npm ci` needed. Still run `npm test`: the jest analytics tests eval the bundled OTel code and catch API breaks a clean build can't see.

If you don't install devDependencies locally, run the tests in the builder image instead. The anonymous volume keeps the container's `node_modules` off your working tree:

```bash
docker run --rm -v "${PWD}:/app" -v /app/node_modules -w /app node:24.22.1-alpine3.24 sh -c "npm ci && npm test"

# on Windows (Git Bash / MSYS2 / UCRT64)
MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker run --rm -v "$(pwd -W):/app" -v /app/node_modules -w /app node:24.22.1-alpine3.24 sh -c "npm ci && npm test"
```

## Production (local)

To build and run the production image locally:

```bash
docker compose -f docker-compose.prod.yml up --build

# open http://localhost:8080
```

## Deploying

**Develop in GitHub Codespaces to ensure all commands/packages are available.**

Confirm that the helm chart and the app deploy correctly:

```bash
make check

make cluster

skaffold dev
```

### Notes

- Branch features/fixes are reviewed using Codespaces

## Support

Please submit any bugs, issues, and feature requests to the [bcit-ltc/sugar-suite](https://github.com/bcit-ltc/sugar-suite) source code repo.

## License

This Source Code Form is subject to the terms of the Mozilla Public License, v2.0. If a copy of the MPL was not distributed with this file, You can obtain one at <https://mozilla.org/MPL/2.0/>.

## About

Developed in 🇨🇦 Canada by the [Learning and Teaching Centre](https://www.bcit.ca/learning-teaching-centre/) at [BCIT](https://www.bcit.ca/).
