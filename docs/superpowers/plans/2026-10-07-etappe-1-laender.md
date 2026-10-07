# HOI4 Mod Creator – Etappe 1 (Grundgerüst und Länder) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine Offline-HTML-Datei, die den HOI4-Spielordner einliest und mit der ein Anfänger ein neues Land erstellt oder ein bestehendes ändert und das Ergebnis als spielbare Mod speichert.

**Architecture:** Vier DOM-freie Schichten (Leser → Spieldaten, Projektmodell, Erzeuger, Prüfung) plus Speicher-Adapter und eine Preact-Oberfläche. Der Erzeuger liefert eine Liste `{ pfad, inhalt }` relativ zum HOI4-Benutzerordner. Dieselbe Liste geht in den Ordner-Schreiber und in den ZIP-Schreiber. Für die Oberfläche gibt es einen Selbsttest (`?selbsttest`), der in Chrome die echte Oberfläche bedient.

**Tech Stack:** Vite 8, vite-plugin-singlefile 2, Preact 10, Vitest 5, fake-indexeddb (Tests), puppeteer-core (Selbsttest mit installiertem Chrome), Node 24.

**Spec:** `docs/superpowers/specs/2026-10-07-hoi4-mod-creator-design.md`

## Global Constraints

- Alle UI-Texte deutsch in Schweizer Rechtschreibung (ss statt ß, «» als Anführungszeichen). Fachbegriffe stehen höchstens in Klammern hinter einem Alltagswort.
- Quellcode-Kommentare deutsch. Bezeichner deutsch, wo es fachliche Begriffe sind.
- `src/leser`, `src/projekt`, `src/erzeuger`, `src/pruefung` und `src/speicher/zip.js` greifen weder auf DOM noch auf `window` zu und laufen unverändert in Node.
- Die Ausgabe ist **eine** Datei `dist/hoi4-mod-creator.html`. Sie läuft per `file://` in Chrome/Edge, ohne Netz und ohne externe Ressourcen (keine Webfonts, keine CDNs).
- Laufzeitabhängigkeit ist nur `preact`.
- Die Zeichenfolge `</script` darf in keiner Quelldatei stehen, weil das Skript in die HTML-Datei eingebettet wird.
- Mod-Skriptdateien (`.txt`, `.gfx`) enthalten nur ASCII, ausser es sind Kopien von Spieldateien (`kopie: true`).
- Sprachdateien sind UTF-8 mit BOM, haben Kopfzeile `l_german:` bzw. `l_english:` und CRLF-Zeilenenden. Jeder Text steht identisch deutsch und englisch drin.
- Flaggen: 32-Bit-TGA, unkomprimiert, Ursprung unten links, Grössen 82×52, 41×26, 10×7. Alle anderen Bilder: unkomprimiertes 32-Bit-DDS (A8R8G8B8).
- Jede erzeugte Kennung und jeder Dateiname trägt den `modid`-Präfix. Die `modid` erfüllt `/^[a-z][a-z0-9_]{0,19}$/`.
- Den Spielordner nur lesen. Im Benutzerordner nur Dateien löschen, die in der eigenen Dateiliste `hoi4-mod-creator-dateien.json` stehen.
- Es werden keine Daten ins Netz gesendet.

## Abweichungen vom Konzept (bewusst)

- Eigene Bilder liegen im Projekt als `{ breite, hoehe, rgba: Base64 }` statt als PNG-Data-URL. So braucht der Erzeuger keinen PNG-Decoder.
- Der Mini-Spielordner ist ein JS-Modul `src/selbsttest/mini-spielordner.js` statt eines Ordners `tests/fixtures`. Tests und Selbsttest nutzen dieselbe Quelle.
- Bei geänderten Ländern gibt es pro Reiter einen Schalter `aendern.<reiter>` anstelle von «fehlendes Feld = unverändert». Die Wirkung ist dieselbe, aber die Felder sind immer vorbefüllt.
- «Armee» gibt es nur für neue Länder. Bei bestehenden Ländern würde `oob` ihre ganze Armee ersetzen.
- Spielbilder dekodiert Etappe 1 nur für Flaggen, nationale Geister und generische Porträts. Etappe 2 erhöht `LESER_VERSION`, damit Fokus-Symbole nachgeladen werden.

## Review Focus

1. **Echte Spieldateien weichen vom Mini-Spielordner ab** (BOM, CRLF, Klammern in Kommentaren, kaputte Datei). Erwartet: Der Leser überspringt nur die kaputte Datei mit Warnung und bricht nicht ab. Test in Task 6.
2. **Falscher Ordner gewählt** (Steam-Hauptordner, Dokumente-Ordner). Erwartet: verständliche Meldung statt Absturz. Test in Task 6.
3. **Sonderzeichen in Namen** (Umlaute, «», `"`). Erwartet: Skripte und Dateinamen bleiben ASCII, die Texte erscheinen korrekt maskiert in der Sprachdatei. Test in Task 11.
4. **Erneutes Speichern, nachdem etwas entfernt wurde.** Erwartet: Veraltete eigene Dateien verschwinden, fremde Dateien im Mod-Ordner bleiben. Test in Task 14.
5. **`modid` nach dem ersten Speichern geändert.** Erwartet: ein Hinweis, dass eine zweite Mod entsteht. Test in Task 13.

---

## Dateistruktur

```
package.json, vite.config.js, hoi4-mod-creator.html, README.md
tools/selbsttest.mjs
src/main.jsx
src/leser/        paradox.js  yml.js  bmp.js  tga.js  dds.js  dateiquelle.js  karte.js  spielordner.js  fehlerlog.js
src/projekt/      modell.js  aenderungen.js  verlauf.js  abgeleitet.js  boni.js  base64.js
src/erzeuger/     bilder.js  flagge.js  kennungen.js  sprache.js  kern.js  ideen.js  land-neu.js  land-geaendert.js  index.js  ausgabepruefung.js
src/pruefung/     regeln.js
src/speicher/     zip.js  indexeddb.js  ordner.js
src/ui/           zustand.js  app.jsx  stil.css  start.jsx  spielordner.jsx  einstellungen.jsx  karte.jsx  staatsuche.jsx
                  bilder.js  bild-zuschnitt.jsx  farbe.js
                  laender/  uebersicht.jsx  land-editor.jsx  reiter-name.jsx  reiter-flagge.jsx  reiter-gebiet.jsx
                            reiter-regierung.jsx  reiter-anfuehrer.jsx  reiter-startwerte.jsx  reiter-geister.jsx
                  geister/  geister-liste.jsx  geist-editor.jsx
                  pruefung.jsx  speichern.jsx  spielfehler.jsx
src/selbsttest/   mini-spielordner.js  fake-ordner.js  helfer.js  szenario.js  selbsttest.js
tests/            spiegelt src/ (z. B. tests/leser/paradox.test.js)
```

---

### Task 1: Projektgerüst und Paradox-Parser

**Files:**
- Create: `package.json`, `vite.config.js`, `hoi4-mod-creator.html`, `src/main.jsx`, `src/leser/paradox.js`
- Test: `tests/leser/paradox.test.js`

**Interfaces:**
- Produces:
  - `parseParadox(text: string, { streng?: boolean }) → { eintraege: Inhalt, warnungen: string[] }`. Bei `streng` wirft er `ParadoxFehler` (mit `.zeile`), statt zu warnen.
  - Typen:
    - `Inhalt = Array<Eintrag | Wert>`
    - `Eintrag = { schluessel: string, op: '='|'<'|'>'|'<='|'>='|'!=', wert: Wert }`
    - `Wert = { typ: 'wort', text } | { typ: 'text', text } | { typ: 'block', inhalt: Inhalt, tag?: 'rgb'|'hsv' }`
  - `schreibeParadox(inhalt: Inhalt) → string`: Tab-Einzug. Reine Wertlisten stehen auf einer Zeile (`{ 1 2 3 }`), Texte in Anführungszeichen mit `\"`, Zeilenende `\n`.
  - Hilfen: `finde(inhalt, schluessel) → Eintrag|undefined` (erster Treffer), `findeAlle(inhalt, schluessel) → Eintrag[]`, `wertText(wert) → string`, `zahlen(wert) → number[]` (Zahlen eines Listenblocks).
  - `class ParadoxFehler extends Error { zeile }`

- [ ] **Step 1: Gerüst anlegen**
  - `npm init -y`, dann `"type": "module"` und die Skripte `"dev": "vite"`, `"build": "vite build"`, `"test": "vitest run"`, `"selbsttest": "vite build && node tools/selbsttest.mjs"`.
  - Installieren: `npm install preact` und `npm install -D vite@^8 vite-plugin-singlefile@^2 vitest@^5 fake-indexeddb puppeteer-core`.
  - `vite.config.js`:
    - `plugins: [viteSingleFile()]`
    - `esbuild: { jsx: 'automatic', jsxImportSource: 'preact' }`
    - `build.rollupOptions.input = 'hoi4-mod-creator.html'`
    - `test: { include: ['tests/**/*.test.js'], environment: 'node' }`
  - `hoi4-mod-creator.html`: `<title>HOI4 Mod Creator</title>`, `<div id="app">` und ein Modul-Skript auf `/src/main.jsx`.
  - `main.jsx` rendert vorerst `<h1>HOI4 Mod Creator</h1>`.

- [ ] **Step 2: Failing tests schreiben**

```js
const TEXT = '\uFEFFstate = { id = 64 # Kommentar mit }\r\n\tname = "STATE_64"\r\n\tprovinces = { 1 2 3 }\r\n' +
  '\thistory = { owner = GER 1939.1.1 = { owner = SOV } }\r\n}\r\nfarbe = rgb { 10 20 30 }\r\nlimit = { has_stability > 0.5 }\r\n'

test('liest Bloecke, Listen, Operatoren, Datumsschluessel und rgb', () => {
  const { eintraege, warnungen } = parseParadox(TEXT)
  expect(warnungen).toEqual([])
  const state = finde(eintraege, 'state').wert
  expect(wertText(finde(state.inhalt, 'id').wert)).toBe('64')
  expect(finde(state.inhalt, 'name').wert).toEqual({ typ: 'text', text: 'STATE_64' })
  expect(zahlen(finde(state.inhalt, 'provinces').wert)).toEqual([1, 2, 3])
  const hist = finde(state.inhalt, 'history').wert
  expect(finde(finde(hist.inhalt, '1939.1.1').wert.inhalt, 'owner').wert.text).toBe('SOV')
  expect(finde(eintraege, 'farbe').wert.tag).toBe('rgb')
  expect(finde(finde(eintraege, 'limit').wert.inhalt, 'has_stability').op).toBe('>')
})
test('behaelt doppelte Schluessel in Reihenfolge', () => {
  const { eintraege } = parseParadox('add_core_of = GER add_core_of = FRA')
  expect(findeAlle(eintraege, 'add_core_of').map(e => e.wert.text)).toEqual(['GER', 'FRA'])
})
test('maskierte Anfuehrungszeichen', () => {
  expect(finde(parseParadox('a = "sagt \\"hi\\""').eintraege, 'a').wert.text).toBe('sagt "hi"')
})
test('Schreiben und Lesen ergibt denselben Baum', () => {
  const { eintraege } = parseParadox(TEXT)
  expect(parseParadox(schreibeParadox(eintraege)).eintraege).toEqual(eintraege)
})
test('tolerant bei fehlender Klammer am Ende, streng wirft', () => {
  const r = parseParadox('a = { b = 1')
  expect(r.warnungen.length).toBe(1)
  expect(finde(finde(r.eintraege, 'a').wert.inhalt, 'b').wert.text).toBe('1')
  expect(() => parseParadox('a = { b = 1', { streng: true })).toThrow(ParadoxFehler)
  expect(parseParadox('a = 1 }').warnungen.length).toBe(1)
})
```

- [ ] **Step 3: Tests laufen lassen, sie schlagen fehl.** Run: `npx vitest run tests/leser/paradox.test.js`. Expected: FAIL (Modul fehlt).

- [ ] **Step 4: `src/leser/paradox.js` implementieren.**
  - Tokenizer: Wort-Zeichen sind alles ausser Leerraum, `{ } = < > ! " #`.
  - Kommentare gehen von `#` bis zum Zeilenende (nicht innerhalb von Texten). Ein BOM am Anfang wird ignoriert.
  - `rgb`/`hsv` direkt vor `{` werden zum `tag` des Blocks.

- [ ] **Step 5: Tests laufen lassen.** Expected: PASS. Zusätzlich Run: `npx vite build`. Expected: `dist/hoi4-mod-creator.html` existiert und enthält keinen Verweis auf externe `.js`-Dateien.

- [ ] **Step 6: Commit** – `git add -A && git commit -m "Projektgeruest und Paradox-Parser"`

---

### Task 2: Sprachdateien (YML)

**Files:** Create `src/leser/yml.js` · Test `tests/leser/yml.test.js`

**Interfaces:**
- Produces:
  - `parseYml(text) → { sprache: string|null, eintraege: Map<string,string> }`: `\"` wird zu `"`, `\n` bleibt wörtlich.
  - `schreibeYml(sprache: 'german'|'english', eintraege: Array<[schluessel, text]>) → Uint8Array`: BOM, `l_<sprache>:`, Zeilen ` KEY:0 "Text"`, CRLF. `"` wird zu `\"`, ein echter Zeilenumbruch zu `\n`.

- [ ] **Step 1: Failing tests**

