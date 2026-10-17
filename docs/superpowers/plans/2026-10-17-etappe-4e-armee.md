# HOI4 Mod Creator – Etappe 4e (Armee) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue und bestehende Länder bekommen eigene Divisionsvorlagen und Startverbände des Heeres.

**Architecture:**
- **Leser:** sammelt Einheitenarten und die Einheiten, die jede Technologie freischaltet.
- **`src/projekt/armee.js`:** verwaltet `land.armee = { vorlagen, verbaende }`. `ergaenzeProjekt` wandelt das alte Feld `armee.divisionen` um.
- **Erzeuger:** schreibt die OOB-Datei für neue Länder wie bisher. Für bestehende Länder schreibt er eine zusätzliche OOB-Datei und trägt `load_oob` in den Anhang ein.

**Tech Stack:** wie bisher.

**Spec:** `docs/superpowers/specs/2026-10-17-etappe-4e-armee-design.md`

## Global Constraints

Alle Global Constraints aus Etappe 1–4d gelten weiter, zusätzlich:

- `LESER_VERSION = 9`.
- Raster: `bataillone[spalte][zeile]` mit `spalte` und `zeile` je 0–4. `unterstuetzung[zeile]` mit `zeile` 0–4.
- Bestehende Länder: Schalter `aendern.armee` (Test-ID `aendern-armee`, Text «Armee ergänzen»).
- Ziel der neuen Meldungen: `{ bereich: 'land', id, reiter: 'armee' }`.
- Vorlagen- und Divisionsnamen in Skriptdateien: `transliteriere` und danach nur `[A-Za-z0-9 .\-]`.

## Review Focus

1. **Altes Projekt mit `armee: { divisionen: 4 }`.**
   - Erwartet: die Vorgabe-Vorlage und ein Verband `4 × Hauptstadt`, sodass die Mod gleich bleibt wie vorher.
   - Bei `divisionen: 0` gibt es keinen Verband.
   - Test in Task 2 und 3.
2. **Vorlage löschen, auf die ein Verband zeigt.** Erwartet: Der Verband verschwindet mit, und der Erzeuger stürzt nicht ab. Test in Task 2.
3. **Bestehendes Land: die Original-Armee bleibt unverändert.** Erwartet: Die Original-OOB-Datei wird nicht kopiert, und im Anhang steht nur `load_oob`. Test in Task 3.
4. **Vorlagenname mit Umlaut** («Gebirgsjäger»). Erwartet: `Gebirgsjaeger` in Vorlage und Divisionen. Die Datei ist ASCII und parst streng. Test in Task 3.
5. **Verband ohne Staat (`null`) bei einem Land ohne Hauptstadt.** Erwartet: Fehler `verband-verweis` statt Absturz, und es entsteht keine Datei mit kaputter `location`. Test in Task 3 und 4.

---

### Task 1: Spieldaten

**Files:** Modify `src/leser/spielordner.js`, `src/selbsttest/mini-spielordner.js` · Test `tests/leser/spielordner.test.js`

**Interfaces:** `einheitenArten` und `technologien[].einheiten` nach Spec §2, dazu `bericht.einheitenArten`.

**Ergänzung Mini-Spielordner** (Format des Spiels mit `sub_units = { … }`):

| Datei | Einheit | Werte |
|---|---|---|
| `common/units/infantry.txt` | `infantry` | `group = infantry`, `combat_width = 2`, `active = yes` |
| `common/units/artillery.txt` | `artillery_brigade` | `combat_width = 3`, `active = yes` |
| `common/units/engineer.txt` | `engineer` | `group = support`, `combat_width = 0`, `active = no` |
| `common/units/motorized.txt` | `motorized` | `group = mobile`, `combat_width = 2`, `active = no` |

- Die Technologie `tech_support` bekommt `enable_subunits = { engineer }`.
- Sprache: `infantry` «Infanterie», `motorized` «Motorisiert», `engineer` «Pioniere».

- [ ] **Step 1: Failing tests**

```js
expect(LESER_VERSION).toBe(9)
expect(sd.einheitenArten).toEqual([
  { id: 'artillery_brigade', name: 'artillery_brigade', unterstuetzung: false, kampfbreite: 3, aktiv: true },
  { id: 'infantry', name: 'Infanterie', unterstuetzung: false, kampfbreite: 2, aktiv: true },
  { id: 'motorized', name: 'Motorisiert', unterstuetzung: false, kampfbreite: 2, aktiv: false },
  { id: 'engineer', name: 'Pioniere', unterstuetzung: true, kampfbreite: 0, aktiv: false },
])
expect(sd.technologien.find(t => t.id === 'tech_support').einheiten).toEqual(['engineer'])
expect(sd.technologien.find(t => t.id === 'infantry_weapons').einheiten).toEqual([])
```

