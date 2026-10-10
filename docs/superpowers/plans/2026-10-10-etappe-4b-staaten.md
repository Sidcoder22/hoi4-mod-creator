# HOI4 Mod Creator – Etappe 4b (Staaten bearbeiten) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jeder Staat auf der Karte lässt sich bearbeiten:
- **Staat:** Name, Einwohner, Kategorie, Extra-Bauplätze, Gebäude, Ressourcen
- **Provinz:** Siegpunkte mit Namen, Provinz-Gebäude

Die Mod enthält danach die angepasste Staatsdatei und die neuen Namen.

**Architecture:** Der Leser sammelt Gebäudearten, Ressourcen, Kategorien, Küsten und die Werte pro Staat. Das Projekt speichert in `projekt.staaten` nur Abweichungen vom Spiel. Die reinen Funktionen in `src/projekt/staaten.js` löschen dabei jeden Wert, der wieder dem Spiel entspricht. `aendereStaatsdatei` wendet die Abweichungen auf die kopierte Staatsdatei an, im selben Schritt wie Besitzerwechsel und Bevölkerung ±%.

**Tech Stack:** wie bisher (Vite 8, Preact 11, Vitest 5, puppeteer-core).

**Spec:** `docs/superpowers/specs/2026-10-10-etappe-4b-staaten-design.md`

## Global Constraints

Alle Global Constraints aus Etappe 1–4a gelten weiter, zusätzlich:

- `LESER_VERSION = 6`.
- Datumsblöcke in Staatsdateien bleiben unverändert. Geändert werden nur die oberste Ebene des Staats und die oberste Ebene von `history`.
- Eine feste Einwohnerzahl (`einwohner`) hat Vorrang vor dem Bevölkerungs-Faktor des Landes.
- Neue Namen gehen über `k.sprache.ersetze(schluessel, text)` in den Ersatz-Ordner:
  - Staatsname unter dem `nameSchluessel` des Staats
  - Siegpunkt-Name unter `VICTORY_POINTS_<provinz>`
- Das Ziel aller neuen Prüfmeldungen ist `{ bereich: 'staat', id: staatId }`.

## Review Focus

1. **Gebäude, die es nur in einem Datumsblock gibt** (zum Beispiel `1939.1.1 = { buildings = { arms_factory = 2 } }`). Erwartet: Der Leser zählt sie nicht zum Spielwert, der Erzeuger lässt den Datumsblock unverändert. Test in Task 1 und 3.
2. **Staat, der den Besitzer wechselt und gleichzeitig bearbeitet wird, dazu ein Bevölkerungs-Faktor beim Land.** Erwartet: genau eine Datei mit neuem Besitzer, geänderten Werten und fester Einwohnerzahl ohne Faktor. Test in Task 3.
3. **Wert ändern und wieder auf den Spielwert stellen.** Erwartet: Der Eintrag verschwindet aus `projekt.staaten`, und es wird keine Staatsdatei geschrieben. Test in Task 2 und 3.
4. **Staatsdatei ohne `history`, `buildings` oder `resources`.** Erwartet: Die Blöcke werden angelegt, die Datei parst streng. Test in Task 3.
5. **Spiel-Update entfernt einen Staat oder eine Kategorie.** Erwartet: Fehler in der Prüfung, kein Absturz in Oberfläche und Erzeuger. Test in Task 4.

---

### Task 1: Spieldaten für Staaten

**Files:** Modify `src/leser/spielordner.js`, `src/leser/karte.js` (`parseDefinition` liest `kueste`), `src/selbsttest/mini-spielordner.js` · Test `tests/leser/spielordner.test.js`, `tests/leser/karte.test.js`

**Interfaces:**
- `parseDefinition` gibt zusätzlich `kueste: boolean` zurück (Spalte 6, `true`, ohne Rücksicht auf Gross-/Kleinschreibung).
- Die neuen Felder in `spieldaten` sind genau die aus Spec §2:
  - `gebaeudeArten: [{ id, name, maxStufe, provinz, kueste, gemeinsamerPlatz }]`
  - `ressourcenArten: [{ id, name }]`
  - `staatsKategorien: [{ id, name, bauplaetze }]`
  - `provinzKueste: { [id]: true }`
  - `siegpunktNamen: { [provinz]: name }`
  - pro Staat: `gebaeude`, `provinzGebaeude`, `ressourcen`, `siegpunkte`, `nameSchluessel`
