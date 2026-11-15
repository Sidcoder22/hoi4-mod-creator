# HOI4 Mod Creator – Etappe 4g: Mods als Grundlage (Submods)

Stand: 15. November 2026 · Status: zur Durchsicht · ergänzt `2026-10-07-hoi4-mod-creator-design.md`

## 1. Ziel

Der Creator erkennt die installierten Mods. Eine oder mehrere davon lassen sich als **Grundlage** einlesen, zum Beispiel Kaiserreich. Danach gilt «Spiel + Mod» als Grundlage, so als wäre es das Spiel:

- Alle bisherigen Werkzeuge arbeiten mit den Inhalten der Mod: Länder, Staaten, Geister, Forschung, Personen, Armee.
- Auch die Fokusbäume der Mod lassen sich importieren, als «Diesen Baum ändern» oder als «Vorlage für …» (Etappe 4f).
- Die erzeugte Mod ist eine **Submod**: Sie verlangt die Grundlage-Mod (`dependencies`), und der Launcher lädt sie danach.

**Warum Submod und nicht Kopieren:** Inhalte einer Mod verweisen auf deren eigene Events, Geister, Bilder und Länder. Kopiert in eine Mod ohne diese Grundlage, funktionieren sie grösstenteils nicht.

**Nicht im Umfang:**

- Inhalte einer Mod in eine eigenständige Mod ohne `dependencies` kopieren
- die Grundlage-Mod selbst verändern
- Mod-Ordner ohne Ordnerauswahl lesen. Der Browser darf das nicht.
- mehrere Spieldaten-Sätze gleichzeitig speichern. Wer zwischen Grundlagen wechselt, liest neu ein.
- `replace_path` in der eigenen Submod

**Zum Scheitern würde führen:** Ein Projekt ohne Mod als Grundlage erzeugt nach einem Einlesen mit Kaiserreich unbemerkt eine Kaiserreich-Submod, oder umgekehrt. Deshalb merkt sich jedes Projekt seine Grundlage (Abschnitt 4).

## 2. Mods erkennen

**Liste der installierten Mods:**

- Quelle sind die Dateien `mod/*.mod` im Benutzerordner `Dokumente/Paradox Interactive/Hearts of Iron IV`.
- Ist dieser Ordner schon als Zielordner zum Speichern gemerkt (`z.zielordner`), liest der Creator die Liste direkt.
- Sonst gibt es den Knopf «Mod-Liste lesen». Er öffnet `showDirectoryPicker` mit Lese- und Schreibrecht und merkt den Ordner über `merkeZielordner`. Dieselbe Freigabe dient danach auch dem Speichern.
- Je Mod zeigt der Creator den Namen (`name`), die Version, `remote_file_id` (Steam) und den Ordnerpfad (`path`).
- Relative Pfade wie `mod/x` werden für die Anzeige zum Benutzerordner ergänzt, soweit bekannt. Sonst bleiben sie relativ mit dem Hinweis «im Benutzerordner».
- Eigene Mods des Creators erscheinen ebenfalls, ausser der Mod des offenen Projekts.

**Mod-Ordner wählen:**

- Je Mod gibt es zwei Knöpfe:
  - «Pfad kopieren» kopiert den Pfad in die Zwischenablage.
  - «Ordner wählen» ist ein `<input webkitdirectory>` (`grundlage-input-<i>`).
- Ein Hinweis erklärt den Weg im Auswahlfenster:
  - **Mac:** ⌘⇧G drücken, den Pfad einfügen, «Öffnen». Der Steam-Ordner liegt im versteckten Ordner `Library`.
  - **Windows:** Den Pfad oben in die Adressleiste einfügen.
- Zusätzlich gibt es einen freien Knopf «Anderen Mod-Ordner wählen» (`grundlage-input`) für Mods, die nicht in der Liste stehen.

**Prüfung des gewählten Ordners:**

- Er braucht eine `descriptor.mod`. Fehlt sie, erscheint die Meldung «Das ist kein Mod-Ordner. Wähle den Ordner, in dem die Datei descriptor.mod liegt.»
- Der Creator liest daraus `name`, `version`, `remote_file_id` und alle `replace_path`.
- Weicht der Name von der Mod ab, bei der «Ordner wählen» geklickt wurde, erscheint der Hinweis «Gewählt wurde «X», nicht «Y»». Der Ordner wird trotzdem übernommen.

