# Etappe 4g: Mods als Grundlage – Bauplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installierte Mods erkennen, «Spiel + Mod(s)» als Grundlage einlesen und daraus Submods mit `dependencies` erzeugen.

**Architecture:**
- Eine überlagerte Dateiquelle legt Mod-Ordner über den Spielordner. `leseSpielordner` arbeitet unverändert darauf und merkt nur die Ebenen für Sprachdateien und Fokusbäume.
- Das Projekt speichert seine Grundlage. Eine Prüfregel sperrt das Speichern, wenn sie nicht zu den eingelesenen Spieldaten passt.
- Der Erzeuger schreibt `dependencies`.

**Tech Stack:** Vite 8, Preact, Vitest 5, puppeteer-core (Selbsttest)

**Spec:** `docs/superpowers/specs/2026-11-15-etappe-4g-mods-als-grundlage-design.md`

## Global Constraints

- Alle Texte der Oberfläche auf Deutsch mit Schweizer Schreibweise (ss statt ß, «»).
- `LESER_VERSION` bleibt 10. Fehlt `spieldaten.grundlage`, gilt `[]`. Fehlt `spielFokusbaeume[].quelle`, gilt «Spiel».
- Grundlage-Einträge im Projekt sind `{ name, id }`. In den Spieldaten sind sie `{ name, version, id }`. `id` ist `remote_file_id` oder `null`.
- `dependencies` sind die Namen in Ladereihenfolge, genau wie im Deskriptor der Mod, mit Umlauten. Anführungszeichen werden entfernt.
- Kein neuer Speicherplatz für mehrere Spieldaten-Sätze.
- Commits enden mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Falsche Ebene gewählt:** Der Nutzer wählt den Ordner eine Ebene zu hoch, etwa `394360` mit vielen Mods. Dann liegt `descriptor.mod` nicht oben, und es muss die klare Meldung «Das ist kein Mod-Ordner …» kommen, kein stilles Einlesen. → Test in Task 1 (`leseModOrdner`).
2. **Doppelt hinzugefügt:** Dieselbe Mod wird zweimal hinzugefügt. Sie darf nur einmal in der Grundlage stehen; der zweite Eintrag ersetzt den ersten an seiner Stelle. → Test in Task 5 (`fuegeGrundlageHinzu`).
3. **Umlaute im Namen:** Eine Mod heisst «Mittelmächte sieg» oder ähnlich. `dependencies` muss den Namen exakt mit Umlaut schreiben, und die Ausgabeprüfung darf deshalb nicht anschlagen. → Test in Task 4.
4. **Spielordner neu eingelesen:** Wird der Spielordner neu gewählt, während Mods gewählt sind, bleiben sie gewählt und werden mit eingelesen. → Test in Task 5 (`grundlageEinlesen`-Ablauf über reine Funktion `ueberlagerung`).
5. **Kaputte `.mod`-Datei** in der Mod-Liste oder fehlender Ordner `mod`: Die Liste lässt den Eintrag aus, kein Absturz. → Test in Task 2.

---

### Task 1: Deskriptor lesen und Dateiquellen überlagern

**Files:**
- Create: `src/leser/mod-ordner.js`
- Modify: `src/leser/dateiquelle.js`
- Test: `tests/leser/mod-ordner.test.js`, `tests/leser/dateiquelle.test.js`

