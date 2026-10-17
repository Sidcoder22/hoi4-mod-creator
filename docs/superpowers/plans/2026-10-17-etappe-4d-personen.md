# HOI4 Mod Creator – Etappe 4d (Personen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Länder bekommen neue Generäle, Feldmarschälle, Admirale und Berater. Sie stehen in der Charakterdatei des Landes und sind zum Spielstart rekrutiert.

**Architecture:**
- Der Leser sammelt Eigenschaften für Heer- und Flottenführer.
- `src/projekt/personen.js` verwaltet `land.personen`.
- Ein gemeinsamer Sammler `k.charakter(tag, kennung, inhalt)` ersetzt das direkte Schreiben der Charakterdatei durch den Anführer-Erzeuger.
- Der neue Personen-Erzeuger meldet seine Charaktere an denselben Sammler.
- Am Ende schreibt `erzeugeMod` je Land eine Charakterdatei.

**Tech Stack:** wie bisher.

**Spec:** `docs/superpowers/specs/2026-10-16-etappe-4d-personen-design.md`

## Global Constraints

Alle Global Constraints aus Etappe 1–4c gelten weiter, zusätzlich:

- `LESER_VERSION = 8`.
- Kennung: `<modid>_person_<nummer>` (`zaehler.person`); Berater-Token `<kennung>_berater`.
- Werte: Stufe und Fähigkeiten 1–9, Berater-Kosten 0–500 (Vorgabe 150).
- Berater-Plätze: `political_advisor`, `army_chief`, `navy_chief`, `air_chief`, `high_command`, `theorist`.
- Bestehende Länder: Schalter `aendern.personen` (Test-ID `aendern-personen`, Text «Personen hinzufügen»).
- Ziel aller neuen Meldungen: `{ bereich: 'land', id, reiter: 'personen' }`.

## Review Focus

1. **Neues Land mit Anführer und Personen.** Erwartet: genau eine Datei `common/characters/<modid>_<TAG>.txt` mit allen Charakteren, kein «Datei doppelt». Test in Task 3.
2. **Bestehendes Land, nur Personen (Anführer nicht geändert).** Erwartet: Es gibt eine Charakterdatei mit den Personen und `recruit_character` im Anhang, aber kein `promote_character`. Test in Task 3.
3. **Rollenwechsel von General zu Admiral mit Heer-Eigenschaften.** Erwartet: Die Werte und Eigenschaften werden auf die Vorgaben des Admirals zurückgesetzt, es bleibt keine unpassende Eigenschaft hängen. Test in Task 2.
4. **Eine eigene Berater-Eigenschaft (Etappe 2b) wird gelöscht.** Erwartet: Fehler `person-eigenschaft`, kein Absturz. Test in Task 4.
5. **Altes Projekt ohne `personen`.** Erwartet: `[]` und kein Reiter-Absturz. Test in Task 2.

---

### Task 1: Spieldaten

**Files:** Modify `src/leser/spielordner.js`, `src/selbsttest/mini-spielordner.js` · Test `tests/leser/spielordner.test.js`

**Interfaces:**
- `spieldaten.fuehrerEigenschaften: [{ id, name, rollen }]` nach Spec §2.
- `type` kann ein Wort oder ein Block aus Wörtern sein.
- Dazu `bericht.fuehrerEigenschaften`.

**Ergänzung Mini-Spielordner:** `common/unit_leader/00_traits.txt` mit `leader_traits = { … }`:
- `panzer_leader`: `type = corps_commander`, `trait_type = assignable_trait`
- `offensive_doctrine`: `type = land`, `trait_type = personality_trait`
- `seawolf`: `type = navy`
- `wounded`: `type = all`, `trait_type = status_trait`
- `operative_infiltrator`: `type = operative`

Sprache: `panzer_leader` «Panzerexperte», `seawolf` «Seewolf».

- [ ] **Step 1: Failing tests**

```js
expect(LESER_VERSION).toBe(8)
expect(sd.fuehrerEigenschaften).toEqual([
  { id: 'offensive_doctrine', name: 'offensive_doctrine', rollen: ['general', 'feldmarschall'] },
  { id: 'panzer_leader', name: 'Panzerexperte', rollen: ['general'] },
  { id: 'seawolf', name: 'Seewolf', rollen: ['admiral'] },
])
expect(sd.bericht.fuehrerEigenschaften).toBe(3)
```

- [ ] **Step 2: Run** `npx vitest run tests/leser`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Spieldaten fuer Personen"`

---

### Task 2: Projektdaten

**Files:** Create `src/projekt/personen.js` · Modify `src/projekt/modell.js`, `src/projekt/aenderungen.js` · Test `tests/projekt/personen.test.js`