- Werte in Datumsblöcken (Schlüssel wie `1939.1.1`) werden nicht gelesen.
- `bericht.gebaeudeArten`, `bericht.ressourcenArten`, `bericht.staatsKategorien`

**Ergänzung Mini-Spielordner:**
- `common/buildings/00_buildings.txt`:
  - `industrial_complex` und `arms_factory`: `max_level = 15`, `shares_slots = yes`
  - `infrastructure`: `max_level = 5`
  - `naval_base`: `max_level = 10`, `provincial = yes`, `only_coastal = yes`
  - `bunker`: `max_level = 10`, `provincial = yes`
- `common/resources/00_resources.txt`: `resources = { oil = { cic = 0.125 } steel = { cic = 0.125 } }`
- `common/state_category/00_state_categories.txt`: `state_categories = { town = { local_building_slots = 4 } large_town = { local_building_slots = 5 } city = { local_building_slots = 6 } megalopolis = { local_building_slots = 12 } }`
- Sprache:
  - `industrial_complex` «Zivilfabrik», `arms_factory` «Militärfabrik», `naval_base` «Marinestützpunkt»
  - `oil` «Öl»
  - `city` «Stadt», `town` «Kleinstadt»
  - `VICTORY_POINTS_1` «Berlin»
- Staat 1 (Brandenburg):
  - `resources = { steel = 12 }`
  - in `history.buildings`: `1 = { bunker = 2 }`
  - dazu `1939.1.1 = { buildings = { arms_factory = 2 } }`
- `definition.csv`: Provinz 4 (Bern) bekommt `true` als Küste, damit es eine Küstenprovinz auf Land gibt.

- [ ] **Step 1: Failing tests**

```js
expect(LESER_VERSION).toBe(6)
expect(sd.gebaeudeArten.slice(0, 2).map(g => g.id)).toEqual(['arms_factory', 'industrial_complex'])
expect(sd.gebaeudeArten.find(g => g.id === 'naval_base')).toEqual({ id: 'naval_base', name: 'Marinestützpunkt', maxStufe: 10, provinz: true, kueste: true, gemeinsamerPlatz: false })
expect(sd.ressourcenArten).toEqual([{ id: 'oil', name: 'Öl' }, { id: 'steel', name: 'Stahl' }])
expect(sd.staatsKategorien.map(k => [k.id, k.bauplaetze])).toEqual([['town', 4], ['large_town', 5], ['city', 6], ['megalopolis', 12]])
expect(sd.provinzKueste).toEqual({ 4: true, 8: true })
expect(sd.staaten[1]).toMatchObject({ nameSchluessel: 'STATE_1', gebaeude: { infrastructure: 4, industrial_complex: 3 },
  provinzGebaeude: { 1: { bunker: 2 } }, ressourcen: { steel: 12 }, siegpunkte: { 1: 20 } })
expect(sd.staaten[3]).toMatchObject({ gebaeude: {}, provinzGebaeude: {}, ressourcen: {}, siegpunkte: {} })
expect(sd.siegpunktNamen).toEqual({ 1: 'Berlin' })
// Rueckfall ohne Dateien
expect(ohne.gebaeudeArten.map(g => g.id)).toEqual(expect.arrayContaining(['industrial_complex', 'arms_factory', 'dockyard', 'infrastructure', 'air_base', 'anti_air_building', 'radar_station', 'naval_base', 'bunker', 'coastal_bunker']))
expect(ohne.ressourcenArten.map(r => r.id)).toEqual(['oil', 'aluminium', 'rubber', 'tungsten', 'steel', 'chromium'])
```

- [ ] **Step 2: Run** `npx vitest run tests/leser`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** `staatsKategorien` hat ohne Dateien als Rückfall: `wasteland 0, enclave 0, tiny_island 0, pastoral 1, small_island 1, rural 2, town 4, large_town 5, city 6, large_city 8, metropolis 10, megalopolis 12`.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (bestehende exakte Erwartungen um die neuen Felder ergänzen).
- [ ] **Step 5: Commit** – `"Spieldaten fuer Staaten"`

---

### Task 2: Projektdaten für Staatsänderungen

**Files:** Create `src/projekt/staaten.js` · Modify `src/projekt/modell.js` · Test `tests/projekt/staaten.test.js`