```js
test('schreibt BOM, Kopf, CRLF und maskiert', () => {
  const b = schreibeYml('german', [['MRE', 'Mein «Reich»'], ['MRE_ADJ', 'sagt "hi"\nneu']])
  expect([...b.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF])
  expect(new TextDecoder().decode(b.slice(3))).toBe('l_german:\r\n MRE:0 "Mein «Reich»"\r\n MRE_ADJ:0 "sagt \\"hi\\"\\nneu"\r\n')
})
test('liest Kommentare, fehlende Versionsnummer und Anfuehrungszeichen im Text', () => {
  const r = parseYml('\uFEFFl_german:\n # Kommentar\n A:0 "eins" # hinten\n B: "zwei"\n C:1 "a "b" c"\n')
  expect(r.sprache).toBe('german')
  expect([...r.eintraege]).toEqual([['A', 'eins'], ['B', 'zwei'], ['C', 'a "b" c']])
})
test('Rundreise', () => {
  const t = new TextDecoder().decode(schreibeYml('english', [['X', 'sagt "hi"']]))
  expect(parseYml(t).eintraege.get('X')).toBe('sagt "hi"')
})
```

- [ ] **Step 2: Run** `npx vitest run tests/leser/yml.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** Der Text reicht von der ersten bis zur letzten `"` der Zeile.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Sprachdateien lesen und schreiben"`

---

### Task 3: Bildformate (BMP, TGA, DDS) und Skalieren

**Files:** Create `src/leser/bmp.js`, `src/leser/tga.js`, `src/leser/dds.js`, `src/erzeuger/bilder.js` · Test `tests/leser/bilder.test.js`

**Interfaces:**
- Produces:
  - `leseBmp(bytes) → { breite, hoehe, rgb: Uint8Array }`: 3 Byte pro Pixel, oben-nach-unten. Nur 24 Bit, sonst `Error`. Negative Höhe bedeutet oben-nach-unten.
  - `schreibeBmp24(rgb, breite, hoehe) → Uint8Array` (nur für den Mini-Spielordner)
  - `leseTga(bytes) → { breite, hoehe, rgba: Uint8ClampedArray }`: Typ 2 und 10, 24/32 Bit, beachtet Ursprungs-Bit 5
  - `leseDds(bytes) → { breite, hoehe, rgba } | null`: DXT1, DXT3, DXT5, unkomprimiert 32/24 Bit. Bei unbekanntem Format (z. B. `DX10`) `null`.
  - `ddsGroesse(bytes) → [breite, hoehe]`
  - `schreibeTga(rgba, breite, hoehe) → Uint8Array`: Kopf `[2]=2`, `[16]=32`, `[17]=8`, Zeilen unten-nach-oben, BGRA
  - `schreibeDds(rgba, breite, hoehe) → Uint8Array`:
    - Magic `DDS `, Kopfgrösse 124, Flags `0x100F`, Pitch `breite*4`
    - Pixelformat-Flags `0x41`, 32 Bit
    - Masken R `0x00FF0000`, G `0x0000FF00`, B `0x000000FF`, A `0xFF000000`
    - Caps `0x1000`, Daten BGRA
  - `skaliereRgba(rgba, b, h, zielB, zielH) → Uint8ClampedArray`: Flächenmittel beim Verkleinern, bilinear beim Vergrössern

- [ ] **Step 1: Failing tests**

```js
test('BMP unten-nach-oben mit Zeilenauffuellung', () => {
  const rgb = Uint8Array.from([255,0,0, 0,255,0, 0,0,255,  1,1,1, 2,2,2, 3,3,3]) // 3x2, oben zuerst
  const r = leseBmp(schreibeBmp24(rgb, 3, 2))
  expect([r.breite, r.hoehe]).toEqual([3, 2]); expect([...r.rgb]).toEqual([...rgb])
})
test('TGA Rundreise und Kopf', () => {
  const rgba = Uint8ClampedArray.from([10,20,30,255, 40,50,60,128])
  const b = schreibeTga(rgba, 2, 1)
  expect([b[2], b[16], b[17]]).toEqual([2, 32, 8])
  expect([...leseTga(b).rgba]).toEqual([...rgba])
})
test('TGA RLE', () => {
  const kopf = new Uint8Array(18); kopf[2] = 10; kopf[12] = 2; kopf[14] = 1; kopf[16] = 32; kopf[17] = 8 | 32
  const daten = Uint8Array.from([0x81, 30, 20, 10, 255]) // 2x dasselbe BGRA
  expect([...leseTga(Uint8Array.from([...kopf, ...daten])).rgba]).toEqual([10,20,30,255, 10,20,30,255])
})
test('DDS unkomprimiert Rundreise und Groesse', () => {
  const rgba = new Uint8ClampedArray(4 * 4 * 4).fill(200)
  const b = schreibeDds(rgba, 4, 4)
  expect(ddsGroesse(b)).toEqual([4, 4]); expect([...leseDds(b).rgba]).toEqual([...rgba])
})
test('DXT1 und DXT5', () => {
  expect([...leseDds(ddsMitBlock('DXT1', [0x00, 0xF8, 0x00, 0x00, 0, 0, 0, 0])).rgba.slice(0, 4)]).toEqual([255, 0, 0, 255])
  expect([...leseDds(ddsMitBlock('DXT5', [128, 128, 0, 0, 0, 0, 0, 0, 0x00, 0xF8, 0x00, 0x00, 0, 0, 0, 0])).rgba.slice(0, 4)]).toEqual([255, 0, 0, 128])
  expect(leseDds(ddsMitBlock('DX10', new Array(16).fill(0)))).toBeNull()
})
test('skaliereRgba mittelt 2x2-Bloecke', () => {
  const q = new Uint8ClampedArray(4 * 4 * 4); for (let i = 0; i < 16; i++) q.set(i % 4 < 2 ? [0,0,0,255] : [200,100,50,255], i * 4)
  expect([...skaliereRgba(q, 4, 4, 2, 2).slice(4, 8)]).toEqual([200, 100, 50, 255])
})
```

`ddsMitBlock(fourCC, blockBytes)` ist eine Testhilfe in derselben Datei. Sie baut einen DDS-Kopf für 4×4 mit Pixelformat-Flag `0x4` (FOURCC) und hängt den Block an.

- [ ] **Step 2: Run** `npx vitest run tests/leser/bilder.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** DXT1: Ist `color0 <= color1`, gilt der 3-Farben-Modus mit transparentem Index 3. 565 wird mit `(c<<3)|(c>>2)` erweitert.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Bildformate BMP, TGA, DDS"`

---

### Task 4: Mini-Spielordner und Dateiquelle

**Files:** Create `src/selbsttest/mini-spielordner.js`, `src/leser/dateiquelle.js` · Test `tests/leser/dateiquelle.test.js`

**Interfaces:**
- Consumes: `schreibeBmp24`, `schreibeTga`, `schreibeDds` (Task 3)
- Produces:
  - `erstelleMiniSpielordner() → { [pfad]: string | Uint8Array }`, mit genau dem Inhalt aus der Tabelle unten
  - `Dateiquelle = { liste(): string[], hat(pfad): boolean, text(pfad): Promise<string>, bytes(pfad): Promise<Uint8Array> }`. Pfade sind relativ, mit `/`.
  - `dateiquelleAusObjekt(obj) → Dateiquelle`
  - `dateiquelleAusFileList(files) → Dateiquelle`: entfernt das erste Segment von `webkitRelativePath` und wandelt `\` in `/` um.

**Inhalt Mini-Spielordner** (spätere Tests verlassen sich darauf):

| Pfad | Inhalt |
|---|---|
| `launcher-settings.json` | `{"gameId":"hoi4","version":"Seelöwe v1.15.4.0c7d","rawVersion":"v1.15.4.0c7d"}` |
| `common/country_tags/00_countries.txt` | `GER = "countries/Germany.txt"`, `SWI = "countries/Switzerland.txt"`, `FRA = "countries/France.txt"` |
| `common/country_tags/01_countries.txt` | `dynamic_tags = yes` + `D01 = "countries/D01.txt"` |
| `common/countries/Germany.txt` / `Switzerland.txt` / `France.txt` | `graphical_culture = western_european_gfx`, `graphical_culture_2d = western_european_2d`, `color = { 75 75 75 }` / `{ 200 30 30 }` / `{ 57 57 195 }` |
| `common/countries/colors.txt` | je Tag `X = { color = rgb { … } color_ui = rgb { … } }` mit denselben Farben |
| `common/ideologies/00_ideologies.txt` | `ideologies = { democratic = { types = { conservatism = { } liberalism = { } socialism = { } } } communism = { types = { marxism = { } leninism = { } stalinism = { } } } fascism = { types = { nazism = { } fascism_ideology = { } } } neutrality = { types = { despotism = { } oligarchism = { } } } }` |
| `common/characters/GER.txt` | `GER_adolf_hitler` mit `name = "Adolf Hitler"`, `portraits = { civilian = { large = GFX_portrait_GER_adolf_hitler } }`, `country_leader = { ideology = nazism expire = "1965.1.1.1" id = -1 }` |
| `common/characters/SWI.txt` | `SWI_giuseppe_motta` mit `name = SWI_giuseppe_motta`, `country_leader = { ideology = conservatism }` |
| `history/countries/GER - Germany.txt` | `capital = 1`, `oob = "GER_1936"`, `set_research_slots = 4`, `set_stability = 0.6`, `set_war_support = 0.3`, `set_technology = { infantry_weapons = 1 infantry_weapons1 = 1 tech_support = 1 }`, `set_politics = { ruling_party = fascism last_election = "1933.3.5" election_frequency = 48 elections_allowed = no }`, `set_popularities = { democratic = 10 fascism = 70 communism = 5 neutrality = 15 }`, `recruit_character = GER_adolf_hitler`, `1939.1.1 = { set_technology = { infantry_weapons2 = 1 } }` |
| `history/countries/SWI - Switzerland.txt` | `capital = 3`, Stabilität 0.8, Kriegsunterstützung 0.1, 3 Forschungsplätze, `set_technology = { infantry_weapons = 1 }`, `ruling_party = democratic`, Wahlen ja, Beliebtheit 80/5/5/10 (dem/fas/com/neu), `recruit_character = SWI_giuseppe_motta` |
| `history/countries/FRA - France.txt` | `capital = 5`, `ruling_party = democratic`, Beliebtheit 60/10/20/10, kein Charakter |
| `history/states/1-Brandenburg.txt` | `state = { id = 1 name = "STATE_1" manpower = 2500000 state_category = city history = { owner = GER add_core_of = GER victory_points = { 1 20 } buildings = { infrastructure = 4 industrial_complex = 3 } } provinces = { 1 2 } }` |
| `history/states/2-Bayern.txt` | id 2, GER, manpower 3000000, Provinz 3 |
| `history/states/3-Bern.txt`, `4-Zuerich.txt` | SWI, Provinzen 4 bzw. 5, manpower 900000 / 1200000 |
| `history/states/5-Ile_de_France.txt` | FRA, Provinz 6 |
| `history/states/6-Elsass.txt` | **mit BOM, CRLF**, Kommentar `# alte Grenze }` , `owner = FRA add_core_of = FRA add_core_of = GER`, `1939.1.1 = { owner = GER }`, Provinz 7 |
| `history/states/99-Kaputt.txt` | `state = { name = "STATE_99" }` (ohne id) |
| `map/definition.csv` | `0;0;0;0;land;false;unknown;0` und Provinzen 1–7: `n;n*20;0;0;land;false;plains;1`, Provinz 8: `8;0;0;200;sea;true;ocean;0` |
| `map/provinces.bmp` | 64×32. Zeile oben (y 0–15): Provinzen 1,2,3,4 in 16-px-Spalten. Zeile unten (y 16–31): 5,6,7,8 |
| `localisation/german/countries_l_german.yml` | `GER` Deutschland, `GER_DEF` Deutschland, `GER_ADJ` deutsch, `GER_fascism` Deutsches Reich, `GER_fascism_DEF` das Deutsche Reich, `GER_fascism_ADJ` deutsch, `SWI` Schweiz, `SWI_DEF` die Schweiz, `SWI_ADJ` schweizerisch, `FRA` Frankreich, `FRA_DEF` Frankreich, `FRA_ADJ` französisch |
| `localisation/german/state_names_l_german.yml` | `STATE_1` Brandenburg … `STATE_4` Zürich, `STATE_5` Île-de-France (kein `STATE_6`) |
| `localisation/english/state_names_l_english.yml` | `STATE_6` Alsace |
| `localisation/german/ideologies_l_german.yml` | democratic Demokratisch, communism Kommunistisch, fascism Faschistisch, neutrality Blockfrei, conservatism Konservatismus, liberalism Liberalismus, socialism Sozialismus, marxism Marxismus, leninism Leninismus, stalinism Stalinismus, nazism Nationalsozialismus, fascism_ideology Faschismus, despotism Despotismus, oligarchism Oligarchie, `SWI_giuseppe_motta` Giuseppe Motta |
| `interface/ideas.gfx` | `GFX_idea_generic_army` → `gfx/interface/ideas/idea_generic_army.dds`, `GFX_idea_generic_industry` → `…/idea_generic_industry.dds` |
| `interface/leaders.gfx` | `GFX_portrait_GER_adolf_hitler` → `gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds` |
| `gfx/interface/ideas/*.dds` | je 64×64 unkomprimiert (grün / grau) |
| `gfx/leaders/Europe/portrait_europe_generic_1.dds`, `_2.dds`, `gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds` | 156×210 unkomprimiert |
| `gfx/flags/GER.tga`, `GER_fascism.tga`, `SWI.tga`, `FRA.tga`, `gfx/flags/medium/GER.tga` | 82×52 (medium 41×26), einfarbig in Landesfarbe |

- [ ] **Step 1: Failing tests**

