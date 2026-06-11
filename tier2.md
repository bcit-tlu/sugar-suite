# Tier 2 — Engagement Depth

Add interaction tracking to each sugar-suite feature module. Depends on Tier 1 (the `window.otelAnalytics.trackEvent()` API must be available).

## Goals

- Know which interactive components users actually engage with
- Understand engagement depth (e.g., how many flashcards flipped, how many quiz answers submitted)
- Identify unused or underused components

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

### Flashcards (`flashcards.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `flashcard_flip` | `card_index`, `total_cards` | User flips a card |
| `flashcard_shuffle` | `total_cards` | User clicks shuffle |
| `flashcard_navigate` | `direction` (next/prev), `card_index` | User navigates between cards |

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

### Slider (`slider.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `slider_navigate` | `direction` (next/prev), `slide_index`, `total_slides` | User navigates slides |
| `slider_fullscreen` | `slide_index` | User enters fullscreen |

### Reveal (`reveal.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `reveal_clicked` | `reveal_index`, `has_active_input` | User clicks reveal button |

### Checklist (`checklist.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `checklist_checked` | `item_index`, `checked` (true/false), `total_items`, `completed_items` | User checks/unchecks an item |

### Swapper (`swapper.js`)

| Event | Attributes | When |
|-------|-----------|------|
| `swapper_toggle` | `swapper_index` | User toggles a swapper element |

## Tasks

1. Add guarded `trackEvent` calls at interaction points in each feature module listed above
2. Ensure events include enough context to be useful in Loki queries (component type, index, counts)
3. Verify locally with `ConsoleLogRecordExporter` that events fire correctly
4. Keep changes minimal — one-line additions at existing event handler locations

## Verification

- Load a test page with each component type
- Interact with each component
- Confirm events appear in browser console (dev mode) with correct attributes
- No regressions in component functionality (existing tests pass)