# HOI4 Mod Creator – Etappe 4f (Fokusbäume aus dem Spiel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fokusbäume des Spiels lassen sich importieren, um den Baum eines Landes zu ändern oder um ihn als Vorlage für ein anderes Land zu nehmen. Danach bearbeitest du sie im bestehenden Baum-Editor.

**Architecture:**
- **Leser:** liefert eine Übersicht in `spieldaten` und die vollständigen Bäume getrennt in `spielfokus`. Dieser Teil liegt in einem eigenen IndexedDB-Eintrag.
- **`src/projekt/fokus-import.js`:** baut daraus normale Fokusbäume mit `herkunft`, gesperrten geteilten Fokussen und übersetzten Bausteinen.
- **Erzeuger:** schreibt `aendern`-Bäume unter dem Pfad des Spiels mit den Kennungen des Spiels.

**Tech Stack:** wie bisher.

**Spec:** `docs/superpowers/specs/2026-10-27-etappe-4f-fokusbaeume-import-design.md`

## Global Constraints

Alle Global Constraints aus Etappe 1–4e gelten weiter, zusätzlich:

- `LESER_VERSION = 10`.
- `leseSpielordner` gibt zusätzlich `spielfokus: { baeume: { [id]: SpielBaum }, geteilt: { [id]: GeteilterFokus } }` zurück.
- `speichereSpieldaten` legt `spielfokus` im Store `spieldaten` unter dem Schlüssel `spielfokus` ab. `ladeSpielfokus(db)` liest ihn.
- Gesperrte Fokusse (`gesperrt: true`) lassen sich nicht verschieben, ändern oder löschen und werden nie geschrieben.
- Code-Bausteine aus dem Spiel: `{ art: 'code', werte: { code }, ausSpiel: true }`.

## Review Focus

1. **Relative Positionen über Ketten** (A relativ zu B, B relativ zu C) **und ein Kreis** (A ↔ B). Erwartet: korrekte feste Positionen; bei einem Kreis kein Hängenbleiben, sondern die eigene x/y-Angabe. Test in Task 1.
2. **Prerequisite-Mischung «A und (B oder C)».** Erwartet: Die Gruppen bleiben, `prerequisite` wird beim Speichern genau so geschrieben. Ein Klick auf ein Voraussetzungs-Häkchen löscht die Gruppen. Test in Task 2 und 3.
3. **«Baum ändern», unveränderter Name.** Erwartet: kein Sprachschlüssel für diesen Fokus in der Mod. Ein geänderter Name landet nur im Ersatz-Ordner. Test in Task 3.
4. **Ein Fokus verweist auf einen geteilten Fokus.** Erwartet: Die Voraussetzung zeigt auf die gesperrte Karte und wird mit der Spielkennung geschrieben. Die gesperrte Karte selbst wird nicht geschrieben. Test in Task 2 und 3.
5. **Import vor dem Neu-Einlesen** (kein `spielfokus` im Speicher). Erwartet: verständlicher Hinweis im Dialog, kein Absturz. Test in Task 5 (Selbsttest-Helfer).

---

### Task 1: Spieldaten

**Files:** Modify `src/leser/spielordner.js`, `src/speicher/indexeddb.js`, `src/ui/zustand.js` (Speichern beim Einlesen), `src/selbsttest/mini-spielordner.js` · Test `tests/leser/spielordner.test.js`, `tests/speicher/indexeddb.test.js`

**Interfaces:**
- `spieldaten.spielFokusbaeume` und `spielfokus` nach Spec §2.
- `weitere` ist `schreibeParadox` der übrigen Einträge.
- `verfuegbar` und `belohnung` sind Eintragslisten (AST).
- `bericht.fokusbaeume` und `bericht.spielFokusse`.

**Ergänzung Mini-Spielordner** (Format des Spiels):
- `common/national_focus/germany.txt` mit dem Baum `german_focus`:
  - `country = { factor = 0 modifier = { add = 10 tag = GER } }`
  - `default = no`
  - `continuous_focus_position = { x = 50 y = 1100 }`
  - `shared_focus = SHARED_army`