## 3. Einlesen mit Grundlage

**Ablauf auf der Seite «Spielordner einlesen»:**

1. Die Wahl des Spielordners liest wie heute sofort ein, ohne Mods. Die Dateiliste des Spiels bleibt für die laufende Sitzung im Speicher.
2. Darunter steht die neue Karte **«Grundlage für Submods»**:
   - aktuelle Grundlage: «Nur das Spiel» oder die Mods in Ladereihenfolge, je mit «Entfernen»
   - die Mod-Liste aus Abschnitt 2
3. Jedes Hinzufügen oder Entfernen einer Mod liest sofort neu ein: Spiel + alle gewählten Mods.
   - Fehlt die Dateiliste des Spiels, etwa nach einem Neustart des Browsers, sind die Mod-Knöpfe gesperrt. Dann steht dort «Wähle zuerst oben den Spielordner (neu einlesen)».
   - Das Gleiche gilt für Mod-Ordner aus früheren Sitzungen: Sie müssen neu gewählt werden. Spieldaten, die schon in IndexedDB gespeichert sind, bleiben aber nutzbar, ohne Neuwahl.

**Überlagerte Dateiquelle** `dateiquelleUeberlagert(spiel, mods)` in `src/leser/dateiquelle.js`:

- `mods` ist `[{ quelle, name, replacePaths }]` in Ladereihenfolge.
- **Gleicher Pfad:** Die spätere Ebene gewinnt. Pfade werden ohne Rücksicht auf Gross- und Kleinschreibung verglichen, wie bei `aufloeser`.
- **`replace_path = "a/b"`:** Dateien früherer Ebenen, die direkt in `a/b/` liegen, fallen weg. Unterordner bleiben (wie im Spiel).
- `descriptor.mod`, `thumbnail.png` und `*.mod` auf oberster Ebene einer Mod gehören nicht dazu.
- Zusätzlich `ebene(pfad) → 0 | 1 | …` (0 = Spiel) und `ebenenName(i)`.

**Leser:**

- `leseSpielordner(quelle, { grundlage })` bekommt die Liste `[{ name, version, id }]` und legt sie unverändert als `spieldaten.grundlage` ab. Ohne Mods ist das `[]`.
- **Sprachdateien:** Die Lesereihenfolge ist zuerst Nicht-`replace` vor `replace`, dann nach Ebene, dann nach Pfad. So gewinnt die Mod auch bei anderen Dateinamen.
- **Fokusbäume:** Die Einträge in `spielFokusbaeume` bekommen `quelle`, den Namen der Ebene ihrer Datei, also «Spiel» oder den Mod-Namen.
- **Bericht:** `bericht.grundlage` (Namen) und die Überschrift «Eingelesen: Spiel 1.x + Kaiserreich».
- `LESER_VERSION` bleibt 10. Fehlt `grundlage`, gilt `[]`. Fehlt `quelle`, gilt «Spiel».

## 4. Projekt

- `projekt.mod.grundlage = [{ name, id }]`. Alte Projekte bekommen `[]` über `ergaenzeProjekt`.
- Ein neues Projekt übernimmt die Grundlage der eingelesenen Spieldaten.
- Ein Projekt, das aus einer Mod geöffnet wird, behält seine gespeicherte Grundlage.
- **Einstellungen:** neue Zeile «Grundlage» (`mod-grundlage`), zum Beispiel «Kaiserreich» oder «Nur das Spiel». Weicht sie von den Spieldaten ab, erscheint der Knopf «Grundlage auf «…» umstellen» (`grundlage-uebernehmen`).

**Prüfung:**

| Regel | Schwere | Bedingung | Ziel |
|---|---|---|---|
| `grundlage-abweichend` | Fehler | Die Namen in `projekt.mod.grundlage` ≠ die Namen in `spieldaten.grundlage` (Reihenfolge zählt) | Einstellungen |

Text: «Dieses Projekt baut auf «A» auf, eingelesen ist aber «B». Lies den Spielordner mit der richtigen Grundlage ein oder stelle sie in den Einstellungen um.» Der Fehler sperrt das Speichern wie jeder Fehler.

## 5. Erzeugte Mod

Bei nicht leerer Grundlage stehen in `descriptor.mod` und in `<modid>.mod` zusätzlich alle Grundlage-Namen in Ladereihenfolge:

```
dependencies={
	"Kaiserreich"
}
```

Alles andere bleibt, wie es ist:

- **Kopien** (`kopie: true`, zum Beispiel Staatsdateien, Verlaufsdateien, `colors.txt`, Fokusbäume mit «ändern») stammen jetzt aus der überlagerten Quelle und enthalten deshalb den Stand der Mod. Gleicher Pfad heisst: Die Submod ersetzt die Datei der Mod.
- **Sprachersatz** (`replace`) wirkt auch auf Texte der Mod.

## 6. Kleinigkeiten für den Mac

Der Nutzer spielt jetzt auch auf dem Mac.

- **«Spielordner einlesen»:** Neben dem Windows-Pfad steht der Mac-Pfad `~/Library/Application Support/Steam/steamapps/common/Hearts of Iron IV` mit dem ⌘⇧G-Hinweis.
- **Anleitung nach dem Speichern:**
  - Der Benutzerordner steht für beide Systeme da.
  - Neuer Schritt: «Läuft der Launcher schon, starte ihn neu. Er sucht nur beim Start nach neuen Mods.»
  - Im Schritt «Spielsets» steht: «Klicke auf «Weitere Mods hinzufügen» und suche deine Mod.»
  - Bei Submods kommt hinzu: «Füge auch «Kaiserreich» hinzu. Der Launcher ordnet die Reihenfolge selbst.»

## 7. Oberfläche (Test-IDs)

- **Grundlage:**
  - `grundlage-karte`, `grundlage-aktuell`
  - je gewählte Mod `grundlage-<i>` mit `grundlage-<i>-entfernen`
- **Mod-Liste:**
  - `modliste-lesen`
  - je Mod `modliste-<i>` mit `modliste-<i>-pfad` (kopieren) und `grundlage-input-<i>`
  - der freie Knopf `grundlage-input`
- **Fokusbaum-Dialog:**
  - Die Einträge `spielbaum-<id>` zeigen die Quelle, wenn sie nicht «Spiel» ist.
  - Der Knopf heisst «Baum aus Spiel oder Mod …».

## 8. Tests

- **Dateiquelle:**
  - Überlagerung bei gleichem Pfad, auch mit anderer Gross- und Kleinschreibung
  - `replace_path`: Ein direkter Ordner fällt weg, Unterordner bleiben
  - zwei Mods hintereinander
  - `ebene`
  - Dateien des Deskriptors ausgeschlossen
- **Deskriptor lesen:** `name`, `version`, `remote_file_id`, mehrere `replace_path`
- **Mod-Liste:** absolute und relative Pfade; Liste aus `.mod`-Dateien eines Fake-Ordners
- **Leser:**
  - Sprachschlüssel der Mod gewinnen bei anderem Dateinamen
  - Ein Fokusbaum der Mod hat `quelle`
  - `replace_path` entfernt den Baum des Spiels
  - `spieldaten.grundlage`
- **Projekt:** Ein neues Projekt übernimmt die Grundlage; `ergaenzeProjekt` ergänzt `[]`.
- **Erzeuger:** `dependencies` in beiden Dateien; ohne Grundlage keine `dependencies`. Kopien stammen aus der Mod.
- **Prüfung:** `grundlage-abweichend`, mit Fall und Gegenfall
- **Selbsttest:**
  - Ein Mini-Mod-Ordner «Mini-Reich» im Format echter Mods. Er hat:
    - eine `descriptor.mod` mit `replace_path = "common/national_focus"`
    - einen eigenen Fokusbaum
    - einen geänderten Ländernamen in einer Sprachdatei mit eigenem Namen
  - Danach:
    - hinzufügen
    - Bericht prüfen
    - neues Projekt
    - Baum der Mod importieren
    - speichern und `dependencies` prüfen
    - Mod entfernen, damit `grundlage-abweichend` erscheint

## 9. Grenzen (für die Anleitung)

- Gleichnamige Objekte in Dateien mit verschiedenen Namen, etwa zwei Dateien mit derselben Idee, löst der Creator nicht wie das Spiel auf. Massgeblich ist der Dateipfad.
- Sehr grosse Mods (mehrere GB) brauchen länger zum Einlesen.
- Mod-Ordner müssen nach jedem Neustart des Browsers neu gewählt werden, sobald neu eingelesen wird.