```js
test('Mini-Spielordner hat Karte und kaputte Datei', () => {
  const o = erstelleMiniSpielordner()
  expect(o['map/provinces.bmp']).toBeInstanceOf(Uint8Array)
  expect(o['history/states/99-Kaputt.txt']).toContain('STATE_99')
})
test('Dateiquelle aus FileList entfernt Ordnernamen und Backslashes', async () => {
  const f = (p, t) => ({ webkitRelativePath: p, text: async () => t, arrayBuffer: async () => new TextEncoder().encode(t).buffer })
  const q = dateiquelleAusFileList([f('Hearts of Iron IV/map/definition.csv', 'x'), f('Hearts of Iron IV\\common\\a.txt', 'y')])
  expect(q.liste().sort()).toEqual(['common/a.txt', 'map/definition.csv'])
  expect(q.hat('common/a.txt')).toBe(true); expect(await q.text('common/a.txt')).toBe('y')
  expect([...(await q.bytes('map/definition.csv'))]).toEqual([120])
})
test('Dateiquelle aus Objekt liefert Text auch fuer Bytes', async () => {
  const q = dateiquelleAusObjekt({ 'a.txt': 'hallo', 'b.bin': Uint8Array.from([1]) })
  expect(await q.text('a.txt')).toBe('hallo'); expect([...(await q.bytes('b.bin'))]).toEqual([1])
})
```

- [ ] **Step 2: Run** `npx vitest run tests/leser/dateiquelle.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** `text()` dekodiert mit `TextDecoder('utf-8')` und lässt das BOM als `\uFEFF` stehen.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Mini-Spielordner und Dateiquelle"`

---

### Task 5: Karte berechnen und färben

**Files:** Create `src/leser/karte.js` · Test `tests/leser/karte.test.js`

**Interfaces:**
- Consumes: `leseBmp` (Task 3), Mini-Spielordner (Task 4)
- Produces:
  - `parseDefinition(text) → Array<{ id, r, g, b, art: 'land'|'sea'|'lake' }>`: überspringt id 0 und fehlerhafte Zeilen
  - `berechneKarte(bmp, provinzen, staaten: { [id]: { provinzen: number[] } }) → Karte`, mit `Karte = { breite, hoehe, staatIndex: Uint16Array, staatIds: number[] }`. Index 0 bedeutet kein Staat; `staatIds[i]` ist die Staats-ID zum Index i.
  - `staatAn(karte, x, y) → number|null`
  - `schwerpunkt(karte, staatId) → [x, y]` (Mittel aller Pixel)
  - `faerbeKarte(karte, farben: Uint8Array /* 3 Byte je Index */, ziel: Uint8ClampedArray /* RGBA */, { meer: [r,g,b], hervorheben?: Set<number> /* Indizes */ })`:
    - Ein Pixel wird um den Faktor 0.6 abgedunkelt, wenn sein rechter oder unterer Nachbar einen anderen Index ≠ 0 hat und er selbst ≠ 0 ist (Grenze).
    - Hervorgehobene Indizes werden 35 % Richtung Weiss aufgehellt.

- [ ] **Step 1: Failing tests** – Karte aus dem Mini-Spielordner (`leseBmp`, `parseDefinition`, Staaten 1–6 von Hand als `{1:{provinzen:[1,2]},2:{provinzen:[3]},…}`):

```js
expect(staatAn(k, 2, 2)).toBe(1); expect(staatAn(k, 20, 2)).toBe(1); expect(staatAn(k, 40, 2)).toBe(2)
expect(staatAn(k, 60, 20)).toBeNull()
expect(schwerpunkt(k, 2)).toEqual([39.5, 7.5])
// Faerben: Index von Staat 1 rot, Staat 2 blau
expect(pixel(ziel, 2, 2)).toEqual([255, 0, 0, 255])
expect(pixel(ziel, 15, 2)).toEqual([255, 0, 0, 255])   // Grenze Provinz 1/2 im selben Staat: keine Linie
expect(pixel(ziel, 31, 2)).toEqual([153, 0, 0, 255])   // Staatsgrenze 1/2: abgedunkelt
expect(pixel(ziel, 60, 20)).toEqual([...meer, 255])
```

- [ ] **Step 2: Run** `npx vitest run tests/leser/karte.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** Farbschlüssel ist `r<<16|g<<8|b`, daraus Provinz und daraus Staatsindex. Alles läuft über Typed Arrays, damit 11,5 Mio. Pixel in unter 2 s gehen.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Karte berechnen und faerben"`

---

### Task 6: Spielordner-Leser

**Files:** Create `src/leser/spielordner.js` · Test `tests/leser/spielordner.test.js`

**Interfaces:**
- Consumes: Tasks 1–5
- Produces:
  - `LESER_VERSION = 1`
  - `class SpielordnerFehler extends Error`
  - `leseSpielordner(quelle: Dateiquelle, { fortschritt?(anteil 0..1, text), kodiereBild?(rgba, breite, hoehe) → Promise<any> }) → Promise<{ spieldaten, karte, bilder: Map<string, any>, warnungen: string[] }>`
  - Standard für `kodiereBild`: `async (rgba, breite, hoehe) => ({ breite, hoehe, rgba })`
  - Bildschlüssel: `flagge:<TAG|Variante>`, `idee:<GFX-Name>`, `portraet:<pfad>`
  - `spieldaten`:

```js
{ leserVersion, version: '1.15.4', supportedVersion: '1.15.*',
  laender: { [tag]: { tag, name, nameDef, adjektiv, farbe: [r,g,b], grafikstil, grafikstil2d, landDatei, verlaufDatei,
                      hauptstadt, regierung, anfuehrer /* Charakter-ID des Anführers der Regierungsideologie oder null */,
                      flaggen: string[] /* Dateinamen ohne .tga direkt in gfx/flags */,
                      namensVarianten: string[] /* vorhandene Schlüssel TAG_<ideologie>[_DEF|_ADJ] */ } },
  ideologien: [{ id, name, unter: [{ id, name }] }],
  charaktere: { [id]: { id, name, ideologie: string|null, portraet: string|null } },
  staaten: { [id]: { id, name, provinzen, besitzer, kerne, kategorie, manpower, datei } },
  provinzArten: { [id]: 'land'|'sea'|'lake' },
  sprites: { [gfxName]: texturPfad },
  ideenBilder: string[] /* GFX_idea_*, sortiert, erfolgreich dekodiert */,
  portraets: string[] /* gfx/leaders/**.dds mit «generic» im Pfad, sortiert */,
  bildgroessen: { flagge: [b,h], idee: [b,h], portraet: [b,h] } /* häufigste Grösse; Rückfall 82×52, 64×64, 156×210 */,
  originaltexte: { [pfad]: string } /* alle history/countries, history/states, common/countries */ }
```

- Namen kommen aus `localisation/german`, Rückfall `localisation/english`, Rückfall der Schlüssel selbst. `nameDef` und `adjektiv` fallen auf `name` zurück.

- [ ] **Step 1: Failing tests**

```js
const ergebnis = await leseSpielordner(dateiquelleAusObjekt(erstelleMiniSpielordner()))
const sd = ergebnis.spieldaten
expect([sd.version, sd.supportedVersion]).toEqual(['1.15.4', '1.15.*'])
expect(Object.keys(sd.laender).sort()).toEqual(['FRA', 'GER', 'SWI'])
expect(sd.laender.GER).toMatchObject({ name: 'Deutschland', adjektiv: 'deutsch', farbe: [75, 75, 75], grafikstil: 'western_european_gfx',
  grafikstil2d: 'western_european_2d', hauptstadt: 1, regierung: 'fascism', anfuehrer: 'GER_adolf_hitler',
  verlaufDatei: 'history/countries/GER - Germany.txt', landDatei: 'common/countries/Germany.txt' })
expect(sd.laender.GER.flaggen.sort()).toEqual(['GER', 'GER_fascism'])
expect(sd.laender.GER.namensVarianten.sort()).toEqual(['GER_fascism', 'GER_fascism_ADJ', 'GER_fascism_DEF'])
expect(sd.staaten[6]).toMatchObject({ name: 'Alsace', besitzer: 'FRA', kerne: ['FRA', 'GER'], provinzen: [7] })
expect(sd.staaten[4].name).toBe('Zürich')
expect(sd.staaten[99]).toBeUndefined()
expect(ergebnis.warnungen.some(w => w.includes('99-Kaputt.txt'))).toBe(true)
expect(sd.ideologien.map(i => i.id)).toEqual(['democratic', 'communism', 'fascism', 'neutrality'])
expect(sd.ideologien[3]).toEqual({ id: 'neutrality', name: 'Blockfrei', unter: [{ id: 'despotism', name: 'Despotismus' }, { id: 'oligarchism', name: 'Oligarchie' }] })
expect(sd.charaktere.SWI_giuseppe_motta).toMatchObject({ name: 'Giuseppe Motta', ideologie: 'conservatism' })
expect(sd.charaktere.GER_adolf_hitler.portraet).toBe('gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds')
expect(sd.provinzArten[8]).toBe('sea')
expect(sd.ideenBilder).toEqual(['GFX_idea_generic_army', 'GFX_idea_generic_industry'])
expect(sd.portraets).toEqual(['gfx/leaders/Europe/portrait_europe_generic_1.dds', 'gfx/leaders/Europe/portrait_europe_generic_2.dds'])
expect(sd.bildgroessen).toEqual({ flagge: [82, 52], idee: [64, 64], portraet: [156, 210] })
expect(sd.originaltexte['history/states/1-Brandenburg.txt']).toContain('owner = GER')
expect(ergebnis.bilder.get('flagge:SWI')).toMatchObject({ breite: 82, hoehe: 52 })
expect(ergebnis.karte.staatIds.length).toBe(7)
```

Ausserdem:
- Ein Ordner ohne `launcher-settings.json` oder ohne `map/provinces.bmp` führt zu `SpielordnerFehler` mit Meldung, die beginnt mit `Das ist nicht der Hearts-of-Iron-IV-Spielordner.`
- `fortschritt` wird mindestens 5-mal aufgerufen, die Anteile steigen, der letzte ist `1`.
- `JSON.parse(JSON.stringify(sd))` ergibt wieder `sd` (alles serialisierbar).

- [ ] **Step 2: Run** `npx vitest run tests/leser/spielordner.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
  - Jede Datei steht in einem eigenen `try`. Fehler oder Parser-Warnungen kommen in `warnungen` (mit Pfad), die Datei wird übersprungen, wenn wichtige Felder fehlen.
  - Anführer: die Charaktere aus `recruit_character` (oberste Ebene der Verlaufsdatei), deren `country_leader.ideology` zur Gruppe von `regierung` gehört.
  - Porträt: `large` ist entweder ein Pfad oder ein GFX-Name, der über `sprites` aufgelöst wird.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Spielordner einlesen"`

---

### Task 7: Projektmodell, Änderungen, Verlauf

**Files:** Create `src/projekt/modell.js`, `aenderungen.js`, `verlauf.js`, `abgeleitet.js`, `boni.js`, `base64.js`, `tests/hilfe.js` · Test `tests/projekt/*.test.js`

`tests/hilfe.js` exportiert `miniSpieldaten()` (einmal `leseSpielordner(Mini-Spielordner)`, danach zwischengespeichert), `text(dateien, pfad)` (Inhalt als String, wirft bei fehlendem Pfad) und ab Task 11 `testprojekt(sd)`.

**Interfaces:**
- Consumes: Spieldaten-Form (Task 6)
- Produces:

**modell.js**
- `modidAusName(name) → string`: ä→ae, ö→oe, ü→ue, ß→ss, alles klein; Nicht-`[a-z0-9]` wird `_`, zusammengefasst und an den Rändern entfernt; max. 20 Zeichen; beginnt es mit einer Ziffer, kommt `mod_` davor; leer ergibt `meine_mod`.
- `tagVorschlag(name, belegt: Set<string>) → string`. Gesperrt sind `AND NOT ALL ANY`, `/^D\d\d$/` und alles in `belegt`. Kandidaten in dieser Reihenfolge:
  1. bei ≥ 2 Wörtern: `w1[0]+w2[0]+w2[1]`
  2. erster Buchstabe + jedes Paar `(i<j)` der restlichen Buchstaben
  3. erster Buchstabe + Buchstabe + Ziffer
  4. `X` + zwei Ziffern
  - Transliteration wie bei `modidAusName`, nur `A–Z`.
- `neueId() → string` (`'e' + 10 Zeichen base36`)
- `neuesProjekt(name)` ergibt:

```js
{ id, formatVersion: 1,
  mod: { name, modid: modidAusName(name), modidManuell: false, version: '1.0', beschreibung: '', spielversion: null,
         windowsBenutzer: '', gespeichertAls: null, vorschaubild: null /* oder { pngBase64 } */ },
  laender: [], ideen: [], bilder: {}, zaehler: { geist: 0 } }
```

- `GRAFIKSTILE = ['western_european','eastern_european','middle_eastern','asian','african','southamerican','commonwealth']` (mit Anzeigenamen; Ausgabe `<x>_gfx` / `<x>_2d`)
- `ladeProjektAusJson(text) → projekt`: wirft `ProjektFehler('Das ist keine Projektdatei des HOI4 Mod Creators.')` bei fehlender oder grösserer `formatVersion`; vergibt eine neue `id`.

**aenderungen.js** (rein, gibt jeweils ein neues Projekt zurück)
- `fuegeLandHinzu(p, sd, art, tag?) → [p, landId]`
  - Neues Land:

```js
{ id, art: 'neu', tag, tagManuell: false, name: '', nameDef: '', adjektiv: '', farbe: [120, 120, 160],
  flagge: { art: 'designer', vorlage: 'drei_waagrecht', farben: ['#ffffff', '#3060a0', '#c03030'], symbol: null, symbolFarbe: '#ffd700' },
  grafikstil: 'western_european', staaten: [], hauptstadt: null, kerneAltBesitzerBehalten: true,
  regierung: { ideologie: 'neutrality', wahlen: false, wahlintervall: 48,
               parteien: { democratic: {name:'',langname:'',beliebtheit:25}, communism: {...25}, fascism: {...25}, neutrality: {...25} } },
  anfuehrer: { name: '', unterideologie: <erste Unterideologie von neutrality>, bild: { art: 'spiel', pfad: sd.portraets[0] ?? null } },
  startwerte: { stabilitaet: 50, kriegsunterstuetzung: 20, forschungsplaetze: 3 }, technikWie: null, armee: { divisionen: 6 }, ideen: [] }
```

  - Das Kürzel beim neuen Land ist `tagVorschlag('Neues Land', belegteTags(...))`.
  - `'geaendert'`: gleiche Felder, vorbefüllt aus `sd.laender[tag]` und `verlaufsWerte`, plus `aendern: { name, farbe, flagge, gebiet, regierung, anfuehrer, startwerte, geister }`, alle `false`.
  - Existiert das Land bereits, kommt die vorhandene ID zurück.
