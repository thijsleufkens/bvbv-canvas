# BVBV Canvas

Een 3-vels A4-werkcanvas voor het **Datawijs met Thijs**-framework: **Begrijp · Vertaal · Bouw + Veranker**. Print het uit en pak een pen, of vul het in op het scherm — projectinhoud wordt los van de template als JSON opgeslagen, dus klantdata mengt niet met code.

🌐 **Live demo:** [BVBV Canvas met leeg template](https://thijsleufkens.github.io/bvbv-canvas/BVBV%20Canvas.html?project=projects/template.json)

## Waar het voor dient

Een gespreksleider voor de eerste sessie(s) van een dataproject:

1. **Begrijp** — wie is de gebruiker, in welk werkritme landt dit, welke vragen leven er?
2. **Vertaal** — welke vragen moet het product beantwoorden, welk meetbaar antwoord, welke input?
3. **Bouw + Veranker** — wat is haalbaar (mensen · data · regels · succes), in welke vorm, hoe land je het?

Bedoeld om mét de eindgebruiker ingevuld te worden, niet door het datateam alleen.

## Snel starten

- **In de browser:** open de live demo, klik **Open JSON** om een eigen projectbestand in te laden.
- **Printen:** ⌘P / Ctrl+P. A4-landscape, marges op nul, kleuren intact.
- **Lokaal draaien (eigen projecten opslaan):**
  ```bash
  python3 -m http.server 8000
  ```
  Open `http://localhost:8000/BVBV%20Canvas.html?project=projects/<jouw-slug>.json`. Localhost is een secure context, dus **Bewaar JSON** kan stil naar een gekozen map.

## Bestandsindeling

| Bestand                       | Wat het doet                                              |
| ----------------------------- | --------------------------------------------------------- |
| `BVBV Canvas.html`            | Lege template — printbaar én op scherm te bewerken.       |
| `assets/canvas.js`            | Render/edit/save-loop (vanilla JS, geen build-step).      |
| `assets/tokens.css`           | Designtokens (kleuren, fonts).                            |
| `projects/template.json`      | Lege JSON-vorm — startpunt voor nieuwe projecten.         |
| `projects/<jouw-slug>.json`   | Projectinhoud — los van de template, lokaal opgeslagen.   |

Klantdata blijft lokaal: `projects/*.json` is `.gitignore`d, behalve `template.json`.

## Eerste draft via AI

Een leeg canvas invullen is repetitief. Met [Claude Code](https://claude.com/claude-code) (of vergelijkbare AI-agent) genereer je een eerste draft op basis van je projectnotities, e-mails of plannen:

> Lees `projects/SCHEMA.md` en mijn notities in `<pad>`. Schrijf `projects/<slug>.json` als eerste draft.

De agent vult elk vak met wat hij uit de bron kan afleiden, en markeert aannames inline als `<span class="vraag">…</span>` — die kleuren oranje in het canvas, dus je ziet meteen wat nog bevraagd moet worden. Zie `.claude/skills/bvbv-draft/SKILL.md` voor de project-skill die Claude Code automatisch oppikt.

## Bewerken in de browser

Klik **Bewerk** in de toolbar — alle vakken worden bewerkbaar. Q/A/I-rijen blijven rij-aligned (Enter splitst de drie kolommen tegelijk). Tags cyclen door _geselecteerd_ → _doorgestreept_ → leeg. **Bewaar JSON** schrijft stil terug naar het bronbestand op localhost / GitHub Pages; op `file://` valt het terug op een download.

## Print én scherm

Op scherm zoomt het canvas mee met je viewport (tot 2.4×); in de printvoorbeeldweergave staan de mm vast voor scherp drukwerk. Verberg-blok-toggles in bewerkmodus laten vel 3 reflowen — als je `H1`–`H4` verbergt, schuiven `vorm`/`medium`/`borg` naar boven.

## Hergebruik

Het canvas-template (HTML/CSS/JS) is bedoeld als open hulpmiddel: fork het, pas de tokens en merknaam aan, gebruik het in je eigen projecten. Het BVBV-framework zelf (Begrijp · Vertaal · Bouw + Veranker, "Datawijs met Thijs") is van [Thijs Leufkens](https://datawijs.nl) — vraag even als je het onder die naam wilt gebruiken of citeren.