- [ ] **Step 2: Run** `npx vitest run tests/leser`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (die exakte Erwartung an `infantry_weapons1` in Etappe 4c um `einheiten: []` ergänzen).
- [ ] **Step 5: Commit** – `"Spieldaten fuer die Armee"`

---

### Task 2: Projektdaten

**Files:** Create `src/projekt/armee.js` · Modify `src/projekt/modell.js`, `src/projekt/aenderungen.js` · Test `tests/projekt/armee.test.js`

**Interfaces:**
- Funktionen und Datenform nach Spec §3.
- `standardArmee(p) → [p, armee]` setzt die Vorgabe-Vorlage und einen Verband mit 6 Divisionen in der Hauptstadt und vergibt dabei die Nummer.
- `fuegeLandHinzu` nutzt `standardArmee` für neue Länder. Bestehende Länder bekommen `{ vorlagen: [], verbaende: [] }`.
- `ergaenzeProjekt` wandelt das alte Feld `divisionen` um und ergänzt `aendern.armee: false`. `STANDARD_ZAEHLER.vorlage = 0`.

- [ ] **Step 1: Failing tests**

```js
const [p, mre] = fuegeLandHinzu(neuesProjekt('M'), sd, 'neu')
const a = armee(p, mre)
expect(a.vorlagen).toEqual([{ id: expect.any(String), nummer: 1, name: 'Infanterie-Division',
  bataillone: [['infantry', 'infantry', 'infantry', null, null], ['infantry', 'infantry', 'infantry', null, null], [null, null, null, null, null], [null, null, null, null, null], [null, null, null, null, null]],
  unterstuetzung: [null, null, null, null, null] }])
expect(a.verbaende).toEqual([{ id: expect.any(String), vorlage: a.vorlagen[0].id, anzahl: 6, staat: null }])
// Review Focus 1
const alt = ergaenzeProjekt({ ...p, laender: p.laender.map(l => ({ ...l, armee: { divisionen: 4 } })) }, sd)
expect(armee(alt, mre).verbaende.map(v => v.anzahl)).toEqual([4])
expect(armee(ergaenzeProjekt({ ...p, laender: p.laender.map(l => ({ ...l, armee: { divisionen: 0 } })) }, sd), mre).verbaende).toEqual([])
expect(armee(alt, mre).divisionen).toBeUndefined()
let q = setzeZelle(p, mre, a.vorlagen[0].id, 'unterstuetzung', 0, 2, 'engineer')
expect(armee(q, mre).vorlagen[0].unterstuetzung).toEqual([null, null, 'engineer', null, null])
q = setzeZelle(q, mre, a.vorlagen[0].id, 'bataillon', 2, 0, 'artillery_brigade')
expect(kampfbreite(sd, armee(q, mre).vorlagen[0])).toBe(15)
// Review Focus 2
expect(armee(entferneVorlage(q, mre, a.vorlagen[0].id), mre)).toEqual({ vorlagen: [], verbaende: [] })
```

- [ ] **Step 2: Run** `npx vitest run tests/projekt/armee.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (exakte alte Erwartungen an `armee` und `aendern` ergänzen).
- [ ] **Step 5: Commit** – `"Projektdaten fuer die Armee"`

---

### Task 3: Erzeuger

**Files:** Create `src/erzeuger/armee.js` · Modify `src/erzeuger/land-neu.js` (alte Funktion `einheiten` ersetzen), `src/erzeuger/land-geaendert.js` · Test `tests/erzeuger/armee.test.js`, `tests/erzeuger/land-neu.test.js`

**Interfaces:**
- `oobDatei(sd, land) → string | null`: Inhalt nach Spec §4. `null` gibt es ohne Verbände oder ohne gültigen Ort.
- `oobName(modid, land) → string`:
  - neues Land: `<TAG>_1936`
  - bestehendes Land: `<modid>_<TAG>_1936`
- Neues Land: `oob = "<name>"` im Verlauf, Datei `history/units/<name>.txt`.
- Bestehendes Land mit `aendern.armee` und Datei: dieselbe Datei und `load_oob = "<name>"` im Anhang.

- [ ] **Step 1: Failing tests** (alles streng zurückgeparst)
  - Neues Land mit Vorgabe-Armee: genauso viele Divisionen (6) in Provinz 1 wie bisher, Namen `1. Infanterie-Division` …; der bestehende Test in `land-neu.test.js` bleibt grün.
  - Vorlage mit `artillery_brigade` auf (2,0) und `engineer` auf Kompanie-Zeile 1 ergibt `regiments.artillery_brigade = { x = 2 y = 0 }` und `support.engineer = { x = 0 y = 1 }`.
  - Zwei Verbände derselben Vorlage (2 × Staat 1, 3 × Staat 4): Die Namen laufen von 1 bis 5. Die `location` ist 1 bzw. 5.
  - Eine Vorlage ohne Verband steht trotzdem als `division_template` in der Datei.
  - **Review Focus 4:** Die Vorlage «Gebirgsjäger» ergibt `name = "Gebirgsjaeger"` und `division_template = "Gebirgsjaeger"`, und die Datei ist ASCII.
  - **Review Focus 1:** Ein altes Projekt mit `divisionen: 4` ergibt 4 Divisionen in Provinz 1.
  - **Review Focus 3:** Schweiz mit `aendern.armee` und einem Verband:
    - Es gibt die Datei `history/units/mein_reich_SWI_1936.txt`.
    - Der Anhang der kopierten Verlaufsdatei enthält `load_oob = "mein_reich_SWI_1936"`.
    - Keine andere Datei unter `history/units/` stammt aus dem Spiel.
  - Ohne Verbände entsteht keine Datei und keine `oob`-Zeile.
  - **Review Focus 5:** Ein neues Land ohne Hauptstadt mit Verband `staat: null` ergibt keine Datei und keinen Absturz.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Armee erzeugen"`