**Interfaces** (alle rein, `p` → neues `p`; ein Wert gleich dem Spielwert löscht den Schlüssel, und leere Objekte werden aufgeräumt):
- `aendereStaat(p, sd, staatId, patch)`: Schlüssel `name`, `einwohner`, `kategorie`, `extraBauplaetze`. Der Spielwert von `extraBauplaetze` ist 0. Ein leerer `name` gilt als Spielwert.
- `setzeGebaeude(p, sd, staatId, art, stufe)`
- `setzeRessource(p, sd, staatId, art, menge)`
- `setzeProvinz(p, sd, staatId, provinzId, feld, wert)`: `feld` ist `'siegpunkte'` oder `'siegpunktName'`.
- `setzeProvinzGebaeude(p, sd, staatId, provinzId, art, stufe)`
- `verwerfeStaat(p, staatId)`
- `effektiveStaatswerte(p, sd, staatId) → { name, einwohner, kategorie, extraBauplaetze, bauplaetze, belegt, gebaeude, ressourcen, siegpunkte, siegpunktNamen, provinzGebaeude }`
  - `bauplaetze` = Plätze der Kategorie (0, wenn unbekannt) + `extraBauplaetze`
  - `belegt` = Summe der Stufen der Gebäude mit `gemeinsamerPlatz`
  - Fehlt der Staat im Spiel, kommt `null` zurück.
- `neuesProjekt` erhält `staaten: {}`, und `ergaenzeProjekt` ergänzt `staaten: {}`.

- [ ] **Step 1: Failing tests**

```js
let p = setzeGebaeude(neuesProjekt('M'), sd, 3, 'industrial_complex', 2)
expect(p.staaten).toEqual({ 3: { gebaeude: { industrial_complex: 2 } } })
expect(effektiveStaatswerte(p, sd, 3)).toMatchObject({ kategorie: 'town', bauplaetze: 4, belegt: 2, gebaeude: { industrial_complex: 2 } })
// Review Focus 3
expect(setzeGebaeude(p, sd, 3, 'industrial_complex', 0).staaten).toEqual({})
p = aendereStaat(p, sd, 1, { name: 'Mark', einwohner: 2500000, kategorie: 'city' })
expect(p.staaten[1]).toEqual({ name: 'Mark' })
p = setzeRessource(p, sd, 1, 'steel', 12)
expect(p.staaten[1].ressourcen).toBeUndefined()
p = setzeProvinz(setzeProvinz(p, sd, 1, 1, 'siegpunkte', 25), sd, 1, 1, 'siegpunktName', 'Neu-Berlin')
expect(p.staaten[1].provinzen).toEqual({ 1: { siegpunkte: 25, siegpunktName: 'Neu-Berlin' } })
p = setzeProvinzGebaeude(p, sd, 1, 1, 'bunker', 2)
expect(p.staaten[1].provinzen[1].gebaeude).toBeUndefined()
expect(verwerfeStaat(p, 1).staaten[1]).toBeUndefined()
expect(effektiveStaatswerte(p, sd, 999)).toBeNull()
expect(ergaenzeProjekt({ ...neuesProjekt('A'), staaten: undefined }, sd).staaten).toEqual({})
```

- [ ] **Step 2: Run** `npx vitest run tests/projekt/staaten.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (die exakten Erwartungen an `neuesProjekt` ergänzen).
- [ ] **Step 5: Commit** – `"Projektdaten fuer Staatsaenderungen"`

---

### Task 3: Erzeuger – Staatsdatei und Namen

**Files:** Modify `src/erzeuger/kern.js` (`aendereStaatsdatei`), `src/erzeuger/index.js`, Create `src/erzeuger/staaten.js` · Test `tests/erzeuger/staaten.test.js`, `tests/erzeuger/kern.test.js`

**Interfaces:**
- `aendereStaatsdatei(text, { neuerBesitzer, kernAltEntfernen, manpowerFaktor, staat })`. `staat` ist eine `Staatsaenderung` aus Spec §3.
  - Mit `staat.einwohner` wird `manpowerFaktor` ignoriert.
  - Alle Regeln aus Spec §4.
  - Das Ergebnis beginnt wie bisher mit `# Geaendert durch HOI4 Mod Creator`.
- `erzeugeStaaten(k)` steht in `ERZEUGER` vor `erzeugeIdeen`:
  - Für jeden Eintrag in `projekt.staaten` ruft es `k.staatAenderung(staatId, aenderung)` auf.
  - Namen schreibt es über `k.sprache.ersetze`.