- Fokusse:
  - `GER_rhineland`: `x = 5`, `y = 0`, `cost = 10`, `icon = GFX_goal_generic_construct_civ_factory`. Belohnung `add_political_power = 120`, `add_stability = 0.05` und `GER = { add_state_core = 1 }`. `ai_will_do = { factor = 5 }`, `search_filters = { FOCUS_FILTER_POLITICAL }`.
  - `GER_anschluss`: `relative_position_id = GER_rhineland`, `x = 1`, `y = 1`, `prerequisite = { focus = GER_rhineland }`, `available = { has_completed_focus = GER_rhineland is_puppet = no }`
  - `GER_army`: `relative_position_id = GER_anschluss`, `x = -2`, `y = 1`. `prerequisite = { focus = GER_rhineland }` und `prerequisite = { focus = GER_anschluss focus = SHARED_army }` (das ist «A und (B oder C)»). Dazu `offset = { x = 3 y = 0 trigger = { has_dlc = "x" } }`.
  - `GER_kreis_a`: relativ zu `GER_kreis_b`, `x = 9`, `y = 0`
  - `GER_kreis_b`: relativ zu `GER_kreis_a`, `x = 10`, `y = 0`
  - `GER_navy`: `x = @navy_x` (in der Datei oben `@navy_x = 8`), `y = 0`, `mutually_exclusive = { focus = GER_rhineland }`, Belohnung `add_ideas = deutsche_industrie`
- `common/national_focus/shared.txt`: `shared_focus = { id = SHARED_army icon = GFX_goal_generic_army_doctrines x = 2 y = 0 cost = 10 }`
- Sprache: `GER_rhineland` «Rheinland», `GER_rhineland_desc` «Zurück an den Rhein.», `SHARED_army` «Heeresreform»

- [ ] **Step 1: Failing tests**

```js
expect(LESER_VERSION).toBe(10)
expect(sd.spielFokusbaeume).toEqual([{ id: 'german_focus', datei: 'common/national_focus/germany.txt', land: 'GER', anzahl: 6 }])
const b = spielfokus.baeume.german_focus
const f = (id) => b.fokusse.find(x => x.id === id)
expect(b.geteilt).toEqual(['SHARED_army'])
expect(b.weitere).toContain('continuous_focus_position')
expect(b.weitere).not.toContain('GER_rhineland')
expect(f('GER_rhineland')).toMatchObject({ name: 'Rheinland', beschreibung: 'Zurück an den Rhein.', symbol: 'GFX_goal_generic_construct_civ_factory', x: 5, y: 0, dauer: 10, voraussetzungen: [], ausschluss: [] })
expect(f('GER_rhineland').weitere).toContain('search_filters')
expect(f('GER_rhineland').weitere).toContain('ai_will_do')
expect(f('GER_anschluss')).toMatchObject({ x: 6, y: 1, voraussetzungen: [['GER_rhineland']] })
expect(f('GER_army')).toMatchObject({ x: 4, y: 2, voraussetzungen: [['GER_rhineland'], ['GER_anschluss', 'SHARED_army']] })   // Review Focus 1, offset ignoriert
expect([f('GER_kreis_a').x, f('GER_kreis_b').x]).toEqual([9, 10])   // Review Focus 1: Kreis
expect(f('GER_navy')).toMatchObject({ x: 8, ausschluss: ['GER_rhineland'] })
expect(f('GER_anschluss').name).toBe('GER_anschluss')
expect(spielfokus.geteilt.SHARED_army).toEqual({ id: 'SHARED_army', name: 'Heeresreform', symbol: 'GFX_goal_generic_army_doctrines', x: 2, y: 0 })
expect(sd.bericht).toMatchObject({ fokusbaeume: 1, spielFokusse: 6 })
```

Dazu der Speicher: `speichereSpieldaten(db, { spieldaten, karte, bilder, spielfokus })` und danach `ladeSpielfokus(db)` ergibt dasselbe Objekt. Ohne Eintrag kommt `null`.
- [ ] **Step 2: Run** `npx vitest run tests/leser tests/speicher`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Spieldaten fuer Fokusbaeume aus dem Spiel"`

---

### Task 2: Import und Projektdaten

**Files:** Create `src/projekt/fokus-import.js` · Modify `src/projekt/fokus.js` (gesperrte Fokusse; Gruppen löschen bei `setzeVoraussetzung` und bei `aendereFokus` mit `voraussetzungsArt`) · Test `tests/projekt/fokus-import.test.js`

