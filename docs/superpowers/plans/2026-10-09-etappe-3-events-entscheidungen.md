# HOI4 Mod Creator – Etappe 3 (Events und Entscheidungen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Anfänger baut eigene Events (Titel, Text, Bild, Auslöser, 1–4 Antworten mit Wirkungen) und eigene Entscheidungen (in eigenen oder bestehenden Kategorien) und verknüpft sie über den neuen Baustein «Event auslösen» und über Merker.

**Architecture:** Der Leser sammelt Eventbilder, Entscheidungssymbole und die Entscheidungskategorien des Spiels. Events, Entscheidungen und Kategorien kommen als neue Projektdaten mit eigenen reinen Änderungsfunktionen dazu. Zwei neue Erzeuger schreiben `events/`, `common/decisions/` und `common/decisions/categories/` und benutzen dafür den Baukasten aus Etappe 2 über einen gemeinsamen `bausteinKontext`. Die Oberfläche bekommt die Bereiche «Events» und «Entscheidungen» mit Vorschau im Spiel-Look.

**Tech Stack:** wie bisher (Vite 8, Preact 11, Vitest 5, puppeteer-core).

**Spec:** `docs/superpowers/specs/2026-10-07-hoi4-mod-creator-design.md` (Abschnitte 6.4 «Event auslösen», 6.6, 6.7, 7.1, 7.2 «Events»/«Entscheidungen», 8)

## Global Constraints

Alle Global Constraints aus Etappe 1, 2 und 2b gelten weiter, zusätzlich:

- `LESER_VERSION = 5`.
- Kennungen (Nummern aus `projekt.zaehler`, stabil):
  - Event: `<modid>.<nummer>`, Namespace `add_namespace = <modid>`
  - Entscheidung: `<modid>_entscheidung_<nummer>`
  - Kategorie: `<modid>_kategorie_<nummer>`
- Sprachschlüssel:
  - Event: `<modid>.<n>.t` (Titel), `<modid>.<n>.d` (Text), Antworten `<modid>.<n>.a` … `.d` nach Position
  - Entscheidung und Kategorie: `<kennung>` (Name), `<kennung>_desc` (Beschreibung)
- Dateien:
  - `mod/<m>/events/<m>_events.txt`
  - `mod/<m>/common/decisions/<m>_decisions.txt`
  - `mod/<m>/common/decisions/categories/<m>_categories.txt` (nur bei eigenen Kategorien)
  - eigene Bilder: `gfx/event_pictures/<m>_event_<n>.dds` (Sprite `GFX_report_event_<m>_<n>`, Datei `interface/<m>_events.gfx`), `gfx/interface/decisions/<kennung>.dds` (Sprite `GFX_decision_<kennung>` bzw. `GFX_decision_category_<kennung>`, Datei `interface/<m>_decisions.gfx`)
- Symbole von Entscheidungen und Kategorien stehen im Skript **ohne** Präfix wie im Spiel: `icon = generic_industry` für `GFX_decision_generic_industry`, `icon = generic_political_actions` für `GFX_decision_category_generic_political_actions`.
- Bildgrössen aus den Originalen, Rückfall: Event 210×176, Entscheidung 32×32, Kategorie 32×32.
- Ein Event hat 1–4 Antworten. Ein neues Event startet mit einer Antwort «Verstanden» (KI 100 %).
- Projekte aus älteren Versionen werden über `ergaenzeProjekt` um `events`, `entscheidungen`, `kategorien` und die Zähler `event`, `entscheidung`, `kategorie` ergänzt.

## Review Focus

1. **Event-Kennung mit Punkt** (`mein_reich.1`). Erwartet: steht unzitiert in `id = …` und `country_event = { id = … }`, die Datei parst streng mit dem eigenen Parser. Test in Task 4.
2. **Gelöschtes Event, auf das noch «Event auslösen» zeigt** (in einem Fokus, einer Antwort oder einer Entscheidung). Erwartet: Fehler `baustein` in der Prüfung, beim Erzeugen kein «Interner Fehler». Test in Task 3 und 6.
3. **Event wird nur verschachtelt ausgelöst**, zum Beispiel in «Bei Land X ausführen» einer Fokus-Belohnung oder in der «Wirkung am Ende» einer Entscheidung. Erwartet: kein Hinweis «wird nie ausgelöst». Test in Task 6.
4. **Eigene Kategorie gelöscht, Entscheidungen hängen noch daran.** Erwartet: Fehler `entscheidung-kategorie` mit Sprung zur Entscheidung; der Erzeuger überspringt diese Entscheidungen, ohne abzustürzen. Test in Task 5 und 6.
5. **Altes Projekt ohne Events-Felder** (aus IndexedDB oder Projektdatei). Erwartet: öffnet ohne Absturz, Bereiche «Events» und «Entscheidungen» sind leer bedienbar. Test in Task 2.

---

## Dateistruktur (neu oder geändert)