- `aendereLand(p, sd, landId, patch)`: Wenn sich `name` ändert, `art === 'neu'` gilt und `!tagManuell`, wird `tag` neu vorgeschlagen. `patch.tag` setzt `tagManuell = true`.
- `entferneLand(p, landId)`
- `schalteStaat(p, landId, staatId)`:
  - Fügt den Staat hinzu oder entfernt ihn.
  - Gehört er einem anderen Projektland, wird er dort entfernt.
  - Ein erster Staat wird Hauptstadt.
  - Wird die Hauptstadt entfernt, wird `hauptstadt` zum nächsten Staat oder `null`.
- `setzeBeliebtheit(p, landId, ideologie, wert)`:
  - `wert` wird auf 0..100 begrenzt.
  - Die anderen drei teilen sich `100 - wert` im Verhältnis ihrer bisherigen Werte (alle 0 bedeutet gleichmässig).
  - Gerundet wird nach dem Verfahren der grössten Reste, damit die Summe genau 100 ist.
- `fuegeGeistHinzu(p, sd) → [p, geistId]`:
  - Geist: `{ id, nummer: ++zaehler.geist, name: '', beschreibung: '', bild: { art: 'spiel', sprite: sd.ideenBilder[0] ?? 'GFX_idea_generic_army' }, boni: [] }`
- `aendereGeist(p, geistId, patch)`
- `entferneGeist(p, geistId)`: entfernt die ID auch aus allen `land.ideen`.
- `fuegeBildHinzu(p, { breite, hoehe, rgba }) → [p, bildId]`
- `setzeModFeld(p, feld, wert)`: Ein neuer `name` ändert die `modid`, solange `!modidManuell && !gespeichertAls`. Das Feld `modid` setzt `modidManuell = true`.

**verlauf.js**
- `erstelleVerlauf(max = 100)` ergibt `{ merke(zustand), rueckgaengig(aktuell) → zustand|null, wiederholen(aktuell) → zustand|null, kannZurueck(), kannVor() }`.

**abgeleitet.js**
- `belegteTags(p, sd, ohneLandId?) → Set`
- `effektiveBesitzer(p, sd) → Map<staatId, tag>`
- `landFarbe(tag, p, sd) → [r,g,b]` und `landName(tag, p, sd) → string`: berücksichtigen `aendern`
- `verlaufsWerte(sd, tag) → { stabilitaet, kriegsunterstuetzung, forschungsplaetze, beliebtheiten, ideologie, wahlen }`: Prozentwerte ganzzahlig, aus dem Originaltext ohne Datumsblöcke
- `hauptstadtVon(tag, p, sd) → staatId|null`

**boni.js**
- `BONI`: Array von `{ art, name, modifier, einheit: 'proTag'|'prozent', min, max, schritt }`, genau diese Einträge:

| art | name | modifier | Einheit |
|---|---|---|---|
| `politische_macht` | Politische Macht pro Tag | `political_power_gain` | proTag, −2..2, 0.05 |
| `stabilitaet` | Stabilität | `stability_factor` | prozent, −50..50 |
| `kriegsunterstuetzung` | Kriegsunterstützung | `war_support_factor` | prozent, −50..50 |
| `forschung` | Forschungsgeschwindigkeit | `research_speed_factor` | prozent, −50..50 |
| `fabrikleistung` | Fabrikleistung | `industrial_capacity_factory` | prozent, −50..50 |
| `baugeschwindigkeit` | Baugeschwindigkeit | `production_speed_buildings_factor` | prozent, −50..100 |
| `rekruten` | Rekrutierbare Bevölkerung | `conscription` | prozent, −5..10, 0.5 |
| `bevoelkerung` | Bevölkerungswachstum | `monthly_population` | prozent, −50..100 |
| `angriff` | Angriff der Armee | `army_attack_factor` | prozent, −50..50 |
| `verteidigung` | Verteidigung der Armee | `army_defence_factor` | prozent, −50..50 |
| `organisation` | Organisation der Armee | `army_org_factor` | prozent, −50..50 |
| `fabrikeffizienz` | Maximale Fabrikeffizienz | `production_factory_max_efficiency_factor` | prozent, −50..50 |

- Schrittweite 1, wo nichts anderes steht.
- `bonusWertImSpiel(bonus) → number`: Prozentwerte geteilt durch 100.

**base64.js**
- `zuBase64(Uint8Array) → string`, `ausBase64(string) → Uint8Array`, ohne `Buffer`.

- [ ] **Step 1: Failing tests** (Auszug der Pflicht-Assertions)

```js
expect(modidAusName('Mein Reich')).toBe('mein_reich'); expect(modidAusName('Grösste Schweiz!')).toBe('groesste_schweiz')
expect(modidAusName('1936 Neu')).toBe('mod_1936_neu'); expect(modidAusName('')).toBe('meine_mod')
expect(modidAusName('Ein sehr sehr langer Modname')).toMatch(/^[a-z][a-z0-9_]{0,19}$/)
expect(tagVorschlag('Mein Reich', new Set())).toBe('MRE'); expect(tagVorschlag('Helvetien', new Set())).toBe('HEL')
expect(tagVorschlag('Helvetien', new Set(['HEL']))).toBe('HEV'); expect(tagVorschlag('Über Land', new Set())).toBe('ULA')
expect(tagVorschlag('Andorra', new Set())).toBe('ANO')
// setzeBeliebtheit
expect(werte(setzeBeliebtheit(p25, id, 'democratic', 40))).toEqual({ democratic: 40, communism: 20, fascism: 20, neutrality: 20 })
expect(werte(setzeBeliebtheit(p100, id, 'democratic', 70))).toEqual({ democratic: 70, communism: 10, fascism: 10, neutrality: 10 })
expect(summe(setzeBeliebtheit(p25, id, 'fascism', 33))).toBe(100)
// schalteStaat
let [q, mre] = fuegeLandHinzu(neuesProjekt('X'), sd, 'neu'); q = schalteStaat(q, mre, 1); q = schalteStaat(q, mre, 4)
expect(land(q, mre)).toMatchObject({ staaten: [1, 4], hauptstadt: 1 })
const [q2, swi] = fuegeLandHinzu(q, sd, 'geaendert', 'SWI'); const q3 = schalteStaat(q2, swi, 4)
expect(land(q3, mre).staaten).toEqual([1]); expect(effektiveBesitzer(q3, sd).get(4)).toBe('SWI')
expect(effektiveBesitzer(q, sd).get(2)).toBe('GER')
expect(fuegeLandHinzu(q2, sd, 'geaendert', 'SWI')[1]).toBe(swi)
// Name -> Kuerzel
expect(land(aendereLand(q, sd, mre, { name: 'Mein Reich' }), mre).tag).toBe('MRE')
// verlaufsWerte
expect(verlaufsWerte(sd, 'GER')).toEqual({ stabilitaet: 60, kriegsunterstuetzung: 30, forschungsplaetze: 4,
  beliebtheiten: { democratic: 10, fascism: 70, communism: 5, neutrality: 15 }, ideologie: 'fascism', wahlen: false })
// Geist entfernen raeumt Verweise auf; Verlauf
// erstelleVerlauf: merke(a), merke(b) → rueckgaengig(c) === b, wiederholen(b) === c; merke nach rueckgaengig leert «vor»; 101-mal merke → 100 Schritte zurück möglich
// ladeProjektAusJson('{"x":1}') wirft ProjektFehler; Rundreise JSON.stringify(projekt) → ladeProjektAusJson ergibt gleiche Daten, neue id
// base64: ausBase64(zuBase64(bytes)) gleich, für 0..255 und Länge 1/2/3
```

`sd` kommt aus `leseSpielordner(Mini-Spielordner)`. Die Hilfen `land`, `werte` und `summe` stehen in der Testdatei.

- [ ] **Step 2: Run** `npx vitest run tests/projekt`. Expected: FAIL.
- [ ] **Step 3: Implementieren** (alle Funktionen kopieren, statt zu verändern; `structuredClone` ist erlaubt).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Projektmodell und Aenderungen"`

---

### Task 8: Flaggen zeichnen

**Files:** Create `src/erzeuger/flagge.js` · Test `tests/erzeuger/flagge.test.js`

**Interfaces:**
- Consumes: `skaliereRgba` (Task 3)
- Produces:
  - `VORLAGEN = [{ id, name, farben: n }]` für `einfarbig`(1), `zwei_waagrecht`(2), `drei_waagrecht`(3), `zwei_senkrecht`(2), `drei_senkrecht`(3), `nordisches_kreuz`(2), `schweizer_kreuz`(2), `diagonale`(2), `rand`(2)
  - `SYMBOLE = [{ id, name }]` für `stern`, `kreis`, `kreuz`, `halbmond`, `raute`, `adler`
  - `zeichneFlagge(flagge, breite, hoehe, holeBild?: (bildId) → {breite,hoehe,rgba}) → Uint8ClampedArray`

Geometrie (h = Höhe, w = Breite):
- nordisches Kreuz: Balkendicke `round(0.2h)`, senkrechter Balken ab `x = round(0.3w)`, waagrechter Balken mittig
- Schweizer Kreuz: mittig, Armdicke `0.2h`, Gesamtlänge `0.6h`
- Diagonale: Pixel oberhalb der Linie von unten links nach oben rechts erhalten `farben[0]`
- Rand: `farben[1]` innen, Rahmen `farben[0]` mit Dicke `round(0.15h)`
- Symbole stehen mittig:
  - Stern: 5 Zacken, Radien `0.28h`/`0.11h`
  - Kreis: `r = 0.22h`
  - Kreuz: Dicke `0.12h`, Länge `0.5h`
  - Halbmond: Kreis `0.25h` minus Kreis `0.21h`, um `0.08h` nach rechts versetzt
  - Raute: Halbdiagonalen `0.3h` senkrecht, `0.2h` waagrecht
  - Adler: symmetrisches Polygon mit Körper und Flügeln, das die Mitte abdeckt
- Symbolkanten werden mit 4×4-Supersampling geglättet.
- `art: 'bild'` skaliert das gespeicherte Bild auf die Zielgrösse.

- [ ] **Step 1: Failing tests**

```js
const f = (vorlage, farben, extra = {}) => zeichneFlagge({ art: 'designer', vorlage, farben, symbol: null, symbolFarbe: '#ffff00', ...extra }, 82, 52)
const px = (rgba, x, y) => [...rgba.slice((y * 82 + x) * 4, (y * 82 + x) * 4 + 4)]
const d = f('drei_senkrecht', ['#0000ff', '#ffffff', '#ff0000'])
expect(px(d, 10, 26)).toEqual([0, 0, 255, 255]); expect(px(d, 41, 26)).toEqual([255, 255, 255, 255]); expect(px(d, 72, 26)).toEqual([255, 0, 0, 255])
const s = f('schweizer_kreuz', ['#ff0000', '#ffffff'])
expect(px(s, 41, 26)).toEqual([255, 255, 255, 255]); expect(px(s, 2, 2)).toEqual([255, 0, 0, 255])
expect(px(f('zwei_waagrecht', ['#000000', '#00ff00']), 41, 40)).toEqual([0, 255, 0, 255])
for (const symbol of ['stern', 'kreis', 'kreuz', 'raute', 'adler'])
  expect(px(f('einfarbig', ['#000000'], { symbol }), 41, 26)).toEqual([255, 255, 0, 255])
expect(zeichneFlagge({ art: 'designer', vorlage: 'rand', farben: ['#000000', '#ffffff'] }, 10, 7).length).toBe(10 * 7 * 4)
```

- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/flagge.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren** (Polygon-Füllung mit Even-Odd-Regel; Kreise per Abstand).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Flaggen-Designer zeichnen"`

---

### Task 9: Erzeuger-Kern, Ausgabeprüfung und leere Mod

**Files:** Create `src/erzeuger/kennungen.js`, `sprache.js`, `kern.js`, `index.js`, `ausgabepruefung.js` · Test `tests/erzeuger/kern.test.js`

**Interfaces:**
- Consumes: Parser (1), YML (2), Projektmodell (7)
- Produces:
  - `Datei = { pfad: string /* relativ zu «Hearts of Iron IV» im Benutzerordner */, inhalt: string | Uint8Array, kopie?: true }`
  - **kennungen.js**:
    - `modPfad(modid, rest) → 'mod/<modid>/<rest>'`
    - `geistKennung(p, geist) → '<modid>_geist_<nummer>'`
    - `anfuehrerKennung(p, land) → '<modid>_<tag klein>_anfuehrer'`
    - `asciiDateiname(text) → string`: Transliteration, nur `[A-Za-z0-9 ]`, getrimmt
    - `zahl(x) → string`: max. 3 Nachkommastellen, ohne Nullen am Ende, Punkt als Dezimalzeichen
  - **sprache.js**: `erstelleSprachsammler()` ergibt `{ setze(schluessel, text), ersetze(schluessel, text), dateien(modid) → Datei[] }`:
    - `mod/<m>/localisation/german/<m>_l_german.yml` + `english/<m>_l_english.yml`
    - bei Ersetzungen zusätzlich `…/german/replace/<m>_replace_l_german.yml` + `english/replace/…`
  - **kern.js** (reine Textfunktionen):
    - `aendereStaatsdatei(text, { neuerBesitzer, kernAltEntfernen }) → string`:
      - Im `history`-Block der obersten Ebene wird `owner` ersetzt (und `controller`, falls vorhanden).
      - `add_core_of = <neu>` wird ergänzt, falls es fehlt; bei `kernAltEntfernen` fällt `add_core_of = <alt>` weg.
      - Datumsblöcke bleiben unangetastet. Erste Zeile `# Geaendert durch HOI4 Mod Creator`.
    - `aendereColors(text|null, farben: Map<tag,[r,g,b]>) → string`:
      - `color = rgb { … }` wird ersetzt oder ein neuer Eintrag angehängt.
      - `color_ui` = jede Komponente `min(255, round(c*1.2+25))`.
    - `aendereLandDatei(text, farbe) → string`: ersetzt `color` durch `{ r g b }`.
    - `verlaufMitAnhang(text, zeilen, modid) → string`: Original unverändert + `\n\n# --- Aenderungen aus dem HOI4 Mod Creator (<modid>) ---\n` + Zeilen
  - **index.js**:
    - `erzeugeMod(projekt, spieldaten) → { dateien: Datei[], fehler: string[] }`
    - Baut den `kontext` und ruft die Land- und Geist-Erzeuger auf (ab Task 10/11/12 registriert in `ERZEUGER`).
    - Schliesst ab mit Staatsdateien, Verlaufskopien, `colors.txt`, Sprachdateien, Deskriptoren und `mod/<m>/hoi4-mod-creator-projekt.json`. Danach `pruefeAusgabe`.
  - `kontext`:

```js
{ projekt, spieldaten, modid,
  holeBild(bildId) → { breite, hoehe, rgba },
  schreibe(pfad, inhalt, { kopie } = {}),      // gleicher Pfad doppelt → Eintrag in fehler
  sprache: { setze, ersetze },
  braucheSprache(schluessel), braucheGfx(name),
  verlaufAnhaengen(tag, zeilen: string[]),
  neueFarbe(tag, [r,g,b]),
  staatAnLand(staatId, tag, { kernAltEntfernen }) }
```

  - **Deskriptor** (`mod/<m>/descriptor.mod`), UTF-8 ohne BOM:

```
version="<mod.version>"
tags={
	"Alternative History"
}
name="<mod.name ohne ">"
supported_version="<sd.supportedVersion>"
picture="thumbnail.png"          (nur mit Vorschaubild; dann auch mod/<m>/thumbnail.png = ausBase64(vorschaubild.pngBase64))
```

  - `mod/<m>.mod` hat denselben Inhalt plus `path="mod/<m>"`. Mit `windowsBenutzer` lautet der Pfad stattdessen `path="C:/Users/<benutzer>/Documents/Paradox Interactive/Hearts of Iron IV/mod/<m>"`.
  - **ausgabepruefung.js**: `pruefeAusgabe(dateien, { benutzteSprache: Set, definierteSprache: Set, benutzteGfx: Set, bekannteGfx: Set }) → string[]`. Meldungen beginnen jeweils mit dem Pfad:
    - `.txt`/`.gfx` lassen sich nicht streng parsen
    - `.txt`/`.gfx` (ohne `kopie`) enthalten Nicht-ASCII
    - `.yml` ohne BOM oder ohne Kopf `l_german:`/`l_english:`
    - benutzter Sprachschlüssel fehlt (weder in der Mod noch im Spiel)
    - benutztes GFX fehlt (weder in der Mod noch in `sd.sprites`)

- [ ] **Step 1: Failing tests**

```js
const p = setzeModFeld(neuesProjekt('Mein Reich'), 'version', '1.2')
const { dateien, fehler } = erzeugeMod(p, sd)
expect(fehler).toEqual([])
expect(text(dateien, 'mod/mein_reich.mod')).toContain('path="mod/mein_reich"')
expect(text(dateien, 'mod/mein_reich/descriptor.mod')).toContain('supported_version="1.15.*"')
expect(text(dateien, 'mod/mein_reich/descriptor.mod')).not.toContain('path=')
expect(JSON.parse(text(dateien, 'mod/mein_reich/hoi4-mod-creator-projekt.json')).mod.version).toBe('1.2')
const mitBenutzer = erzeugeMod(setzeModFeld(p, 'windowsBenutzer', 'Sid'), sd)
expect(text(mitBenutzer.dateien, 'mod/mein_reich.mod')).toContain('path="C:/Users/Sid/Documents/Paradox Interactive/Hearts of Iron IV/mod/mein_reich"')
// kern.js
const neu = aendereStaatsdatei(sd.originaltexte['history/states/6-Elsass.txt'], { neuerBesitzer: 'MRE', kernAltEntfernen: false })
const hist = finde(finde(parseParadox(neu).eintraege, 'state').wert.inhalt, 'history').wert.inhalt
expect(finde(hist, 'owner').wert.text).toBe('MRE')
expect(findeAlle(hist, 'add_core_of').map(e => e.wert.text)).toEqual(['FRA', 'GER', 'MRE'])
expect(finde(finde(hist, '1939.1.1').wert.inhalt, 'owner').wert.text).toBe('GER')
expect(findeAlle(holeHist(aendereStaatsdatei(..., { neuerBesitzer: 'MRE', kernAltEntfernen: true })), 'add_core_of').map(…)).toEqual(['GER', 'MRE'])
expect(aendereColors(sd.originaltexte['common/countries/colors.txt'], new Map([['MRE', [10, 20, 30]]]))).toMatch(/MRE = \{\s*color = rgb \{ 10 20 30 \}\s*color_ui = rgb \{ 37 49 61 \}/)
// pruefeAusgabe
expect(pruefeAusgabe([{ pfad: 'a.txt', inhalt: 'x = {' }], leer)[0]).toMatch(/^a\.txt/)
expect(pruefeAusgabe([{ pfad: 'a.txt', inhalt: 'x = "ä"' }], leer).length).toBe(1)
expect(pruefeAusgabe([{ pfad: 'a.txt', inhalt: 'x = "ä"', kopie: true }], leer)).toEqual([])
expect(pruefeAusgabe([{ pfad: 'x_l_german.yml', inhalt: new TextEncoder().encode('l_german:\r\n') }], leer).length).toBe(1)
expect(pruefeAusgabe([], { ...leer, benutzteSprache: new Set(['FEHLT']) })[0]).toContain('FEHLT')
```

- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/kern.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
  - Die von der Mod definierten Sprachschlüssel sammelt `sprache`. Die Spiel-Schlüssel sind die `TAG*`-Schlüssel aus `sd.laender` plus `STATE_*`.
  - `bekannteGfx` = Sprites der Mod ∪ `sd.sprites`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Erzeuger-Kern und Ausgabepruefung"`

---

### Task 10: Nationale Geister erzeugen

**Files:** Create `src/erzeuger/ideen.js` · Modify `src/erzeuger/index.js` (in `ERZEUGER` eintragen) · Test `tests/erzeuger/ideen.test.js`

**Interfaces:**
- Consumes: `kontext` (9), `BONI`, `bonusWertImSpiel` (7), `schreibeDds`, `skaliereRgba` (3)
- Produces:
  - `erzeugeIdeen(kontext)`:
    - Ist `projekt.ideen` leer, entsteht nichts.
    - Sonst `mod/<m>/common/ideas/<m>_ideas.txt`:

```
ideas = {
	country = {
		<kennung> = {
			picture = <sprite ohne Präfix GFX_idea_>
			allowed = { always = no }
			removal_cost = -1
			modifier = { <modifier> = <zahl> … }
		}
	}
}
```

  - Eigenes Bild:
    - Sprite `GFX_idea_<kennung>` in `mod/<m>/interface/<m>_ideas.gfx`
    - DDS `mod/<m>/gfx/interface/ideas/<kennung>.dds` in `sd.bildgroessen.idee`
    - `picture = <kennung>`
  - Sprache: `<kennung>` = Name, `<kennung>_desc` = Beschreibung (leer erlaubt). Ein Geist ohne Boni bekommt `modifier = { }`.

- [ ] **Step 1: Failing tests**
  - Projekt mit einem Geist: `name: 'Alpenfestung'`, Boni `[{ art: 'stabilitaet', wert: 5 }, { art: 'politische_macht', wert: 0.1 }]`, Spielbild `GFX_idea_generic_army`.
  - Die Ideen-Datei parst. Der Eintrag `mein_reich_geist_1` hat `picture = generic_army`, `modifier.stability_factor = 0.05` und `modifier.political_power_gain = 0.1`.
  - Die deutsche Sprachdatei enthält ` mein_reich_geist_1:0 "Alpenfestung"`.
  - Zweiter Geist mit eigenem Bild (via `fuegeBildHinzu`, 10×10 rot): DDS 64×64 vorhanden, `.gfx` parst und enthält den Namen `GFX_idea_mein_reich_geist_2`.
  - `fehler` bleibt `[]`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/ideen.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Nationale Geister erzeugen"`

---

### Task 11: Neues Land erzeugen

**Files:** Create `src/erzeuger/land-neu.js` · Modify `src/erzeuger/index.js`, `tests/hilfe.js` (`testprojekt(sd)` = das Testprojekt aus Step 1) · Test `tests/erzeuger/land-neu.test.js`

**Interfaces:**
- Consumes: `kontext` (9), `zeichneFlagge` (8), `geistKennung`, `anfuehrerKennung`, `asciiDateiname` (9), `schreibeTga`, `schreibeDds`, `skaliereRgba` (3), `parseParadox`
- Produces: `erzeugeNeueLaender(kontext)` für alle Länder mit `art === 'neu'`

Dateien je Land (`m` = modid, `T` = tag):

| Datei | Inhalt |
|---|---|
| `mod/m/common/country_tags/m_countries.txt` | alle neuen Tags: `T = "countries/m_T.txt"` |
| `mod/m/common/countries/m_T.txt` | `graphical_culture = <stil>_gfx`, `graphical_culture_2d = <stil>_2d`, `color = { r g b }` |
| (über `neueFarbe`) | Eintrag in `colors.txt` |
| `mod/m/history/countries/T - <asciiDateiname(name) oder T>.txt` | siehe unten |
| `mod/m/history/units/T_1936.txt` | nur wenn `armee.divisionen > 0` |
| `mod/m/common/characters/m_T.txt` | nur wenn `anfuehrer.name` gesetzt |
| `mod/m/gfx/leaders/T/m_anfuehrer.dds` | nur bei eigenem Porträt, Grösse `bildgroessen.portraet` |
| `mod/m/gfx/flags/T.tga`, `medium/T.tga`, `small/T.tga` | 82×52, 41×26, 10×7 |
| Sprache | `T`, `T_DEF` (Rückfall Name), `T_ADJ` (Rückfall Name), `T_<ideologie>_party` und `_party_long` für alle vier Ideologien (Rückfall Ideologie-Name aus `sd`), Anführer-Kennung = Anführer-Name |

Verlaufsdatei in dieser Reihenfolge:

```
capital = <hauptstadt>
oob = "T_1936"                                  (nur mit Armee)
set_research_slots = <n>
set_stability = <s/100>
set_war_support = <k/100>
set_technology = { <aus technikWie; sonst vom bisherigen Besitzer der Hauptstadt; sonst infantry_weapons infantry_weapons1 tech_support tech_engineers gw_artillery> = 1 }
set_politics = { ruling_party = <ideologie> last_election = "1933.3.5" election_frequency = <wahlintervall> elections_allowed = <yes|no> }
set_popularities = { democratic = a communism = b fascism = c neutrality = d }
recruit_character = <anfuehrerKennung>           (nur mit Anführer)
add_ideas = { <geistKennung …> }                (nur mit Geistern)
```

- Die Technik kommt aus allen `set_technology`-Blöcken der obersten Ebene im Original, ohne Datumsblöcke.
- Für jeden Staat: `kontext.staatAnLand(id, T, { kernAltEntfernen: !kerneAltBesitzerBehalten })`.
- Einheiten:
  - `division_template = { name = "Infanterie-Division" regiments = { infantry = { x = 0 y = 0 } … 6 Stück (x 0–1, y 0–2) } }`
  - pro Division `division = { name = "<n>. Infanterie-Division" location = <kleinste Landprovinz der Hauptstadt> division_template = "Infanterie-Division" start_experience_factor = 0.2 }`
- Charakter:
  - `characters = { <kennung> = { name = <kennung> portraits = { civilian = { large = "<pfad>" } } country_leader = { ideology = <unterideologie> expire = "1965.1.1.1" id = -1 } } }`
  - Der Porträtpfad ist entweder das Spielporträt oder der eigene DDS-Pfad ohne `mod/m/`.

- [ ] **Step 1: Failing tests**
  - Testprojekt `Mein Reich`: Tag MRE, Staaten `[1, 4]`, Hauptstadt 1, Regierung `democratic` mit Beliebtheit 60/10/10/20, Anführer `Max Muster`/`conservatism`, Geist aus Task 10, Flagge `drei_senkrecht`.
  - `fehler` ist `[]`.
  - `history/countries/MRE - Mein Reich.txt` parst:
    - `capital = 1`, `oob = "MRE_1936"`, `set_stability = 0.5`
    - `set_technology` enthält `infantry_weapons1` (von GER)
    - `set_politics.ruling_party = democratic`
    - `set_popularities` ergibt in Summe 100
    - `recruit_character = mein_reich_mre_anfuehrer`
    - `add_ideas` enthält `mein_reich_geist_1`
  - Einheiten: 6 `division`-Einträge, alle mit `location = 1`.
  - Flaggen: `leseTga` ergibt 82×52, 41×26 und 10×7. Das mittlere Pixel der grossen Flagge hat `farben[1]`.
  - `mod/mein_reich/history/states/1-Brandenburg.txt` hat `owner = MRE` und `add_core_of` GER und MRE. `4-Zuerich.txt` hat `owner = MRE`.
  - `colors.txt` enthält `MRE = {`.
  - Deutsche und englische Sprachdatei sind bis auf den Kopf gleich und enthalten `MRE`, `MRE_ADJ` und `MRE_democratic_party`.
  - **Review Focus 3:** `name: 'Grossherzogtum «Über» "Test"'`, Tag manuell `GRT`:
    - Pfad `mod/mein_reich/history/countries/GRT - Grossherzogtum Ueber Test.txt`
    - Die Sprachdatei enthält `GRT:0 "Grossherzogtum «Über» \"Test\""`
    - `fehler` bleibt `[]`.
  - Ohne Armee entstehen keine Einheiten-Datei und kein `oob`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/land-neu.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Neues Land erzeugen"`