**Interfaces:**
- `importiereSpielbaum(p, sd, spielfokus, baumId, art, landTag?) → [p, neueBaumId]` nach Spec §3.
- `uebersetzeWirkungen(eintraege, sd) → Wirkung[]` und `uebersetzeBedingungen(eintraege, idVon) → Bedingungsblock`, beide exportiert.
- `verschiebeFokus` und `entferneFokus` lassen gesperrte Fokusse unverändert.

- [ ] **Step 1: Failing tests** (mit `spielfokus` aus dem Mini-Spielordner)
  - **`aendern`:**
    - Der Baum hat `land: 'GER'`, `herkunft: { art: 'aendern', spielId: 'german_focus', datei, geteilt: ['SHARED_army'] }` und `name: 'Deutschland (aus dem Spiel)'`.
    - Er hat 7 Fokusse: 6 aus dem Baum und `SHARED_army` gesperrt bei (2,0).
    - `GER_rhineland`:
      - `spielId: 'GER_rhineland'`, `spielName: 'Rheinland'`, `kiGewicht: null`
      - Belohnung `[politische_macht 120, stabilitaet 5, code «GER = {…}» mit ausSpiel]`
    - `GER_anschluss.verfuegbar`: `{ modus: 'alle', liste: [fokus_erledigt → id von GER_rhineland, code «is_puppet = no»] }`
    - `GER_army` (**Review Focus 2/4**):
      - `voraussetzungsGruppen: [[id(GER_rhineland)], [id(GER_anschluss), id(SHARED_army)]]`
      - `voraussetzungen` ist die flache Vereinigung
    - `GER_navy`: Ausschluss beidseitig mit `GER_rhineland`, Belohnung `spielgeist_hinzu deutsche_industrie`
    - Alle Fokusse haben eine eindeutige `nummer`.
  - **`vorlage` für FRA:**
    - `land: 'FRA'`, `herkunft.art: 'vorlage'`, kein `spielId`
    - Bausteine wie oben
  - **Bearbeiten:**
    - `setzeVoraussetzung` auf `GER_army` löscht `voraussetzungsGruppen` (**Review Focus 2**).
    - `verschiebeFokus` und `entferneFokus` auf `SHARED_army` geben `p` zurück.
- [ ] **Step 2: Run** `npx vitest run tests/projekt/fokus-import.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Fokusbaeume aus dem Spiel importieren"`

---

### Task 3: Erzeuger

**Files:** Modify `src/erzeuger/fokus.js` · Test `tests/erzeuger/fokus-import.test.js`

**Interfaces:** Spec §4.

- [ ] **Step 1: Failing tests** (streng zurückgeparst)
  - **`aendern`-Import von `german_focus`**, Name von `GER_anschluss` geändert in «Anschluss», dazu ein neuer Fokus «Neu»:
    - Datei `mod/mein_reich/common/national_focus/germany.txt` mit `focus_tree.id = german_focus`
    - `country`, `default` und `continuous_focus_position` stehen dort, wie im Spiel einmal.
    - `shared_focus = SHARED_army`
    - kein Fokus mit der id `SHARED_army`
    - Fokus-ids `GER_rhineland` … sowie `mein_reich_fokus_<n>` für «Neu»
    - `GER_rhineland` enthält `search_filters`, `ai_will_do.factor = 5`, `completion_reward` mit `add_political_power = 120` und `GER = { add_state_core = 1 }`.
    - `GER_army` hat genau die zwei `prerequisite`-Blöcke `{ focus = GER_rhineland }` und `{ focus = GER_anschluss focus = SHARED_army }` (**Review Focus 2/4**).
    - Ersatz-Sprachdatei: `GER_anschluss` = «Anschluss». Die normale Sprachdatei enthält weder `GER_rhineland` noch `GER_anschluss` (**Review Focus 3**), wohl aber den neuen Fokus.
    - `fehler` ist `[]`.
  - **`vorlage` für FRA:**
    - Die Datei liegt unter dem üblichen Pfad `mein_reich_<baumKennung>.txt`.
    - Es gibt den eigenen `country`-Block mit `tag = FRA` und `shared_focus = SHARED_army`.
    - Die Fokusse haben die Kennungen `mein_reich_fokus_*`, die Voraussetzungen sind übersetzt, `SHARED_army` behält seinen Namen.
    - Alle Namen stehen in der normalen Sprachdatei.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (die bestehenden Fokus-Tests bleiben grün).
