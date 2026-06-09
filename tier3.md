# Tier 3 — Reliability

Add error instrumentation scoped to sugar-suite. Depends on Tier 1 (LoggerProvider must be initialized).

## Goals

- Detect when sugar-suite JS breaks on D2L pages (e.g., after a D2L platform upgrade)
- Surface unhandled errors with enough context to diagnose (component type, page URL, stack trace)
- Avoid capturing noise from the D2L host page or other third-party scripts

## Approach

### Option A: `ErrorsInstrumentation` (recommended start)

Use `@opentelemetry/browser-instrumentation`'s `ErrorsInstrumentation`:

```js
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ErrorsInstrumentation } from '@opentelemetry/browser-instrumentation/experimental/errors';

registerInstrumentations({
  instrumentations: [new ErrorsInstrumentation()],
});
```

This captures unhandled errors and unhandled promise rejections globally. In Loki, filter by `service.name = "sugar-suite"` to isolate.

**Trade-off**: This may capture errors from D2L or other scripts on the page. Acceptable as a starting point — filter in Loki/Grafana by stack trace content (e.g., `otel-analytics.js` or `lat.js` in the stack).

### Option B: Scoped error boundary (future enhancement)

Wrap sugar-suite initialization in a try/catch and emit a custom `sugar_suite_error` event:

```js
function safeInit(fn, componentType) {
  try {
    fn();
  } catch (e) {
    logEvent('sugar_suite_error', {
      'component_type': componentType,
      'error.message': e.message,
      'error.stack': (e.stack || '').slice(0, 1000),
      'url': window.location.href,
    });
  }
}
```

This could be applied to each feature module's IIFE wrapper. More targeted but requires modifying each module.

## Tasks

### Phase 1 (this issue)

1. Add `@opentelemetry/browser-instrumentation` to dependencies (if not already from Tier 1)
2. Register `ErrorsInstrumentation` in `source/js/analytics/init.js`
3. Verify errors from sugar-suite code appear in console (dev) / Loki (prod)

### Phase 2 (future)

4. Add `safeInit` wrapper to feature modules for scoped error capture
5. Add `sugar_suite_error` custom event with component context
6. Consider filtering rules in the OTel Collector to drop non-sugar-suite errors (if noise becomes a problem)

## Events Emitted

| Event | Attributes | When |
|-------|-----------|------|
| (auto) `exception` | `exception.type`, `exception.message`, `exception.stacktrace` | Unhandled error or promise rejection (via `ErrorsInstrumentation`) |
| `sugar_suite_error` | `component_type`, `exception.message`, `exception.stacktrace`, `url` | Caught error during component init (Phase 2) |

## Dependencies

```json
"@opentelemetry/browser-instrumentation": "^0.5.2"
```

## Verification

- Intentionally throw an error in a feature module
- Confirm error event appears in console (dev mode) with stack trace
- In production, verify the event reaches Loki via Grafana
- Confirm no impact on component functionality when errors occur in other scripts