---

### Task 12: Bestehendes Land ändern

**Files:** Create `src/erzeuger/land-geaendert.js` · Modify `src/erzeuger/index.js` · Test `tests/erzeuger/land-geaendert.test.js`

**Interfaces:**
- Consumes: wie Task 11
- Produces: `erzeugeGeaenderteLaender(kontext)`. Je Land wirken nur die Reiter mit `aendern.<reiter> === true`:

| Reiter | Wirkung |
|---|---|
| `name` | `ersetze` für `T`, `T_DEF`, `T_ADJ` und alle `namensVarianten` (Endung `_DEF` → nameDef, `_ADJ` → adjektiv, sonst name) |
| `farbe` | `neueFarbe` + Kopie `mod/m/<landDatei>` via `aendereLandDatei` (`kopie: true`) |
| `flagge` | `T` und alle `flaggen`-Varianten in allen drei Grössen |
| `gebiet` | `staatAnLand` für `staaten`; `capital = <hauptstadt>` anhängen, wenn sie von `sd.laender[T].hauptstadt` abweicht |
| `regierung` | `set_politics` + `set_popularities` anhängen; `ersetze` für Parteinamen, die nicht leer sind |
| `anfuehrer` | Charakterdatei `mod/m/common/characters/m_T.txt`; `recruit_character = <k>` und `promote_character = <k>` anhängen |
| `startwerte` | `set_research_slots`, `set_stability`, `set_war_support`; bei `technikWie` zusätzlich `set_technology` |
| `geister` | `add_ideas = { … }` |

Die Anhänge sammelt `kontext.verlaufAnhaengen`. `index.js` schreibt pro Tag einmal `mod/m/<verlaufDatei>` = `verlaufMitAnhang(original, zeilen, m)` mit `kopie: true`. Fehlt `verlaufDatei`, entsteht ein Fehler `Für <T> gibt es keine Verlaufsdatei im Spiel.`

- [ ] **Step 1: Failing tests**
  - SWI geändert, `aendern.name` und `aendern.anfuehrer`, Name `Helvetien`:
    - Die Ersetzungsdatei enthält `SWI:0 "Helvetien"`.
    - `mod/mein_reich/history/countries/SWI - Switzerland.txt` beginnt mit dem Originaltext und enthält danach `recruit_character = mein_reich_swi_anfuehrer` und `promote_character = mein_reich_swi_anfuehrer`.
    - Es gibt keine Flaggen- und keine Farbdatei.
  - GER geändert mit `aendern.flagge`: Es entstehen `gfx/flags/GER.tga` und `GER_fascism.tga`, je in drei Grössen, also 6 Dateien.
  - GER mit `aendern.name`: Die Ersetzung enthält `GER_fascism_DEF` = nameDef.
  - GER mit `aendern.gebiet`, `staaten: []`, `hauptstadt: 2`: Der Anhang enthält `capital = 2`.
  - Farbe ändern: Die Kopie von `common/countries/Germany.txt` hat die neue `color`, `colors.txt` hat den neuen GER-Eintrag.
  - Ohne aktiven Reiter entsteht für dieses Land keine Datei.
  - Immer gilt `fehler === []`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/land-geaendert.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: PASS. Ausserdem `npx vitest run`: alle grün.
- [ ] **Step 5: Commit** – `"Bestehende Laender aendern"`

---

### Task 13: Prüfregeln

**Files:** Create `src/pruefung/regeln.js` · Test `tests/pruefung/regeln.test.js`

**Interfaces:**
- Consumes: Projektmodell (7), `effektiveBesitzer`, `hauptstadtVon` (7)
- Produces:
  - `pruefeProjekt(p, sd) → Meldung[]`
  - `Meldung = { regel, schwere: 'fehler'|'hinweis', text, ziel: { bereich: 'einstellungen'|'land'|'geist', id?, reiter? }, behebung?: { text, anwenden(p, sd) → p } }`
  - `hatFehler(meldungen) → boolean`

| regel | Schwere | Bedingung | Text (Beispiel) |
|---|---|---|---|
| `mod-name` | fehler | `mod.name` leer | Die Mod braucht einen Namen. |
| `modid` | fehler | modid passt nicht auf das Muster | Der interne Name der Mod darf nur Kleinbuchstaben, Ziffern und _ enthalten. |
| `land-name` | fehler | neu und Name leer | Ein neues Land braucht einen Namen. |
| `tag-format` | fehler | neu und Tag ≠ `/^[A-Z][A-Z0-9]{2}$/` oder gesperrt | Das Kürzel «X» ist nicht erlaubt … |
| `tag-belegt` | fehler | neu und Tag im Spiel oder bei einem anderen Projektland | Das Kürzel «GER» gehört schon Deutschland. |
| `land-doppelt` | fehler | zwei Projektländer mit demselben Tag | |
| `ohne-staaten` | fehler | neu und keine Staaten | «Mein Reich» hat noch kein Gebiet. |
| `ohne-hauptstadt` | fehler | neu und keine Hauptstadt | |
| `hauptstadt-fremd` | fehler | Hauptstadt (neu, oder geändert mit `aendern.gebiet`) gehört effektiv jemand anderem | |
| `beliebtheit` | fehler | (neu oder `aendern.regierung`) und Summe ≠ 100 | |
| `staat-doppelt` | fehler | Staat in zwei Projektländern | |
| `hauptstadt-verloren` | fehler | Spiel-Land X: Spiel-Hauptstadt gehört effektiv anderen, X besitzt noch ≥ 1 Staat, kein Projekt-Land X mit `aendern.gebiet` und eigener Hauptstadt | «Deutschland» verliert seine Hauptstadt Brandenburg. Behebung: «Bayern als neue Hauptstadt festlegen» (verbleibender Staat mit grösster `manpower`; legt bei Bedarf ein geändertes Land an, setzt `aendern.gebiet` und `hauptstadt`) |
| `anfuehrer-ideologie` | fehler | Unterideologie gehört nicht zur Gruppe der Regierungsideologie (bei geändertem Land ohne `aendern.regierung`: Spiel-Ideologie) | |
| `geist-verweis` | fehler | `land.ideen` enthält unbekannte ID | |
| `geist-name` | fehler | Geist ohne Namen | |
| `bild-fehlt` | fehler | `bildId` verweist ins Leere (Flagge, Porträt, Geist) | |
| `land-verschwindet` | hinweis | Spiel-Land besitzt effektiv keine Staaten mehr | … ist zu Spielbeginn nicht mehr dabei. |
| `ohne-anfuehrer` | hinweis | neu und Anführer-Name leer | |
| `geist-beschreibung` | hinweis | Beschreibung leer | |
| `spielversion` | hinweis | `mod.spielversion` gesetzt und ≠ `sd.version` | |
| `modid-geaendert` | hinweis | `gespeichertAls` gesetzt und ≠ modid | Die Mod wurde bisher als «x» gespeichert. Mit dem neuen internen Namen entsteht eine zweite Mod. |
| `start-1939` | hinweis | mindestens ein geändertes Land | Änderungen an bestehenden Ländern gelten für den Start 1936. |

- [ ] **Step 1: Failing tests**
  - Hilfe `gueltig()` = Testprojekt aus Task 11, mit Staaten `[2, 4]` und Hauptstadt 2, sodass GER Brandenburg behält. Darauf gilt `hatFehler(pruefeProjekt(gueltig(), sd)) === false`.
  - Pro Regel ein Test, der `gueltig()` minimal verändert und `regeln(meldungen)` (Liste der `regel`-Werte) mit `toContain('<regel>')` prüft. Dazu je ein Gegentest ohne diese Regel.
  - Für `hauptstadt-verloren`:
    - Staaten `[1, 4]` ergeben die Meldung. `behebung.anwenden` liefert ein Projekt mit GER geändert, `aendern.gebiet` und `hauptstadt: 2`, danach fehlt die Regel.
    - Staaten `[1, 2]` ergeben keinen `hauptstadt-verloren`, aber `land-verschwindet` für GER.
  - **Review Focus 5:** `gespeichertAls: 'alt_name'` ergibt `modid-geaendert`.
- [ ] **Step 2: Run** `npx vitest run tests/pruefung`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln"`

---

### Task 14: Speicher (ZIP, IndexedDB, Ordner)

**Files:** Create `src/speicher/zip.js`, `src/speicher/indexeddb.js`, `src/speicher/ordner.js`, `src/selbsttest/fake-ordner.js` · Test `tests/speicher/*.test.js`

**Interfaces:**
- Produces:
  - **zip.js**:
    - `crc32(bytes) → number` (vorzeichenlos)
    - `erstelleZip(dateien: Datei[]) → Uint8Array`: Methode «stored», Bit 11 (UTF-8) gesetzt, Zeitstempel fest auf 1.1.2026 00:00
  - **indexeddb.js**:
    - `oeffneDb(name = 'hoi4-mod-creator') → Promise<IDBDatabase>`, Stores `projekte` (keyPath `id`), `spieldaten`, `bilder`, `einstellungen`
    - `alleProjekte(db) → [{ id, name, geaendert }]`, `ladeProjekt(db, id)`, `speichereProjekt(db, p)` (setzt `geaendert = Date.now()` im Datensatz), `loescheProjekt(db, id)`
    - `speichereSpieldaten(db, { spieldaten, karte, bilder: Map })`: leert vorher den Store `bilder`
    - `ladeSpieldaten(db) → { spieldaten, karte } | null`, `ladeBild(db, schluessel) → any|null`
    - `merke(db, schluessel, wert)`, `hole(db, schluessel)`
  - **ordner.js**:
    - `pruefeZielordner(wurzel) → Promise<boolean>`: `settings.txt` oder Unterordner `mod` vorhanden
    - `schreibeMod(wurzel, modid, dateien, fortschritt?) → Promise<{ geschrieben: number, geloescht: string[] }>`:
      1. alte Liste `mod/<modid>/hoi4-mod-creator-dateien.json` lesen
      2. alles schreiben, fehlende Ordner anlegen
      3. Pfade aus der alten Liste löschen, die nicht mehr vorkommen
      4. neue Liste schreiben
    - `leseFehlerlog(wurzel) → Promise<string|null>`: liest `logs/error.log`
  - **fake-ordner.js**: `erstelleFakeOrdner(anfang: {[pfad]: string|Uint8Array} = {})` ergibt ein Objekt mit:
    - `getDirectoryHandle(name, {create})`, `getFileHandle(name, {create})`, `removeEntry(name)`, `entries()`, `queryPermission()`, `requestPermission()` (beide `'granted'`)
    - einem Datei-Handle mit `getFile()`, das `{ text(), arrayBuffer() }` liefert, und `createWritable()`, das `{ write(daten), close() }` liefert
    - `alsObjekt() → {[pfad]: Uint8Array}`

- [ ] **Step 1: Failing tests**

```js
expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xCBF43926)
const z = erstelleZip([{ pfad: 'mod/a.mod', inhalt: 'x' }, { pfad: 'mod/a/b.bin', inhalt: Uint8Array.from([1, 2]) }])
expect(new DataView(z.buffer).getUint32(0, true)).toBe(0x04034b50)
expect(eintraegeAusZip(z)).toEqual([['mod/a.mod', [120]], ['mod/a/b.bin', [1, 2]]])   // Testhilfe liest Zentralverzeichnis
// Ordner – Review Focus 4
const o = erstelleFakeOrdner({ 'settings.txt': '', 'mod/mein_reich/eigene_notiz.txt': 'meins', 'mod/fremd.mod': 'x' })
expect(await pruefeZielordner(o)).toBe(true); expect(await pruefeZielordner(erstelleFakeOrdner())).toBe(false)
await schreibeMod(o, 'mein_reich', [datei('mod/mein_reich.mod'), datei('mod/mein_reich/a.txt'), datei('mod/mein_reich/b/c.txt')])
const r = await schreibeMod(o, 'mein_reich', [datei('mod/mein_reich.mod'), datei('mod/mein_reich/a.txt')])
expect(r.geloescht).toEqual(['mod/mein_reich/b/c.txt'])
expect(Object.keys(o.alsObjekt()).sort()).toEqual(['mod/fremd.mod', 'mod/mein_reich.mod', 'mod/mein_reich/a.txt',
  'mod/mein_reich/eigene_notiz.txt', 'mod/mein_reich/hoi4-mod-creator-dateien.json', 'settings.txt'])
expect(await leseFehlerlog(erstelleFakeOrdner({ 'logs/error.log': 'zeile' }))).toBe('zeile')
expect(await leseFehlerlog(o)).toBeNull()
// IndexedDB (import 'fake-indexeddb/auto')
// speichereProjekt/alleProjekte/ladeProjekt/loescheProjekt; speichereSpieldaten → ladeSpieldaten gibt karte.staatIndex als Uint16Array zurück;
// ladeBild('flagge:SWI') liefert das gespeicherte Objekt; zweites speichereSpieldaten ohne SWI → ladeBild null; merke/hole
```

- [ ] **Step 2: Run** `npx vitest run tests/speicher`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** Ein leerer Ordner, der nach dem Löschen übrig bleibt, wird nicht entfernt (zu riskant).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Speichern: ZIP, IndexedDB, Ordner"`

---

### Task 15: Oberfläche – Gerüst, Startseite, Spielordner, Einstellungen, Selbsttest

**Files:** Create `src/ui/zustand.js`, `app.jsx`, `stil.css`, `start.jsx`, `spielordner.jsx`, `einstellungen.jsx`, `bilder.js`, `src/selbsttest/helfer.js`, `szenario.js`, `selbsttest.js`, `tools/selbsttest.mjs` · Modify `src/main.jsx`

