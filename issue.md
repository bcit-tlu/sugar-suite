# Add OpenTelemetry Browser Instrumentation

## Summary

Add client-side observability to sugar-suite using the OpenTelemetry browser SDK (logs signal only). Sugar-suite is a JS/CSS component library loaded inside D2L Learning Hub pages — the host page already has its own analytics. Our instrumentation focuses on **sugar-suite-specific adoption, component interactions, and error tracking**.

The browser emits structured log records directly to the shared public OpenTelemetry Collector at `https://telemetry.ltc.bcit.ca/v1/logs`, which forwards to the internal collector and on to Loki.

Unlike `conversion-guide`/`course-workload-estimator`, sugar-suite assets are served from the CDN and run on `learn.bcit.ca`, so a same-origin nginx `/v1/logs` proxy is not reachable from the pages that use it.

## Implementation Tiers

Work is split into three tiers (separate issues/PRs):

- **Tier 1 — Adoption & Reach** (`tier1.md`): Foundation — OTel SDK setup, build integration, and load/init events
- **Tier 2 — Engagement Depth** (`tier2.md`): Component interaction tracking across all feature modules
- **Tier 3 — Reliability** (`tier3.md`): Error instrumentation scoped to sugar-suite

## Architecture

```
source/js/analytics/init.js  → OTel SDK + LoggerProvider + ErrorsInstrumentation
                             → emits sugar_suite_loaded + component_initialized
                             → exposes window.otelAnalytics.trackEvent()

source/js/features/*.js      → call window.otelAnalytics.trackEvent() on interactions
                               (added in Tier 2)

telemetry.ltc.bcit.ca        → flux-fleet opentelemetry-collector-public (CORS: *.ltc.bcit.ca, learn.bcit.ca)
```

## Design Decisions

- **Logs only** — no traces or metrics; lightest-weight for a component library
- **Runtime hostname detection** — production = `*.ltc.bcit.ca` or `learn.bcit.ca`; no build-time `NODE_ENV` needed
- **IIFE prepended to `lat.js`** — isolates OTel SDK from jQuery code without an extra script tag; init is try/catch-guarded so analytics can't break the page
- **Host gating** — exports only on production hosts, logs to console on `localhost`, and stays off elsewhere
- **Privacy** — `url`/`referrer` drop query strings and fragments; `session.id` is a random `localStorage` UUID
- **No browser auto-instrumentations for navigation/web-vitals** — D2L host page already captures page-level metrics; sugar-suite can't meaningfully isolate its contribution
- **ErrorsInstrumentation kept** — catches unhandled errors; a filtering log processor keeps only exceptions with a `sugar-suite` stack frame
- **Public collector, no nginx proxy** — sugar-suite chart/nginx stay unchanged
- **Analytics retention** — `sugar-suite` is added to the flux-fleet `transform/analytics-scope` allowlist so events get the 180-day `{analytics="true"}` Loki streams