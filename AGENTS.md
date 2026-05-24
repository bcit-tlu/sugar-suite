# AGENTS.md

Operational patterns for `sugar-suite` (for migration playbooks and AI/code agents).

## 1) Command execution pattern

- Use `nix-shell -p {binary}` for ad-hoc tools.
- Preferred form for one-off commands:
  - `nix-shell -p {binary} --run "<command>"`
- Examples:
  - `nix-shell -p kubernetes-helm --run "helm lint charts/"`
  - `nix-shell -p nodejs --run "npm test"`

## 2) CI/CD workflow map

- `.github/workflows/ci.yaml`
  - Runs on push/PR to `main`.
  - Parallel chart lint/validation (`helm lint` + `kubeconform`).
  - Reusable image build workflow (`bcit-tlu/.github/.github/workflows/oci-build.yaml@main`).
  - Publishes RC Helm chart from `main` pushes when image RC version exists.
- `.github/workflows/pr-title-lint.yaml`
  - Enforces Conventional Commit PR titles (release-please signal quality gate).
- `.github/workflows/release-please.yaml`
  - Runs release-please on `main`.
  - Guards against stale `release-as` pins.
  - Explicitly dispatches downstream publish workflows because `GITHUB_TOKEN`-created releases do not trigger release/tag workflows.
- `.github/workflows/helm-publish.yaml`
  - Publishes signed Helm chart for release tags (`vX.Y.Z`) or manual dispatch.
- `.github/workflows/release-retag.yaml`
  - Retags `sha-<commit>` image to semver and optional `latest` (highest stable only), then signs image.

## 3) Release/versioning pattern

- release-please config: `release-please-config.json`
- release state: `.release-please-manifest.json`
- Versioned files kept in sync by release-please:
  - `package.json`
  - `package-lock.json` (both root and `packages['']` version)
  - `charts/Chart.yaml` (`version` + `appVersion`)
- Tags are `vX.Y.Z`.

## 4) OCI + signing pattern

- Registry: `ghcr.io`
- Image path pattern: `ghcr.io/<owner>/<repo>/sugar-suite`
- Chart path pattern: `oci://ghcr.io/<owner>/<repo>/charts`
- Cosign keyless signing is used for both images and Helm charts.

## 5) Helm chart pattern

- Chart root: `charts/`
- Templates in `charts/templates/`.
- Chart/image lockstep:
  - RC chart publish in CI uses image RC version output.
  - Release chart publish uses release tag version.
- Optional zone anti-affinity via `values.yaml` (`zoneAntiAffinity.enabled`).

## 6) Container/runtime pattern

- Multi-stage Dockerfile:
  - Builder: `node:24-alpine`
  - Runtime: unprivileged nginx (`nginxinc/nginx-unprivileged`)
- Runtime config in `conf.d/default.conf`:
  - Health endpoints: `/healthz`, `/healthz/startup`, `/healthz/ready`
  - Static asset caching + structured logs.
- Compose files:
  - `docker-compose.yml` for local dev (`vite preview` on `9000`)
  - `docker-compose.prod.yml` for local prod-like nginx run (`8080`)

## 7) Devcontainer/k3d/skaffold pattern

- Devcontainer config: `.devcontainer/devcontainer.json`
- Shared env source of truth: `.devcontainer/scripts/env.sh`
- Local cluster bootstrapping via `make cluster` and `.devcontainer/scripts/cluster.sh`
- Local chart pull/unpack: `.devcontainer/scripts/app-chart.sh` -> `app-chart/`
- Skaffold config: `.devcontainer/skaffold/skaffold.yaml`

## 8) Repository hygiene pattern

- Ignore files standardized:
  - `.gitignore`
  - `.dockerignore`
- Helm package artifact glob: `charts/**/*.tgz`
- Local pulled chart ignored via `app-chart/`.

## 9) Agent change guardrails

When changing operational behavior, update all coupled files in the same PR:

- Workflow logic ↔ release docs/config (`.github/workflows/*`, `release-please-config.json`)
- Chart behavior ↔ chart defaults/templates (`charts/values.yaml`, `charts/templates/*`)
- Container behavior ↔ Docker/nginx/compose (`Dockerfile`, `conf.d/default.conf`, `docker-compose*.yml`)
- Local tooling behavior ↔ devcontainer/make scripts (`Makefile`, `.devcontainer/scripts/*`, `.devcontainer/skaffold/*`)

Keep comments short and intent-focused; avoid long narrative comments unless they capture non-obvious constraints.