**Interfaces:**
- Consumes: alles aus Tasks 4–14
- Produces:
  - **zustand.js**:
    - `erstelleSpeicher(anfang)` ergibt `{ lies(), setze(teil|fn), abonniere(fn) → abmelden }`
    - `useSpeicher(waehler)` (Preact-Hook)
    - `aktionen`:
      - `start({ dbName })`: öffnet die DB, lädt Projektliste und Spieldaten
      - `neuesProjekt(name)`, `oeffneProjekt(id)`, `dupliziereProjekt(id)`, `loescheProjekt(id)`, `importiereProjekt(text)`
      - `aendere(fn: (p, sd) → p, { gruppe? })`: Verlauf und gedrosseltes Autospeichern nach 500 ms. Gleiche `gruppe` innerhalb von 1000 ms ergibt einen Verlaufsschritt.
      - `rueckgaengig()`, `wiederholen()`, `gehe(ansicht)`
      - `spielordnerEinlesen(quelle) → Promise`: Fortschritt im Zustand, `kodiereBild` aus `ui/bilder.js`
  - Zustand: `{ db, projekte, projekt, spieldaten, karte, ansicht: { bereich, id?, reiter? }, einlesen: { anteil, text } | null, meldung: string | null }`
  - **bilder.js**:
    - `kodiereBild(rgba, b, h) → Promise<Blob>` (OffscreenCanvas, `image/webp`, Qualität 0.9)
    - `bildUrl(schluessel) → Promise<string|null>` (zwischengespeicherte Object-URL)
    - `rgbaZuUrl({ breite, hoehe, rgba }) → string`
  - Fehlt IndexedDB oder schlägt sie fehl, gibt es ein Banner «Automatisches Speichern ist in diesem Browser nicht möglich – bitte Projekt als Datei sichern.» und die Arbeit geht im Speicher weiter.
  - Tastatur:
    - Strg/Cmd+Z → `rueckgaengig`, Strg+Y / Cmd+Shift+Z → `wiederholen`
    - Liegt der Fokus in `input` oder `textarea`, gilt das nicht.
  - **Selbsttest**:
    - `main.jsx` startet bei `?selbsttest` mit `dbName 'hoi4-mod-creator-selbsttest'` (wird vorher gelöscht) und ruft `starteSelbsttest()` auf.
    - `window.__hmc = { aktionen, speicher }` gibt es nur im Selbsttest.
    - `szenario.js` exportiert `SCHRITTE: Array<{ name, lauf(h) }>`. `selbsttest.js` führt sie der Reihe nach aus.
    - Ergebnis: `document.title = 'SELBSTTEST OK'` bzw. `'SELBSTTEST FEHLER'`, dazu `window.__selbsttest = { ok, schritte: [{ name, ok, fehler }] }`.
  - **helfer.js**: `klicke(test)`, `tippe(test, text)` (setzt `value` und löst `input` aus), `waehle(test, wert)` (`change`), `hakeAn(test, an)`, `warte(bedingung, ms = 5000)`, `el(test)`, `text(test)`, `ladeHoch(test, file)` (DataTransfer), `taste(key, { ctrl, meta, shift })`. Alle suchen über `[data-test="…"]`.
  - **tools/selbsttest.mjs**:
    - puppeteer-core mit `executablePath = process.env.CHROME_PFAD ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`
    - öffnet `file://<abs>/dist/hoi4-mod-creator.html?selbsttest` und wartet bis zu 120 s, bis der Titel mit `SELBSTTEST` beginnt
    - gibt die Schritte aus; `pageerror` gilt als Fehler; Exit-Code 0/1

Oberfläche:
- Gestaltung: dunkles «Kriegskarten»-Thema mit Schiefergrau und Messing-Akzent, Systemschriften, ab 1200 px Breite optimiert.
- Kopf: Projektname, Rückgängig/Wiederholen (`data-test="rueckgaengig"`/`"wiederholen"`), Status der Spieldaten (Version).
- Seitenleiste (`data-test="seitenleiste"`): `nav-einstellungen`, `nav-laender`, `nav-geister`, `nav-pruefung` (mit Ampel), `nav-speichern`, `nav-spielfehler`.
- Startseite:
  - Ohne Spieldaten: zuerst Karte «Schritt 1: Spielordner einlesen» mit Anleitung (Steam → Rechtsklick → Verwalten → Lokale Dateien durchsuchen; Hinweis zur Chrome-Frage «hochladen»).
  - Dann Projektliste (`projekt-<id>` öffnen, `duplizieren-<id>`, `loeschen-<id>` mit `confirm`), `neues-projekt-name` + `neues-projekt-anlegen`, `projekt-importieren` (Datei-Input `.json`).
- Spielordner-Dialog: `<input type="file" webkitdirectory data-test="spielordner-input">`, Fortschrittsbalken mit Text, `SpielordnerFehler` als Meldung. Von der Startseite und aus dem Kopf erreichbar («neu einlesen»).
- Einstellungen: `mod-name`, `mod-version`, `mod-beschreibung`, `mod-vorschaubild` (Upload, PNG-Base64 via `canvas.toDataURL`, max. 512×512). Unter «Erweitert» zugeklappt: `mod-modid`, `mod-windowsbenutzer`. Anzeige `modid-anzeige`.

- [ ] **Step 1: Selbsttest-Schritte schreiben (failing)** in `szenario.js`:
  1. «Projekt anlegen»: `tippe('neues-projekt-name', 'Selbsttest Reich')`, `klicke('neues-projekt-anlegen')`, dann warten auf `seitenleiste`.
  2. «Spielordner einlesen»: `await window.__hmc.aktionen.spielordnerEinlesen(dateiquelleAusObjekt(erstelleMiniSpielordner()))`; der Kopf zeigt `1.15.4`.
  3. «Einstellungen»: `klicke('nav-einstellungen')`, `tippe('mod-name', 'Selbsttest Reich 2')`; `text('modid-anzeige')` enthält `selbsttest_reich_2`.
  4. «Rückgängig»: `klicke('rueckgaengig')`; der Wert von `mod-name` ist `Selbsttest Reich`.
  5. «Duplizieren»: zurück zum Start, `duplizieren-<id>` klicken; die Projektliste hat 2 Einträge. Danach `projekt-<id>` (das Original) wieder öffnen, damit die folgenden Schritte darin arbeiten.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: `SELBSTTEST FEHLER` (Schritt 1 findet das Element nicht).
- [ ] **Step 3: Oberfläche implementieren** wie beschrieben.
- [ ] **Step 4: Run** `npm run selbsttest` und `npx vitest run`. Expected: `SELBSTTEST OK`, alle Tests grün.
- [ ] **Step 5: Commit** – `"Oberflaeche: Geruest, Startseite, Spielordner, Einstellungen, Selbsttest"`

---

### Task 16: Kartenkomponente und Auswahl eines bestehenden Landes

**Files:** Create `src/ui/karte.jsx`, `src/ui/staatsuche.jsx`, `src/ui/laender/uebersicht.jsx` · Modify `src/ui/app.jsx`, `src/selbsttest/szenario.js`, `src/selbsttest/helfer.js`

**Interfaces:**
- Consumes: `faerbeKarte`, `staatAn`, `schwerpunkt` (5), `effektiveBesitzer`, `landFarbe`, `landName` (7)
- Produces:
  - `<Karte karte farbeFuerStaat={(staatId) → [r,g,b]} hervorheben={Set<staatId>} beschreibe={(staatId) → string} onKlick={(staatId) → void} test="…" />`
    - Ein `<canvas>` in voller Kartenauflösung, Ansicht per CSS `transform: translate() scale()`
    - Mausrad zoomt um den Zeiger (Faktor 0.25–8 relativ zu «Einpassen»), Ziehen verschiebt, ein Klick zählt nur bei < 4 px Bewegung
    - Tooltip mit `beschreibe`; Knopf `karte-einpassen`
    - Neu gefärbt wird nur, wenn sich Farben oder Hervorhebung ändern.
    - Exportiert `zeigeStaat(staatId)`, das per Ref auf den Schwerpunkt zoomt.
  - `<Staatsuche spieldaten projekt onWaehle />`: Feld `staatsuche` filtert nach Name, ID oder Besitzer; Treffer `staatsuche-treffer-<id>`.
  - Länder-Übersicht:
    - Kacheln `land-<landId>` mit Flaggenvorschau und Name
    - `neues-land` legt ein Land an und öffnet den Editor
    - `bestehendes-land` öffnet einen Dialog mit Karte (`karte-auswahl`) und Liste (`land-liste`, Einträge `land-waehlen-<TAG>`). Ein Klick auf einen Staat wählt dessen Besitzer und zeigt `auswahl-bestaetigen` mit dem Ländernamen.
  - `helfer.klickeKarte(test, staatId)`: rechnet `schwerpunkt` über `getBoundingClientRect` des Canvas in Bildschirmkoordinaten um (`left + (x+0.5) * rect.width / karte.breite`) und löst `pointerdown`/`pointerup` aus.

- [ ] **Step 1: Selbsttest-Schritt (failing)** «Bestehendes Land wählen»: `klicke('nav-laender')`, `klicke('bestehendes-land')`, `klickeKarte('karte-auswahl', 3)`. `text('auswahl-bestaetigen')` enthält `Schweiz`. `klicke('auswahl-bestaetigen')` öffnet den Editor `land-editor` mit dem Kopf `Schweiz`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER in diesem Schritt.
- [ ] **Step 3: Implementieren.** `land-editor` ist hier nur ein Kopf mit Namen; die Reiter folgen in Task 17.
- [ ] **Step 4: Run** `npm run selbsttest`. Expected: OK.
- [ ] **Step 5: Commit** – `"Karte und Auswahl bestehender Laender"`

---

### Task 17: Land-Editor – Name & Farbe, Flagge, Bild-Zuschnitt

**Files:** Create `src/ui/laender/land-editor.jsx`, `reiter-name.jsx`, `reiter-flagge.jsx`, `src/ui/bild-zuschnitt.jsx`, `src/ui/farbe.js` · Modify `szenario.js`

**Interfaces:**
- Consumes: `aendereLand`, `fuegeBildHinzu` (7), `VORLAGEN`, `SYMBOLE`, `zeichneFlagge` (8), `GRAFIKSTILE` (7)
- Produces:
  - `land-editor.jsx`:
    - Reiter `reiter-name`, `reiter-flagge`, `reiter-gebiet`, `reiter-regierung`, `reiter-anfuehrer`, `reiter-startwerte`, `reiter-geister`
    - Kopf mit Flagge, Name, Kürzel und `land-loeschen` (mit Rückfrage)
    - Bei geänderten Ländern hat jeder Reiter oben einen Schalter `aendern-<reiter>` («Das ändern»). Ausgeschaltet sind die Felder deaktiviert und zeigen die Spielwerte.
  - `farbe.js`: `hexZuRgb('#ff0000') → [255,0,0]`, `rgbZuHex([255,0,0]) → '#ff0000'`
  - `reiter-name`:
    - `land-name`, `land-namedef`, `land-adjektiv`, `land-farbe` (`input type=color`), `land-grafikstil` (select mit Beschreibungen)
    - `land-tag`: Neueingabe in Grossbuchstaben; daneben Statustext `tag-status` («frei» / «schon vergeben an …»)
    - Felder mit `gruppe: 'land:<id>:<feld>'`
  - `reiter-flagge`:
    - Umschalter `flagge-art-designer` / `flagge-art-bild`
    - Vorlagen-Kacheln `flagge-vorlage-<id>`, Farbwähler `flagge-farbe-<i>`, Symbole `flagge-symbol-<id|keins>`, `flagge-symbolfarbe`
    - Vorschau-Canvas `flagge-vorschau` 164×104 (zeichneFlagge 82×52, doppelt skaliert ohne Glättung), dazu klein 41×26 und 10×7
  - `<BildZuschnitt zielBreite zielHoehe onFertig={(bild) → void} test="…" />`:
    - Datei-Input `<test>-datei`, Zuschnittrahmen im Zielseitenverhältnis, Zoom-Regler `<test>-zoom`, Ziehen verschiebt, `<test>-uebernehmen`
    - Liefert `{ breite: zielBreite, hoehe: zielHoehe, rgba }`.
    - Für Flaggen: Ziel 82×52, danach `fuegeBildHinzu` und `flagge = { art: 'bild', bildId }`.

- [ ] **Step 1: Selbsttest-Schritte (failing)**
  - «Neues Land»: `klicke('nav-laender')`, `klicke('neues-land')`, `tippe('land-name', 'Mein Reich')`. Der Wert von `land-tag` ist `MRE`, `text('tag-status')` enthält `frei`.
  - «Kürzel belegt»: `tippe('land-tag', 'GER')`; `tag-status` enthält `Deutschland`. Danach `tippe('land-tag', 'MRE')`.
  - «Flagge»: `klicke('reiter-flagge')`, `klicke('flagge-vorlage-drei_senkrecht')`, Farbe `flagge-farbe-1` = `#00ff00`. Das mittlere Pixel im Canvas `flagge-vorschau` (über `getContext('2d').getImageData`) ist `[0,255,0,255]`.
  - «Flaggenbild»: `klicke('flagge-art-bild')`, `ladeHoch('flaggenbild-datei', <PNG 100×60 rot, im Test per OffscreenCanvas.convertToBlob erzeugt>)`, `klicke('flaggenbild-uebernehmen')`. Das mittlere Vorschau-Pixel ist rot. Danach zurück auf Designer.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: OK.
- [ ] **Step 5: Commit** – `"Land-Editor: Name, Farbe, Flagge"`

---

### Task 18: Land-Editor – Gebiet, Regierung, Anführer, Startwerte

**Files:** Create `src/ui/laender/reiter-gebiet.jsx`, `reiter-regierung.jsx`, `reiter-anfuehrer.jsx`, `reiter-startwerte.jsx` · Modify `szenario.js`

