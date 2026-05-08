# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static HTML/CSS/JS prototype of the **BVBV Canvas** — a 3-sheet A4-landscape working canvas (Begrijp · Vertaal · Bouw + Veranker) for the "Datawijs met Thijs" brand. No build step, no package manager, no framework. The output is meant to print to real paper *and* be filled in on screen.

## Running it

- **Open directly**: double-click `BVBV Canvas.html` (works under `file://`).
- **Load a project via URL**: requires HTTP serving because `fetch()` is blocked under `file://`. From the repo root: `python3 -m http.server 8000`, then open `http://localhost:8000/BVBV%20Canvas.html?project=projects/evoke.json`.
- **Load a project offline**: open the HTML directly, click **Open JSON** in the toolbar to pick a file.
- **Print**: toolbar **Print** button (or `Cmd+P`) — `@page { size: A4 landscape; margin: 0 }` is set, and `-webkit-print-color-adjust: exact` preserves the amber/cream palette.

There are no tests, lints, or build scripts.

## Architecture: template + sidecar JSON + thin JS layer

Three files together form the system. Understanding their separation matters because edits often need to touch all three in lockstep.

1. **`BVBV Canvas.html`** — the *empty template*. Every fillable region is marked with a `data-*` attribute hook. Default child is `<div class="write-area"></div>` (printable ruled lines). The template is brand-agnostic: it has no project content baked in.

2. **`assets/canvas.js`** — the renderer/editor/exporter (single IIFE, ~300 lines). Three core functions:
   - `render(data)` — one-way write from JSON → DOM. Iterates `data.meta`, `data.boxes`, `data.qai`, `data.actions`. For boxes, replaces innerHTML with `<div class="filled">…</div>`.
   - `collect()` — reverse direction, DOM → JSON. Used by export and autosave.
   - `setEdit(on)` — toggles `contentEditable` on `[data-meta], [data-box] .filled, [data-actions] li, [data-qai] li`. Click handlers on `[data-check]` and `[data-tag]` only fire in edit mode.

3. **`projects/<slug>.json`** — one file per project. Schema:
   ```
   { meta, settings: { tall_sheets }, boxes: { <key>: { html: [...], checks: [...], tags: {...} } },
     qai: [ { q, a, i, warn } ], actions: { show, title, questions, materials, decisions } }
   ```
   `html` is stored as an **array of strings** (one paragraph block per element) for git-friendly diffs — `collect()` splits on `\n+` when writing back.

`assets/tokens.css` holds the design tokens (`--dmt-amber-*`, `--dmt-ink`, `--dmt-cream`, font stacks). Don't hardcode brand colors elsewhere.

## Data-attribute contract

Adding or renaming a fillable region means coordinating *all* of: the HTML hook, the JSON key, and (sometimes) the renderer.

- `data-meta="<key>"` — single text field; written via `textContent`.
- `data-box="<key>"` — rich content; written as inner HTML wrapped in `.filled`.
- `data-checks="<key>"` + child `[data-check="<name>"]` — checkbox row. `<key>` matches the box key.
- `data-tags="<key>"` + child `[data-tag="<name>"]` — tag row; states cycle none → `selected` → `crossed` → none.
- `data-qai="q|a|i"` — three linked lists (Vragen / Antwoorden / Inzichten) populated row-by-row from `data.qai`. A `warn: true` row gets `class="warn"` on each of the three `<li>`s.
- `data-actions="questions|materials|decisions"` — lists in the optional `.actions-panel` (only shown when `data.actions.show === true`).

## Edit mode and persistence

- Edit mode is a body class (`body.edit-mode`) plus per-element `contentEditable="true"`. CSS sibling selectors (e.g. `.qai-list:not(:empty) ~ .qai-write { display: none }`) hide the printable write-areas once content arrives.
- **Autosave** writes to `localStorage` under key `bvbv-canvas-draft` on every input event in edit mode.
- **URL param wins**: if `?project=` is present, JSON is fetched and renders; the localStorage draft is *only* restored when no URL param is given.
- **Wis** clears localStorage and reloads to a clean canvas.
- **Bewaar JSON** downloads `<project-slug>.json` (slug derived from `data.meta.project`).

## Tall sheets

When filled content overflows the default A4 landscape height, set `"settings": { "tall_sheets": true }` in the JSON. This adds `body.tall-sheets`, which extends sheets 2 and 3 to 297mm. Use this for content-heavy projects (e.g. `projects/evoke.json` has 13 Q/A/I rows).

## Conventions

- **Language**: UI copy is Dutch. Keep it Dutch unless the user asks otherwise.
- **No frameworks**: keep `canvas.js` vanilla. No bundler, no transpile step.
- **Print-first**: when changing CSS, verify both screen and `Cmd+P` preview before reporting done. The toolbar has `@media print { .toolbar { display: none } }` — anything new that's screen-only needs the same treatment or a `.screen-only` class.
- **`BVBV Canvas - Evoke.html`** is a legacy hardcoded copy from before the refactor; the canonical Evoke render is `BVBV Canvas.html?project=projects/evoke.json`. Don't extend the standalone file — add new projects as JSON under `projects/`.
