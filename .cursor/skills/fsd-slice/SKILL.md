---
name: fsd-slice
description: Creates a Feature-Sliced Design slice for Vue (entities, features, widgets, pages). Use when adding a new domain entity, feature, or page under src/ FSD layers.
---

# FSD slice (Vue)

## Steps

1. Choose layer: `entities` (domain), `features` (user action), `widgets` (composition), `pages` (route).
2. Create `src/<layer>/<slice-name>/` with only needed segments: `ui/`, `model/`, `api/`, `lib/`.
3. Export public API from `src/<layer>/<slice-name>/index.ts` only.
4. Import downward only; no same-layer cross-slice imports.
5. Pinia store (if any) in slice `model/`, not legacy `src/stores/`.
6. Wire page routes in `app`/`pages` without leaking internals.

## Checklist

- [ ] `index.ts` re-exports
- [ ] No deep imports from other slices
- [ ] Types for public props/API
- [ ] Russian UI strings if user-facing
