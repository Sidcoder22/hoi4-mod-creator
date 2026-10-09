# HOI4 Mod Creator – Etappe 3b (Boni in Fokussen, Events und Entscheidungen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Boni der nationalen Geister (auch Konsumgüter) lassen sich über den Baustein «Bonus erhalten» in Fokussen, Event-Antworten und Entscheidungen vergeben, dauerhaft oder für X Tage; Entscheidungen mit Dauer bekommen «Bonus während der Laufzeit».

**Architecture:** Die Bonus-Prüfung und die Bonus-Anzeige ziehen in die reine Schicht `src/projekt/boni.js`, damit Baukasten, Prüfung und Oberfläche sie teilen. Der neue Baustein meldet beim Erzeugen einen Bonus-Geist an den Erzeuger-Kontext, und der Erzeuger der Geister läuft zuletzt und schreibt eigene Geister und Bonus-Geister in dieselbe Datei. Entscheidungen erhalten das Feld `boniLaufzeit`, das als `modifier`-Block erscheint.

**Tech Stack:** wie bisher (Vite 8, Preact 11, Vitest 5, puppeteer-core).

**Spec:** `docs/superpowers/specs/2026-10-09-etappe-3b-boni-in-bausteinen-design.md` (ergänzt `2026-10-07-hoi4-mod-creator-design.md`)

## Global Constraints

Alle Global Constraints aus Etappe 1–3 gelten weiter, zusätzlich:

- `LESER_VERSION` bleibt 5 (keine neuen Spieldaten).
- Kennung des Bonus-Geists: `<modid>_bonus_<baustein-id>`.
- Wirkung: `tage = 0` → `add_ideas = <kennung>`; `tage > 0` → `add_timed_idea = { idea = <kennung> days = <tage> }`.
- Bonus-Geist: `picture = <sprite ohne GFX_idea_>`, `allowed = { always = no }`, `removal_cost = -1`, `modifier = { … }` mit `zahl(bonusWertImSpiel(b), 6)`, in `common/ideas/<modid>_ideas.txt` im Block `country`; Sprache `<kennung>` = Name, `<kennung>_desc` = `''`.
- Die Anzeige eines Bonus benutzt das bestehende Format von `bonusText` (z. B. `Konsumgüter -10 %`, mit normalem Minus statt «−» aus dem Konzept), mehrere mit `, ` verbunden.
- Das Standardbild ist fest `GFX_idea_generic_army` (Bausteine kennen beim Anlegen keine Spieldaten); fehlt es im Spiel, meldet die Prüfung «Bild fehlt».

## Review Focus

1. **Dieselbe Bonus-Wirkung (gleiche Baustein-ID) kommt mehrfach in der Mod vor**, etwa weil sie in eine Antwort und eine Entscheidung kopiert wurde. Erwartet: genau ein Geist, keine «Datei doppelt»-Meldung. Test in Task 2.
2. **Nur Bonus-Bausteine, keine eigenen Geister.** Erwartet: `common/ideas/<modid>_ideas.txt` entsteht trotzdem, und die Ausgabeprüfung findet das Bild. Test in Task 2.
3. **Freier Bonus mit Grossbuchstaben im Baustein** («Consumer Goods»). Erwartet: Fehler `baustein` in der Prüfung, kein kaputter Code. Test in Task 2.
4. **Entscheidung mit Laufzeit-Boni, dann Dauer auf 0 gesetzt.** Erwartet: kein `modifier`-Block, keine Prüfung der Laufzeit-Boni, und «bewirkt nichts» erscheint wieder, wenn sonst nichts da ist. Test in Task 3.
5. **Altes Projekt ohne `boniLaufzeit`.** Erwartet: öffnet, das Feld wird als `[]` ergänzt. Test in Task 3.

---

### Task 1: Gemeinsame Bonus-Prüfung und Bonus-Anzeige

**Files:** Modify `src/projekt/boni.js`, `src/pruefung/regeln.js`, `src/ui/bonus-editor.jsx` (und die drei Importe von `bonusText` in `src/ui/laender/eigenschaften.jsx`, `src/ui/geister/geist-bild.jsx`, `src/ui/geister/spielgeister.jsx`) · Test `tests/projekt/boni.test.js`

