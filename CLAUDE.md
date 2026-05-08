# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static HTML/CSS/JS prototype of the **BVBV Canvas** — a 3-sheet A4-landscape working canvas (Begrijp · Vertaal · Bouw + Veranker) for the "Datawijs met Thijs" framework. No build step, no package manager, no framework. Designed to print to real paper *and* be filled in on screen, with project content stored as sidecar JSON.

Lives at <https://github.com/thijsleufkens/bvbv-canvas>; published via GitHub Pages at <https://thijsleufkens.github.io/bvbv-canvas/>.

## Running it

- **Recommended**: `python3 -m http.server 8000` from the repo root, open `http://localhost:8000/BVBV%20Canvas.html?project=projects/template.json`. localhost is a secure context, so the File System Access API (silent save, directory picker) works.
- **Production**: GitHub Pages URL above. Same secure-context behaviour.
- **`file://`**: double-clicking the HTML works for *viewing* and *editing*, but `fetch()` is blocked (no `?project=` URL param) and the File System Access API is unavailable, so save falls back to a Downloads-folder download.

There are no tests, lints, or build scripts.

## Architecture: template + sidecar JSON + thin JS layer

Three files form the system. Edits to fillable regions usually need to touch all three in lockstep.

1. **`BVBV Canvas.html`** — the *empty template*. Every fillable region is marked with a `data-*` attribute hook. Default child of every box is `<div class="write-area"></div>` (printable ruled lines). The template is brand-agnostic and contains zero project content.

2. **`assets/canvas.js`** — single IIFE holding the render / collect / edit / save loop. Core functions:
   - `render(data)` — JSON → DOM. Iterates `data.meta`, `data.boxes`, `data.qai`, `data.actions`. For boxes, replaces innerHTML with `<div class="filled">…</div>` and applies `is-hidden`/`checks`/`tags`.
   - `collect()` — DOM → JSON. Used by export and autosave. `box.html` is split on `\n+` so the JSON stays git-friendly.
   - `setEdit(on)` — toggles `contentEditable`, ensures empty Q/A/I and actions lists have a bootstrap `<li>` for caret placement, and attaches per-box hide buttons.
   - `exportJSON({saveAs})` — three-tier save (see "Save flow" below).

3. **`projects/<slug>.json`** — one file per project. `projects/template.json` is the only JSON tracked in git; real project files match `projects/*.json` and are `.gitignore`d (client data). Schema:
   ```
   { meta, settings: { tall_sheets },
     boxes: { <key>: { html: [...], checks: [...], tags: {...}, hidden: bool } },
     qai: [ { q, a, i, warn } ],
     actions: { show, title, questions, materials, decisions } }
   ```

`assets/tokens.css` holds the design tokens (`--dmt-amber-*`, `--dmt-ink`, `--dmt-cream`, font stacks). Don't hardcode brand colors elsewhere.

## Data-attribute contract

Adding or renaming a fillable region means coordinating *all* of: the HTML hook, the JSON key, the renderer, and `collect()`.

- `data-meta="<key>"` — single text field; written via `textContent`.
- `data-box="<key>"` — rich content; written as inner HTML wrapped in `.filled`. The wrapping `.box` element gets `is-hidden` when `box.hidden` is true.
- `data-checks="<key>"` + child `[data-check="<name>"]` — checkbox row. `<key>` matches the box key.
- `data-tags="<key>"` + child `[data-tag="<name>"]` — tag row; states cycle none → `selected` → `crossed` → none.
- `data-qai="q|a|i"` — three row-linked lists (Vragen / Antwoorden / Inzichten) populated from `data.qai`. A `warn: true` row gets `class="warn"` on each of the three `<li>`s.
- `data-actions="questions|materials|decisions"` — lists in the optional `.actions-panel` (only shown when `data.actions.show === true`).

## Edit mode and list editing