```
src/leser/       spielordner.js (Eventbilder, Entscheidungssymbole, Kategorien)
src/projekt/     modell.js (events, entscheidungen, kategorien, zaehler)  events.js  entscheidungen.js
src/bausteine/   wirkungen.js (+ event)  felder.js (+ Feldtyp event)
src/erzeuger/    baustein-kontext.js (aus fokus.js verschoben)  events.js  entscheidungen.js  kennungen.js  index.js
src/pruefung/    regeln.js (+ Event-, Entscheidungs- und Kategorie-Regeln)
src/ui/          events/ events-liste.jsx  event-editor.jsx  event-vorschau.jsx
                 entscheidungen/ entscheidungen-liste.jsx  entscheidung-editor.jsx  kategorie-editor.jsx  entscheidung-vorschau.jsx
                 laender-wahl.jsx  fokus/symbole.jsx (Galerie verallgemeinert)  bausteine/felder.jsx (+ event)
                 app.jsx  pruefung.jsx (zielAnsicht)  stil.css
src/selbsttest/  mini-spielordner.js  szenario.js
```

---

### Task 1: Spieldaten für Etappe 3

**Files:** Modify `src/leser/spielordner.js`, `src/selbsttest/mini-spielordner.js` · Test `tests/leser/spielordner.test.js`

**Interfaces:**
- Produces, neu in `spieldaten`:
  - `eventBilder: string[]`: Sprites mit Präfix `GFX_report_event_` (ohne Rücksicht auf Gross-/Kleinschreibung), sortiert. Bilder unter `event:<sprite>`.
  - `entscheidungsSymbole: string[]`: Sprites mit Präfix `GFX_decision_`, ohne `GFX_decision_category_` und `GFX_decision_cat_picture_`, sortiert. Bilder unter `entscheidung:<sprite>`.
  - `kategorieSymbole: string[]`: Sprites mit Präfix `GFX_decision_category_`, sortiert. Bilder unter `kategorie:<sprite>`.
  - `entscheidungsKategorien: [{ id, name, sprite }]` aus den Schlüsseln oberster Ebene in `common/decisions/categories/*.txt`. `name` aus den Sprachdateien (Rückfall `id`). `sprite`: `icon`, wenn es mit `GFX_` beginnt, sonst `GFX_decision_category_<icon>`; ohne `icon` `null`. Sortiert nach `name`.
  - `bildgroessen.event` (Rückfall `[210, 176]`), `bildgroessen.entscheidung` (`[32, 32]`), `bildgroessen.kategorie` (`[32, 32]`)
  - `bericht.eventBilder`, `bericht.entscheidungsSymbole`, `bericht.entscheidungsKategorien`
- `LESER_VERSION = 5`
- Wie bei den Fokus-Symbolen bleibt ein nicht lesbares Bild (z. B. BC7) in der Liste, ohne Eintrag in `bilder`.

**Ergänzung Mini-Spielordner:**
- `interface/eventpictures.gfx`: `GFX_report_event_generic_rally` → `gfx/event_pictures/report_event_generic_rally.dds` (210×176), `GFX_report_event_soldiers_marching` → `…/report_event_soldiers_marching.dds` (210×176)
- `interface/decisions.gfx`: `GFX_decision_generic_industry` → `gfx/interface/decisions/decision_generic_industry.dds` (32×32), `GFX_decision_category_generic_political_actions` → `…/decision_category_generic_political_actions.dds` (32×32)
- `common/decisions/categories/00_decision_categories.txt`: `political_actions = { icon = generic_political_actions } economy_decisions = { icon = GFX_decision_category_generic_political_actions allowed = { always = yes } }`
- Sprache: `political_actions` «Politische Massnahmen», `economy_decisions` «Wirtschaft»

- [ ] **Step 1: Failing tests**

```js
expect(LESER_VERSION).toBe(5)
expect(sd.eventBilder).toEqual(['GFX_report_event_generic_rally', 'GFX_report_event_soldiers_marching'])
expect(sd.entscheidungsSymbole).toEqual(['GFX_decision_generic_industry'])
expect(sd.kategorieSymbole).toEqual(['GFX_decision_category_generic_political_actions'])
expect(sd.entscheidungsKategorien).toEqual([
  { id: 'political_actions', name: 'Politische Massnahmen', sprite: 'GFX_decision_category_generic_political_actions' },
  { id: 'economy_decisions', name: 'Wirtschaft', sprite: 'GFX_decision_category_generic_political_actions' },
])
expect(sd.bildgroessen).toMatchObject({ event: [210, 176], entscheidung: [32, 32], kategorie: [32, 32] })
expect(bilder.has('event:GFX_report_event_generic_rally')).toBe(true)
expect(bilder.has('entscheidung:GFX_decision_generic_industry')).toBe(true)
expect(sd.bericht).toMatchObject({ eventBilder: 2, entscheidungsSymbole: 1, entscheidungsKategorien: 2 })
```

- [ ] **Step 2: Run** `npx vitest run tests/leser/spielordner.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** Das Lesen der drei Bildarten teilt sich eine Hilfsfunktion mit den Fokus-Symbolen (`leseSymbole(namen, praefixSchluessel) → groessen`).
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Spieldaten fuer Events und Entscheidungen"`

---

### Task 2: Projektdaten für Events, Entscheidungen und Kategorien

