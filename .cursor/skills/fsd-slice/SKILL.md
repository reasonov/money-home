---
name: fsd-slice
description: Creates a Feature-Sliced Design slice for Vue (entities, features, widgets, pages). Use when adding a new domain entity, feature, or page under src/ FSD layers.
---

# FSD slice (Vue)

Layer conventions live in the FSD rule. This skill is only for **creating** a slice.

1. Layer: `entities` (domain), `features` (user action), `widgets` (composition), `pages` (route).
2. `src/<layer>/<slice-name>/` with only needed segments: `ui/`, `model/`, `api/`, `lib/`.
3. Public API: `index.ts` only. Import downward; no same-layer cross-slice imports.
4. Pinia (if any) in slice `model/`.
5. Wire page routes in `app`/`pages` without leaking internals.