**Interfaces:**
- Consumes: `schalteStaat`, `setzeBeliebtheit`, `aendereLand` (7), `<Karte>`, `<Staatsuche>` (16), `<BildZuschnitt>` (17), `bildUrl` (15)
- Produces:
  - `reiter-gebiet`:
    - Karte `karte-gebiet`: eigene Staaten hervorgehoben, Klick ruft `schalteStaat`
    - Staatsuche; Liste `gebiet-staat-<id>` mit bisherigem Besitzer und Entfernen-Knopf
    - Select `land-hauptstadt` (nur eigene Staaten), Häkchen `land-kerne-behalten`
    - Geändertes Land: Spiel-Staaten grau ohne Entfernen, Hinweistext dazu
  - `reiter-regierung`:
    - `land-ideologie` (Gruppen aus `sd.ideologien`), `land-wahlen`, `land-wahlintervall` (Monate)
    - pro Ideologie `partei-name-<id>`, `partei-langname-<id>`, `partei-beliebtheit-<id>` (Range 0–100, über `setzeBeliebtheit`)
    - Anzeige `beliebtheit-summe` («100 %»)
    - Wechselt die Ideologie, wird `anfuehrer.unterideologie` auf die erste der neuen Gruppe gesetzt, falls sie nicht passt.
  - `reiter-anfuehrer`:
    - `anfuehrer-name`, `anfuehrer-unterideologie` (nur aus der Regierungsgruppe)
    - Galerie `portraet-<index>` der Spielporträts (`bildUrl('portraet:'+pfad)`)
    - `<BildZuschnitt test="portraetbild" zielBreite/Hoehe=bildgroessen.portraet>`
    - Geändertes Land: zeigt den aktuellen Spiel-Anführer
  - `reiter-startwerte`:
    - `start-stabilitaet`, `start-kriegsunterstuetzung` (0–100 %), `start-forschungsplaetze` (1–6)
    - `start-technikwie`: Select aller Spiel-Länder plus «Automatisch (bisheriger Besitzer der Hauptstadt)»
    - `start-divisionen` (0–24, nur bei neuem Land)

- [ ] **Step 1: Selbsttest-Schritte (failing)** für MRE:
  - «Gebiet»: `klicke('reiter-gebiet')`, `klickeKarte('karte-gebiet', 1)`, `klickeKarte('karte-gebiet', 4)`. Es gibt `gebiet-staat-1` und `gebiet-staat-4`, der Wert von `land-hauptstadt` ist `1`.
  - «Regierung»: `waehle('land-ideologie', 'democratic')`, `tippe('partei-beliebtheit-democratic', '60')`; `text('beliebtheit-summe')` ist `100 %`. `tippe('partei-name-democratic', 'Volkspartei')`.
  - «Anführer»: `tippe('anfuehrer-name', 'Max Muster')`; `anfuehrer-unterideologie` bietet `conservatism` an und hat ihn als Wert. `klicke('portraet-1')`.
  - «Startwerte»: `tippe('start-stabilitaet', '70')`, `tippe('start-divisionen', '4')`. Im Zustand gilt `startwerte.stabilitaet === 70`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: OK.
- [ ] **Step 5: Commit** – `"Land-Editor: Gebiet, Regierung, Anfuehrer, Startwerte"`

---

### Task 19: Nationale Geister und Änderungen am bestehenden Land

**Files:** Create `src/ui/geister/geister-liste.jsx`, `geist-editor.jsx`, `src/ui/laender/reiter-geister.jsx` · Modify `szenario.js`, `land-editor.jsx`

**Interfaces:**
- Consumes: `fuegeGeistHinzu`, `aendereGeist`, `entferneGeist`, `BONI` (7), `<BildZuschnitt>` (17), `bildUrl` (15)
- Produces:
  - Geister-Liste (`nav-geister`): Kacheln `geist-<id>`, `neuer-geist`
  - Geist-Editor:
    - `geist-name`, `geist-beschreibung`
    - Bild: Galerie `geistbild-<GFX-Name>` mit Suche `geistbild-suche`, oder `<BildZuschnitt test="geistbild">`
    - Boni: Zeilen `bonus-art-<i>` (select über `BONI`), `bonus-wert-<i>` (Zahl mit Einheit «%» bzw. «/Tag»), `bonus-entfernen-<i>`, `bonus-neu`
    - `geist-loeschen` mit Rückfrage, die die Länder nennt, die den Geist nutzen
  - `reiter-geister`: Häkchen `land-geist-<id>` für jeden Geist und `geist-neu-fuer-land`, das einen Geist anlegt, ihn zuweist und den Editor öffnet

- [ ] **Step 1: Selbsttest-Schritte (failing)**
  - «Geist»: `klicke('nav-geister')`, `klicke('neuer-geist')`, `tippe('geist-name', 'Alpenfestung')`, `klicke('bonus-neu')`, `waehle('bonus-art-0', 'stabilitaet')`, `tippe('bonus-wert-0', '5')`.
  - «Geist zuweisen»: Land MRE öffnen, `klicke('reiter-geister')`, `hakeAn('land-geist-<id>', true)`. Im Zustand enthält `ideen` die ID.
  - «Schweiz ändern»: Land SWI öffnen, `klicke('reiter-name')`, `hakeAn('aendern-name', true)`, `tippe('land-name', 'Helvetien')`. Die Kachel in der Übersicht zeigt `Helvetien`.
  - «Schweiz Anführer»: `klicke('reiter-anfuehrer')`, `hakeAn('aendern-anfuehrer', true)`, `tippe('anfuehrer-name', 'Wilhelm Tell')`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: OK.
- [ ] **Step 5: Commit** – `"Nationale Geister und bestehende Laender in der Oberflaeche"`

---

### Task 20: Prüfung, Speichern, Spielfehler, Anleitung

**Files:** Create `src/leser/fehlerlog.js`, `src/ui/pruefung.jsx`, `src/ui/speichern.jsx`, `src/ui/spielfehler.jsx`, `README.md` · Test `tests/leser/fehlerlog.test.js` · Modify `szenario.js`, `app.jsx`

**Interfaces:**
- Consumes: `pruefeProjekt`, `hatFehler` (13), `erzeugeMod` (9), `schreibeMod`, `pruefeZielordner`, `leseFehlerlog`, `erstelleZip` (14), `merke`/`hole` (14)
- Produces:
  - `werteFehlerlogAus(text, { modid, pfade: string[], tags: string[] }) → [{ roh, anzahl, datei: string|null, zeile: number|null, erklaerung }]`:
    - nur Zeilen, die `modid`, einen der Pfade (ohne `mod/<m>/`) oder einen der Tags als ganzes Wort enthalten
    - Gleiche Meldungen ohne Zeitstempel werden zusammengefasst.
    - `datei` aus `/file:? "([^"]+)"/`, `zeile` aus `/near line:? (\d+)/i`
    - Erklärungen in dieser Reihenfolge:

| Muster | Erklärung |
|---|---|
| `/Unexpected token\|Malformed token\|Missing \}\|unexpected end/i` | Ein Tippfehler in einer Datei der Mod. Bitte melde diese Zeile – der Creator sollte so etwas nie erzeugen. |
| `/texture\|\.dds\|\.tga/i` | Ein Bild wurde nicht gefunden oder ist beschädigt. |
| `/Unknown (effect\|trigger)\|Invalid (effect\|trigger)/i` | Ein Befehl ist dem Spiel unbekannt – vielleicht passt die Spielversion nicht. |
| `/state/i` | Mit einem Staat stimmt etwas nicht. |
| `/tag\|country/i` | Mit einem Länderkürzel stimmt etwas nicht. |
| sonst | Unbekannter Fehler – die Originalzeile hilft beim Nachfragen. |

  - **Prüfung-Ansicht**:
    - `pruefung-liste` mit Einträgen `meldung-<regel>-<n>` und Text
    - ein Klick springt per `gehe(ziel)`; `behebung-<regel>-<n>`
    - Ampel `ampel` mit `data-zustand="rot|gelb|gruen"` in der Seitenleiste
  - **Speichern-Ansicht**:
    - Bei Fehlern ist alles gesperrt und es gibt einen Link zur Prüfung.
    - `speichern-ordner`, nur wenn `window.showDirectoryPicker` existiert:
      1. Handle aus `hole(db, 'zielordner')`, sonst `showDirectoryPicker({ mode: 'readwrite' })`
      2. `pruefeZielordner`, sonst Meldung «Bitte wähle den Ordner «Hearts of Iron IV» in Dokumente\Paradox Interactive.» (mit OneDrive-Hinweis)
      3. `requestPermission`, `merke`
      4. `erzeugeMod` → bei `fehler` Anzeige «Interner Fehler – bitte melden» samt Liste und **nicht** schreiben
      5. `schreibeMod`, danach `gespeichertAls = modid` und `spielversion = sd.version`
    - `speichern-zip`: `erzeugeMod` → `erstelleZip` → `ladeHerunter(blob, '<modid>.zip')` (im Selbsttest über `window.__hmc.ladeHerunter` ersetzbar)
    - Ergebnis `speichern-ergebnis`: Anzahl geschriebener und gelöschter Dateien plus Checkliste «So testest du im Spiel»:
      1. Paradox-Launcher öffnen
      2. «Spielsets» → neues Spielset mit der Mod
      3. Spielen
      4. 1936 wählen und das Land über die Karte suchen
      5. Danach hier unter «Spielfehler» nachschauen
  - **Spielfehler-Ansicht**: `spielfehler-laden` liest über den gemerkten Ordner, Einträge `spielfehler-<n>`, Rohzeile aufklappbar. Ohne Ordner: Hinweis, zuerst zu speichern.
  - **README.md** (deutsch):
    - Bauen: `npm install`, `npm run build`, `npm test`, `npm run selbsttest`
    - Benutzen: Datei auf den PC kopieren, mit Chrome/Edge öffnen
    - Grenzen aus dem Konzept, Abschnitt 12

- [ ] **Step 1: Failing Unit-Test für `werteFehlerlogAus`**

```js
const log = '[12:00:01][persistent.cpp:48]: Error: "Unexpected token: }, near line: 7" in file: "history/countries/MRE - Mein Reich.txt" near line: 7\n' +
  '[12:00:02][persistent.cpp:48]: Error: "Unexpected token: }, near line: 7" in file: "history/countries/MRE - Mein Reich.txt" near line: 7\n' +
  '[12:00:03][gfx.cpp:10]: Texture gfx/leaders/MRE/mein_reich_anfuehrer.dds not found\n' +
  '[12:00:04][x.cpp:1]: Error in vanilla file common/foo.txt\n'
const r = werteFehlerlogAus(log, { modid: 'mein_reich', pfade: ['mod/mein_reich/history/countries/MRE - Mein Reich.txt'], tags: ['MRE'] })
expect(r.length).toBe(2)
expect(r[0]).toMatchObject({ anzahl: 2, datei: 'history/countries/MRE - Mein Reich.txt', zeile: 7 })
expect(r[0].erklaerung).toContain('Tippfehler'); expect(r[1].erklaerung).toContain('Bild')
```

- [ ] **Step 2: Run** `npx vitest run tests/leser/fehlerlog.test.js`. Expected: FAIL. **Step 3:** Implementieren. **Step 4:** Run. Expected: PASS.

- [ ] **Step 5: Selbsttest-Schritte (failing)**
  - «Prüfung»: Bei MRE (Staaten 1 und 4) zeigt `ampel` `rot`, es gibt `meldung-hauptstadt-verloren-0`. `klicke('behebung-hauptstadt-verloren-0')` → `ampel` ist `gelb` (Hinweis `start-1939`).
  - «Speichern in Ordner»:
    - `window.__hmc.aktionen.merkeZielordner(erstelleFakeOrdner({ 'settings.txt': '' }))`, dann `klicke('nav-speichern')`, `klicke('speichern-ordner')`.
    - `speichern-ergebnis` erscheint.
    - Der Fake-Ordner enthält `mod/selbsttest_reich.mod`, `mod/selbsttest_reich/history/countries/MRE - Mein Reich.txt`, `mod/selbsttest_reich/gfx/flags/MRE.tga`, `mod/selbsttest_reich/history/countries/SWI - Switzerland.txt` und `mod/selbsttest_reich/common/ideas/selbsttest_reich_ideas.txt`.
    - Alle `.txt` darin parsen streng.
  - «ZIP»: `window.__hmc.ladeHerunter` fängt den Aufruf ab, dann `klicke('speichern-zip')`. Der Name ist `selbsttest_reich.zip`, die Grösse > 1000 Byte.
  - «Spielfehler»: In den Fake-Ordner `logs/error.log` mit der Tippfehler-Zeile von oben (MRE-Pfad) schreiben, dann `klicke('nav-spielfehler')`, `klicke('spielfehler-laden')`. `spielfehler-0` enthält `Tippfehler`.
  - «Projekt aus Mod öffnen»: Den Inhalt von `mod/selbsttest_reich/hoi4-mod-creator-projekt.json` über `ladeHoch('projekt-importieren', …)` auf der Startseite laden. Die Projektliste hat ein Projekt mehr, und dessen Land MRE hat die Staaten `[1, 4]`.

`merkeZielordner(handle)` ist eine kleine Aktion in `zustand.js`, die das Handle per `merke(db, 'zielordner', handle)` ablegt. Die UI nutzt sie nach dem `showDirectoryPicker` ebenfalls.

- [ ] **Step 6: Run** `npm run selbsttest`. Expected: FEHLER. **Step 7:** Implementieren. **Step 8:** Run `npx vitest run && npm run selbsttest`. Expected: alle grün, `SELBSTTEST OK`.

- [ ] **Step 9: Abschlussprüfung**
  - `grep -c "</script" src -r` ergibt 0 Treffer.
  - `dist/hoi4-mod-creator.html` enthält keine URL auf `http`, ausser in Texten und Kommentaren. Prüfen mit `grep -o 'src="http[^"]*"' dist/hoi4-mod-creator.html`: leer.
- [ ] **Step 10: Commit** – `"Pruefung, Speichern, Spielfehler und Anleitung"`