- Edit mode is a body class (`body.edit-mode`) plus per-element `contentEditable`.
- For Q/A/I and actions, the **`<ol>`/`<ul>` itself** is contentEditable, not the individual `<li>`s. This is what makes Enter create new list items and Backspace remove empty ones natively. Q/A/I keydown handlers mirror Enter/Backspace across the three columns so rows stay aligned.
- On `setEdit(true)`, every empty `[data-qai]`/`[data-actions]` list gets a bootstrap `<li>` so the caret has somewhere to land. On `setEdit(false)`, trailing empty `<li>`s are pruned.

## Save flow (three tiers)

When the user clicks **Bewaar JSON** (or ⌘S), `exportJSON` tries paths in order:

1. **Persistent projects folder** — only if the user has clicked **Map…** at least once. `showDirectoryPicker` returns a `FileSystemDirectoryHandle` which is persisted in IndexedDB (`bvbv-canvas` / `handles` / `projectsDir`). On reload the handle is restored; permission must be re-granted on a user gesture (one click). Subsequent saves write `[filename].json` silently into that folder.
2. **Single-file picker** — `showSaveFilePicker` with `currentFileHandle` reused if set, suggested name from `currentProjectFileName`. After first save, subsequent saves overwrite the same file silently.
3. **Download fallback** — classic `<a download>` for Firefox, Safari, and `file://` origin.

`currentProjectFileName` is set when the project is loaded (URL param, picker, or upload), so Save defaults to **overwriting the source file**, not deriving a new name from `meta.project`. Save As (⌘⇧S) bypasses this and prompts.

The `id` parameter passed to `showDirectoryPicker`/`showSaveFilePicker` must be alphanumeric + underscore only — hyphens silently break the call.

A status pill in the toolbar (`#status-pill`) surfaces save errors and the "running on `file://`" diagnostic so failures are visible to the user, not just in the console.

## Layout: reflow, hide, and on-screen scaling

- **Sheet 3 reflows when boxes are hidden**: it uses `grid-auto-flow: row dense` instead of explicit `grid-column`/`grid-row` placements. Only `.box-borg` keeps `grid-column: span 2`. Sheet 1 is column-major in HTML order so it keeps explicit placements (auto-flow would scramble it); boxes there are rarely hidden.
- **Per-block hide**: in edit mode, every box gets a `Verberg blok` toggle. Hidden boxes show dimmed with diagonal stripes during editing, and `display: none` in read mode and print so the grid can reflow into the gap.
- **On-screen scaling**: `body { zoom: clamp(1, calc((100vw - 64px) / 1180px), 2.4) }` inside `@media screen` makes the canvas grow to fill larger viewports while keeping print at exact mm. The cap is 2.4× so 4K screens stay legible without poster-sized fonts. `zoom` is wide-supported (Chrome/Safari always, Firefox 126+).

## Tall sheets

When filled content overflows the default A4 landscape height, set `"settings": { "tall_sheets": true }` in the JSON. This adds `body.tall-sheets`, extending sheets 2 and 3 to 297mm.

## Conventions

- **Language**: UI copy is Dutch. Keep it Dutch unless the user asks otherwise.
- **No frameworks**: keep `canvas.js` vanilla. No bundler, no transpile step.
- **Print-first**: when changing CSS, verify both screen and `Cmd+P` preview before reporting done. Anything that should only show on screen needs `@media print { display: none }` or a `.screen-only` class.
- **Client data stays out of git**: `projects/*.json` is `.gitignore`d except for `template.json`. Standalone hardcoded `BVBV Canvas - *.html` files are also ignored. If you generate a per-client variant for testing, keep it local.

## First-draft via AI

To skip the tedious empty-canvas fill at project start, use the `/bvbv-draft` slash command (`.claude/commands/bvbv-draft.md`). It reads `projects/SCHEMA.md` (key-by-key purpose, valid checks/tags values, HTML conventions, and tone guidance), then writes a populated `projects/<slug>.json` from whatever project context the user provides. Assumptions are flagged inline as `<span class="vraag">…</span>` so the user can spot them in the canvas.
