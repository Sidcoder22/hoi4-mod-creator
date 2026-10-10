# HOI4 Mod Creator – Etappe 4b: Staaten bearbeiten

Stand: 10. Oktober 2026 · Status: zur Durchsicht · ergänzt `2026-10-07-hoi4-mod-creator-design.md`

## 1. Ziel

Der Nutzer will Provinzen bearbeiten können: Name, Fabriken, Bauplätze, Ressourcen, Gebäude und Einwohner. In HOI4 gehören diese Werte fast alle zum **Staat**. Zur **Provinz** gehören nur die Siegpunkte (mit Namen) und die Provinz-Gebäude wie Marinestützpunkt, Bunker und Küstenbunker.

Etappe 4b bringt darum einen eigenen Bereich «Staaten». Darin lässt sich jeder Staat auf der Karte bearbeiten, auch einer, der einem anderen Land gehört:

- **Staat:** Name, Einwohner, Kategorie (bestimmt die Bauplätze), zusätzliche Bauplätze, Gebäude im Staat und Ressourcen
- **Provinz:** Siegpunkte, Name des Siegpunkts und Provinz-Gebäude

Nicht im Umfang:

- Provinzen zwischen Staaten verschieben
- neue Staaten abspalten
- Änderungen in Datumsblöcken (`1939.1.1 = { … }`)

Es gelten die Grundsätze des Hauptkonzepts: anfängertauglich, Prüfung vor dem Speichern, kein sichtbarer Code.

## 2. Spieldaten (`LESER_VERSION = 6`)

| Neu in `spieldaten` | Quelle | Inhalt |
|---|---|---|
| `gebaeudeArten` | `common/buildings/*.txt`, Block `buildings` | `[{ id, name, maxStufe, provinz, kueste, gemeinsamerPlatz }]`. Die Felder stammen aus `max_level`, `provincial = yes`, `only_coastal = yes` und `shares_slots = yes`. Namen aus den Sprachdateien (Schlüssel = id). Sortierung: Plätze teilende zuerst, dann nach Name. Rückfall ohne Dateien: industrial_complex, arms_factory, dockyard (teilen Plätze, max 15), infrastructure (5), air_base (10), anti_air_building (5), radar_station (6), naval_base (Provinz, Küste, 10), bunker (Provinz, 10), coastal_bunker (Provinz, Küste, 10). |
| `ressourcenArten` | `common/resources/*.txt`, Block `resources` | `[{ id, name }]`. Name: Sprachschlüssel `id`, dann `PRODUCTION_MATERIALS_<ID>`, dann die deutsche Rückfall-Liste (oil Öl, aluminium Aluminium, rubber Gummi, tungsten Wolfram, steel Stahl, chromium Chrom) |
| `staatsKategorien` | `common/state_category/*.txt`, Block `state_categories` | `[{ id, name, bauplaetze }]` aus `local_building_slots`, sortiert nach `bauplaetze` |
| `provinzKueste` | `map/definition.csv`, Spalte 6 (`true`/`false`) | `{ [provinzId]: true }`, nur Küstenprovinzen |
| `staaten[id].gebaeude` | `history.buildings` (oberste Ebene, keine Datumsblöcke) | `{ [art]: stufe }`, nur Staatsgebäude |
| `staaten[id].provinzGebaeude` | Zahlen-Schlüssel in `history.buildings` | `{ [provinzId]: { [art]: stufe } }` |
| `staaten[id].ressourcen` | `resources` des Staats | `{ [art]: menge }` |
| `staaten[id].siegpunkte` | `history.victory_points = { provinz wert }`, auch mehrere | `{ [provinzId]: wert }` |
| `staaten[id].nameSchluessel` | `name` des Staats | z. B. `STATE_1` |
| `siegpunktNamen` | Sprachschlüssel `VICTORY_POINTS_<provinz>` | `{ [provinzId]: name }`, nur für Provinzen mit Siegpunkt |

Danach muss der Spielordner einmal neu eingelesen werden.

## 3. Projektdaten

Neu ist `projekt.staaten: { [staatId]: Staatsaenderung }`. `ergaenzeProjekt` ergänzt `{}`.

```js
Staatsaenderung = {
  name?: string,
  einwohner?: number,
  kategorie?: string,
  extraBauplaetze?: number,                     // >= 0
  gebaeude?: { [art]: stufe },                  // nur geänderte Arten; 0 = entfernen
  ressourcen?: { [art]: menge },                // nur geänderte Arten; 0 = entfernen
  provinzen?: { [provinzId]: { siegpunkte?: number, siegpunktName?: string, gebaeude?: { [art]: stufe } } },
}
```

- Gespeichert werden nur Felder, die vom Spielwert abweichen.
- Die reinen Funktionen in `src/projekt/staaten.js` setzen ein Feld auf den Spielwert zurück, indem sie den Schlüssel löschen. Ein leerer Eintrag wird entfernt.
- `effektiveStaatswerte(p, sd, staatId)` gibt die Werte zurück, die im Spiel gelten: Spielwert, darüber die Änderung.

## 4. Erzeugte Mod