**Interfaces:**
- `pruefeBonus(bonus, sd) → string | null` in `boni.js`. Texte ohne «Wer»-Präfix:
  - frei mit ungültigem Namen (`/^[a-z0-9_]+$/`): `Der Bonus «<modifier>» hat einen ungültigen Namen. Erlaubt sind nur Kleinbuchstaben, Ziffern und _.`
  - feste Liste ausserhalb des Bereichs oder kein Zahlenwert: `«<name>» muss zwischen <min> und <max> liegen.`
  - unbekannte `art` (weder `frei` noch in `BONI`): `Unbekannter Bonus «<art>».`
- `bonusText(bonus, sd) → string` zieht unverändert von `ui/bonus-editor.jsx` nach `boni.js`. `bonus-editor.jsx` exportiert es weiter (Re-Export), damit die drei Aufrufer unverändert bleiben dürfen.
- `regeln.js` benutzt `pruefeBonus` in `pruefeBoni`. Die Meldungstexte bleiben `<wer>: <text>`, die Regeln `bonus-name`/`bonus-wert` bleiben gleich, der Hinweis `bonus-unbekannt` bleibt in `regeln.js`.

- [ ] **Step 1: Failing tests**

```js
expect(pruefeBonus({ art: 'konsumgueter', wert: -10 }, sd)).toBeNull()
expect(pruefeBonus({ art: 'konsumgueter', wert: 80 }, sd)).toBe('«Konsumgüter» muss zwischen -50 und 50 liegen.')
expect(pruefeBonus({ art: 'frei', modifier: 'Consumer Goods', wert: 0.1 }, sd)).toMatch(/ungültigen Namen/)
expect(pruefeBonus({ art: 'frei', modifier: 'consumer_goods_factor', wert: 0.1 }, sd)).toBeNull()
expect(pruefeBonus({ art: 'gibtsnicht', wert: 1 }, sd)).toBe('Unbekannter Bonus «gibtsnicht».')
expect(bonusText({ art: 'konsumgueter', wert: -10 }, sd)).toBe('Konsumgüter -10 %')
expect(bonusText({ art: 'frei', modifier: 'consumer_goods_factor', wert: -0.05 }, sd)).toBe('Konsumgüter -5 %')
```

- [ ] **Step 2: Run** `npx vitest run tests/projekt/boni.test.js`. Expected: FAIL (`pruefeBonus` fehlt).
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS, auch die bestehenden Regeln `bonus-name`/`bonus-wert` in `tests/pruefung/regeln.test.js`.
- [ ] **Step 5: Commit** – `"Bonus-Pruefung und -Anzeige gemeinsam in boni.js"`

---

### Task 2: Baustein «Bonus erhalten» und Bonus-Geister

**Files:** Modify `src/bausteine/wirkungen.js`, `src/bausteine/felder.js`, `src/erzeuger/baustein-kontext.js`, `src/erzeuger/index.js`, `src/erzeuger/ideen.js`, `src/erzeuger/kennungen.js` · Test `tests/bausteine/bonus.test.js`, `tests/erzeuger/bonus.test.js`

**Interfaces:**
- Neue Feldtypen in `felder.js`:
  - `boni`: `pruefeFeld` → leer oder kein Array: `Mindestens ein Bonus fehlt`; sonst der erste Text aus `pruefeBonus`. `feldAnzeige` → `bonusText` aller Boni, verbunden mit `, `.
  - `ideenbild`: `pruefeFeld` → nicht in `sd.sprites`: `Bild fehlt`. `feldAnzeige` → Sprite ohne `GFX_idea_`.
- Wirkung in `WIRKUNGEN`, Gruppe «Politik», direkt nach `spielgeist_weg`:

| art | Felder (Name, Typ, Standard) | Satz |
|---|---|---|
| `bonus` | `name` text `''` · `bild` ideenbild `'GFX_idea_generic_army'` · `boni` boni `[{ art: 'konsumgueter', wert: -10 }]` · `tage` zahl `0` (0–3650, Label «Dauer in Tagen (0 = dauerhaft)») | `Bonus «<name>»: <boni>` + ` – für <tage> Tage` bzw. ` – dauerhaft` |

- `bonusKennung(p, bausteinId) → '<modid>_bonus_<bausteinId>'` in `kennungen.js`.
- `bausteinKontext(k, quelle)` gibt `bonusGeist(kennung, { name, bild, boni })` aus `k` weiter, und `kennung.bonus(bausteinId)` liefert die Kennung.
- Erzeuger-Kontext in `index.js`: `bonusGeist(kennung, daten)` sammelt in einer Map (eine Kennung nur einmal). `ERZEUGER` stellt `erzeugeIdeen` an das **Ende** der Liste. `erzeugeIdeen` schreibt eigene Geister und alle gesammelten Bonus-Geister in eine Datei; die Datei entsteht, sobald eines von beiden existiert. Bonus-Geister: `k.braucheGfx(bild)`, `k.braucheSprache(kennung)`.

