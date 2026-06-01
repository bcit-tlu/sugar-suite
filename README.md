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
