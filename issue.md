# Add OpenTelemetry Browser Instrumentation

## Summary

Add client-side observability to sugar-suite using the OpenTelemetry browser SDK (logs signal only). Sugar-suite is a JS/CSS component library loaded inside D2L Learning Hub pages — the host page already has its own analytics. Our instrumentation focuses on **sugar-suite-specific adoption, component interactions, and error tracking**.

The browser emits structured log records to a relative `/v1/logs` endpoint, which nginx reverse-proxies to the shared OpenTelemetry Collector in the cluster. The collector ships logs to Loki.

This follows the same pattern used by `conversion-guide` and `course-workload-estimator`.

## Implementation Tiers

Work is split into three tiers (separate issues/PRs):

- **Tier 1 — Adoption & Reach** (`tier1.md`): Foundation — OTel SDK setup, build integration, nginx proxy, Helm chart, and load/init events
- **Tier 2 — Engagement Depth** (`tier2.md`): Component interaction tracking across all feature modules
- **Tier 3 — Reliability** (`tier3.md`): Error instrumentation scoped to sugar-suite

## Architecture

```
source/js/analytics/init.js  → OTel SDK + LoggerProvider + ErrorsInstrumentation
                             → emits sugar_suite_loaded + component_initialized
                             → exposes window.otelAnalytics.trackEvent()

source/js/features/*.js      → call window.otelAnalytics.trackEvent() on interactions
                               (added in Tier 2)

conf.d/default.conf          → /v1/logs proxy to OTel Collector
charts/templates/            → ConfigMap nginx override with templated endpoint
```

## Design Decisions

- **Logs only** — no traces or metrics; lightest-weight for a component library
- **Runtime hostname detection** — production = `*.ltc.bcit.ca`; no build-time `NODE_ENV` needed
- **Separate IIFE bundle** — isolates OTel SDK from jQuery code; opt-in via `<script src="/js/otel-analytics.js"></script>`
- **No browser auto-instrumentations for navigation/web-vitals** — D2L host page already captures page-level metrics; sugar-suite can't meaningfully isolate its contribution
- **ErrorsInstrumentation kept** — catches unhandled errors from sugar-suite code; valuable for detecting breakage across D2L version upgrades
- **No collector changes** — shared collector already accepts OTLP-HTTP on port 4318 and pipes logs to Loki
- **ConfigMap nginx override** — same pattern as conversion-guide; Helm values control the proxy target