---

### Task 4: Prüfregeln

**Files:** Modify `src/pruefung/regeln.js` · Test `tests/pruefung/armee.test.js`

**Interfaces:**
- Die Regeln aus Spec §5. «Freigeschaltet» heisst: `aktiv` ist wahr, oder eine Technologie aus `forschungVon(sd, land)` hat die Einheit in `einheiten`.
- `verband-verweis` gilt auch bei `staat: null` ohne Hauptstadt.

- [ ] **Step 1: Failing tests:**
  - Die Vorgabe-Armee meldet nichts.
  - Je Regel ein Fall:
    - `vorlage-leer`: alle Bataillone leer
    - `vorlage-name`: leerer Name; zwei Vorlagen «Infanterie-Division»
    - `vorlage-einheit`: `engineer` als Bataillon; `infantry` als Kompanie; `gibtsnicht`
    - `verband-verweis`: Vorlage `weg`; Staat 999; Anzahl 0; `null` ohne Hauptstadt (**Review Focus 5**)
    - `vorlage-forschung`: `motorized` bei MRE (keine freischaltende Technologie). `engineer` mit `tech_support` in der Forschung meldet nichts.
    - `verband-fremd`: Verband in Staat 3 (Bern)
    - `vorlage-breite`: 5 × 5 Artillerie (75)
  - Die Schweiz ohne Schalter wird nicht geprüft.
- [ ] **Step 2: Run** `npx vitest run tests/pruefung`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln fuer die Armee"`

---

### Task 5: Oberfläche, Selbsttest, Anleitung

**Files:** Create `src/ui/laender/reiter-armee.jsx` · Modify `src/ui/laender/land-editor.jsx` (REITER nach `forschung`: `{ id: 'armee', text: 'Armee', schalter: 'Armee ergänzen' }`), `src/ui/laender/reiter-startwerte.jsx` (Feld Divisionen entfernen), `src/ui/stil.css`, `src/selbsttest/szenario.js` (Schritt «Startwerte» ohne `start-divisionen`), `README.md`

**Interfaces:** Test-IDs aus Spec §6.

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Personen»:
  - «Armee»:
    - `reiter-armee`
    - `klicke('vorlage-neu')` und die neue Vorlage «Panzer-Division» nennen
    - Raster: `motorized` auf (0,0) und (0,1), `engineer` auf Kompanie 0
    - `klicke('verband-neu')`, Vorlage «Panzer-Division», Anzahl 2, `waehle('verband-<id>-staat', '4')`
    - `vorlage-<id>-breite` zeigt «Kampfbreite 4»
    - `armee-summe` zeigt «8 Divisionen»
    - In der Prüfung steht `meldung-vorlage-forschung-0`.
  - «Schweiz Armee» (nach «Schweiz Admiral»):
    - `reiter-armee`, `hakeAn('aendern-armee', true)`, `klicke('vorlage-neu')`, Name «Gebirgsdivision», Raster `infantry` auf (0,0)
    - `klicke('verband-neu')`, die Vorlage ist vorbelegt
  - In «Speichern in Ordner»:
    - `history/units/MRE_1936.txt` enthält `motorized` und zweimal `Panzer-Division`.
    - Es gibt die Datei `history/units/selbsttest_reich_SWI_1936.txt`.
    - Die Kopie des Schweizer Verlaufs enthält `load_oob`.
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Armee».
- [ ] **Step 3: Implementieren.**
  - README: einen Punkt «Armee» in Etappe 4.
  - Unter Grenzen: «Neue Vorlagen bestehender Länder brauchen einen eigenen Namen, der im Spiel noch nicht vorkommt.» und «Ob `load_oob` im Verlauf zuverlässig wirkt, zeigt der Spieltest.»
- [ ] **Step 4: Run** `npx vitest run && npm run selbsttest`. Expected: alles grün.
- [ ] **Step 5: Commit** – `"Etappe 4e: Oberflaeche, Selbsttest, Anleitung"`