**Files:** Create `src/projekt/events.js`, `src/projekt/entscheidungen.js` · Modify `src/projekt/modell.js` · Test `tests/projekt/events.test.js`, `tests/projekt/entscheidungen.test.js`, `tests/projekt/modell.test.js`

**Interfaces:**
- `neuesProjekt` erhält `events: []`, `entscheidungen: []`, `kategorien: []`; `STANDARD_ZAEHLER` erhält `event: 0, entscheidung: 0, kategorie: 0`. `ergaenzeProjekt` ergänzt alle drei Listen.
- Datenform:

```js
Event = { id, nummer, titel: '', text: '',
          bild: { art: 'spiel', sprite } | { art: 'eigen', bildId },
          ausloeser: 'ausgeloest' | 'datum' | 'zufall',
          land: '',                         // '' = «wer es auslöst»; Pflicht bei 'datum' und 'zufall'
          datum: '1936.6.1',                // nur 'datum'
          tage: 30,                         // Durchschnittszeit, nur 'zufall'
          nurEinmal: true,                  // nur 'zufall'; 'datum' ist immer einmal
          bedingungen: Bedingungsblock,     // zusätzliche Bedingungen bei 'datum' und 'zufall'
          antworten: [{ id, text, wirkungen: Wirkung[], kiProzent }] }
Kategorie = { id, nummer, name: '', beschreibung: '', symbol: { art: 'spiel', sprite } | { art: 'eigen', bildId }, laender: [tag] }
Entscheidung = { id, nummer, name: '', beschreibung: '',
                 kategorie: { art: 'eigen' | 'spiel', id },
                 symbol: { art: 'spiel', sprite } | { art: 'eigen', bildId },
                 kosten: 50, nurEinmal: true, wartezeit: 30,      // wartezeit nur ohne nurEinmal
                 dauer: 0,                                         // Tage; 0 = sofort
                 laender: [tag],                                   // leer = alle, die die Kategorie sehen
                 sichtbar: Bedingungsblock, verfuegbar: Bedingungsblock,
                 wirkungen: Wirkung[], wirkungenEnde: Wirkung[], kiGewicht: 1 }
```

- `src/projekt/events.js` (rein):
  - `fuegeEventHinzu(p, sd) → [p, eventId]`: Bild `GFX_report_event_generic_rally`, wenn in `sd.eventBilder`, sonst `sd.eventBilder[0]`, sonst `GFX_report_event_generic_rally`; eine Antwort «Verstanden», `kiProzent: 100`.
  - `aendereEvent(p, eventId, patch)`, `entferneEvent(p, eventId)`
  - `fuegeAntwortHinzu(p, eventId)`: neue Antwort mit leerem Text und `kiProzent: 50`. Bei 4 Antworten kommt `p` unverändert zurück.
  - `aendereAntwort(p, eventId, antwortId, patch)`, `entferneAntwort(p, eventId, antwortId)`
- `src/projekt/entscheidungen.js` (rein):
  - `fuegeKategorieHinzu(p, sd) → [p, kategorieId]`: Symbol `sd.kategorieSymbole[0]` oder `GFX_decision_category_generic_political_actions`.
  - `aendereKategorie`, `entferneKategorie(p, id)`: Entscheidungen der Kategorie bleiben stehen (die Prüfung meldet sie).
  - `fuegeEntscheidungHinzu(p, sd, kategorie?) → [p, entscheidungId]`: Kategorie ist das Argument, sonst die erste eigene, sonst `{ art: 'spiel', id: 'political_actions' }`, wenn vorhanden, sonst die erste aus `sd.entscheidungsKategorien`. Symbol `GFX_decision_generic_industry`, wenn vorhanden, sonst `sd.entscheidungsSymbole[0]`.
  - `aendereEntscheidung`, `entferneEntscheidung`
  - `entscheidungenIn(p, kategorie) → Entscheidung[]`

- [ ] **Step 1: Failing tests** (Auszug)

```js
let [p, ev] = fuegeEventHinzu(neuesProjekt('M'), sd)
expect(p.events[0]).toMatchObject({ nummer: 1, ausloeser: 'ausgeloest', land: '', bild: { art: 'spiel', sprite: 'GFX_report_event_generic_rally' } })
expect(p.events[0].antworten).toEqual([expect.objectContaining({ text: 'Verstanden', kiProzent: 100, wirkungen: [] })])
p = fuegeAntwortHinzu(fuegeAntwortHinzu(fuegeAntwortHinzu(p, ev), ev), ev)
expect(fuegeAntwortHinzu(p, ev)).toBe(p)
let [q, kat] = fuegeKategorieHinzu(p, sd)
let ent
;[q, ent] = fuegeEntscheidungHinzu(q, sd)
expect(q.entscheidungen[0].kategorie).toEqual({ art: 'eigen', id: kat })
expect(entscheidungenIn(entferneKategorie(q, kat), { art: 'eigen', id: kat })).toHaveLength(1)
expect(fuegeEntscheidungHinzu(neuesProjekt('N'), sd)[0].entscheidungen[0].kategorie).toEqual({ art: 'spiel', id: 'political_actions' })
// Review Focus 5
const alt = ergaenzeProjekt({ ...neuesProjekt('A'), events: undefined, entscheidungen: undefined, kategorien: undefined, zaehler: { geist: 2 } }, sd)
expect(alt).toMatchObject({ events: [], entscheidungen: [], kategorien: [], zaehler: { geist: 2, event: 0, entscheidung: 0, kategorie: 0 } })
```

