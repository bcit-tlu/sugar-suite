# AGENTS.md

## Setup Commands

- Install dependencies: `npm install`
- Build for production: `npm run build`
- Preview (build + serve): `npm run preview`
- Quick build + preview: `npm run quick`
- Run tests: `npm test`
- Helm lint: `helm lint charts/`
- Helm validate: `helm template test charts/ | kubeconform -strict -summary -schema-location default -ignore-missing-schemas`

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

## CI/CD

- CI uses shared `bcit-tlu/.github` OCI build reusable workflow
- `helm-lint` validates Helm charts on every push and PR
- `release-please` manages versioning via conventional commits (`release-type: "simple"`)
- Version is tracked in `.release-please-manifest.json` and `Chart.yaml` (`# x-release-please-version` annotations)
- Images are published to `ghcr.io/bcit-tlu/sugar-suite/sugar-suite`
- Charts are published to `oci://ghcr.io/bcit-tlu/sugar-suite/charts`
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` is set in all workflows

## Deployment

- Deployed to Kubernetes via Flux CD (see `bcit-tlu/flux-fleet`)
- Ingress: `sugar-suite.<CLUSTER_ENV>.ltc.bcit.ca`
- Runtime: nginx-unprivileged serving static assets on port 8080
- Health endpoints: `/healthz`, `/healthz/startup`, `/healthz/ready`

## Development Workflow

- Create feature branches from `main`
- Use pull requests for code review
- PR titles must follow conventional commit format (enforced by `pr-title-lint.yaml`)
- Squash commits before merging
