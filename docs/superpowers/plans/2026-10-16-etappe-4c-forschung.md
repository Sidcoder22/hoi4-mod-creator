# HOI4 Mod Creator – Etappe 4c (Forschung) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Startforschung neuer und bestehender Länder lässt sich per Schnellwahl und Liste mit Häkchen festlegen. Voraussetzungen werden dabei automatisch mitgeführt.

**Architecture:**
- Der Leser sammelt Technologien, Bereiche und die Startforschung jedes Landes.
- `src/projekt/forschung.js` enthält die reinen Funktionen für Liste, Schnellwahl und das Mitführen der Voraussetzungen.
- Der Erzeuger schreibt die Liste bei neuen Ländern direkt.
- Bei bestehenden Ländern entfernt er Technologien über eine neue Kontext-Funktion `verlaufUmformen` aus der kopierten Verlaufsdatei und hängt neue an.

**Tech Stack:** wie bisher.

**Spec:** `docs/superpowers/specs/2026-10-12-etappe-4c-forschung-design.md`

## Global Constraints

Alle Global Constraints aus Etappe 1–4b gelten weiter, zusätzlich:

- `LESER_VERSION = 7`.
- `land.forschung: string[] | null`. `null` bedeutet «wie bisher», und in diesem Fall gilt `technikWie` wie heute.
- Bestehende Länder folgen dem Muster «ändern»: Schalter `aendern.forschung` mit der Test-ID `aendern-forschung` (über `REITER.schalter`). Die Liste zählt nur, wenn der Schalter an ist.
- Datumsblöcke in Verlaufsdateien bleiben unverändert.
- Das Ziel der neuen Meldungen ist `{ bereich: 'land', id, reiter: 'forschung' }`.

## Review Focus

1. **Technologie mit Voraussetzungs-Kette (A → B → C), B abhaken.** Erwartet: C fällt mit weg, A bleibt, und `mitgeaendert` nennt C. Test in Task 2.
2. **Bestehendes Land, Technologie nur in einem `if`-Block.** Erwartet: Sie wird dort entfernt, und der Datumsblock `1939.1.1` bleibt unverändert. Test in Task 3.
3. **Bestehendes Land mit Schalter an, aber unveränderter Liste.** Erwartet: keine Änderung an der Forschung in der Verlaufsdatei. Test in Task 3.
4. **Altes Projekt ohne `forschung`.** Erwartet: `null` und unverändertes Verhalten mit `technikWie`. Test in Task 2 und 3.
5. **Spiel-Update entfernt eine Technologie, die in der Liste steht.** Erwartet: Fehler mit der Behebung «unbekannte entfernen», kein Absturz. Test in Task 4.

---

### Task 1: Spieldaten für Forschung

**Files:** Modify `src/leser/spielordner.js`, `src/selbsttest/mini-spielordner.js` · Test `tests/leser/spielordner.test.js`

**Interfaces:** neu in `spieldaten` sind `technologien`, `technologieBereiche` und `laender[tag].forschung`, genau wie in Spec §2. Dazu `bericht.technologien`.

**Ergänzung Mini-Spielordner:**
- `common/technologies/infantry.txt`, beginnend mit `@1918 = 0`:
  - `infantry_weapons`: Jahr 1918, `leads_to_tech = infantry_weapons1`, Ordner `infantry_folder`
  - `infantry_weapons1`: 1936, führt zu `infantry_weapons2`
  - `infantry_weapons2`: 1939
  - `tech_support`: 1936, Ordner `support_folder`
- `common/technologies/industry.txt`: `basic_machine_tools` (1936, führt zu `improved_machine_tools`) und `improved_machine_tools` (1940), Ordner `industry_folder`
- `common/technologies/land_doctrine.txt`: `grand_battle_plan` mit `doctrine = yes`, Jahr 1936, Ordner `land_doctrine_folder`
- Sprache:
  - `infantry_weapons` «Infanteriewaffen»
  - `infantry_weapons1` «Infanteriewaffen I»
  - `infantry_weapons2` «Infanteriewaffen II»
  - `industry_folder` «Industrie»
- Verlauf SWI: zusätzlich `if = { limit = { has_dlc = "La Resistance" } set_technology = { tech_support = 1 } }`

- [ ] **Step 1: Failing tests**

```js
expect(LESER_VERSION).toBe(7)
expect(sd.technologieBereiche).toEqual([{ id: 'infantry_folder', name: 'Infanterie' }, { id: 'support_folder', name: 'Unterstützung' },
  { id: 'industry_folder', name: 'Industrie' }, { id: 'land_doctrine_folder', name: 'Heeresdoktrin' }])
expect(sd.technologien.map(t => t.id)).toEqual(['infantry_weapons', 'infantry_weapons1', 'infantry_weapons2', 'tech_support', 'basic_machine_tools', 'improved_machine_tools', 'grand_battle_plan'])
expect(sd.technologien.find(t => t.id === 'infantry_weapons1')).toEqual({ id: 'infantry_weapons1', name: 'Infanteriewaffen I', bereich: 'infantry_folder', jahr: 1936, voraussetzungen: ['infantry_weapons'], doktrin: false })
expect(sd.technologien.find(t => t.id === 'grand_battle_plan')).toMatchObject({ doktrin: true, voraussetzungen: [] })
expect(sd.laender.GER.forschung).toEqual(['infantry_weapons', 'infantry_weapons1', 'tech_support'])
expect(sd.laender.SWI.forschung).toEqual(['infantry_weapons', 'tech_support'])
expect(sd.bericht.technologien).toBe(7)
```