- [ ] **Step 2: Run** `npx vitest run tests/projekt`. Expected: FAIL.
- [ ] **Step 3: Implementieren** (Muster wie `src/projekt/fokus.js`: `zaehle`, `structuredClone` für Patches).
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (bestehende `neuesProjekt`-Erwartungen um die neuen Felder ergänzen).
- [ ] **Step 5: Commit** – `"Projektdaten fuer Events und Entscheidungen"`

---

### Task 3: Baustein «Event auslösen» und gemeinsamer Baustein-Kontext

**Files:** Create `src/erzeuger/baustein-kontext.js` · Modify `src/erzeuger/fokus.js`, `src/erzeuger/kennungen.js`, `src/bausteine/wirkungen.js`, `src/bausteine/felder.js`, `src/ui/bausteine/felder.jsx` · Test `tests/bausteine/wirkungen.test.js`, `tests/bausteine/felder.test.js`

**Interfaces:**
- `kennungen.js`: `eventKennung(p, ev) → '<modid>.<nummer>'`, `entscheidungKennung(p, x)`, `kategorieKennung(p, x)`
- `bausteinKontext(k, quelle)` zieht von `erzeuger/fokus.js` nach `erzeuger/baustein-kontext.js` und erhält:
  - `kennung.event(eventId) → string` (`'unbekannt'`, wenn gelöscht)
  - `kennung.eventLand(eventId) → tag | ''`
- Neuer Feldtyp `event` in `felder.js`:
  - `pruefeFeld`: leer → «Event fehlt»; unbekannte ID → «Das Event wurde gelöscht»
  - `feldAnzeige`: Titel oder «(ohne Titel)»
  - `BausteinFeld`: Auswahl aller Projekt-Events, Text `«Titel» · <Land oder «wer es auslöst»>`
- Neue Wirkung in Gruppe «Merker und Profis» (vor `bei_land`):

| art | Felder | Satz | Syntax |
|---|---|---|---|
| `event` | `event` (Typ event), `tage` (zahl 0–365, Standard 0, Label «Verzögerung in Tagen») | `Event «{event}» auslösen` + ` – nach {tage} Tagen` bei `tage > 0` | `country_event = { id = <kennung> days = <tage> }` (`days` nur bei `tage > 0`); hat das Event ein Land, eingepackt in `<land> = { … }` |

- Der Test `WIRKUNGEN.some(d => d.art === 'event') === false` aus Etappe 2 wird umgedreht.

- [ ] **Step 1: Failing tests**

`k` ist ein `bausteinKontext` über ein Projekt `mein_reich` mit den Events `e1` (Nummer 3, Titel «Volksfest», Land `''`) und `e2` (Nummer 4, Land `GER`); `kontext = { projekt, spieldaten }` für dasselbe Projekt.

```js
expect(text(erzeugeWirkungen([w('event', { event: 'e1', tage: 0 })], k))).toBe('country_event = {\n\tid = mein_reich.3\n}\n')
expect(text(erzeugeWirkungen([w('event', { event: 'e2', tage: 7 })], k))).toBe('GER = {\n\tcountry_event = {\n\t\tid = mein_reich.4\n\t\tdays = 7\n\t}\n}\n')
expect(pruefeBausteine([w('event', { event: 'weg' })], kontext, 'Fokus A')[0].text).toMatch(/Event wurde gelöscht/)
expect(pruefeBausteine([w('event', { event: '' })], kontext, 'Fokus A')[0].text).toMatch(/Event fehlt/)
expect(satzText(wirkungsDef('event'), { event: 'e1', tage: 5 }, kontext)).toBe('Event «Volksfest» auslösen – nach 5 Tagen')
// Review Focus 2: geloeschtes Event wirft nicht
expect(() => erzeugeWirkungen([w('event', { event: 'weg' })], k)).not.toThrow()
```

- [ ] **Step 2: Run** `npx vitest run tests/bausteine`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** Das Einpacken passiert in `erzeuge(w, k)` der Wirkung über `k.kennung.eventLand`.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Baustein Event ausloesen"`

---

### Task 4: Events erzeugen

**Files:** Create `src/erzeuger/events.js` · Modify `src/erzeuger/index.js` · Test `tests/erzeuger/events.test.js`

**Interfaces:**
- `erzeugeEvents(k)` in `ERZEUGER` nach `erzeugeFokusbaeume`. Ohne Events entsteht keine Datei.
- Datei `mod/<m>/events/<m>_events.txt`:

```
add_namespace = <modid>
country_event = {
	id = <modid>.<n>
	title = <modid>.<n>.t
	desc = <modid>.<n>.d
	picture = <GFX>
	# 'ausgeloest':
	is_triggered_only = yes
	# 'datum':
	fire_only_once = yes
	trigger = { tag = <land> date > <datum> …bedingungen… }
	mean_time_to_happen = { days = 1 }
	# 'zufall':
	fire_only_once = yes                      # nur bei nurEinmal
	trigger = { tag = <land> …bedingungen… }
	mean_time_to_happen = { days = <tage> }
	option = {
		name = <modid>.<n>.a
		ai_chance = { factor = <kiProzent> }
		…wirkungen…
	}
}
```