- **Staatsdatei:**
  - Die Kopie aus dem Spiel wird bearbeitet. Das geschieht im selben Schritt wie Besitzerwechsel und Bevölkerung ±%, also eine Datei pro Staat.
  - Die Funktion ist `aendereStaatsdatei(text, { …, staat: Staatsaenderung })`.
  - `manpower` = `einwohner`. Eine feste Einwohnerzahl hat Vorrang vor dem Prozentwert des Landes.
  - `state_category` = `kategorie`.
  - `resources = { … }`: geänderte Mengen werden gesetzt, Menge 0 fällt weg. Ein leerer Block fällt ganz weg.
  - Im obersten `history`-Block:
    - `buildings = { … }`: Staatsgebäude setzen, Stufe 0 entfernen. Provinz-Gebäude stehen als `<provinz> = { art = stufe }`; ein leerer Provinz-Block fällt weg.
    - `victory_points = { <provinz> <wert> }`: geänderte Provinzen werden ersetzt, Wert 0 entfernt den Eintrag.
    - `add_extra_state_shared_building_slots = <n>` bei `extraBauplaetze > 0`.
  - Datumsblöcke bleiben unverändert.
- **Namen:**
  - Staatsname im Ersatz-Ordner unter dem `nameSchluessel` des Staats.
  - Siegpunkt-Name unter `VICTORY_POINTS_<provinz>`.
  - Beides in Deutsch und Englisch, wie beim Umbenennen von Ländern.
- Die Ausgabeprüfung parst die Staatsdatei streng.

## 5. Prüfung

Ziel jeder Meldung ist `{ bereich: 'staat', id: staatId }`.

| Regel | Schwere | Bedingung |
|---|---|---|
| `staat-bauplaetze` | Fehler | Die Summe der Gebäude mit `gemeinsamerPlatz` ist grösser als die Bauplätze der Kategorie plus die Extra-Plätze. Behebung «Bauplätze passend erhöhen» setzt die Extra-Plätze auf den Fehlbetrag. |
| `staat-stufe` | Fehler | Ein Gebäude im Staat oder in einer Provinz hat eine Stufe über `maxStufe`. |
| `staat-kueste` | Fehler | Ein Gebäude mit `kueste` steht in einer Provinz, die nicht in `provinzKueste` vorkommt. |
| `staat-provinz` | Fehler | Die Änderung nennt eine Provinz, die nicht zum Staat gehört. |
| `staat-unbekannt` | Fehler | Den Staat gibt es im eingelesenen Spiel nicht mehr. |
| `staat-kategorie` | Fehler | Die Kategorie gibt es im Spiel nicht. |
| `staat-unveraendert` | Hinweis | Ein Eintrag in `projekt.staaten` entspricht ganz dem Spiel. Behebung «aufräumen» entfernt ihn. |

## 6. Oberfläche

- **Neuer Bereich «Staaten»** (`nav-staaten`) zwischen «Länder» und «Nationale Geister». Die Unteransicht `{ bereich: 'staat', id }` zeigt die Karte mit der Seitenleiste.
- **Links:**
  - Karte wie im Land-Editor, dazu die Staatssuche.
  - Geänderte Staaten haben einen Messingrand.
  - Darunter die Liste «Geänderte Staaten» (`geaendert-<id>`).
  - Klick auf die Karte oder in die Liste wählt den Staat.
- **Rechts**, die Seitenleiste `staat-seite`. Jedes geänderte Feld hat «↺ Spielwert» (`<feld>-zurueck`).
  1. **Allgemein:**
     - `staat-name`, `staat-einwohner`
     - `staat-kategorie`, Auswahl mit «Name · N Plätze»
     - `staat-extra` (Zahl ≥ 0)
     - Anzeige `staat-belegung`: «X von Y Bauplätzen belegt»
  2. **Gebäude:** je Staatsgebäude eine Zeile mit `gebaeude-<art>-minus`, `gebaeude-<art>` (Zahl) und `gebaeude-<art>-plus`. Grenzen sind 0 und `maxStufe`.
  3. **Ressourcen:** je Art `ressource-<art>` (Zahl ≥ 0).
  4. **Provinzen:** je Provinz des Staats `provinz-<id>-siegpunkte`, `provinz-<id>-name` (nur bei Siegpunkten > 0) und `provinz-<id>-<art>` für Provinz-Gebäude. Gebäude mit `kueste` erscheinen nur bei Küstenprovinzen.
- Knopf `staat-verwerfen`: alle Änderungen an diesem Staat verwerfen.
- Die Prüfung springt auf `{ bereich: 'staat', id }`.

## 7. Tests

- **Leser:**
  - `gebaeudeArten`, `ressourcenArten`, `staatsKategorien` und `provinzKueste`
  - pro Staat Gebäude, Provinz-Gebäude, Ressourcen und Siegpunkte
  - die Rückfall-Listen
  - Der Mini-Spielordner bekommt dafür `common/buildings`, `common/resources`, `common/state_category`, Ressourcen und Siegpunkte in Staatsdateien und eine Küstenprovinz in `definition.csv`.
- **Projektdaten:** Setzen, Zurücksetzen auf den Spielwert und Aufräumen leerer Einträge, `effektiveStaatswerte`, Ergänzen alter Projekte.
- **Erzeuger:**
  - jede Art von Änderung in der Staatsdatei
  - das Zusammenspiel mit Besitzerwechsel und Bevölkerung ±%: eine Datei, feste Einwohner haben Vorrang
  - unveränderte Datumsblöcke
  - Namen im Ersatz-Ordner
- **Prüfung:** Für jede Regel ein Fall, in dem sie anschlägt, und einer, in dem sie schweigt. Dazu die Behebung «Bauplätze passend erhöhen».
- **Selbsttest:**
  - Bern umbenennen, eine Zivilfabrik dazugeben, Öl setzen und einen Siegpunkt mit Namen vergeben.
  - Zu viele Fabriken auslösen und mit «Bauplätze passend erhöhen» beheben.
  - Die Mod speichern und die Staatsdatei streng prüfen.
