# AGENTS.md

## Setup Commands

- Install dependencies: `npm install`
- Build for production: `npm run build`
- Preview (build + serve): `npm run preview`
- Quick build + preview: `npm run quick`
- Run tests: `npm test`
- Helm lint: `helm lint charts/`
- Helm validate: `helm template test charts/ | kubeconform -strict -summary -schema-location default -ignore-missing-schemas`
- Verify CDN rewrite initContainer: `bash tests/helm-cdn-rewrite.sh`
- Rewrite dist/ for CDN upload: `CDN_BASE_URL=... CDN_NAMESPACE=... REPO_NAME=... SHORT_SHA=... ASSET_EXTENSIONS=... bash .github/scripts/cdn-rewrite-dist.sh`
- Use `nix-shell -p {binary}` for ad-hoc tools not in PATH.
  - Preferred form: `nix-shell -p {binary} --run "<command>"`
  - Examples:
    - `nix-shell -p kubernetes-helm --run "helm lint charts/"`
    - `nix-shell -p nodejs --run "npm test"`

## Code Style

- CSS/JS authoring framework — SCSS variables, mixins, and partials
- jQuery for interactive features (accordion, tabs, flashcards, etc.)
- Follow conventional commit format for PR titles
- License: MPL-2.0

## Project Structure

- `/source/scss` — SCSS source (variables, mixins, partials)
- `/source/js` — JavaScript feature modules (jQuery-based)
- `/source/experimental` — Experimental SCSS/JS features
- `/public` — Static assets served by nginx
- `/charts` — Helm chart for Kubernetes deployment (flat layout)
- `/conf.d` — Nginx server configuration (health endpoints, caching, logging)
- `/.github/workflows/` — CI/CD pipelines
- `/tests` — Jest test files
- `.devcontainer/` — Devcontainer config, k3d cluster scripts, Skaffold

## CI/CD

- CI uses shared `bcit-tlu/.github` reusable workflows: `oci-build.yaml` (image build), `helm-lint.yaml` (chart lint + kubeconform), and `helm-publish.yaml` (package + push + cosign-sign)
- `helm-lint` validates Helm charts on every push and PR via the shared `helm-lint.yaml` (passes `extra_command: bash tests/helm-cdn-rewrite.sh`)
- `release-please` manages versioning via conventional commits (`release-type: "simple"`)
- Version is tracked in `.release-please-manifest.json` and `Chart.yaml` (`# x-release-please-version` annotations)
- Images are published to `ghcr.io/bcit-tlu/sugar-suite/sugar-suite`
- Charts are published to `oci://ghcr.io/bcit-tlu/sugar-suite/charts`

### Workflow map

- `ci.yaml` — push/PR to `main`: shared `helm-lint.yaml`, reusable OCI build, RC Helm chart publish from `main` via shared `helm-publish.yaml`
- `pr-title-lint.yaml` — thin caller of shared `bcit-tlu/.github` `pr-title-lint.yaml`; enforces Conventional Commit PR titles
- `release-please.yaml` — thin caller of shared `bcit-tlu/.github` `release-please.yaml`; runs release-please on `main`, guards stale `release-as` pins, dispatches `helm-publish.yaml`/`release-retag.yaml`
- `helm-publish.yaml` — thin caller of shared `bcit-tlu/.github` `helm-publish.yaml`; publishes signed Helm chart for release tags (`vX.Y.Z`) or manual dispatch
- `release-retag.yaml` — thin caller of shared `bcit-tlu/.github` `release-retag.yaml`; retags `sha-<commit>` image to semver + optional `latest` (highest stable only), then signs

Reusable workflows live in `bcit-tlu/.github/.github/workflows/`: `oci-build.yaml`, `cdn-upload.yaml`, `helm-lint.yaml`, `helm-publish.yaml`, `pr-title-lint.yaml`, `release-please.yaml`, `release-retag.yaml`.

### Release/versioning

- Config: `release-please-config.json`; state: `.release-please-manifest.json`
- Versioned files kept in sync by release-please:
  - `package.json`, `package-lock.json` (root + `packages['']`)
  - `charts/Chart.yaml` (`version` + `appVersion`)
- Tags: `vX.Y.Z`

### OCI + signing

- Registry: `ghcr.io`
- Image: `ghcr.io/<owner>/<repo>/sugar-suite`
- Charts: `oci://ghcr.io/<owner>/<repo>/charts`
- Cosign keyless signing for both images and Helm charts

### Helm chart

- Chart root: `charts/`; templates in `charts/templates/`
- Chart/image lockstep: RC chart publish in CI uses image RC version output; release chart publish uses release tag version
- Optional zone anti-affinity via `values.yaml` (`zoneAntiAffinity.enabled`)

## Deployment

- Deployed to Kubernetes via Flux CD (see `bcit-tlu/flux-fleet`)
- Ingress: `sugar-suite.<CLUSTER_ENV>.ltc.bcit.ca`
- Runtime: nginx-unprivileged serving static assets on port 8080
- Health endpoints: `/healthz`, `/healthz/startup`, `/healthz/ready`

### Container/runtime

- Multi-stage Dockerfile: builder (`node:24-alpine`) → runtime (`nginxinc/nginx-unprivileged`)
- Runtime config: `conf.d/default.conf` (static asset caching + structured logs)
- Compose files:
  - `docker-compose.yml` — local dev (`vite preview` on port `9000`)
  - `docker-compose.prod.yml` — local prod-like nginx run (port `8080`)

### Devcontainer/k3d/skaffold

- Devcontainer config: `.devcontainer/devcontainer.json`
- Shared env source of truth: `.devcontainer/scripts/env.sh`
- Local cluster bootstrapping: `make cluster` / `.devcontainer/scripts/cluster.sh`
- Local chart pull/unpack: `.devcontainer/scripts/app-chart.sh` → `app-chart/`
- Skaffold config: `.devcontainer/skaffold/skaffold.yaml`

## Development Workflow

- Create feature branches from `main`
- Use pull requests for code review
- PR titles must follow conventional commit format (enforced by `pr-title-lint.yaml`)
- Squash commits before merging

## Agent Change Guardrails

When changing operational behavior, update all coupled files in the same PR:

- Workflow logic ↔ release docs/config (`.github/workflows/*`, `release-please-config.json`)
- Chart behavior ↔ chart defaults/templates (`charts/values.yaml`, `charts/templates/*`)
- Container behavior ↔ Docker/nginx/compose (`Dockerfile`, `conf.d/default.conf`, `docker-compose*.yml`)
- Local tooling behavior ↔ devcontainer/make scripts (`Makefile`, `.devcontainer/scripts/*`, `.devcontainer/skaffold/*`)

Keep comments short and intent-focused; avoid long narrative comments unless they capture non-obvious constraints.