- `bausteinKontext(k, '<modid>.<n>.t')` für alle Bausteine des Events (Quelle für `add_tech_bonus` ist der Titelschlüssel).
- Eigenes Bild: DDS in `bildgroessen.event`, Sprite `GFX_report_event_<m>_<n>` in `interface/<m>_events.gfx`.
- `k.braucheGfx(picture)` und `k.braucheSprache` für Titel, Text und jede Antwort.

- [ ] **Step 1: Failing tests**
  - Projekt mit drei Events für MRE:
    - E1 `ausgeloest`, zwei Antworten («Feiern» mit politischer Macht 25 und KI 80, «Absagen» mit KI 20)
    - E2 `datum` 1937.1.1, Land MRE, Bedingung Stabilität über 50 %
    - E3 `zufall`, Land GER, 120 Tage, `nurEinmal: false`, eigenes Bild
  - Die Datei parst streng; das erste Element ist `add_namespace = mein_reich` (**Review Focus 1:** `id` ist das Wort `mein_reich.1`, nicht zitiert).
  - E1: `is_triggered_only = yes`, kein `trigger`; Optionen `mein_reich.1.a` mit `ai_chance.factor = 80` und `add_political_power = 25`, `mein_reich.1.b` mit `factor = 20`.
  - E2: `fire_only_once = yes`, `trigger` mit `tag = MRE`, `date > 1937.1.1` und `has_stability > 0.5`, `mean_time_to_happen.days = 1`.
  - E3: kein `fire_only_once`, `trigger.tag = GER`, `mean_time_to_happen.days = 120`, `picture = GFX_report_event_mein_reich_3`; DDS 210×176 und `.gfx` parsen streng.
  - Sprachdatei enthält `mein_reich.1.t`, `mein_reich.1.d`, `mein_reich.1.a`, `mein_reich.1.b`.
  - Ein Fokus mit Wirkung `event` auf E1 enthält `country_event = { id = mein_reich.1 }`.
  - `fehler` ist `[]`; ein unbekanntes Spielbild ergibt `Bild fehlt`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/events.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Events erzeugen"`

---

### Task 5: Entscheidungen und Kategorien erzeugen

**Files:** Create `src/erzeuger/entscheidungen.js` · Modify `src/erzeuger/index.js` · Test `tests/erzeuger/entscheidungen.test.js`

**Interfaces:**
- `erzeugeEntscheidungen(k)` in `ERZEUGER` nach `erzeugeEvents`.
- Kategorien-Datei (nur eigene Kategorien), `mod/<m>/common/decisions/categories/<m>_categories.txt`:

```
<kategorie> = {
	icon = <symbol ohne GFX_decision_category_>
	allowed = { tag = <A> }               # mehrere Länder: allowed = { OR = { tag = A tag = B } }; keine Länder: kein allowed
}
```

- Entscheidungs-Datei, `mod/<m>/common/decisions/<m>_decisions.txt`, ein Block je benutzter Kategorie (eigene Kennung oder Spiel-ID):

```
<kategorie> = {
	<entscheidung> = {
		icon = <symbol ohne GFX_decision_>
		cost = <kosten>
		allowed = { … }                    # wie bei Kategorien, nur mit Ländern
		visible = { … }                    # nur mit Bedingungen
		available = { … }                  # nur mit Bedingungen
		fire_only_once = yes               # bei nurEinmal; sonst days_re_enable = <wartezeit>
		complete_effect = { … }            # bei dauer = 0
		days_remove = <dauer>              # bei dauer > 0, dazu:
		remove_effect = { … }              #   Wirkung am Ende
		ai_will_do = { factor = <kiGewicht> }
	}
}
```

- Bei `dauer > 0` gehen `wirkungen` in `complete_effect` (sofort beim Start) und `wirkungenEnde` in `remove_effect`.
- Entscheidungen mit gelöschter eigener Kategorie oder unbekannter Spielkategorie werden übersprungen (**Review Focus 4**).
- Eigene Symbole: DDS in `bildgroessen.entscheidung` bzw. `.kategorie`, Sprites in `interface/<m>_decisions.gfx`. `braucheGfx` mit dem vollen Sprite-Namen.
- `bausteinKontext(k, <entscheidungKennung>)`; Sprache `<kennung>`, `<kennung>_desc` für Entscheidungen und Kategorien.