- [ ] **Step 1: Failing tests**
  - `tests/bausteine/bonus.test.js` (mit echtem `bausteinKontext` und einem `k`, das `bonusGeist` mitschreibt):

```js
expect(neueWirkung('bonus').werte).toEqual({ name: '', bild: 'GFX_idea_generic_army', boni: [{ art: 'konsumgueter', wert: -10 }], tage: 0 })
expect(text(erzeugeWirkungen([b], k))).toBe(`add_ideas = mein_reich_bonus_${b.id}\n`)
expect(text(erzeugeWirkungen([{ ...b, werte: { ...b.werte, tage: 180 } }], k)))
  .toBe(`add_timed_idea = {\n\tidea = mein_reich_bonus_${b.id}\n\tdays = 180\n}\n`)
expect(gemeldet).toEqual([[`mein_reich_bonus_${b.id}`, { name: 'Festlaune', bild: 'GFX_idea_generic_army', boni: [{ art: 'konsumgueter', wert: -10 }] }]])
expect(satzText(wirkungsDef('bonus'), { ...b.werte, tage: 180 }, kontext)).toBe('Bonus «Festlaune»: Konsumgüter -10 % – für 180 Tage')
expect(satzText(wirkungsDef('bonus'), b.werte, kontext)).toBe('Bonus «Festlaune»: Konsumgüter -10 % – dauerhaft')
expect(pruefeBausteine([mitWerten({ boni: [] })], kontext, 'A')[0].text).toMatch(/Mindestens ein Bonus fehlt/)
expect(pruefeBausteine([mitWerten({ boni: [{ art: 'konsumgueter', wert: 99 }] })], kontext, 'A')[0].text).toMatch(/zwischen -50 und 50/)
expect(pruefeBausteine([mitWerten({ bild: 'GFX_idea_gibtsnicht' })], kontext, 'A')[0].text).toMatch(/Bild fehlt/)
expect(pruefeBausteine([mitWerten({ name: '' })], kontext, 'A')[0].text).toMatch(/Name/)
// Review Focus 3
expect(pruefeBausteine([mitWerten({ boni: [{ art: 'frei', modifier: 'Consumer Goods', wert: 0.1 }] })], kontext, 'A')[0].text).toMatch(/ungültigen Namen/)
```

  - `tests/erzeuger/bonus.test.js`:
    - Fokus mit Bonus «Festlaune», Konsumgüter −10 %, 180 Tage. Die Fokusdatei enthält `add_timed_idea`. `common/ideas/mein_reich_ideas.txt` parst streng und enthält den eigenen Geist `mein_reich_geist_1` **und** `mein_reich_bonus_<id>` mit `consumer_goods_factor = -0.1`, `picture = generic_army`, `removal_cost = -1`. Die Sprachdatei hat `mein_reich_bonus_<id>` = «Festlaune». `fehler` ist `[]`.
    - **Review Focus 2:** Projekt ohne eigene Geister (`ideen: []`, Land ohne `ideen`), nur ein Event mit Bonus-Antwort: Die Ideen-Datei entsteht, `fehler` ist `[]`.
    - **Review Focus 1:** Dieselbe Wirkung (gleiche ID) in Event-Antwort und Entscheidung: genau ein Eintrag `mein_reich_bonus_<id>` in der Ideen-Datei, kein «Datei doppelt».
    - `bei_land` GER mit Bonus darin ergibt `GER = { add_ideas = … }`.