**Interfaces:**
- Produces:
  - `leseDeskriptor(text: string) → { name: string, version: string|null, id: string|null, replacePaths: string[], pfad: string|null }` aus `src/leser/mod-ordner.js`
    - `name` ohne `"`, Rückfall `''`
    - `id` = `remote_file_id`
    - `pfad` = `path`
    - `replacePaths` ohne abschliessendes `/`, mit `/` statt `\`
  - `async leseModOrdner(quelle: Dateiquelle) → { name, version, id, replacePaths, quelle }`
    - wirft `ModOrdnerFehler` (exportierte Klasse, `extends Error`) mit dem Text `Das ist kein Mod-Ordner. Wähle den Ordner, in dem die Datei descriptor.mod liegt.`, wenn `quelle.hat('descriptor.mod')` falsch ist
    - wirft dieselbe Meldung, wenn `name` leer ist
  - `dateiquelleUeberlagert(spiel: Dateiquelle, mods: { quelle, name, replacePaths }[]) → Dateiquelle & { ebene(pfad): number, ebenenName(i): string }` aus `dateiquelle.js`
    - `ebenenName(0)` ist `'Spiel'`, `ebenenName(i)` ist `mods[i-1].name`

- [ ] **Step 1: Tests schreiben** in `tests/leser/mod-ordner.test.js`:
  - `leseDeskriptor liest name, version, remote_file_id, path und mehrere replace_path`
    - Eingabe ist ein Kaiserreich-ähnlicher Text mit `replace_path="common/national_focus"` und `replace_path="history/states/"`
    - erwartet `replacePaths` gleich `['common/national_focus', 'history/states']`, `id: '1521695605'`
  - `leseDeskriptor ohne remote_file_id und ohne version` → `id: null`, `version: null`
  - `leseModOrdner wirft ModOrdnerFehler, wenn descriptor.mod nicht oben liegt`
    - Quelle ist `{ '1521695605/descriptor.mod': 'name="X"' }`
  - `leseModOrdner liefert name und quelle`

  Dazu in `tests/leser/dateiquelle.test.js` diese Tests:
  - `ueberlagert: spätere Ebene gewinnt bei gleichem Pfad, auch bei anderer Gross-/Kleinschreibung`
    - Spiel `common/a.txt`='spiel', Mod `Common/A.txt`='mod'
    - erwartet `text('common/a.txt')` gleich `'mod'`
    - erwartet, dass `liste()` den Pfad nur einmal enthält
    - erwartet `ebene('common/a.txt') === 1`
  - `ueberlagert: replace_path entfernt direkte Dateien früherer Ebenen, Unterordner bleiben`
    - Spiel hat `common/national_focus/germany.txt` und `common/national_focus/sub/x.txt`
    - Mod hat `replacePaths ['common/national_focus']` und `common/national_focus/reich.txt`
    - erwartet `hat('common/national_focus/germany.txt') === false`
    - erwartet `sub/x.txt` und `reich.txt` vorhanden
  - `ueberlagert: zwei Mods hintereinander, ebenenName`
    - Mod2 überschreibt Mod1
    - erwartet `ebene` 2 und `ebenenName(2)` gleich Mod2-Name
  - `ueberlagert: descriptor.mod, thumbnail.png und *.mod einer Mod gehören nicht dazu`

- [ ] **Step 2:** `npx vitest run tests/leser/mod-ordner.test.js tests/leser/dateiquelle.test.js` → FAIL (Module oder Funktionen fehlen)

- [ ] **Step 3: Implementieren.**
  - `leseDeskriptor` nutzt `parseParadox` und `findeAlle` mit `wertText`.
  - `dateiquelleUeberlagert` baut eine Map `kleinPfad → { ebene, quelle, pfad }`:
    - Die Ebenen werden der Reihe nach angewendet.
    - Vor dem Eintragen einer Mod-Ebene werden alle bisherigen Einträge gelöscht, deren Ordner (`pfad` bis zum letzten `/`, kleingeschrieben) gleich einem `replacePath` ist (kleingeschrieben).
    - `text` und `bytes` delegieren an die Quelle der Ebene mit deren echtem Pfad.

- [ ] **Step 4:** Dieselben Tests → PASS. Danach `npx vitest run` → alles grün.

- [ ] **Step 5: Commit** «Mod-Ordner lesen und Dateiquellen überlagern»

---

### Task 2: Liste der installierten Mods

**Files:**
- Modify: `src/leser/mod-ordner.js`
- Test: `tests/leser/mod-ordner.test.js`

**Interfaces:**
- Consumes: `leseDeskriptor` (Task 1)
- Produces: `async leseModListe(benutzerOrdner: FileSystemDirectoryHandle, { ausser?: string } = {}) → { datei, name, version, id, pfad, absolut: boolean }[]`
  - `datei` ist der Dateiname, zum Beispiel `ugc_1521695605.mod`.
  - `absolut` ist wahr, wenn `pfad` mit `/` oder `X:` beginnt.
  - Die Liste ist nach `name` sortiert (`localeCompare 'de'`).
  - `ausser` ist der Dateiname, der fehlen soll, also die `.mod` des offenen Projekts.
  - Fehlt der Ordner `mod`, ist das Ergebnis `[]`.
  - Unlesbare Dateien oder Dateien ohne Namen werden ausgelassen.

- [ ] **Step 1: Tests schreiben.**
  - Für alle Tests: `erstelleFakeOrdner` aus `src/selbsttest/fake-ordner.js` mit drei Dateien:
    - `mod/ugc_1.mod` mit absolutem Pfad `/Users/x/Library/Application Support/Steam/steamapps/workshop/content/394360/1` und `remote_file_id="1"`
    - `mod/eigen.mod` mit `path="mod/eigen"`
    - `mod/kaputt.mod` mit `name=` und ohne Wert
  - `leseModListe liest .mod-Dateien, erkennt absolute Pfade, sortiert`:
    - Erwartet sind zwei Einträge.
    - Kaputte Datei fehlt.
    - `absolut` ist richtig gesetzt.
  - `leseModListe ohne Ordner mod → []`
  - `leseModListe mit ausser lässt die eigene Mod weg`

- [ ] **Step 2:** `npx vitest run tests/leser/mod-ordner.test.js` → FAIL

- [ ] **Step 3: Implementieren.** Über `(await ordner.getDirectoryHandle('mod')).entries()` laufen, nur `kind === 'file'` mit Endung `.mod`. Jede Datei in `try/catch`.

- [ ] **Step 4:** PASS, danach `npx vitest run` grün.

- [ ] **Step 5: Commit** «Liste der installierten Mods lesen»

---

### Task 3: Leser mit Grundlage

**Files:**
- Create: `src/selbsttest/mini-mod.js`
- Modify: `src/leser/spielordner.js`
- Test: `tests/leser/spielordner.test.js`

**Interfaces:**
- Consumes: `dateiquelleUeberlagert`, `leseModOrdner` (Task 1)
- Produces:
  - `erstelleMiniMod() → { [pfad]: string }`. Sein Mod-Name `MINI_MOD_NAME = 'Mini-Reich'` wird exportiert.
  - `leseSpielordner(quelle, { grundlage = [] })` legt `spieldaten.grundlage` ab.
  - `spielFokusbaeume[].quelle: string`
  - `bericht.grundlage: string[]`

`erstelleMiniMod()` im Format echter Mods:
- `descriptor.mod`: `version="2.0"`, `name="Mini-Reich"`, `remote_file_id="424242"`, `replace_path="common/national_focus"`, `supported_version="1.15.*"`
- `common/national_focus/reich.txt`:
  - `focus_tree = { id = reich_focus country = { factor = 0 modifier = { add = 10 tag = GER } } … }`
  - mit Fokus `REICH_start` (x 3, y 0, `completion_reward = { add_political_power = 50 }`)
  - und Fokus `REICH_weiter` (`relative_position_id = REICH_start`, y 1, `prerequisite = { focus = REICH_start }`)
- `localisation/german/00_minireich_l_german.yml`:
  - `GER` = «Reich (Mini)»
  - `REICH_start` = «Aufbruch»
  - `REICH_weiter` = «Weiter so»
  - Der Name beginnt mit `00_`, damit er alphabetisch **vor** `countries_l_german.yml` liegt. So prüft der Test die Ebenen-Reihenfolge wirklich.

- [ ] **Step 1: Tests schreiben** in `tests/leser/spielordner.test.js`, neuer `describe('Etappe 4g')`:
  - Vorbereitung: `quelle = dateiquelleUeberlagert(dateiquelleAusObjekt(erstelleMiniSpielordner()), [{ ...mod, quelle: modQuelle }])` mit `mod = await leseModOrdner(dateiquelleAusObjekt(erstelleMiniMod()))`. Dann `leseSpielordner(quelle, { grundlage: [{ name: mod.name, version: mod.version, id: mod.id }] })`.
  - `Sprachschlüssel der Mod gewinnen auch bei anderem Dateinamen`: `sd.laender.GER.name === 'Reich (Mini)'`
  - `replace_path entfernt die Fokusbäume des Spiels, der Baum der Mod hat quelle`: `sd.spielFokusbaeume.map(b => b.id)` gleich `['reich_focus']`, dazu `quelle === 'Mini-Reich'` und `spielfokus.baeume.reich_focus.fokusse.length === 2`. Den Feldnamen von `spielfokus` aus dem bestehenden 4f-Test übernehmen.
  - `spieldaten.grundlage und bericht.grundlage`
  - `ohne Grundlage: grundlage [] und quelle «Spiel»`: nur der Mini-Spielordner, `german_focus.quelle === 'Spiel'`

- [ ] **Step 2:** `npx vitest run tests/leser/spielordner.test.js` → FAIL (GER heisst «Deutschland», `quelle` fehlt)

- [ ] **Step 3: Implementieren.**
  - `const ebene = (p) => quelle.ebene?.(p) ?? 0` und `const ebenenName = (i) => quelle.ebenenName?.(i) ?? 'Spiel'`.
  - Sprachdateien sortieren nach: Nicht-`replace` vor `replace`, dann `ebene`, dann Pfad.
  - Fokusbaum-Übersicht: `quelle: ebenenName(ebene(pfad))`.
  - `spieldaten.grundlage = grundlage`; `bericht.grundlage = grundlage.map(g => g.name)`.

- [ ] **Step 4:** PASS, danach `npx vitest run` grün.

- [ ] **Step 5: Commit** «Spielordner mit Mods als Grundlage lesen»

---

### Task 4: Projekt, Prüfung und Erzeuger

**Files:**
- Modify: `src/projekt/modell.js`, `src/pruefung/regeln.js`, `src/erzeuger/index.js`
- Test: `tests/projekt/modell.test.js`, `tests/pruefung/grundlage.test.js` (neu), `tests/erzeuger/grundlage.test.js` (neu)

**Interfaces:**
- Consumes: `erstelleMiniMod`, Leser aus Task 3, `importiereSpielbaum` (4f)
- Produces:
  - `neuesProjekt(name, grundlage = [])`, wobei `mod.grundlage` gleich `grundlage.map(({ name, id }) => ({ name, id }))` ist
  - `ergaenzeProjekt` ergänzt `mod.grundlage ?? []`
  - `grundlageText(liste) → string` aus `modell.js`: `'Nur das Spiel'` bei leerer Liste, sonst die Namen mit `' + '` verbunden
  - Prüfregel `grundlage-abweichend`

- [ ] **Step 1: Tests schreiben.**
  - `modell.test.js`:
    - `neuesProjekt übernimmt die Grundlage ohne version`
    - `ergaenzeProjekt ergänzt grundlage []`
    - `grundlageText`
  - `tests/pruefung/grundlage.test.js`:
    - **Fall:** Projekt ohne Grundlage, Spieldaten mit `grundlage [{name:'Mini-Reich'}]`. Erwartet wird die Meldung `grundlage-abweichend` mit `schwere 'fehler'`, `ziel { bereich: 'einstellungen' }` und dem Text `Dieses Projekt baut auf «Nur das Spiel» auf, eingelesen ist aber «Mini-Reich». Lies den Spielordner mit der richtigen Grundlage ein oder stelle sie in den Einstellungen um.`
    - **Gegenfall:** gleiche Namen
    - **Gegenfall:** Spieldaten ohne Feld `grundlage` und Projekt mit `[]` geben keinen Fehler.
    - **Reihenfolge zählt:** `[A,B]` gegen `[B,A]` gibt einen Fehler.
  - `tests/erzeuger/grundlage.test.js`:
    - `Submod: dependencies in descriptor.mod und <modid>.mod, Baum der Mod am gleichen Pfad`
      - Vorbereitung: Mini-Spiel + Mini-Mod lesen, `testprojekt(sd)` mit `mod.grundlage = [{ name: 'Mini-Reich', id: '424242' }]`, `importiereSpielbaum(..., 'reich_focus', 'aendern')`, `erzeugeMod`.
      - Erwartet: `fehler` leer; beide Deskriptoren enthalten `dependencies={\n\t"Mini-Reich"\n}`.
      - Erwartet: Die Datei `mod/mein_reich/common/national_focus/reich.txt` existiert.
    - `ohne Grundlage keine dependencies`
    - `Umlaute im Namen der Grundlage`: Grundlage `Mittelmächte sieg`. `dependencies` enthält den Namen exakt, und `fehler` ist leer. Spieldaten-Grundlage für diesen Test passend setzen.

- [ ] **Step 2:** `npx vitest run tests/projekt/modell.test.js tests/pruefung/grundlage.test.js tests/erzeuger/grundlage.test.js` → FAIL

- [ ] **Step 3: Implementieren.**
  - **Regel:** im Abschnitt «Mod» von `pruefeProjekt` mit `namen = (l) => (l ?? []).map(g => g.name).join('\n')`.
  - **Deskriptor:** `deskriptor()` hängt bei nicht leerer Grundlage `dependencies={\n` + je Name `\t"<name ohne ">"\n` + `}\n` an. Beide Dateien nutzen denselben Text.
  - **Ausgabeprüfung:** Schlägt sie bei Umlauten im Deskriptor an, den Deskriptor von dieser Prüfung ausnehmen, so wie die `kopie`-Dateien. Der Launcher liest UTF-8.

- [ ] **Step 4:** PASS, danach `npx vitest run` grün.

- [ ] **Step 5: Commit** «Grundlage im Projekt, Prüfung und dependencies»

---

### Task 5: Zustand und Seite «Spielordner einlesen»

**Files:**
- Create: `src/projekt/grundlage.js`
- Modify: `src/ui/zustand.js`, `src/ui/spielordner.jsx`, `src/ui/stil.css`, `src/selbsttest/szenario.js`
- Test: `tests/projekt/grundlage.test.js` (neu)

**Interfaces:**
- Consumes: Tasks 1–4
- Produces:
  - `src/projekt/grundlage.js`, reine Funktionen:
    - `fuegeGrundlageHinzu(liste, mod) → liste`: Gleicher `name` ersetzt den Eintrag an seiner Stelle, sonst wird angehängt.
    - `entferneGrundlage(liste, i) → liste`
    - `ueberlagerung(spielQuelle, liste) → Dateiquelle`: bei leerer Liste `spielQuelle` selbst, sonst `dateiquelleUeberlagert`
    - `grundlageDaten(liste) → { name, version, id }[]`
  - Zustand, nur in der Sitzung und nicht in IndexedDB:
    - `spielQuelle`: Modulvariable
    - `grundlageMods`: im Speicher-Zustand, Einträge aus `leseModOrdner`
    - `modListe`: `null` oder Liste aus `leseModListe`
  - Aktionen:
    - `spielordnerEinlesen(quelle)` merkt `spielQuelle = quelle`, liest `ueberlagerung(quelle, grundlageMods)` mit `{ grundlage: grundlageDaten(grundlageMods) }` und gibt das Ergebnis zurück wie bisher.
    - `async grundlageHinzufuegen(modQuelle, { erwartet } = {})`: liest `leseModOrdner`; ein Fehler setzt `meldung` auf den Fehlertext. Weicht der Name von `erwartet` ab, kommt die Meldung `Gewählt wurde «X», nicht «Y».` Danach `fuegeGrundlageHinzu` und Neueinlesen über `spielordnerEinlesen(spielQuelle)`.
    - `async grundlageEntfernen(i)`: entfernt den Eintrag und liest neu ein.
    - `async modListeLesen()`: nimmt `zielordner` oder fragt `showDirectoryPicker({ id: 'hoi4-benutzerordner', mode: 'readwrite', startIn: 'documents' })` und ruft `merkeZielordner` auf. Dann `leseModListe(handle, { ausser: projekt ? `${projekt.mod.modid}.mod` : undefined })`.
    - `neuesProjekt(name)` übergibt `spieldaten?.grundlage ?? []`.

**Oberfläche** in `spielordner.jsx`, neue Komponente `Grundlage`, nur sichtbar mit `z.spieldaten` und ohne laufendes Einlesen:
- Karte `grundlage-karte` mit der Überschrift «Grundlage für Submods» und einem Satz Erklärung: «Willst du eine Mod erweitern, zum Beispiel Kaiserreich? Dann lies sie hier zusätzlich ein. Deine Mod wird dadurch zur Submod und verlangt sie im Launcher.»
- `grundlage-aktuell`: `grundlageText(...)`
- je Eintrag `grundlage-<i>` mit Name und Version, dazu `grundlage-<i>-entfernen`
- Ohne `spielQuelle` (Aktion `hatSpielQuelle()`) sind die Mod-Knöpfe gesperrt, und es erscheint der Hinweis «Wähle zuerst oben den Spielordner (neu einlesen).»
- `modliste-lesen`: «Installierte Mods anzeigen»
- je Mod `modliste-<i>`:
  - Name, Pfad als `<code>`
  - Knopf `modliste-<i>-pfad` «Pfad kopieren» über `navigator.clipboard`
  - `<label class="knopf datei-knopf">Ordner wählen<input type="file" webkitdirectory data-test="grundlage-input-<i>">`. Das Ereignis ruft `grundlageHinzufuegen(dateiquelleAusFileList(files), { erwartet: name })` auf.
  - Relative Pfade zeigen den Zusatz «im Ordner «Hearts of Iron IV» (Dokumente)».
- Hinweis unter der Liste:
  - «Im Auswahlfenster: Auf dem Mac ⌘⇧G drücken und den Pfad einfügen (der Steam-Ordner liegt im versteckten Ordner Library). Unter Windows den Pfad oben in die Adressleiste einfügen.»
  - «Musst du später neu einlesen, wähle die Mod-Ordner dann nochmals.»
- Freier Knopf `grundlage-input`: «Anderen Mod-Ordner wählen»
- `Bericht`: Die Überschrift wird «Eingelesen: Spiel 1.x» + ` + ${namen}`, wenn `bericht.grundlage?.length`. Auch `berichtAlsText` ergänzen.

- [ ] **Step 1: Tests schreiben** in `tests/projekt/grundlage.test.js`:
  - `fuegeGrundlageHinzu hängt an und ersetzt gleichen Namen an seiner Stelle`
  - `entferneGrundlage`
  - `ueberlagerung ohne Mods ist die Spielquelle selbst`
  - `ueberlagerung mit Mod: Spielordner neu eingelesen behält die Mods`. Gleiche Liste, neue Spielquelle; danach liefert `text` eines Mod-Pfads den Mod-Inhalt.
  - `grundlageDaten`

- [ ] **Step 2:** `npx vitest run tests/projekt/grundlage.test.js` → FAIL

- [ ] **Step 3: Implementieren:** `grundlage.js`, Zustand, Oberfläche, Stil (kleine Abstände, Pfad mit `word-break: break-all`).

- [ ] **Step 4: Selbsttest-Schritt «Grundlage hinzufügen»** am Ende von `SCHRITTE`, nach «Projekt aus Mod öffnen»:
  - `fakeOrdner` bekommt `mod/ugc_424242.mod` mit `name="Mini-Reich"` und absolutem Pfad.
  - Zur Seite «Spielordner» gehen: `aktionen.gehe({ bereich: 'spielordner' })`. Den Bereichsnamen aus `app.jsx` übernehmen.
  - `modliste-lesen` klicken; erwartet `modliste-0` mit «Mini-Reich».
  - Direkt `aktionen.grundlageHinzufuegen(dateiquelleAusObjekt(erstelleMiniMod()), { erwartet: 'Mini-Reich' })` aufrufen, weil `webkitRelativePath` im Selbsttest nicht nachstellbar ist.
  - Warten, bis `grundlage-aktuell` «Mini-Reich» enthält und der Bericht «+ Mini-Reich» zeigt.

- [ ] **Step 5:** `npx vitest run` grün und `npm run selbsttest` → `SELBSTTEST OK`

- [ ] **Step 6: Commit** «Grundlage für Submods auf der Seite Spielordner»

---

### Task 6: Einstellungen, Fokusbaum-Dialog, Mac-Hinweise, Selbsttest Submod, Anleitung

**Files:**
- Modify:
  - `src/ui/einstellungen.jsx`
  - `src/ui/fokus/baeume.jsx`
  - `src/ui/speichern.jsx`
  - `src/ui/spielordner.jsx`
  - `src/selbsttest/szenario.js`
  - `README.md`

**Interfaces:**
- Consumes: `grundlageText`, `setzeModFeld(p, 'grundlage', liste)` (vorhanden), Spieldaten mit `grundlage`

**Inhalt:**
- **Einstellungen:**
  - Zeile `mod-grundlage`: «Grundlage: <grundlageText(p.mod.grundlage)>»
  - Weicht sie von `grundlageText(sd.grundlage ?? [])` ab, erscheint der Knopf `grundlage-uebernehmen`: «Grundlage auf «…» umstellen». Er setzt `grundlage` auf die Spieldaten, als `{ name, id }`.
- **Fokusbaum-Dialog:**
  - Knopftext «Baum aus Spiel oder Mod …»
  - In `spielbaum-<id>` steht bei `quelle && quelle !== 'Spiel'` zusätzlich `· <quelle>`.
- **Speichern, `Checkliste`:**
  - Die ZIP-Zeile nennt beide Pfade: «Windows: Dokumente\Paradox Interactive\Hearts of Iron IV · Mac: Dokumente/Paradox Interactive/Hearts of Iron IV».
  - Neu: «Läuft der Launcher schon, starte ihn neu. Er sucht nur beim Start nach neuen Mods.»
  - Spielsets-Schritt: «… lege ein neues Spielset an, klicke auf «Weitere Mods hinzufügen» und füge deine Mod hinzu.»
  - Bei `p.mod.grundlage.length`: «Füge auch «<Namen>» hinzu. Der Launcher ordnet die Reihenfolge selbst.» `Checkliste` bekommt dafür `grundlage` als Eigenschaft.
- **Spielordner-Anleitung:** In Schritt 2 kommt nach dem Windows-Pfad der Satz «Auf dem Mac: ~/Library/Application Support/Steam/steamapps/common/Hearts of Iron IV – im Auswahlfenster ⌘⇧G drücken und den Pfad einfügen.»
- **Selbsttest:** neuer Schritt «Submod» nach «Grundlage hinzufügen»:
  - neues Projekt «Selbsttest Submod» über die Startseite
  - erwartet: `zustand().projekt.mod.grundlage[0].name === 'Mini-Reich'`
  - Fokusbaum-Dialog: Der Eintrag `spielbaum-reich_focus` enthält «Mini-Reich». Mit Art «ändern» importieren.
  - Speichern in den Ordner: `mod/selbsttest_submod/descriptor.mod` enthält `"Mini-Reich"`, und `mod/selbsttest_submod/common/national_focus/reich.txt` existiert.
  - Danach `aktionen.grundlageEntfernen(0)`. Die Prüfung zeigt `grundlage-abweichend`, und in den Einstellungen erscheint `grundlage-uebernehmen`.
- **README:**
  - Etappe-4-Liste: «Mods als Grundlage (Submods)»
  - Pläne: «(Etappe 1 bis 4g)»
  - Grenzen: gleichnamige Objekte in verschiedenen Dateien; Mod-Ordner nach jedem Browser-Neustart neu wählen

- [ ] **Step 1:** Selbsttest-Schritt «Submod» schreiben, dann `npm run selbsttest` → FEHLER (Eintrag ohne Quelle, `grundlage-uebernehmen` fehlt)
- [ ] **Step 2:** Einstellungen, Dialog, Checkliste und Anleitung umsetzen
- [ ] **Step 3:** `npx vitest run` grün und `npm run selbsttest` → `SELBSTTEST OK`
- [ ] **Step 4: Commit** «Etappe 4g: Einstellungen, Fokus-Dialog, Mac-Hinweise, Selbsttest, Anleitung»