- [ ] **Step 2: Run** `npx vitest run tests/leser`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Spieldaten fuer Forschung"`

---

### Task 2: Projektdaten und Forschungs-Logik

**Files:** Create `src/projekt/forschung.js` · Modify `src/projekt/modell.js`, `src/projekt/aenderungen.js` (neue Länder `forschung: null`, `aendern.forschung: false`) · Test `tests/projekt/forschung.test.js`

**Interfaces:** wie in Spec §3: `forschungVon`, `setzeForschung`, `schalteTechnologie`, `schnellwahl`, `forschungZuruecksetzen`.

`forschungVon(sd, land)` bei `null`:
- bestehendes Land: `sd.laender[tag].forschung`
- neues Land: die Forschung von `technikWie` oder vom bisherigen Besitzer der Hauptstadt, sonst `[]`

- [ ] **Step 1: Failing tests**

```js
// neues Land MRE aus testprojekt (Hauptstadt 1 = GER)
expect(forschungVon(sd, land(p))).toEqual(['infantry_weapons', 'infantry_weapons1', 'tech_support'])
let [q, mit] = schalteTechnologie(p, sd, mre, 'infantry_weapons2', true)
expect(land(q).forschung).toEqual(['infantry_weapons', 'infantry_weapons1', 'tech_support', 'infantry_weapons2'])
expect(mit).toEqual([])
;[q, mit] = schalteTechnologie(q, sd, mre, 'infantry_weapons1', false)   // Review Focus 1
expect(land(q).forschung).toEqual(['infantry_weapons', 'tech_support'])
expect(mit).toEqual(['infantry_weapons2'])
;[q, mit] = schalteTechnologie(setzeForschung(p, sd, mre, []), sd, mre, 'infantry_weapons2', true)
expect(mit).toEqual(['infantry_weapons1', 'infantry_weapons'])
expect(schnellwahl(sd, 'jahr', 1936).sort()).toEqual(['basic_machine_tools', 'infantry_weapons', 'infantry_weapons1', 'tech_support'])
expect(schnellwahl(sd, 'land', 'SWI')).toEqual(['infantry_weapons', 'tech_support'])
expect(schnellwahl(sd, 'nichts')).toEqual([])
expect(land(forschungZuruecksetzen(q, mre)).forschung).toBeNull()
// Review Focus 4
expect(ergaenzeProjekt({ ...p, laender: p.laender.map(l => { const { forschung, ...rest } = l; return rest }) }, sd).laender[0].forschung).toBeNull()
```

- [ ] **Step 2: Run** `npx vitest run tests/projekt/forschung.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (exakte Erwartungen an neue Länder ergänzen).
- [ ] **Step 5: Commit** – `"Projektdaten fuer Forschung"`

---

### Task 3: Erzeuger

**Files:** Modify `src/erzeuger/index.js` (`verlaufUmformen`), `src/erzeuger/land-neu.js`, `src/erzeuger/land-geaendert.js` · Test `tests/erzeuger/forschung.test.js`

**Interfaces:**
- `k.verlaufUmformen(tag, fn)`: `fn(eintrag) → eintrag | null` wird auf jeden Eintrag angewendet, auf oberster Ebene und in `if`/`else_if`/`else`, nicht in Datumsblöcken. `null` entfernt den Eintrag.
  - Die Funktion läuft in derselben Schleife wie `verlaufEntfernen`.
  - Sie löst eine Kopie der Verlaufsdatei aus, so wie heute `verlaufEntfernen`.
- Neues Land: Ist `forschung` eine Liste, ersetzt sie `technikFuer(...)`. Bei einer leeren Liste entfällt der Block `set_technology`.
- Bestehendes Land mit `aendern.forschung` und einer Liste:
  - `weg` = Spielforschung ohne Liste, `neu` = Liste ohne Spielforschung.
  - Bei nicht leerem `weg` ruft der Erzeuger `verlaufUmformen` auf. Die Funktion entfernt die Technologien aus `set_technology`-Blöcken, und ein leerer Block wird `null`.
  - Bei nicht leerem `neu` ergibt es die Anhang-Zeilen `set_technology = { … }`.
- `technikWie` gilt bei bestehenden Ländern nur noch, wenn `aendern.forschung` aus ist oder `forschung` `null` ist.

- [ ] **Step 1: Failing tests**
  - Neues Land MRE mit `forschung: ['tech_support', 'basic_machine_tools']`: Der `set_technology`-Block enthält genau diese zwei. Mit `[]` gibt es keinen `set_technology`-Block.
  - **Review Focus 4:** `forschung: null` mit `technikWie: 'SWI'` ergibt `infantry_weapons` und `tech_support`.
  - Schweiz geändert, `aendern.forschung` an, `forschung: ['infantry_weapons', 'basic_machine_tools']`:
    - In der kopierten `history/countries/SWI - Switzerland.txt`: Der `if`-Block enthält kein `tech_support` mehr, und sein leerer `set_technology` ist weg (**Review Focus 2**).
    - Der Anhang enthält `basic_machine_tools = 1`.
    - Die Datei parst streng.
  - Deutschland: Entfernen von `infantry_weapons1` lässt `1939.1.1 = { set_technology = { infantry_weapons2 = 1 } }` unverändert (**Review Focus 2**).
  - **Review Focus 3:** Schalter an, Liste gleich der Spielforschung, sonst nichts geändert: Es wird keine Verlaufsdatei der Schweiz geschrieben.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/forschung.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Forschung erzeugen"`

