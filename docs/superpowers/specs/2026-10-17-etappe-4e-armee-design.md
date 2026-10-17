# HOI4 Mod Creator – Etappe 4e: Armee (Divisionsvorlagen und Startverbände)

Stand: 17. Oktober 2026 · Status: zur Durchsicht · ergänzt `2026-10-07-hoi4-mod-creator-design.md`

## 1. Ziel

Neue und bestehende Länder bekommen eigene **Divisionsvorlagen** und **Startverbände** des Heeres:

- **Vorlage:** Name, Raster mit 5 × 5 Bataillonsplätzen und 5 Plätze für Unterstützungskompanien, Anzeige der Kampfbreite.
- **Startverband:** Vorlage × Anzahl in einem Staat. Die Divisionen heissen «1. <Vorlage>», «2. <Vorlage>» und so weiter.
- Bestehende Länder behalten ihre Armee aus dem Spiel. Die neuen Divisionen kommen dazu.

Nicht im Umfang: Flotte, Luftwaffe, Ausrüstung im Lager, Divisionen aus dem Spiel ändern oder entfernen, Erfahrung pro Division.

## 2. Spieldaten (`LESER_VERSION = 9`)

| Neu in `spieldaten` | Quelle | Inhalt |
|---|---|---|
| `einheitenArten` | `common/units/*.txt`, Block `sub_units` | `[{ id, name, unterstuetzung, kampfbreite, aktiv }]` |
| `technologien[].einheiten` | `enable_subunits = { … }` jeder Technologie | `[id]` |

Felder von `einheitenArten`:

- `name`: Sprachschlüssel = id, sonst die id
- `unterstuetzung`: `group = support` oder `categories` enthält `category_support_battalions`
- `kampfbreite`: `combat_width`, sonst 0
- `aktiv`: `active = yes` (ohne `active`: `true`)

Sortierung: Kampfeinheiten zuerst, dann nach Name.

## 3. Projektdaten

```js
land.armee = {
  vorlagen: [{ id, nummer, name, bataillone: [[artId | null] × 5 Zeilen] × 5 Spalten, unterstuetzung: [artId | null] × 5 }],
  verbaende: [{ id, vorlage: vorlageId, anzahl, staat }],
}
```

- Der Zähler `zaehler.vorlage` vergibt die Nummern.
- Ein neues Land bekommt die Vorlage «Infanterie-Division» (Spalten 0 und 1, Zeilen 0–2 mit `infantry`) und einen Verband «× 6 in der Hauptstadt». Die Hauptstadt wird dabei erst beim Erzeugen bestimmt (`staat: null` = Hauptstadt).
- Ein bestehendes Land bekommt keine Vorlagen und keine Verbände. Der Schalter `aendern.armee` heisst «Armee ergänzen».
- **Alte Projekte** (`armee.divisionen = N`, keine `vorlagen`): `ergaenzeProjekt` macht daraus die Vorgabe-Vorlage und einen Verband `N × Hauptstadt` (bei N = 0 keinen Verband). Danach entfällt `divisionen`.
- Reine Funktionen in `src/projekt/armee.js`:
  - `fuegeVorlageHinzu(p, landId) → [p, id]`
  - `aendereVorlage(p, landId, vorlageId, patch)`
  - `setzeZelle(p, landId, vorlageId, bereich, spalte, zeile, artId | null)` mit `bereich`: `'bataillon'` oder `'unterstuetzung'`. Bei `'unterstuetzung'` gilt nur `zeile`.
  - `entferneVorlage` (entfernt auch ihre Verbände)
  - `fuegeVerbandHinzu`, `aendereVerband`, `entferneVerband`
  - `kampfbreite(sd, vorlage) → number`: Summe der Kampfbreite der Bataillone

## 4. Erzeugte Mod

- **Neues Land:** `history/units/<TAG>_1936.txt` mit `oob = "<TAG>_1936"` im Verlauf, wie heute. Ohne Verbände entfällt beides.
- **Bestehendes Land mit `aendern.armee` und mindestens einem Verband:**
  - Die Datei heisst `history/units/<modid>_<TAG>_1936.txt`.
  - Im Anhang der Verlaufsdatei steht `load_oob = "<modid>_<TAG>_1936"`.
