# BVBV Canvas — schema-gids voor een AI-eerste-draft

Doel: een AI-agent kan met deze gids + projectcontext direct een geldige `projects/<slug>.json` schrijven, zonder de HTML/JS te hoeven lezen. Taal: **Nederlands**. Toon: zakelijk, concreet, geen marketing.

## Top-level

```jsonc
{
  "meta":     { … },           // koptekst per vel
  "settings": { "tall_sheets": false },
  "boxes":    { "<key>": { html: [...], checks?: [...], tags?: {...}, hidden?: true } },
  "qai":      [ { q, a, i, warn? }, … ],   // 3 kolommen per rij — rij-aligned
  "actions":  { show, title?, questions, materials, decisions }
}
```

## meta — koptekst (per vel andere user/datum)

| key      | wat                                                  |
| -------- | ---------------------------------------------------- |
| project  | Naam dataproduct/project                             |
| user_1   | Primaire eindgebruiker (rol & aantal/naam) — vel 1   |
| date_1   | JJJJ-MM-DD                                           |
| user_2   | Wie kijkt mee · besluitvormers — vel 2               |
| date_2   | JJJJ-MM-DD                                           |
| owner    | Eigenaar(s) · datapartner — vel 3                    |
| date_3   | JJJJ-MM-DD                                           |

## settings

- `tall_sheets: true` als vel 2 of 3 overvol is → strekt sheets uit tot 297 mm.

## boxes — vel 1 · Begrijp

| key        | wat erin hoort                                                                              | checks (mogelijke waarden)                |
| ---------- | ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| rhythm     | In welk werkritme landt dit? Dagelijks / wekelijks / maandelijks; wat wordt nu gebruikt.    | `aanvulling`, `vervanging`, `nieuw`       |
| userstory  | "Wanneer ik … wil ik … zodat …" + meetbare succescriteria.                                  | `meetbaar`, `andere_initiatieven`         |
| mens_zelf  | Vragen die de gebruiker zélf wil kunnen beantwoorden (volzinnen, geen KPI-namen).           | —                                         |
| mens_coll  | Manager / peers / klanten / werkvloer-TV — wie kijkt mee, wat willen zij zien?              | —                                         |
| proces     | Concreet: welk moment in week/maand wordt beter? Welke beslissing/taak ondersteunt dit?     | —                                         |
| vragen     | Randvragen: alleen voor jou of óók anderen? Realistische tijd/wk? Hoe absoluut **niet**?    | —                                         |

## boxes — vel 3 · Bouw + Veranker

(Vel 2 is volledig de `qai`-array — geen boxes.)

| key    | wat erin hoort                                                                                                  | checks / tags                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| h1     | Capaciteit: datateam + domeinexperts + validators; risico's; geschatte doorlooptijd.                            | —                                                                                                                                 |
| h2     | Data: ✓ beschikbaar / ⚠ te verifiëren / ✗ niet v1; toegang/licenties.                                           | —                                                                                                                                 |
| h3     | Regels: privacy/RLS-rollen, AVG, tooling, mag je pionieren?                                                     | —                                                                                                                                 |
| h4     | Succesmeting: adoptie, proces-impact, reviewmomenten — moet aansluiten op `userstory.Succes`.                   | —                                                                                                                                 |
| vorm   | Vorm-keuze in 1 zin; waarom past die bij déze gebruiker?                                                        | tags: `Dashboard`, `Database`, `Datamodel`, `Index`, `Algoritme`, `Simulator`, `Website`, `Infographic`, `API`                    |
| medium | Waar komt het beschikbaar — standaardplek of apart?                                                             | tags: `Bestaande BI`, `SharePoint`, `Eigen site`, `Scherm op werkvloer`, `E-mail`                                                 |
| borg   | Demo, training, documentatie, eigenaarschap, onderhoud, feedbackrondes — wie doet wat, wanneer?                 | checks: `demo`, `training`, `documentatie`, `eigenaarschap`, `onderhoud`, `feedback`                                              |