**Interfaces:**
- `fuegePersonHinzu(p, sd, landId, rolle) → [p, personId]`
- `aenderePerson(p, sd, landId, personId, patch)`: Ist `patch.rolle` eine andere Rolle, gelten die Vorgaben der neuen Rolle (Spec §3), nur `name` und `bild` bleiben.
- `entfernePerson(p, landId, personId)`
- `vorgabenFuer(rolle) → Teil-Person`:
  - Heer: `stufe: 1`, `werte: { angriff: 1, verteidigung: 1, planung: 1, logistik: 1 }`, `eigenschaften: []`
  - Admiral: `stufe: 1`, `werte: { angriff: 1, verteidigung: 1, manoever: 1, koordination: 1 }`, `eigenschaften: []`
  - Berater: `platz: 'political_advisor'`, `kosten: 150`, `beraterEigenschaft: null`
- Neue Länder bekommen `personen: []` und `aendern.personen: false`. `ergaenzeProjekt` ergänzt beides, und `STANDARD_ZAEHLER` erhält `person: 0`.

- [ ] **Step 1: Failing tests**

```js
let [q, g] = fuegePersonHinzu(p, sd, mre, 'general')
expect(person(q, g)).toMatchObject({ nummer: 1, rolle: 'general', name: '', stufe: 1, werte: { angriff: 1, verteidigung: 1, planung: 1, logistik: 1 }, eigenschaften: [],
  bild: { art: 'spiel', pfad: sd.portraets[0] } })
q = aenderePerson(q, sd, mre, g, { name: 'Hans', eigenschaften: ['panzer_leader'] })
q = aenderePerson(q, sd, mre, g, { rolle: 'admiral' })                         // Review Focus 3
expect(person(q, g)).toMatchObject({ name: 'Hans', rolle: 'admiral', eigenschaften: [], werte: { angriff: 1, verteidigung: 1, manoever: 1, koordination: 1 } })
expect(person(aenderePerson(q, sd, mre, g, { rolle: 'berater' }), g)).toMatchObject({ platz: 'political_advisor', kosten: 150, beraterEigenschaft: null })
expect(entfernePerson(q, mre, g).laender[0].personen).toEqual([])
expect(ergaenzeProjekt({ ...p, laender: p.laender.map(({ personen, ...l }) => l) }, sd).laender[0].personen).toEqual([])   // Review Focus 5
```

- [ ] **Step 2: Run** `npx vitest run tests/projekt`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (exakte Erwartungen an `aendern` und `zaehler` ergänzen).
- [ ] **Step 5: Commit** – `"Projektdaten fuer Personen"`

---

### Task 3: Erzeuger

**Files:**
- Create `src/erzeuger/personen.js`
- Modify `src/erzeuger/index.js` (Sammler `charakter`, Schreiben am Ende), `src/erzeuger/land-neu.js` (`schreibeAnfuehrer` meldet an den Sammler statt zu schreiben), `src/erzeuger/kennungen.js` (`personKennung`), `src/erzeuger/land-geaendert.js`
- Test `tests/erzeuger/personen.test.js`

**Interfaces:**
- `k.charakter(tag, kennung, inhalt: Eintrag[])`. Am Ende schreibt `erzeugeMod` je Tag `common/characters/<modid>_<TAG>.txt` mit `characters = { … }` in der Reihenfolge der Meldungen.
- `erzeugePersonen(k)` in `ERZEUGER` nach den Länder-Erzeugern. Es gilt für jedes neue Land und jedes bestehende Land mit `aendern.personen`:
  - pro Person einen Charakter nach Spec §4 mit `k.charakter`
  - eigene Porträts als DDS
  - `k.sprache.setze(kennung, name)`
  - `k.startZeilen(tag, ['recruit_character = <kennung>'])`

- [ ] **Step 1: Failing tests** (alle Dateien streng zurückgeparst)
  - MRE mit General «Hans» (Stufe 3, Angriff 4, Verteidigung 2, Planung 3, Logistik 1, `panzer_leader`) und Berater «Erika» (`theorist`, Kosten 100, Eigenschaft `popular_figurehead`):
    - `corps_commander` mit `skill = 3`, `attack_skill = 4`, `defense_skill = 2`, `planning_skill = 3`, `logistics_skill = 1`, `traits = { panzer_leader }`, `legacy_id = -1`
    - `portraits.army.large` = Pfad des Spielporträts
    - Berater: `advisor` mit `slot = theorist`, `idea_token = mein_reich_person_2_berater`, `cost = 100`, `allowed.original_tag = MRE`, `traits = { popular_figurehead }`; `portraits.civilian` mit `large` und `small`
  - **Review Focus 1:** genau eine Datei `common/characters/mein_reich_MRE.txt` mit Anführer, General und Berater. Die Verlaufsdatei von MRE enthält `recruit_character = mein_reich_person_1` und `… _2`.
  - Feldmarschall ergibt `field_marshal`, Admiral ergibt `navy_leader` mit `maneuvering_skill` und `coordination_skill` und `portraits.navy`.
  - **Review Focus 2:** Schweiz mit `aendern.personen` und einem Admiral, Anführer unverändert: Die Datei `mein_reich_SWI.txt` hat nur den Admiral. Die kopierte Verlaufsdatei enthält `recruit_character = mein_reich_person_<n>` und kein `promote_character`.
  - Eigenes Porträt: Es gibt ein DDS in `gfx/leaders/MRE/mein_reich_person_1.dds`.
  - Die Sprachdatei enthält die Namen.
  - `fehler` ist `[]`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (die bestehenden Anführer-Tests bleiben grün).
