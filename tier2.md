# Tier 2 — Engagement Depth

Add interaction tracking to select sugar-suite feature modules. Depends on Tier 1 (the `window.otelAnalytics.trackEvent()` API must be available).

## Goals

- Know which interactive components users actually engage with
- Understand engagement depth for assessment components (knowledge checks, line matching)
- Identify unused or underused content sections (accordions, tabs, reveals)

## Design Decisions

Only low-to-medium frequency events are tracked. High-frequency per-interaction events (every card flip, every slider arrow click, every checkbox toggle) are excluded to avoid noise and unnecessary data volume. Components like flashcards, sliders, checklists, and swappers are already captured by Tier 1's `component_initialized` event which confirms they exist on the page.

## Approach

Each feature module calls `window.otelAnalytics.trackEvent()` at key interaction points. The call is guarded:

```js
if (window.otelAnalytics && window.otelAnalytics.trackEvent) {
    window.otelAnalytics.trackEvent('event_name', { ... });
}
```

This ensures feature modules still work if the analytics script isn't loaded.

## Events by Component

### Accordion (`accordion.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `accordion_toggle` | `action` (open/close), `section_title`, `accordion_index` | User opens or closes a section |

### Tabs (`tabs.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `tab_switch` | `tab_label`, `tab_index`, `total_tabs` | User switches to a tab |

### Knowledge Check (`knowledge-check.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `knowledge_check_submit` | `question_index`, `question_type` | User clicks the Check button |
| `knowledge_check_result` | `question_index`, `is_correct`, `attempts` | After all answers are evaluated |

> **Note:** The knowledge-check form submits all questions at once. `question_index` refers to which knowledge-check component on the page (0-indexed), not individual questions within it. `question_type` is `'mixed'` since a single form can contain multiple question types. `attempts` is `'1'` (no stateful attempt counter exists).

### Line Matching (`line-matching.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `line_matching_attempt` | `question_index` | User makes a matching attempt |
| `line_matching_result` | `question_index`, `is_correct` | After matching is evaluated |

### Reveal (`reveal.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `reveal_clicked` | `reveal_index`, `has_active_input` | User clicks reveal button |

## Excluded (too noisy)

The following were considered but excluded due to high per-interaction volume:

| Component | Reason |
|-----------|--------|
| Flashcards (`flashcard_flip`, `flashcard_navigate`, `flashcard_shuffle`) | Every card flip/nav generates an event; presence already tracked by Tier 1 |
| Slider (`slider_navigate`, `slider_fullscreen`) | Every arrow click generates an event |
| Checklist (`checklist_checked`) | Every checkbox fires; a 15-item list = 15 events per user |
| Swapper (`swapper_toggle`) | Every page turn fires |

## Tasks

1. Add guarded `trackEvent` calls at interaction points in each tracked feature module
2. Ensure events include enough context to be useful in Loki queries (component type, index, counts)
3. Remove tracking from excluded components (flashcards, slider, checklist, swapper)
4. Verify locally with `ConsoleLogRecordExporter` that events fire correctly
5. Keep changes minimal — one-line additions at existing event handler locations

## Verification

- Load a test page with each tracked component type
- Interact with each component
- Confirm events appear in browser console (dev mode) with correct attributes
- Confirm excluded components have no trackEvent calls
- No regressions in component functionality (existing tests pass)