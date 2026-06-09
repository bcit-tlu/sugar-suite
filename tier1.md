# Tier 1 — Adoption & Reach

Foundation: OTel SDK setup, build pipeline, nginx proxy, Helm chart changes, and base telemetry events.

## Goals

- Prove sugar-suite loaded on a page (adoption signal)
- Know which component types are present per page (reach per feature)
- Establish the full telemetry pipeline: browser → nginx → collector → Loki

## Tasks

### 1. Add dependencies

Add to `package.json`:

```json
"dependencies": {
  "@opentelemetry/api-logs": "^0.218.0",
  "@opentelemetry/exporter-logs-otlp-http": "^0.218.0",
  "@opentelemetry/instrumentation": "^0.218.0",
  "@opentelemetry/resources": "^2.7.1",
  "@opentelemetry/sdk-logs": "^0.218.0",
  "@opentelemetry/semantic-conventions": "^1.41.1"
}
```

Add `esbuild` to `devDependencies`.

### 2. Create `source/js/analytics/init.js`

```js
// OTel SDK setup
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor, SimpleLogRecordProcessor, ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
```

Behaviour:

- **`isProduction()`** — returns `true` when `window.location.hostname` ends with `.ltc.bcit.ca`
- **`LoggerProvider`** with resource `service.name: "sugar-suite"`, `service.version` from `package.json`
- Production: `BatchLogRecordProcessor` → `OTLPLogExporter({ url: '/v1/logs' })`
- Dev: `SimpleLogRecordProcessor` → `ConsoleLogRecordExporter`
- **`getSessionId()`** — `sessionStorage`-backed UUID per browser tab session
- On init, emit:
  - **`sugar_suite_loaded`** — attributes: `url`, `referrer`, `session.id`, `user_agent`, `screen_resolution`
  - **`component_initialized`** — one event per component type found on the page, attributes: `component_type`, `count`
- Component types to scan for: `.accordion`, `.flashcards` (table.flashcards), `.tabs`, `.knowledge-check`, `.self-test`, `.slider`, `.line-matching`, `.reveal`, `.active-reveal`, `.checklist`, `.swapper`
- Expose global API:
  ```js
  window.otelAnalytics = {
    trackEvent: function(eventName, attributes) { ... },
    logEvent: function(eventName, attributes) { ... }
  };
  ```

### 3. Build integration — Vite plugin

Add to `vite.config.js` a plugin step using `esbuild.build()`:

- Entry: `source/js/analytics/init.js`
- Format: `iife`
- Bundle: `true`
- Minify: `true`
- Target: `es2020`
- Output: `dist/js/otel-analytics.js`
- Define: `{ 'process.env.NODE_ENV': '"production"' }`

Keep separate from `lat.js` concatenation.

### 4. Nginx proxy — `conf.d/default.conf`

Add before health endpoints:

```nginx
# OTel log ingestion proxy
location = /v1/logs {
    resolver 127.0.0.11 valid=30s ipv6=off;
    set $otel_backend "opentelemetry-collector.observability.svc:4318";
    proxy_pass http://$otel_backend/v1/logs;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Content-Type $content_type;
    client_max_body_size 64k;
    access_log off;
}
```

### 5. Helm chart changes

| File | Action |
|------|--------|
| `charts/templates/configmap-nginx.yaml` | **New** — full nginx conf with templated collector endpoint via `{{ .Values.observability.openTelemetry.collectorEndpoint }}` |
| `charts/templates/deployment.yaml` | Add `volumeMounts` for nginx-conf ConfigMap at `/etc/nginx/conf.d` + corresponding `volumes` entry |
| `charts/values.yaml` | Add `observability.openTelemetry.collectorEndpoint: "opentelemetry-collector.observability.svc:4318"` |

### 6. Verification

- `npm run build` succeeds and `dist/js/otel-analytics.js` is emitted
- Load a test page locally — console shows `sugar_suite_loaded` and `component_initialized` events
- `helm lint charts/` passes
- `helm template test charts/ | kubeconform` validates

## Events Emitted

| Event | Attributes | When |
|-------|-----------|------|
| `sugar_suite_loaded` | `url`, `referrer`, `session.id`, `user_agent`, `screen_resolution` | Once on script init |
| `component_initialized` | `component_type`, `count` | Once per component type found on page |