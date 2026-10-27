# HOI4 Mod Creator – Etappe 4f: Fokusbäume aus dem Spiel importieren

Stand: 27. Oktober 2026 · Status: zur Durchsicht · ergänzt `2026-10-07-hoi4-mod-creator-design.md` (Abschnitt 6.5)

## 1. Ziel

Fokusbäume aus dem Spiel lassen sich in den Baum-Editor importieren und dort bearbeiten. Es gibt zwei Arten:

- **«Diesen Baum ändern»:** Der Baum gehört weiter zum Originalland, etwa Deutschland. Die Mod ersetzt die Datei des Spiels durch den geänderten Baum. Fokuskennungen aus dem Spiel bleiben, damit Events und Entscheidungen des Spiels weiter funktionieren.
- **«Als Vorlage für …»:** Eine Kopie wird zum eigenen Baum eines gewählten Landes, mit neuen Kennungen.

Spiellogik geht nicht verloren. Was der Baukasten nicht versteht, bleibt als Baustein «Eigener Code (aus dem Spiel)» erhalten oder wird unsichtbar mitgenommen.

Nicht im Umfang:

- geteilte Fokusse (`shared_focus`) bearbeiten. Sie erscheinen als gesperrte Karten.
- Positionsverschiebungen mit Bedingung (`offset` mit `trigger`). Sie fallen weg.
- Code aus dem Spiel auf ein anderes Land umschreiben
- gemeinsame Fokusse mehrerer Länder (`joint_focus`). Sie bleiben unsichtbar erhalten.

## 2. Spieldaten (`LESER_VERSION = 10`)

Aus `common/national_focus/*.txt`:

- In `spieldaten` liegt nur die Übersicht: `spielFokusbaeume: [{ id, datei, land, anzahl }]`. `land` stammt aus `country`: dem ersten `modifier` mit `tag = X` und `add > 0`, sonst `null`. Die Liste ist nach Landname sortiert, Bäume ohne Land stehen zuletzt.
- Die vollständigen Bäume liefert `leseSpielordner` getrennt als `fokusbaeumeSpiel: { [baumId]: SpielBaum }`. Sie werden im eigenen IndexedDB-Eintrag `spielfokus` gespeichert und erst beim Import geladen.
- Geteilte Fokusse (oberste Ebene `shared_focus = { id … }`) liefert der Leser als `geteilteFokusse: { [id]: { id, name, symbol, x, y } }`, ebenfalls im Eintrag `spielfokus`.
- `bericht.fokusbaeume` (Anzahl Bäume), `bericht.spielFokusse` (Anzahl Fokusse).

```js
SpielBaum = {
  id, datei, land,
  weitere: string,            // alle Einträge des focus_tree ausser focus und shared_focus, als Text
  geteilt: [focusId],         // shared_focus = X im Baum
  fokusse: [{
    id, name, beschreibung, symbol, x, y, dauer,
    voraussetzungen: [[id]],  // je prerequisite-Block eine «oder»-Gruppe
    ausschluss: [id],
    verfuegbar: Eintrag[] | null,    // Inhalt von available
    belohnung: Eintrag[] | null,     // Inhalt von completion_reward
    weitere: string,                 // alle übrigen Einträge ausser id, icon, x, y, relative_position_id, offset, cost, prerequisite, mutually_exclusive, available, completion_reward
  }],
}
```

- **Positionen:** Mit `relative_position_id` wird die Position zur Position des genannten Fokus addiert (auch über Ketten, Kreise abbrechen). Variablen der Datei (`@x = 3`) werden eingesetzt. `offset`-Blöcke werden übersprungen.
- **Namen:** Sprachschlüssel = id, Beschreibung `<id>_desc`. Ohne Text wird die id verwendet.
- **Dauer:** `cost` als Zahl, sonst 10.

## 3. Import und Projektdaten

`importiereSpielbaum(p, sd, spielBaum, geteilteFokusse, art, landTag) → [p, baumId]` in `src/projekt/fokus-import.js`.

**Baum:**

```js
{ …wie bisher, herkunft: { art: 'aendern' | 'vorlage', spielId, datei, weitere, geteilt: [id], vonLand } }
```

- Bei `aendern` ist `land` das Originalland, bei `vorlage` ist es `landTag`.

**Fokus**, zusätzlich zu den bisherigen Feldern:

- `spielId`: die Kennung aus dem Spiel, nur bei `aendern`
- `spielName`, `spielBeschreibung`
- `voraussetzungsGruppen: [[fokusId]] | null`
- `weitere: string`
- `gesperrt: true` bei geteilten Fokussen
- `kiGewicht: null`: Die KI-Gewichtung des Spiels steckt in `weitere`.

**Übersetzung in Bausteine:** jeder oberste Eintrag einzeln.

| Spieleintrag | Baustein |
|---|---|
| `add_political_power = N` | `politische_macht` |
| `add_stability = x` / `add_war_support = x` | `stabilitaet` / `kriegsunterstuetzung` mit `x × 100` |
| `add_manpower = N` | `rekruten` |
| `add_research_slot = 1` | `forschungsplatz` |
| `army_experience` / `navy_experience` / `air_experience = N` | `erfahrung` |
| `add_ideas = X` / `remove_ideas = X` (Wort, X in `spielGeister`) | `spielgeist_hinzu` / `spielgeist_weg` |
| alles andere | `code` mit `werte.code` = Eintrag als Text, `ausSpiel: true` |

Bedingungen in `available`:

- `has_completed_focus = X` mit X im selben Baum wird `fokus_erledigt`.
- `has_war = yes` wird `im_krieg`.
- Alles andere wird `code` mit `ausSpiel: true`.

**Voraussetzungen:**