- Erzeuger-Kontext: `staatAenderung(staatId, aenderung)` merkt die Änderung vor. Die Schleife «Staatsdateien» am Ende von `erzeugeMod` nimmt dafür die Vereinigung aus `staatsAenderungen`, `manpower` und den neuen Änderungen. Danach übergibt sie `staat` an `aendereStaatsdatei`.

- [ ] **Step 1: Failing tests** (`tests/erzeuger/staaten.test.js`, streng zurückgeparst)
  - Brandenburg mit diesen Änderungen:
    - `name: 'Mark'`, `einwohner: 3000000`, `kategorie: 'megalopolis'`, `extraBauplaetze: 2`
    - `gebaeude: { industrial_complex: 5, infrastructure: 0 }`
    - `ressourcen: { oil: 8, steel: 0 }`
    - `provinzen: { 1: { siegpunkte: 30, siegpunktName: 'Neu-Berlin', gebaeude: { bunker: 0 } }, 2: { siegpunkte: 5 } }`
  - Erwartet in der Datei:
    - `manpower = 3000000`, `state_category = megalopolis`
    - `resources` nur mit `oil = 8`
    - `history.buildings`: `industrial_complex = 5`, keine `infrastructure`, kein Provinz-Block `1`
    - `history.victory_points`: genau die Paare `{ 1 30 }` und `{ 2 5 }`
    - `history.add_extra_state_shared_building_slots = 2`
  - **Review Focus 1:** Der Block `1939.1.1` ist unverändert, mit `arms_factory = 2`.
  - Ersatz-Sprachdatei: `STATE_1` = «Mark», `VICTORY_POINTS_1` = «Neu-Berlin».
  - **Review Focus 2:** Brandenburg gehört dem neuen Land MRE (`testprojekt`). Das Land hat Bevölkerung +50 %, und für Brandenburg gibt es die Änderung `einwohner: 1000000`. Ergebnis: genau eine Datei `history/states/1-Brandenburg.txt` mit `owner = MRE` und `manpower = 1000000`. Bayern im selben Land bekommt den Faktor.
  - **Review Focus 3:** Ein Projekt, dessen `staaten` nach Setzen und Zurücksetzen leer ist, schreibt keine Datei für Bern.
  - **Review Focus 4:** `aendereStaatsdatei('state = {\n\tid = 3\n\tprovinces = { 4 }\n}\n', { staat: { gebaeude: { industrial_complex: 1 }, ressourcen: { oil: 2 }, provinzen: { 4: { siegpunkte: 3 } } } })` parst streng und enthält `history`, `buildings`, `resources` und `victory_points`.
  - `fehler` ist `[]`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Staaten erzeugen"`

---

### Task 4: Prüfregeln für Staaten

**Files:** Modify `src/pruefung/regeln.js`, `src/ui/pruefung.jsx` (`zielAnsicht` für `staat`) · Test `tests/pruefung/staaten.test.js`, `tests/ui/pruefung.test.js`

**Interfaces:**
- Die Regeln aus Spec §5:
  - `staat-bauplaetze`, `staat-stufe`, `staat-kueste`, `staat-provinz`, `staat-unbekannt`, `staat-kategorie`
  - `staat-unveraendert` als Hinweis
- Die Behebung von `staat-bauplaetze` ist `{ text: 'Bauplätze passend erhöhen', anwenden(p, sd) }`. Sie setzt `extraBauplaetze` auf `belegt − Plätze der Kategorie`.
- `zielAnsicht({ bereich: 'staat', id })` → `{ bereich: 'staat', id }`, ohne `id` → `{ bereich: 'staaten' }`.

- [ ] **Step 1: Failing tests**
  - Ein gültiges Projekt mit Änderungen an Bern meldet nichts Neues.
  - Je Regel ein Fall:
    - `staat-bauplaetze`: Bern (town, 4 Plätze) mit `industrial_complex: 3, arms_factory: 2`. Danach wendet der Test die Behebung an und erwartet `extraBauplaetze: 1` und keine Meldung mehr.
    - `staat-stufe`: Infrastruktur 6.
    - `staat-kueste`: `naval_base` in Provinz 1.
    - `staat-provinz`: Provinz 5 in Bern.
    - `staat-unbekannt`: Eintrag für Staat 999.
    - `staat-kategorie`: Kategorie `gibtsnicht`.
    - `staat-unveraendert`: von Hand gesetzter Eintrag `{ 3: { einwohner: 900000 } }`. Die Behebung entfernt ihn.
  - **Review Focus 5:** Staat 999 und unbekannte Kategorie lassen weder `pruefeProjekt` noch `erzeugeMod` werfen.
