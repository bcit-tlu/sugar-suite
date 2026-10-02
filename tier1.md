# Tier 1 — Adoption & Reach

Foundation: OTel SDK setup, build pipeline, and base telemetry events.

## Goals

- Prove sugar-suite loaded on a page (adoption signal)
- Know which component types are present per page (reach per feature)
- Establish the full telemetry pipeline: browser → public collector (`telemetry.ltc.bcit.ca`) → internal collector → Loki

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

- **`isProduction()`** — returns `true` when `window.location.hostname` ends with `.ltc.bcit.ca` or is `learn.bcit.ca`
- **`isLocal()`** — `localhost`/`127.0.0.1`; on any other host analytics does not initialize
- **`LoggerProvider`** with resource `service.name: "sugar-suite"`, `service.version` from `package.json`
- Production: `BatchLogRecordProcessor` → `OTLPLogExporter({ url: 'https://telemetry.ltc.bcit.ca/v1/logs' })`
- Dev: `SimpleLogRecordProcessor` → `ConsoleLogRecordExporter`
- **`getSessionId()`** — `localStorage`-backed UUID shared across tabs and reloads in the same browser
- `url` and `referrer` are sent without query string or fragment
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
- Define: `{ 'process.env.NODE_ENV': '"production"' }`
- Output: prepended to `dist/js/lat.js` (no extra script tag; every page that loads sugar-suite reports)

### 4. Collector endpoint (no nginx/Helm changes)

Sugar-suite assets are served from the CDN and run inside D2L pages on
`learn.bcit.ca`, so a same-origin `/v1/logs` nginx proxy is unreachable.
Export directly to the shared public collector
(flux-fleet `infrastructure/observability/opentelemetry-collector-public`),
whose CORS policy allows `https://*.ltc.bcit.ca` and `https://learn.bcit.ca`.

Add `sugar-suite` to the `transform/analytics-scope` `ContainsValue` list in
flux-fleet `opentelemetry-collector/controller/helm-values-configmap.yaml` so
events land in the 180-day `{analytics="true"}` Loki streams.

### 5. Verification

- `npm run build` succeeds and `dist/js/lat.js` contains the analytics IIFE
- `npm test` covers console export, exception filtering, OTLP export payload, and host gating (`tests/analytics*.test.js`)
- Load a test page locally — console shows `sugar_suite_loaded` and `component_initialized` events
- In production, verify events in Grafana: `{service_name="sugar-suite", analytics="true"}`

## Events Emitted

| Event | Attributes | When |
|-------|-----------|------|
| `sugar_suite_loaded` | `url`, `referrer`, `session.id`, `user_agent`, `screen_resolution` | Once on script init |
| `component_initialized` | `component_type`, `count` | Once per component type found on page |