- [ ] **Step 5: Commit** – `"Importierte Fokusbaeume erzeugen"`

---

### Task 4: Prüfregeln

**Files:** Modify `src/pruefung/regeln.js` · Test `tests/pruefung/fokus-import.test.js`

**Interfaces:**
- `fokus-spielcode-vorlage` und `fokus-spiel-geloescht` nach Spec §5. Für `fokus-spiel-geloescht` braucht die Prüfung die Liste der Fokuskennungen des Spielbaums.
- Dafür bekommt `herkunft` beim Import `spielFokusIds: [id]`.
- Gesperrte Fokusse sind von `fokus-symbol` und `fokus-beschreibung` ausgenommen.

- [ ] **Step 1: Failing tests:**
  - `aendern`-Import ohne Änderung meldet nur erlaubte Hinweise: keine Fehler, kein `fokus-symbol`.
  - Einen Fokus löschen ergibt `fokus-spiel-geloescht`.
  - `vorlage`-Import ergibt `fokus-spielcode-vorlage` mit der Anzahl 2 (der `GER = {…}`-Baustein und `is_puppet = no`).
  - Ein Code-Baustein mit Klammerfehler ergibt `baustein`.
- [ ] **Step 2: Run** `npx vitest run tests/pruefung`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln fuer importierte Fokusbaeume"`

---

### Task 5: Oberfläche, Selbsttest, Anleitung

**Files:** Modify `src/ui/fokus/baeume.jsx` (Import-Dialog), `src/ui/fokus/raster.jsx` (gesperrte Karten), `src/ui/fokus/fokus-seite.jsx`, `src/ui/bausteine/wirkungen.jsx` und `bedingungen.jsx` (Vermerk «aus dem Spiel»), `src/ui/zustand.js` (`aktionen.ladeSpielfokus()`), `src/ui/stil.css`, `src/selbsttest/szenario.js`, `README.md`

**Interfaces:** Test-IDs aus Spec §6. Gesperrte Karten: `fokus-<id>` mit Klasse `gesperrt`, ohne Griff.

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Bedingungen» (Fokus):
  - «Spielbaum ändern»:
    - `nav-fokusbaeume`, `klicke('baum-aus-spiel')`, `tippe('spielbaum-suche', 'german')`, `klicke('spielbaum-german_focus')`
    - `waehle('spielbaum-art', 'aendern')`, `klicke('spielbaum-importieren')`
    - Der Editor zeigt 7 Karten, davon eine `gesperrt`.
    - Bei `GER_anschluss` `tippe('fokus-name', 'Anschluss')`
    - Neuer Fokus per Doppelklick auf eine freie Zelle, Name «Neu»
  - «Spielbaum als Vorlage»:
    - Dialog erneut öffnen, `waehle('spielbaum-art', 'vorlage')`, `waehle('spielbaum-land', 'FRA')`, importieren
    - Die Prüfung zeigt `meldung-fokus-spielcode-vorlage-0`.
  - In «Speichern in Ordner»:
    - `mod/selbsttest_reich/common/national_focus/germany.txt` parst streng und enthält `GER_rhineland` und `shared_focus = SHARED_army`.
    - Die Ersatz-Sprachdatei enthält `GER_anschluss:`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Spielbaum ändern».
- [ ] **Step 3: Implementieren.**
  - Der Dialog zeigt ohne `spielfokus` den Hinweis «Bitte den Spielordner neu einlesen» (**Review Focus 5**, ein Selbsttest-Schritt prüft das über einen leeren Speicher nicht; das ist abgedeckt durch `ladeSpielfokus → null`).
  - README: Abschnitt Etappe 4 um «Fokusbäume aus dem Spiel» ergänzen. Unter Grenzen: geteilte Fokusse gesperrt; bedingte Verschiebungen (`offset`) entfallen.
- [ ] **Step 4: Run** `npx vitest run && npm run selbsttest`. Expected: alles grün.
- [ ] **Step 5: Commit** – `"Etappe 4f: Oberflaeche, Selbsttest, Anleitung"`