**Hidden:** Zet `"hidden": true` op een box om hem te verbergen (grid herschikt). Handig op vel 3 voor H1–H4 als de bouw-fase nog niet relevant is in een eerste draft. **Doe dit niet** voor vorm/medium/borg — die horen er altijd te staan.

## qai — vel 2 · Vertaal

Array van rijen, elk met 3 kolommen die op rij-index aligned blijven.

```jsonc
{
  "q": "Volzin-vraag van de gebruiker (niet 'omzet per maand', wél 'haal ik mijn target?').",
  "a": "Meetbaar antwoord: <code>metric_naam</code> ÷ <code>target_meting</code>; visualisatievorm.",
  "i": "Input: <code>tabel_a</code> + <code>tabel_b</code>; periode-logica via <code>DIM_Calendar</code>.",
  "warn": false
}
```

- `warn: true` → rij krijgt waarschuwingsmarkering (rood randje); gebruik voor onbeantwoorde of riskante vragen.
- 5–12 rijen is een goed eerste-draft-getal.

## actions — optioneel panel onderaan vel 3

```jsonc
{
  "show": true,            // false → panel verborgen
  "title": "Concreet — wat valideren we volgende sessie?",   // optioneel
  "questions":  ["Open vraag 1", …],
  "materials":  ["Meegebracht/te leveren materiaal", …],
  "decisions":  ["Te nemen besluit", …]
}
```

## box.html — schrijfconventies

`box.html` is een **array** van HTML-strings; één string per "blok" (alinea, lijst, kop). De array wordt visueel samengevoegd; splitsing per array-element houdt de JSON git-leesbaar.

Toegestane patronen:

| patroon                                                | wanneer                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `<p><strong>Label:</strong> tekst.</p>`                | label-binnen-blok ("Dagelijks:", "Risico:", "Te verifiëren:")          |
| `<ul><li>…</li></ul>`                                  | opsommingen — bullets nesten niet automatisch                          |
| `<em>"Wanneer ik …"</em>`                              | user-story citaten                                                     |
| `<code>tabel_naam</code>`                              | data-objecten: tabellen, measures, kolommen, bronvelden                |
| `<span class="vraag">tekst</span>`                     | **open vraag aan stakeholder** (oranje gemarkeerd) — onmisbaar         |
| `✓ ⚠ ✗`                                                | inline visuele markers voor "wel/twijfel/niet"                         |
| `&nbsp;`                                               | placeholder na een label dat nog ingevuld moet worden                  |
| `<br>`                                                 | regelafbreking binnen een `<li>` of `<p>`                              |

## Eerste-draft-stijlgids

1. **Verwijder alle prompt-tekst uit `template.json`** — die zijn voor lege canvassen, niet voor ingevulde drafts.
2. **Markeer aannames expliciet** met `<span class="vraag">…</span>` — dat is hoe Thijs onbeantwoorde vragen visueel terug-eist in het gesprek.
3. **Gebruik `<code>` zodra je een tabel-/measure-/veldnaam noemt** — ook als die naam nog gokt is. Maak van de gok een `<span class="vraag">` als je twijfelt.
4. **`qai` is rij-aligned** — schrijf altijd q+a+i samen, geen losse rijen met alleen `q`.
5. **Vel 3 H1–H4** kun je `hidden: true` zetten in een vroege draft als de bouwfase nog niet aan de orde is. **Vorm/medium/borg** blijven altijd zichtbaar (eventueel met `<span class="vraag">` placeholders).
6. **`actions.show: false`** in eerste draft tenzij er duidelijke openstaande vragen/materialen zijn.
7. **Datums** als `JJJJ-MM-DD`. Onbekend? Laat leeg of zet de geplande gespreksdatum.
8. **Bestand opslaan als** `projects/<slug>.json` (slug = lowercase, koppeltekens, geen spaties).
