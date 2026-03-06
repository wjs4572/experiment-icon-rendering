# Planned Updates

**Created**: 2026-03-06
**Status**: In planning

---

## Table of Contents

- [Planned Updates](#planned-updates)
  - [Table of Contents](#table-of-contents)
  - [1 — index.html Layout Redesign](#1--indexhtml-layout-redesign)
    - [Problem](#problem)
    - [Proposed Layout Changes](#proposed-layout-changes)
    - [Layout Constraints](#layout-constraints)
  - [2 — Left-Nav Navigation](#2--left-nav-navigation)
    - [Proposed Navigation Changes](#proposed-navigation-changes)
    - [Navigation Constraints](#navigation-constraints)
  - [3 — SimpsonConcepts Branding \& Schema Alignment](#3--simpsonconcepts-branding--schema-alignment)
    - [Known Scope (pending brand finalisation)](#known-scope-pending-brand-finalisation)
      - [Visual / UI](#visual--ui)
      - [Data Schema](#data-schema)
    - [Open Questions](#open-questions)
    - [Branding Constraints](#branding-constraints)

---

## 1 — index.html Layout Redesign

**Status**: Planned
**Motivation**: The seven format test-suite cards each render as a full-width (or wide) block on desktop, consuming most of the viewport before the user can see results or controls. On mobile the cards are appropriately sized and require no changes.

### Problem

- On wide screens the cards stack vertically and require significant scrolling to reach the batch controls and progress section.
- Card height is driven by per-format progress bars, labels, and status pills — content that is useful during a run but largely empty before one starts.

### Proposed Layout Changes

- Condense the seven format cards into a more compact grid on desktop (e.g. 2- or 3-column layout at `md:` breakpoint and above).
- Keep the existing single-column card layout for mobile (`sm:` and below) — no changes to mobile behaviour.
- Consider collapsing idle-state detail rows (progress bar, iteration counter) until a run starts, expanding them on activation.
- Batch control buttons (Start All, Clear Data) should remain above the fold on desktop without scrolling.

### Layout Constraints

- Must not break existing `BatchProgressMonitor` DOM binding — element IDs must be preserved.
- Follow existing TailwindCSS utility class conventions; no new CSS files or inline styles.
- Responsive units only; no fixed pixel widths.

---

## 2 — Left-Nav Navigation

**Status**: Planned
**Motivation**: The Summary and Results Library links are currently surfaced as cards on the `index.html` home screen, consuming additional vertical space and duplicating navigation that would be better placed in persistent chrome.

### Proposed Navigation Changes

- Add a left-side navigation panel to `index.html` (and potentially the format pages) containing:
  - **Summary** → `summary.html`
  - **Results Library** → `results-library.html`
  - Any future top-level views added later
- Remove or repurpose the corresponding cards in the main content area.
- The left nav should collapse to a hamburger/icon-only rail on mobile so it does not compete with the card layout on small screens.

### Navigation Constraints

- Navigation state (open/collapsed) can be stored in `localStorage` for persistence across page loads.
- Do not introduce a JavaScript router; each nav item is a standard `<a href>` link.
- All pages must remain independently openable (no required entry point).

---

## 3 — SimpsonConcepts Branding & Schema Alignment

**Status**: In progress — branding definition not yet finalised
**Motivation**: The project is being aligned with the SimpsonConcepts brand identity. Visual and data schema changes are needed once the brand guide is confirmed.

### Known Scope (pending brand finalisation)

#### Visual / UI

- Colour palette: primary, secondary, and accent tokens to be defined and applied via Tailwind config or CSS custom properties.
- Typography: heading and body font choices to be confirmed.
- Logo / wordmark placement: likely in the left nav (see Update 2) and page headers.

#### Data Schema

- `RunRecord.source` field values may be renamed or extended to reflect project identity (e.g. a branded export tag).
- Exported JSON filenames may adopt a `simpsonconcepts-` prefix or similar convention.
- `testMetadata` may gain a `project` field to identify the originating tool in multi-tool result sets.

### Open Questions

- Final colour and typography tokens — **blocked on brand guide delivery**.
- Whether schema changes need a `schemaVersion` bump (`2` → `3`) or can be backward-compatible additive fields.
- Whether branding applies only to `index.html` and format pages, or also to `summary.html` and `results-library.html`.

### Branding Constraints

- Any `RunRecord` schema change must update `run-record.js` (`createRunRecord`, `normalizeImportedRecord`) and increment `SCHEMA_VERSION` if breaking.
- Existing locally-stored records using schema v2 must either be migrated on first load or gracefully ignored (per the current backward-compat decision: additive fields only, no migration required).
- CSS changes must go through the TailwindCSS build (`npm run css:build`) — do not edit `tailwind.css` directly.