- Sind alle Gruppen einzeln, gilt `voraussetzungsArt: 'alle'`, und die Liste ist flach.
- Ist es genau eine Gruppe, gilt `'eine'`.
- Bei anderen Mischungen wird `voraussetzungsGruppen` gesetzt, `voraussetzungen` ist dann die flache Vereinigung.
- `setzeVoraussetzung` und `voraussetzungsArt` ändern löschen `voraussetzungsGruppen`.
- Ausschlüsse gelten beidseitig.
- Verweise auf Fokusse ausserhalb des Baums, zum Beispiel auf geteilte, zeigen auf die gesperrte Karte. Unbekannte Verweise fallen weg.

**Geteilte Fokusse:** Sie werden gesperrte Fokusse an ihrer Position. Sie haben keine Bausteine und lassen sich nicht verschieben, ändern oder löschen.

**Nummern:** Jeder importierte Fokus erhält eine `nummer` aus `zaehler.fokus` (für neue Kennungen bei Vorlagen).

## 4. Erzeugte Mod

**Baum mit `herkunft.art === 'aendern'`:**

- Datei `mod/<m>/<herkunft.datei>`, gleicher Pfad wie im Spiel
- `focus_tree = { id = <spielId> <herkunft.weitere> shared_focus = … focus = … }`
- Kein eigener `country`, `default` oder `continuous_focus_position`.
- Kennung eines Fokus: `spielId`, für neu angelegte Fokusse `fokusKennung`.
- Sprache: Name oder Beschreibung nur, wenn sie von `spielName` bzw. `spielBeschreibung` abweichen. Dann über `k.sprache.ersetze`. Neue Fokusse wie bisher über `setze`.

**Baum mit `herkunft.art === 'vorlage'`:**

- Datei und Inhalt wie ein eigener Baum, dazu die Zeilen `shared_focus = …` aus `herkunft.geteilt`.
- Alle Fokusse bekommen `fokusKennung`, und alle Texte werden mit `setze` geschrieben.

**Pro Fokus, in beiden Arten:**

- `prerequisite` wird aus `voraussetzungsGruppen` geschrieben, wenn vorhanden, sonst wie bisher.
- `weitere` kommt ans Ende des Fokus-Blocks.
- `ai_will_do` nur bei `kiGewicht != null`.
- Code-Bausteine werden unverändert eingefügt.
- Gesperrte Fokusse werden nicht geschrieben.

## 5. Prüfung

| Regel | Schwere | Bedingung |
|---|---|---|
| `fokus-spielcode-vorlage` | Hinweis | Ein Vorlagen-Baum enthält Code-Bausteine mit `ausSpiel`. Die Meldung nennt die Anzahl. Ziel ist der erste solche Fokus. |
| `fokus-spiel-geloescht` | Hinweis | Bei einem `aendern`-Baum fehlt ein Fokus aus dem Spielbaum. Andere Inhalte des Spiels könnten auf ihn verweisen. |
| `baustein` | Fehler | wie bisher. Eigener Code aus dem Spiel muss streng parsen (Prüfung `pruefeCode`). |

Die Regeln `fokus-symbol` und `fokus-beschreibung` gelten für gesperrte Fokusse nicht. `baum-doppelt` gilt wie bisher.

## 6. Oberfläche

- Neuer Knopf `baum-aus-spiel` in der Baumliste. Er öffnet einen Dialog mit:
  - Suche `spielbaum-suche`
  - Liste `spielbaum-<id>`, die Land, Baumkennung und Anzahl der Fokusse zeigt
  - Art `spielbaum-art` (`aendern` / `vorlage`)
  - bei `vorlage` ein Land `spielbaum-land`
  - Knopf `spielbaum-importieren`
- Der Dialog lädt `spielfokus` aus IndexedDB beim Öffnen. Fehlt der Eintrag, steht dort «Bitte den Spielordner neu einlesen».
- Im Raster sind gesperrte Karten grau mit Schloss und nicht ziehbar. In ihrer Seitenleiste steht nur der Hinweis «Geteilter Fokus aus dem Spiel».
- In der Fokus-Seitenleiste:
  - bei `spielId` der Hinweis «Kennung im Spiel: GER_…»
  - Code-Bausteine mit `ausSpiel` haben den Vermerk «aus dem Spiel» (`<test>-ausspiel-<i>`)
  - Bei `voraussetzungsGruppen` steht der Hinweis «Voraussetzungen aus dem Spiel mit Gruppen – eine Änderung macht daraus «alle» bzw. «eine davon»».

## 7. Tests

- **Leser:**
  - Übersicht und Land
  - Bäume mit relativen Positionen über Ketten, Variablen und `offset`
  - Voraussetzungs-Gruppen, Ausschlüsse, Namen, `weitere`
  - geteilte Fokusse
  - Der Mini-Spielordner bekommt `common/national_focus/germany.txt` im Format des Spiels mit etwa 6 Fokussen und einen geteilten Fokus.
- **Import:**
  - jede Übersetzung in einen Baustein
  - Code-Bausteine mit `ausSpiel`
  - Gruppen, beide Arten
  - geteilte Fokusse als gesperrt
- **Erzeuger:**
  - `aendern`: gleicher Pfad, Kennungen, `weitere`, nur geänderte Namen im Ersatz-Ordner
  - `vorlage`: neue Kennungen, `shared_focus`-Zeilen
  - streng zurückgeparst
- **Prüfung:** neue Regeln mit Fall und Gegenfall
- **Selbsttest:**
  - den deutschen Baum «ändern» importieren, einen Fokus umbenennen und einen neuen anlegen
  - einen Baum als Vorlage für Frankreich importieren (das neue Land hat schon einen eigenen Baum)
  - speichern und Dateien prüfen