- [ ] **Step 5: Commit** – `"Personen erzeugen"`

---

### Task 4: Prüfregeln

**Files:** Modify `src/pruefung/regeln.js` · Test `tests/pruefung/personen.test.js`

**Interfaces:**
- Die Regeln aus Spec §5. Sie gelten für neue Länder und für bestehende Länder mit `aendern.personen`.
- Eine Eigenschaft passt, wenn `fuehrerEigenschaften.find(id).rollen` die Rolle enthält.
- Eine Berater-Eigenschaft ist gültig, wenn sie bei `art: 'spiel'` in `anfuehrerEigenschaften` vorkommt und bei `art: 'eigen'` in `projekt.eigenschaften`.

- [ ] **Step 1: Failing tests:**
  - Gültig: General mit Name und `panzer_leader`, Berater mit Eigenschaft. Ergebnis: keine Meldung.
  - Je Regel ein Fall:
    - `person-name`: leerer Name
    - `person-wert`: Angriff 10, Kosten 600
    - `person-eigenschaft`: General mit `seawolf`; `gibtsnicht`; **Review Focus 4:** eigene Eigenschaft gelöscht
    - `person-bild`: `{ art: 'eigen', bildId: 'weg' }`
    - `berater-platz-doppelt`: zwei `theorist`
    - `berater-ohne-eigenschaft`
  - Die Schweiz ohne Schalter und mit fehlerhafter Person ergibt keine Meldung.
- [ ] **Step 2: Run** `npx vitest run tests/pruefung`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln fuer Personen"`

---

### Task 5: Oberfläche, Selbsttest, Anleitung

**Files:** Create `src/ui/laender/reiter-personen.jsx` · Modify `src/ui/laender/land-editor.jsx` (REITER nach `anfuehrer`: `{ id: 'personen', text: 'Personen', schalter: 'Personen hinzufügen' }`), `src/ui/stil.css`, `src/selbsttest/szenario.js`, `README.md`

**Interfaces:** Test-IDs aus Spec §6. Porträt-Galerie: `person-<id>-portraet-<i>`, eigenes Bild `<BildZuschnitt test="person-<id>-bild">`.

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Forschung abhängig»:
  - «Personen»:
    - `reiter-personen`, `klicke('person-neu-general')`
    - `tippe('person-<id>-name', 'Hans Muster')`, `tippe('person-<id>-angriff', '4')`, `hakeAn('person-<id>-eig-panzer_leader', true)`
    - `klicke('person-neu-berater')`, `tippe('person-<id2>-name', 'Erika Rat')`, `waehle('person-<id2>-platz', 'theorist')`, `waehle('person-<id2>-beratereig', 'spiel:popular_figurehead')`
    - Der General hat `eigenschaften: ['panzer_leader']`, Angriff 4. Die Eigenschaft `seawolf` wird nicht angeboten.
  - «Schweiz Admiral» (nach «Schweiz Forschung»): `reiter-personen`, `hakeAn('aendern-personen', true)`, `klicke('person-neu-admiral')`, Name «Hans Seemann».
  - In «Speichern in Ordner»:
    - `common/characters/selbsttest_reich_MRE.txt` enthält `corps_commander`, `panzer_leader` und `slot = theorist`.
    - `common/characters/selbsttest_reich_SWI.txt` enthält `navy_leader`.
    - Die Kopie des Schweizer Verlaufs enthält `recruit_character = selbsttest_reich_person_`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Personen».
- [ ] **Step 3: Implementieren.** README um einen Punkt «Personen» im Abschnitt Etappe 4 ergänzen.
- [ ] **Step 4: Run** `npx vitest run && npm run selbsttest`. Expected: alles grün.
- [ ] **Step 5: Commit** – `"Etappe 4d: Oberflaeche, Selbsttest, Anleitung"`