---

### Task 4: Prüfregeln

**Files:** Modify `src/pruefung/regeln.js` · Test `tests/pruefung/forschung.test.js`

**Interfaces:**
- Die Regeln `forschung-unbekannt`, `forschung-voraussetzung` und `forschung-leer` aus Spec §5.
- Sie gelten nur bei `forschung` als Liste und `art === 'neu' || aendern.forschung`.
- Behebungen:
  - «unbekannte entfernen» filtert unbekannte Kennungen.
  - «Voraussetzungen ergänzen» nimmt alle fehlenden Voraussetzungen rekursiv dazu.

- [ ] **Step 1: Failing tests:**
  - gültige Liste: keine Meldung
  - `['gibtsnicht', 'infantry_weapons']` ergibt `forschung-unbekannt`. Die Behebung führt zu `['infantry_weapons']` (**Review Focus 5**, und weder `pruefeProjekt` noch `erzeugeMod` werfen).
  - `['infantry_weapons2']` ergibt `forschung-voraussetzung`. Die Behebung ergänzt `infantry_weapons1` und `infantry_weapons`.
  - neues Land mit `[]` ergibt `forschung-leer`. Bei der Schweiz ohne Schalter kommt keine Meldung.
- [ ] **Step 2: Run** `npx vitest run tests/pruefung`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln fuer Forschung"`

---

### Task 5: Oberfläche, Selbsttest, Anleitung

**Files:** Create `src/ui/laender/reiter-forschung.jsx` · Modify `src/ui/laender/land-editor.jsx` (`REITER` nach `startwerte`: `{ id: 'forschung', text: 'Forschung', schalter: 'Forschung ändern' }`), `src/ui/laender/reiter-startwerte.jsx` (Feld «Forschungsstand wie …» entfernen), `src/ui/stil.css`, `src/selbsttest/szenario.js`, `README.md`

**Interfaces:**
- Test-IDs aus Spec §6.
- `forschung-schnell-anwenden` ersetzt die Liste ohne Rückfrage. Rückgängig ist möglich.
- Bei bestehenden Ländern wird die Liste erst mit dem Schalter bearbeitbar, wie bei den anderen Reitern.
- Die Schnellwahl «wie Land …» mit einem neuen Land setzt `technikWie` nicht mehr. Sie füllt die Liste.

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Rekruten»:
  - «Forschung»:
    - Land MRE öffnen, `reiter-forschung`
    - `waehle('forschung-schnell-art', 'jahr')`, `tippe('forschung-schnell-jahr', '1936')`, `klicke('forschung-schnell-anwenden')`
    - Die Liste ist dann `basic_machine_tools`, `infantry_weapons`, `infantry_weapons1`, `tech_support`.
    - Der Text `forschung-anzahl` beginnt mit «4 von 7».
  - «Forschung abhängig»:
    - `hakeAn('tech-infantry_weapons2', true)`, danach `hakeAn('tech-infantry_weapons', false)`
    - Ergebnis: `infantry_weapons1` und `infantry_weapons2` sind weg, und `forschung-mitgeaendert` nennt «Infanteriewaffen I».
  - «Schweiz Forschung»:
    - Schweiz öffnen, `reiter-forschung`, `hakeAn('aendern-forschung', true)`, `hakeAn('tech-tech_support', false)`
    - Ergebnis: Die Liste der Schweiz ist `['infantry_weapons']`.
  - In «Speichern in Ordner»:
    - Die Verlaufsdatei von MRE enthält `basic_machine_tools = 1` und kein `infantry_weapons1`.
    - Die Kopie der Schweiz enthält kein `tech_support`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Forschung».
- [ ] **Step 3: Implementieren.** Dazu einen README-Punkt «Forschung» im Abschnitt Etappe 4 und unter Grenzen: «Technologien, die es nur mit bestimmten DLCs gibt, zeigt der Creator trotzdem an.»
- [ ] **Step 4: Run** `npx vitest run && npm run selbsttest`. Expected: alles grün.
- [ ] **Step 5: Commit** – `"Etappe 4c: Oberflaeche, Selbsttest, Anleitung"`
