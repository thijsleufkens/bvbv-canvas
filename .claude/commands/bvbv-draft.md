---
description: Genereer een eerste-draft BVBV Canvas project-JSON op basis van bestaande projectcontext.
argument-hint: <slug> + verwijs naar context (bestand, geplakte tekst, URL)
---

# BVBV Canvas — eerste-draft generator

Je gaat een **eerste-draft** `projects/<slug>.json` genereren voor het BVBV Canvas. Doel: bespaar tijd bij sessie-start. In plaats van een leeg template opent de gebruiker het canvas met een ingevulde interpretatie van de meegeleverde context, met `<span class="vraag">`-markers op elke aanname.

## Vooraf controleren

1. **Slug** — lowercase, koppeltekens, geen spaties. Wordt de bestandsnaam (`projects/<slug>.json`). Vraag als hij ontbreekt in `$ARGUMENTS`.
2. **Minstens één stuk projectcontext.** Bestandspaden, geplakte tekst, of een URL. Als er niets is: vraag erom — niet verzinnen.
3. Als `projects/<slug>.json` al bestaat: vraag of je mag overschrijven of een andere naam wilt.

## Procedure

1. **Lees `projects/SCHEMA.md`.** Bevat alle keys, geldige check-/tag-waarden, HTML-conventies en stijl-aanwijzingen. Niet overslaan, ook niet als je denkt dat je het weet.
2. **Lees de meegeleverde context.** Bij lange bronnen: mentaal samenvatten per box-key vóór je begint te schrijven.
3. **Stel de JSON op** volgens het schema:
   - Verwijder alle template-prompts; vervang door echte inhoud of `<span class="vraag">…</span>`.
   - Markeer **elke** aanname met `<span class="vraag">`. Liever te veel flags dan stille gokken.
   - Data-objecten in `<code>`: `<code>FCT_Sales</code>`, `<code># Bruto Marge</code>`. Onzeker over de naam? Dan ook in een `vraag`-span.
   - `qai`: 5–12 rijen, **rij-aligned** (schrijf q+a+i altijd samen, nooit losse onaffe rijen).
   - Vel 3 `h1`–`h4`: zet `"hidden": true` als de bouwfase niet aan de orde is in de bronnen. **Niet** verbergen: `vorm`, `medium`, `borg`.
   - `actions.show`: alleen `true` als er concrete open vragen / materialen / besluiten in de bron staan.
   - `settings.tall_sheets`: `true` zodra een vel duidelijk vol oogt (veel qai-rijen, lange lijsten op vel 1).
4. **Valideer en schrijf** naar `projects/<slug>.json`. Parse de JSON eerst zelf — broken JSON breekt het canvas zonder duidelijke foutmelding. Het bestand is `.gitignore`d (klantdata blijft lokaal); dat is correct.
5. **Rapporteer kort** (max 4 zinnen): welke boxen vol zitten, hoeveel `vraag`-spans, welke leeg zijn, en de URL om te openen: `http://localhost:8000/BVBV%20Canvas.html?project=projects/<slug>.json`.

## Toon

- **Nederlands**, zakelijk, concreet. Geen marketing-taal.
- **Houd het bewust onaf.** 2–3 bullets per box is genoeg; de gebruiker vult de rest in tijdens de gespreksvoorbereiding.
- **Open vragen zijn een feature.** Een draft met 8 `vraag`-spans is bruikbaarder dan een draft die alles claimt te weten.

---

Argumenten meegegeven door de gebruiker: $ARGUMENTS