- [ ] **Step 2: Run** `npx vitest run tests/bausteine/bonus.test.js tests/erzeuger/bonus.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (die Vollständigkeitsprüfung in `tests/bausteine/bausteine.test.js` kennt `bonus` als eigenen Fall, wie `event`).
- [ ] **Step 5: Commit** – `"Baustein Bonus erhalten"`

---

### Task 3: Entscheidungen – Bonus während der Laufzeit

**Files:** Modify `src/projekt/entscheidungen.js`, `src/projekt/modell.js` (`ergaenzeProjekt`), `src/erzeuger/entscheidungen.js`, `src/pruefung/regeln.js` · Test `tests/erzeuger/entscheidungen.test.js`, `tests/pruefung/etappe3.test.js`, `tests/projekt/entscheidungen.test.js`

**Interfaces:**
- `Entscheidung.boniLaufzeit: Bonus[]`, Vorgabe `[]` in `fuegeEntscheidungHinzu`; `ergaenzeProjekt` ergänzt es bei jeder Entscheidung.
- Erzeuger: bei `dauer > 0` und `boniLaufzeit.length` steht `modifier = { <modifier> = <wert> … }` direkt nach `days_remove`.
- Prüfung: bei `dauer > 0` jeder Laufzeit-Bonus über `pruefeBoni(d.boniLaufzeit, '<dname> (Bonus während der Laufzeit)', ziel)`. `entscheidung-ohne-wirkung` entfällt, wenn `dauer > 0` und `boniLaufzeit` nicht leer.

- [ ] **Step 1: Failing tests**
  - Erzeuger: D1 aus `aufbau()` mit `boniLaufzeit: [{ art: 'stabilitaet', wert: 5 }]` → `modifier.stability_factor = 0.05`. **Review Focus 4:** mit `dauer: 0` kein `modifier`.
  - Prüfung: `boniLaufzeit: [{ art: 'stabilitaet', wert: 99 }]` bei Dauer 10 ergibt `bonus-wert` mit Ziel `{ bereich: 'entscheidung', id }`; bei Dauer 0 nicht. Entscheidung ohne Wirkungen, Dauer 10, ein Laufzeit-Bonus: kein `entscheidung-ohne-wirkung`; dieselbe mit Dauer 0: wieder `entscheidung-ohne-wirkung`.
  - Projektdaten: `fuegeEntscheidungHinzu(...).entscheidungen[0].boniLaufzeit` ist `[]`. **Review Focus 5:** `ergaenzeProjekt` mit einer Entscheidung ohne `boniLaufzeit` ergibt `[]`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/entscheidungen.test.js tests/pruefung tests/projekt`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Entscheidungen: Bonus waehrend der Laufzeit"`

---

### Task 4: Oberfläche, Selbsttest, Anleitung

**Files:** Modify `src/ui/bausteine/felder.jsx`, `src/ui/entscheidungen/entscheidung-editor.jsx`, `src/ui/stil.css`, `src/selbsttest/szenario.js`, `README.md`

**Interfaces:**
- `BausteinFeld`:
  - `boni`: `<BonusEditor boni={wert} spieldaten={sd} test={test} onAendere={onAendere} />` (Test-IDs `<test>-art-<i>`, `<test>-wert-<i>`, `<test>-neu`)
  - `ideenbild`: `<SymbolGalerie symbole={sd.ideenBilder} bildArt="idee" test={test} praefix="GFX_idea_" klasse="ideen-galerie" />`, Test-IDs `<test>-<GFX>` und `<test>-suche`
- Entscheidungs-Editor: bei `dauer > 0` Abschnitt «Bonus während der Laufzeit» mit `<BonusEditor test="entscheidung-laufzeit">` und dem Satz «Gilt nur, solange die Entscheidung läuft.»

- [ ] **Step 1: Selbsttest-Schritte (failing)**
  - In «Event-Antworten» nach der Wirkung «politische Macht»:
    - `klicke('antwort-0-wirkung-neu')`, `waehle('antwort-0-wirkung-art-1', 'bonus')`
    - `tippe('antwort-0-wirkung-1-name', 'Festlaune')`, `tippe('antwort-0-wirkung-1-tage', '180')`
    - `klicke('antwort-0-wirkung-1-bild-GFX_idea_generic_industry')`
    - Danach: Satz `antwort-0-wirkung-satz-1` ist `Bonus «Festlaune»: Konsumgüter -10 % – für 180 Tage`, und `vorschau-antwort-0` enthält «Festlaune».
  - In «Entscheidung» nach Dauer 30: `klicke('entscheidung-laufzeit-neu')` → `boniLaufzeit` hat einen Eintrag.
  - In «Speichern in Ordner»:
    - Die Events-Datei enthält `add_timed_idea`.
    - Die Ideen-Datei enthält `consumer_goods_factor = -0.1`.
    - Die Entscheidungs-Datei enthält `modifier = {`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Event-Antworten».
- [ ] **Step 3: Implementieren.** README, Abschnitt Etappe 3: ein Punkt «**Boni** wie bei den Geistern (auch Konsumgüter) über den Baustein «Bonus erhalten», dauerhaft oder für X Tage; Entscheidungen mit Dauer haben zusätzlich «Bonus während der Laufzeit».»
- [ ] **Step 4: Run** `npx vitest run && npm run selbsttest`. Expected: alles grün.
- [ ] **Step 5: Commit** – `"Etappe 3b: Oberflaeche, Selbsttest, Anleitung"`
