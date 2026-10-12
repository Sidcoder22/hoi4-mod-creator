# HOI4 Mod Creator – Etappe 4c: Forschung

Stand: 12. Oktober 2026 · Status: zur Durchsicht · ergänzt `2026-10-07-hoi4-mod-creator-design.md`

## 1. Ziel

Bisher kann ein Land nur die ganze Startforschung eines anderen Landes übernehmen («Forschungsstand wie …»). Neu lässt sich die Startforschung für neue und bestehende Länder einzeln festlegen:

- **Schnellwahl:** «wie Land …», «alles bis Jahr …» (ohne Doktrinen) oder «nichts»
- **Feinschliff:** Liste nach Bereichen wie im Spiel, mit Häkchen, Suche sowie «alle» und «keine» pro Bereich
- **Voraussetzungen:** Hakt man eine Technologie an, kommen ihre Voraussetzungen mit. Nimmt man eine weg, fallen die davon abhängigen weg.
- **Bestehende Länder:** Sie starten mit ihrer Forschung aus dem Spiel. Technologien lassen sich hinzufügen und wegnehmen.

Nicht im Umfang:

- Forschungsbaum als Grafik
- Prüfung von DLC-Bedingungen und sich ausschliessenden Technologien (`xor`)
- Forschung in Datumsblöcken

## 2. Spieldaten (`LESER_VERSION = 7`)

| Neu in `spieldaten` | Quelle | Inhalt |
|---|---|---|
| `technologien` | `common/technologies/*.txt`, Block `technologies` | `[{ id, name, bereich, jahr, voraussetzungen: [id], doktrin }]` |
| `technologieBereiche` | die `folder`-Namen der Technologien | `[{ id, name }]` in der Reihenfolge des ersten Auftretens |
| `laender[tag].forschung` | `set_technology` in der Verlaufsdatei (oberste Ebene sowie `if`/`else_if`/`else`, ohne Datumsblöcke) | `[id]` ohne Doppelte |

Regeln für `technologien`:

- `name`: Sprachschlüssel = id, Rückfall id.
- `bereich`: `folder.name` des ersten `folder`-Blocks, sonst `''`.
- `jahr`: `start_year`, sonst `null`.
- `voraussetzungen`: aus allen `path = { leads_to_tech = X }` aller Technologien umgekehrt gesammelt. Steht `leads_to_tech = X` bei A, ist A eine Voraussetzung von X.
- `doktrin`: `doctrine = yes` oder ein Bereich, der auf `doctrine_folder` endet.
- Variablen auf oberster Ebene der Datei (`@1936 = 4`) und Schlüssel, die keine Blöcke sind, werden übersprungen.
- Sortierung: nach Bereich in der Reihenfolge von `technologieBereiche`, dann nach `jahr` (ohne Jahr zuletzt), dann nach `name`.

Für die Namen der Bereiche gilt diese Reihenfolge:

1. Sprachschlüssel = folder
2. dann `<folder>_name`
3. dann die deutsche Rückfall-Liste:
   - infantry_folder Infanterie, support_folder Unterstützung, armour_folder Panzer, artillery_folder Artillerie
   - naval_folder Marine, air_techs_folder Luftwaffe, industry_folder Industrie, electronics_folder Elektronik
   - land_doctrine_folder Heeresdoktrin, naval_doctrine_folder Marinedoktrin, air_doctrine_folder Luftdoktrin
4. sonst die Kennung

## 3. Projektdaten

- `land.forschung: string[] | null`. Die Vorgabe ist `null`, `ergaenzeProjekt` ergänzt `null`.
- **`null` heisst «wie bisher»:**
  - Ein neues Land bekommt `technikWie` oder die Forschung des bisherigen Besitzers der Hauptstadt.
  - Ein bestehendes Land behält seine Forschung unverändert.
- **Eine Liste** ist die gewünschte ganze Startforschung des Landes.
- Reine Funktionen in `src/projekt/forschung.js`:
  - `forschungVon(sd, land) → [id]`: die aktuell geltende Liste, auch bei `null`.
  - `setzeForschung(p, sd, landId, liste)`
  - `schalteTechnologie(p, sd, landId, techId, an) → [p, mitgeaendert: [id]]`
    - `an`: alle Voraussetzungen rekursiv dazu.
    - aus: alle Technologien rekursiv entfernen, die sie voraussetzen.
    - `mitgeaendert` nennt die automatisch mitgeänderten Technologien.
  - `schnellwahl(sd, art, wert) → [id]` mit `art`:
    - `'land'`: Forschung des Landes `wert`
    - `'jahr'`: alle Nicht-Doktrinen mit `jahr <= wert` samt Voraussetzungen
    - `'nichts'`: `[]`
  - `forschungZuruecksetzen(p, landId)`: setzt `forschung` auf `null`.