- [ ] **Step 1: Failing tests**
  - Eigene Kategorie «Reformen» für MRE und GER; Entscheidung D1 darin: Kosten 75, Dauer 30, sichtbar wenn Merker «Armee Reform», Wirkung «Event auslösen» E1, Wirkung am Ende Stabilität 5 %
  - Entscheidung D2 in `political_actions`: `nurEinmal: false`, Wartezeit 60, nur MRE, eigenes Symbol
  - Kategorien-Datei parst streng: `mein_reich_kategorie_1.icon = generic_political_actions`, `allowed.OR` mit `tag = MRE` und `tag = GER`.
  - Entscheidungs-Datei parst streng und hat die Blöcke `mein_reich_kategorie_1` und `political_actions`.
  - D1: `cost = 75`, `days_remove = 30`, `complete_effect.country_event.id = mein_reich.1`, `remove_effect.add_stability = 0.05`, `visible.has_country_flag = mein_reich_armee_reform`, `fire_only_once = yes`.
  - D2: `days_re_enable = 60`, kein `fire_only_once`, `allowed.tag = MRE`, `icon = mein_reich_entscheidung_2`; `interface/mein_reich_decisions.gfx` enthält `GFX_decision_mein_reich_entscheidung_2`.
  - Sprache enthält `mein_reich_kategorie_1`, `mein_reich_entscheidung_1_desc`.
  - Nach `entferneKategorie` fehlt D1 in der Datei, `fehler` ist `[]`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/entscheidungen.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Entscheidungen und Kategorien erzeugen"`

---

### Task 6: Prüfregeln für Events, Entscheidungen und Kategorien

**Files:** Modify `src/pruefung/regeln.js`, `src/ui/pruefung.jsx` (`zielAnsicht`) · Test `tests/pruefung/regeln.test.js`, `tests/ui/pruefung.test.js`

**Interfaces:**
- Ziele: `{ bereich: 'event', id }`, `{ bereich: 'entscheidung', id }`, `{ bereich: 'kategorie', id }`. `zielAnsicht` ohne `id` führt zu `{ bereich: 'events' }` bzw. `{ bereich: 'entscheidungen' }`.
- Hilfsfunktion `ausgeloesteEvents(p) → Set<eventId>`: sammelt alle Wirkungen `event` rekursiv (auch in `bei_land`) aus Fokus-Belohnungen, Event-Antworten (ohne die des Events selbst) und `wirkungen`/`wirkungenEnde` aller Entscheidungen.

| regel | Schwere | Bedingung |
|---|---|---|
| `event-titel` | fehler | Titel leer |
| `event-ohne-antwort` | fehler | keine Antwort |
| `antwort-text` | fehler | eine Antwort ohne Text |
| `event-land` | fehler | `datum`/`zufall` ohne Land, oder Land unbekannt |
| `event-bild` | fehler | Spielbild nicht in `sd.sprites`, oder eigenes Bild fehlt |
| `baustein` | fehler | `pruefeBausteine` meldet etwas in Bedingungen oder Antworten (Text nennt Event und Antwort) |
| `event-nie` | hinweis | `ausgeloest` und nicht in `ausgeloesteEvents(p)`: «… wird nie ausgelöst. Füge irgendwo die Wirkung «Event auslösen» hinzu oder wähle einen anderen Auslöser.» |
| `event-text` | hinweis | Text leer |
| `kategorie-name` | fehler | Name leer |
| `kategorie-symbol` | fehler | Symbol fehlt |
| `kategorie-land` | fehler | ein Land in `laender` unbekannt |
| `kategorie-leer` | hinweis | keine Entscheidung darin |
| `entscheidung-name` | fehler | Name leer |
| `entscheidung-kategorie` | fehler | eigene Kategorie gelöscht oder Spielkategorie nicht in `sd.entscheidungsKategorien` |
| `entscheidung-symbol` | fehler | Symbol fehlt |
| `entscheidung-land` | fehler | ein Land in `laender` unbekannt |
| `baustein` | fehler | in `sichtbar`, `verfuegbar`, `wirkungen`, `wirkungenEnde` |
| `entscheidung-ohne-wirkung` | hinweis | `wirkungen` und `wirkungenEnde` leer |
| `entscheidung-beschreibung` | hinweis | Name vorhanden, Beschreibung leer |

- [ ] **Step 1: Failing tests:**
  - Ein gültiges Projekt mit Event (von einer Entscheidung ausgelöst), Kategorie und Entscheidung ergibt keine neuen Meldungen.
  - Je Regel ein Fall.
  - **Review Focus 2:** Event löschen, auf das ein Fokus mit «Event auslösen» zeigt, ergibt `baustein` mit Ziel `bereich: 'fokus'`.
  - **Review Focus 3:** Event nur in `bei_land` einer Fokus-Belohnung ausgelöst ergibt kein `event-nie`; nur in `wirkungenEnde` einer Entscheidung ebenso. Ein Event, das nur sich selbst auslöst, ergibt `event-nie`.
  - **Review Focus 4:** Kategorie löschen ergibt `entscheidung-kategorie` mit `ziel: { bereich: 'entscheidung', id }`.
  - `zielAnsicht({ bereich: 'event', id: 'x' })` ist `{ bereich: 'event', id: 'x' }`.
- [ ] **Step 2: Run** `npx vitest run tests/pruefung tests/ui`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln fuer Events und Entscheidungen"`

---

### Task 7: Oberfläche – Events mit Vorschau

**Files:** Create `src/ui/events/events-liste.jsx`, `event-editor.jsx`, `event-vorschau.jsx` · Modify `src/ui/app.jsx`, `src/ui/fokus/symbole.jsx`, `src/ui/stil.css`, `src/selbsttest/szenario.js`