- [ ] **Step 2: Run** `npx vitest run tests/pruefung tests/ui`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln fuer Staaten"`

---

### Task 5: Oberfläche – Bereich «Staaten»

**Files:** Create `src/ui/staaten/staaten.jsx`, `src/ui/staaten/staat-seite.jsx` · Modify `src/ui/app.jsx`, `src/ui/karte.jsx` (optionaler Rand für geänderte Staaten über `hervorheben`), `src/ui/stil.css`, `src/selbsttest/szenario.js`

**Interfaces:**
- `BEREICHE` erhält `{ id: 'staaten', text: 'Staaten', ansicht: StaatenAnsicht }` nach `laender`.
- `UNTERANSICHTEN.staat = StaatenAnsicht`, und `OBERBEREICH.staat = 'staaten'`.
- `StaatenAnsicht`:
  - Links Staatsuche und `<Karte test="karte-staaten">` mit Länderfarben. Die geänderten Staaten sind hervorgehoben.
  - Darunter die Liste `geaendert-<id>`.
  - Ein Klick wählt den Staat über `aktionen.gehe({ bereich: 'staat', id })`.
  - Rechts `StaatSeite` (`data-test="staat-seite"`) mit den Test-IDs aus Spec §6.
  - «↺ Spielwert» heisst `<test>-zurueck` und setzt das Feld auf den Spielwert.
  - Zahlenfelder speichern über die Funktionen aus Task 2, mit `gruppe` für den Verlauf.

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Diplomatie»:
  - «Staat bearbeiten»:
    - `nav-staaten`, `klickeKarte('karte-staaten', 3)` → `staat-seite` zeigt «Bern»
    - `tippe('staat-name', 'Bärn')`
    - `klicke('gebaeude-industrial_complex-plus')` → `projekt.staaten[3].gebaeude.industrial_complex === 1`
    - `tippe('ressource-oil', '6')`
    - `tippe('provinz-4-siegpunkte', '10')`, `tippe('provinz-4-name', 'Bärn Stadt')`
    - `staat-belegung` enthält «1 von 4»
    - `klicke('provinz-4-naval_base-plus')` funktioniert, weil Provinz 4 an der Küste liegt
    - `geaendert-3` ist sichtbar
  - «Bauplätze»:
    - `tippe('gebaeude-arms_factory', '4')`
    - In `nav-pruefung` steht `meldung-staat-bauplaetze-0`. Ein Klick auf `behebung-staat-bauplaetze-0` setzt `extraBauplaetze` auf 1.
  - «Spielwert»: `tippe('staat-einwohner', '1000000')`, dann `klicke('staat-einwohner-zurueck')` → `einwohner` ist nicht mehr gesetzt.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Staat bearbeiten».
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npm run selbsttest` und `npx vitest run`. Expected: OK, PASS.
- [ ] **Step 5: Commit** – `"Staaten-Editor"`

---

### Task 6: Durchgang bis zur gespeicherten Mod, Anleitung

**Files:** Modify `src/selbsttest/szenario.js`, `README.md`

- [ ] **Step 1: Selbsttest (failing):** Im Schritt «Speichern in Ordner» gilt für `mod/selbsttest_reich/history/states/3-Bern.txt`:
  - Die Datei parst streng.
  - Sie enthält `industrial_complex = 1`, `arms_factory = 4`, `oil = 6`, `add_extra_state_shared_building_slots = 1` und `naval_base = 1`.
  - Die Ersatz-Sprachdatei enthält `STATE_3` und `VICTORY_POINTS_4`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER, bis alles stimmt.
- [ ] **Step 3: Implementieren.** README:
  - Abschnitt «Etappe 4 bringt dazu» mit dem Staaten-Editor (was er kann; dass Datumsblöcke unverändert bleiben). Den Inhalt von 4a dort auch kurz nennen.
  - Unter Grenzen: «Ob das Spiel zusätzliche Bauplätze aus dem Startblock eines Staats übernimmt, zeigt erst der Spieltest.»
- [ ] **Step 4: Run** `npx vitest run && npm run selbsttest`. Expected: alles grün.
- [ ] **Step 5: Commit** – `"Etappe 4b: Durchgang und Anleitung"`