## 4. Erzeugte Mod

- **Neues Land mit Liste:** `set_technology = { <id> = 1 … }` in der Verlaufsdatei, statt der bisherigen Kopie. Eine leere Liste schreibt keinen Block.
- **Bestehendes Land mit Liste:**
  - Technologien, die das Land im Spiel hat, die aber nicht in der Liste stehen, werden in der kopierten Verlaufsdatei aus allen `set_technology`-Blöcken entfernt. Das gilt für die oberste Ebene sowie `if`/`else_if`/`else`, aber nicht für Datumsblöcke.
  - Ein dadurch leerer `set_technology`-Block fällt weg.
  - Technologien in der Liste, die das Land noch nicht hat, kommen als `set_technology = { … }` an das Ende der kopierten Verlaufsdatei, mit dem bestehenden Anhang-Mechanismus.
  - Entsprechen Liste und Spiel einander, wird nichts geschrieben.
- Das heutige `technikWie` gilt nur noch bei `forschung === null`.

## 5. Prüfung

Das Ziel jeder Meldung ist `{ bereich: 'land', id, reiter: 'forschung' }`.

| Regel | Schwere | Bedingung |
|---|---|---|
| `forschung-unbekannt` | Fehler | Eine Technologie in `forschung` gibt es im Spiel nicht. Behebung «unbekannte entfernen». |
| `forschung-voraussetzung` | Hinweis | Eine Technologie steht ohne ihre Voraussetzung in der Liste. Behebung «Voraussetzungen ergänzen». |
| `forschung-leer` | Hinweis | Ein neues Land hat eine leere Liste. |

## 6. Oberfläche

- Neuer Reiter «Forschung» (`reiter-forschung`) im Land-Editor, nach «Startwerte».
- Das Feld «Forschungsstand wie …» zieht aus «Startwerte» hierher in die Schnellwahl.
- Bei bestehenden Ländern gilt das Muster «ändern»: Ein Häkchen `forschung-aendern` schaltet zwischen `null` und der Spielforschung als Liste.
- **Schnellwahl:**
  - `forschung-schnell-art` mit den Werten `land`, `jahr` und `nichts`
  - je nach Art `forschung-schnell-land` oder `forschung-schnell-jahr` (1918–1950)
  - `forschung-schnell-anwenden` ersetzt die Liste nach einer Bestätigung.
- **Zusammenfassung:** `forschung-anzahl` zeigt «X von Y Technologien».
- **Suche:** `forschung-suche` sucht nach Name oder Kennung.
- **Pro Bereich** ein aufklappbarer Abschnitt `bereich-<id>` mit «alle» (`bereich-<id>-alle`) und «keine» (`bereich-<id>-keine`).
  - Jede Zeile ist ein Häkchen `tech-<id>` mit Name, Jahr und dem Vermerk «Doktrin».
  - Wird etwas automatisch mitgeändert, erscheint die Meldung `forschung-mitgeaendert`, zum Beispiel «Mitgenommen: Infanteriewaffen I». Sie verschwindet nach der nächsten Aktion.

## 7. Tests

- **Leser:**
  - Technologien mit Bereich, Jahr, Voraussetzungen über `leads_to_tech` und Doktrin
  - Bereiche mit Namen, Variablen `@1936` überspringen
  - Forschung pro Land aus der obersten Ebene und aus `if`, ohne Datumsblock
  - Der Mini-Spielordner bekommt `common/technologies/infantry.txt`, `industry.txt` und `land_doctrine.txt` mit je wenigen Technologien.
- **Projektdaten:**
  - `schalteTechnologie` an und aus, auch über Ketten, mit `mitgeaendert`
  - jede Art von `schnellwahl`
  - `forschungVon` bei `null` für neue und bestehende Länder
- **Erzeuger:**
  - neues Land mit Liste und mit leerer Liste
  - bestehendes Land: Entfernen auch aus `if`, Datumsblock unverändert, Hinzufügen im Anhang, keine Kopie ohne Änderung
- **Prüfung:** jede Regel mit Fall und Gegenfall, dazu die Behebungen.
- **Selbsttest:**
  - Für das neue Land Schnellwahl «alles bis 1936» anwenden, eine Technologie abhaken und prüfen, dass die abhängigen mit wegfallen.
  - Für die Schweiz eine Technologie wegnehmen.
  - Die Mod speichern und die Verlaufsdateien prüfen.