**Interfaces:**
- Navigation: `BEREICHE` erhält nach `fokusbaeume` `{ id: 'events', text: 'Events' }` und `{ id: 'entscheidungen', text: 'Entscheidungen' }` (Ansicht in Task 8). `UNTERANSICHTEN.event = EventEditor`. `nav-events` ist auch bei `bereich: 'event'` aktiv.
- `SymbolGalerie` wird allgemein: Props `symbole, gewaehlt, onWaehle, bildArt = 'fokus', test = 'fokussymbol', praefix = 'GFX_goal_', platzhalter`. Die Fokus-Seite bleibt unverändert.
- Liste: Kacheln `event-<id>` (Bild, Titel, Auslöser im Klartext), Knopf `neues-event`.
- Editor (`{ bereich: 'event', id }`), links Felder, rechts die Vorschau:
  - `event-titel`, `event-text` (mehrzeilig)
  - `event-ausloeser`: «Wird ausgelöst (durch Fokus, Entscheidung oder anderes Event)» / «An einem Datum» / «Zufällig, wenn Bedingungen erfüllt»
  - `event-land`: Auswahl mit `''` = «wer es auslöst» (nur bei `ausgeloest`), dann Projekt- und Spielländer (`landOptionen`)
  - `event-datum` (Datum-Widget, Test-IDs `event-datum-tag/-monat/-jahr`) nur bei `datum`; `event-tage` (1–3650) und Häkchen `event-einmal` nur bei `zufall`
  - «Zusätzliche Bedingungen» `<BedingungenEditor test="event-bedingungen">` bei `datum` und `zufall`
  - Bild: `<SymbolGalerie bildArt="event" test="eventbild" praefix="GFX_report_event_">` mit Suche `eventbild-suche`, eigenes Bild `<BildZuschnitt test="eventbild-eigen">` in `bildgroessen.event`
  - Antworten je `i`: `antwort-<i>-text`, `antwort-<i>-ki` (Regler 0–100 %), `<WirkungenEditor test="antwort-<i>-wirkung">`, `antwort-<i>-entfernen`; `antwort-neu` deaktiviert bei 4
  - `event-loeschen` (mit Bestätigung)