- **Dateiinhalt:**
  - Je benutzte Vorlage ein Block `division_template = { name = "…" regiments = { <art> = { x = <spalte> y = <zeile> } … } support = { <art> = { x = 0 y = <zeile> } … } }`. Vorlagen ohne Verband werden trotzdem geschrieben, damit sie im Spiel zur Wahl stehen.
  - Danach `units = { division = { name = "<n>. <Vorlage>" location = <provinz> division_template = "<Vorlage>" start_experience_factor = 0.2 } … }`. Die Zählung `n` läuft je Vorlage über alle Verbände.
  - `location` ist die erste Landprovinz des Staats.
- **Namen** in Skriptdateien werden auf ASCII transliteriert: «ä» wird «ae» usw., andere Zeichen fallen weg.

## 5. Prüfung

Ziel jeder Meldung: `{ bereich: 'land', id, reiter: 'armee' }`. Geprüft werden neue Länder und bestehende Länder mit `aendern.armee`.

| Regel | Schwere | Bedingung |
|---|---|---|
| `vorlage-leer` | Fehler | Vorlage ohne Bataillon |
| `vorlage-name` | Fehler | Name leer oder zwei Vorlagen mit demselben Namen (nach Transliteration) |
| `vorlage-einheit` | Fehler | unbekannte Einheit, Kompanie auf einem Bataillonsplatz oder Bataillon auf einem Kompanieplatz |
| `verband-verweis` | Fehler | Vorlage gelöscht oder Staat unbekannt; Anzahl ausserhalb 1–99 |
| `vorlage-forschung` | Hinweis | Einheit mit `aktiv = false`, die keine Technologie aus `forschungVon(sd, land)` freischaltet |
| `verband-fremd` | Hinweis | Der Staat gehört dem Land zum Start nicht |
| `vorlage-breite` | Hinweis | Kampfbreite über 40 |

## 6. Oberfläche

- Neuer Reiter «Armee» (`reiter-armee`) nach «Forschung». Das Feld «Infanteriedivisionen zu Beginn» entfällt aus «Startwerte».
- **Vorlagen:** je Vorlage eine Karte `vorlage-<id>` mit:
  - `vorlage-<id>-name`
  - Raster `vorlage-<id>-b-<spalte>-<zeile>`, jede Zelle eine Auswahl mit «leer» und den Kampfeinheiten
  - Kompanien `vorlage-<id>-u-<zeile>`
  - Anzeige `vorlage-<id>-breite`: «Kampfbreite 12»
  - `vorlage-<id>-entfernen`
- Unter den Vorlagen der Knopf `vorlage-neu`.
- **Verbände:** Zeilen `verband-<id>` mit:
  - `verband-<id>-vorlage`
  - `verband-<id>-anzahl` (1–99)
  - `verband-<id>-staat`: Auswahl, zuerst die eigenen Staaten, dann alle; «Hauptstadt» bei `null`
  - `verband-<id>-entfernen`
- Dazu der Knopf `verband-neu` und die Summe `armee-summe`: «X Divisionen».

## 7. Tests

- **Leser:**
  - `einheitenArten` mit Unterstützung, Kampfbreite und aktiv
  - `technologien[].einheiten`
  - Der Mini-Spielordner bekommt `common/units/infantry.txt`, `artillery.txt`, `engineer.txt` (Unterstützung) und `motorized.txt` (`active = no`), dazu eine Technologie mit `enable_subunits = { motorized }`. Alles im Format des Spiels.
- **Projekt:**
  - Vorgaben
  - Umwandlung alter Projekte (N = 6 und N = 0)
  - Zellen setzen
  - Vorlage löschen entfernt ihre Verbände
  - Kampfbreite
- **Erzeuger:**
  - neues Land: Vorlagen, Raster, Kompanien, Divisionsnamen und Provinz
  - bestehendes Land: eigene Datei mit `load_oob` im Anhang, Originalarmee unverändert
  - keine Datei ohne Verbände
  - Transliteration der Namen
  - alles streng zurückgeparst
- **Prüfung:** jede Regel mit Fall und Gegenfall.
- **Selbsttest:**
  - Für das neue Land eine Vorlage «Panzer-Division» mit Motorisiert und Pionieren anlegen und einen Verband «× 2 in Zürich».
  - Der Hinweis zur Forschung erscheint.
  - Für die Schweiz «Armee ergänzen» mit einer Infanterievorlage einschalten.
  - Speichern und die Dateien prüfen.