- `<EventVorschau event projekt />` mit `data-test="event-vorschau"`: dunkler Rahmen wie im Spiel, Titel oben, Bild links, Text, je Antwort ein Knopf `vorschau-antwort-<i>` mit dem Text und darunter den Klartextsätzen der Wirkungen.

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Bedingungen» (Fokus):
  - «Event anlegen»: `nav-events`, `neues-event`, `tippe('event-titel', 'Volksfest')`, `tippe('event-text', 'Das Volk feiert.')`, `klicke('eventbild-GFX_report_event_soldiers_marching')` → Vorschau enthält «Volksfest», Bild gesetzt
  - «Event-Antworten»: `tippe('antwort-0-text', 'Feiern')`, `klicke('antwort-0-wirkung-neu')`, Art `politische_macht`, Menge 25; `antwort-neu`, `tippe('antwort-1-text', 'Absagen')` → Vorschau hat `vorschau-antwort-0` mit «25 politische Macht erhalten» und `vorschau-antwort-1`
  - «Event an Datum»: `nav-events`, `neues-event`, Titel «Grenzstreit», `waehle('event-ausloeser', 'datum')`, `waehle('event-land', 'MRE')`, Datum 1.1.1937 → `zustand().projekt.events[1]` hat `datum: '1937.1.1'`; die Auswahl «wer es auslöst» ist weg
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Event anlegen».
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npm run selbsttest` und `npx vitest run`. Expected: OK und PASS.
- [ ] **Step 5: Commit** – `"Event-Editor mit Vorschau"`

---

### Task 8: Oberfläche – Entscheidungen und Kategorien

**Files:** Create `src/ui/entscheidungen/entscheidungen-liste.jsx`, `entscheidung-editor.jsx`, `kategorie-editor.jsx`, `entscheidung-vorschau.jsx`, `src/ui/laender-wahl.jsx` · Modify `src/ui/app.jsx`, `src/ui/stil.css`, `src/selbsttest/szenario.js`

**Interfaces:**
- `UNTERANSICHTEN.entscheidung = EntscheidungEditor`, `UNTERANSICHTEN.kategorie = KategorieEditor`; `nav-entscheidungen` ist auch dort aktiv.
- `<LaenderWahl tags onAendere kontext test leerText />`: gewählte Länder als Chips mit `<test>-weg-<TAG>`, Auswahl `<test>-neu` fügt hinzu.
- Liste: Abschnitt «Eigene Kategorien» mit Kacheln `kategorie-<id>` und `neue-kategorie`; darunter die Entscheidungen gruppiert nach Kategorie (Kategoriename, bei Spielkategorien mit «aus dem Spiel»), Kacheln `entscheidung-<id>`, Knopf `neue-entscheidung`.
- Kategorie-Editor: `kategorie-name`, `kategorie-beschreibung`, `<LaenderWahl test="kategorie-land" leerText="alle Länder">`, Galerie `kategoriesymbol-<GFX>` (`bildArt="kategorie"`, `praefix="GFX_decision_category_"`), eigenes Bild `kategoriebild`, `kategorie-loeschen`.
- Entscheidungs-Editor:
  - `entscheidung-name`, `entscheidung-beschreibung`
  - `entscheidung-kategorie`: Werte `eigen:<id>` und `spiel:<id>`, eigene zuerst
  - `entscheidung-kosten` (0–500, politische Macht)
  - `entscheidung-einmal`; ohne Häkchen `entscheidung-wartezeit` (Tage)
  - `entscheidung-dauer` (Tage, 0 = sofort, mit «?»: «Mit Dauer läuft die Entscheidung so viele Tage und hat danach eine eigene Wirkung am Ende.»)
  - `<LaenderWahl test="entscheidung-land" leerText="alle, die die Kategorie sehen">`
  - `<BedingungenEditor test="entscheidung-sichtbar">` («Sichtbar wenn»), `<BedingungenEditor test="entscheidung-verfuegbar">` («Verfügbar wenn»)
  - `<WirkungenEditor test="entscheidung-wirkung">` («Wirkung» bzw. bei Dauer «Wirkung beim Start»), bei `dauer > 0` zusätzlich `<WirkungenEditor test="entscheidung-ende">` («Wirkung am Ende»)
  - Galerie `entscheidungssymbol-<GFX>` (`bildArt="entscheidung"`, `praefix="GFX_decision_"`), eigenes Bild `entscheidungsbild`, Regler `entscheidung-ki` (0–10), `entscheidung-loeschen`
- `<EntscheidungVorschau>` mit `data-test="entscheidung-vorschau"`: Zeile wie im Spiel mit Symbol, Name, Kosten «75 ⚑», bei Dauer «30 Tage».

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Event an Datum»:
  - «Kategorie»: `nav-entscheidungen`, `neue-kategorie`, `tippe('kategorie-name', 'Reformen')`, `waehle('kategorie-land-neu', 'MRE')` → Chip `kategorie-land-weg-MRE` sichtbar
  - «Entscheidung»: `nav-entscheidungen`, `neue-entscheidung` → Kategorie ist «Reformen»; `tippe('entscheidung-name', 'Armee reformieren')`, `tippe('entscheidung-kosten', '75')`, `tippe('entscheidung-dauer', '30')` → `entscheidung-ende-neu` erscheint; Vorschau enthält «75»
  - «Event auslösen»: `klicke('entscheidung-wirkung-neu')`, `waehle('entscheidung-wirkung-art-0', 'event')`, `waehle('entscheidung-wirkung-0-event', <Volksfest-ID>)`, `tippe('entscheidung-wirkung-0-tage', '5')` → Satz «Event «Volksfest» auslösen – nach 5 Tagen»; Wirkung am Ende: Art `merker_setzen`, Merker «Armee Reform»
  - «Spielkategorie»: `waehle('entscheidung-kategorie', 'spiel:political_actions')` und zurück auf `eigen:<Reformen-ID>` → Projekt hat jeweils die gewählte Kategorie
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Kategorie».
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npm run selbsttest` und `npx vitest run`. Expected: OK und PASS.
- [ ] **Step 5: Commit** – `"Entscheidungs- und Kategorie-Editor"`

---

### Task 9: Durchgang bis zur gespeicherten Mod, Anleitung

**Files:** Modify `src/selbsttest/szenario.js`, `README.md`

- [ ] **Step 1: Selbsttest-Schritte (failing):**
  - In «Prüfung»: keine Meldung `event-nie` für «Volksfest» (die Entscheidung löst es aus), keine Fehler aus Etappe 3.
  - «Sprung zum Event»: `antwort-1-text` von «Volksfest» leeren → Prüfung zeigt `antwort-text`; Klick auf die Meldung öffnet den Event-Editor von «Volksfest»; Text wieder auf «Absagen» setzen.
  - In «Speichern in Ordner» zusätzlich:
    - `mod/selbsttest_reich/events/selbsttest_reich_events.txt` parst streng und enthält `add_namespace = selbsttest_reich`, `is_triggered_only = yes`, `date > 1937.1.1`
    - `mod/selbsttest_reich/common/decisions/selbsttest_reich_decisions.txt` parst streng und enthält `days_remove = 30` und `country_event`
    - `mod/selbsttest_reich/common/decisions/categories/selbsttest_reich_categories.txt` parst streng
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER, bis Reihenfolge und Sprungziele stimmen.
- [ ] **Step 3: Implementieren.** README:
  - Abschnitt «Etappe 3 bringt dazu»: Events (Auslöser, Antworten, Vorschau), Entscheidungen und Kategorien, Baustein «Event auslösen», Verknüpfen über Merker (Beispiel: Fokus setzt Merker → Entscheidung sichtbar)
  - Satz «Geplant sind Events und Entscheidungen …» entfernen
  - Bauplan Etappe 3 unter «Entwickeln» nennen
  - Grenze: Events sind immer Länder-Events (`country_event`); Nachrichten-Events für alle Länder gibt es nicht.
- [ ] **Step 4: Run** `npx vitest run && npm run selbsttest`. Expected: alles grün.
- [ ] **Step 5: Commit** – `"Etappe 3: Durchgang und Anleitung"`
