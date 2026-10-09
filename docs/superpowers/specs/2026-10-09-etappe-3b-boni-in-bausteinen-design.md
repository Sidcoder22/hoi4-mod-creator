# HOI4 Mod Creator – Etappe 3b: Boni in Fokussen, Events und Entscheidungen

Stand: 9. Oktober 2026 · Status: zur Durchsicht · ergänzt `2026-10-07-hoi4-mod-creator-design.md`

## 1. Ziel

Der Nutzer wünscht sich nach Etappe 3, dass alle Boni der nationalen Geister, zum Beispiel Konsumgüter, auch in Fokussen, Events und Entscheidungen auswählbar sind.

Im Spiel können Fokusse, Event-Antworten und Entscheidungen Boni (Modifikatoren) nicht direkt vergeben. Das Spiel macht das immer über einen nationalen Geist.

Darum übernimmt der Creator diesen Schritt:

- **Baustein «Bonus erhalten»:** Er steht überall, wo es Wirkungen gibt. Der Nutzer wählt darin Boni aus derselben Liste wie bei den Geistern: die deutsche Liste plus alle Boni des Spiels. Dazu kommen Name, Bild und Dauer: «dauerhaft» oder «für X Tage».
- **Geist aus dem Baustein:** Beim Speichern entsteht daraus automatisch ein Geist.
- **Entscheidungen mit Dauer:** Sie bekommen zusätzlich «Bonus während der Laufzeit». Das Spiel kennt dafür einen eigenen `modifier`-Block.

Nicht im Umfang:

- ein Baustein «Bonus wieder entfernen»; dafür bleibt der normale Weg über einen eigenen Geist
- eigene Bilder für Bonus-Bausteine; es gibt nur Bilder aus dem Spiel
- dynamische Modifikatoren des Spiels

## 2. Baustein «Bonus erhalten»

| Feld | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `name` | `text` | `''` | So heisst der Geist im Spiel, Pflichtfeld. |
| `bild` | `ideenbild` (neu) | `GFX_idea_generic_army`, wenn vorhanden, sonst `sd.ideenBilder[0]` | Bild des Geists aus den Spielbildern für Geister |
| `boni` | `boni` (neu) | `[{ art: 'konsumgueter', wert: -10 }]` | dieselbe Form wie `geist.boni`: feste Liste oder `{ art: 'frei', modifier, wert }` |
| `tage` | `zahl` 0–3650 | `0` | 0 = dauerhaft, sonst Dauer in Tagen |

- `art: 'bonus'`, Gruppe «Politik», Name «Bonus erhalten».
- Satz: `Bonus «<name>»: <Boni wie «Konsumgüter −10 %, Stabilität +5 %»>` und am Ende ` – für <tage> Tage` bzw. ` – dauerhaft`.
- Prüfung der neuen Feldtypen:
  - `boni`: Ein leerer Bonus ergibt «Mindestens ein Bonus fehlt». Ein Wert ausserhalb des Bereichs und ein freier Bonus mit ungültigem Namen (`/^[a-z0-9_]+$/`) ergeben dieselben Texte wie bei den Geistern.
  - `ideenbild`: Ein Bild, das nicht in `sd.sprites` steht, ergibt «Bild fehlt».
- Fehler aus dem Baustein laufen wie alle Baustein-Fehler über die Regel `baustein` und sperren das Speichern.

## 3. Erzeugte Mod

- **Kennung** des Geists: `<modid>_bonus_<baustein-id>`. Die Baustein-ID ist stabil und besteht nur aus ASCII, so wie bei `fraktionKennung`.
- **Wirkung:**
  - dauerhaft: `add_ideas = <kennung>`
  - mit Dauer: `add_timed_idea = { idea = <kennung> days = <tage> }`
  - Bei `bei_land` gilt die Wirkung für das andere Land, wie bei jeder Wirkung.
- **Geist:**
  - Er steht in derselben Datei `common/ideas/<modid>_ideas.txt` im Block `country`.
  - Form wie die eigenen Geister: `picture = <bild ohne GFX_idea_>`, `allowed = { always = no }`, `removal_cost = -1`, `modifier = { … }`.
  - Gibt es nur Bonus-Bausteine und keine eigenen Geister, entsteht die Datei trotzdem.
- **Sprache:** `<kennung>` = Name, `<kennung>_desc` = leer.
- **Reihenfolge:** Der Erzeuger der Geister sammelt die Bonus-Geister aller anderen Erzeuger ein. Er läuft deshalb zuletzt, oder er schreibt seine Datei erst am Schluss.
- **Entscheidung mit Dauer:**
  - Neues Feld `boniLaufzeit: Bonus[]`, Vorgabe `[]`, ergänzt über `ergaenzeProjekt`.
  - Bei `dauer > 0` und nicht leerer Liste erscheint `modifier = { … }` in der Entscheidung.
  - Ohne Dauer wird das Feld nicht geschrieben und nicht geprüft.

## 4. Prüfung

- Bonus-Bausteine prüft `pruefeBausteine` wie alle Bausteine, siehe Abschnitt 2.
- Für `boniLaufzeit` gelten dieselben Bonus-Regeln wie bei den Geistern (`bonus-wert`, `bonus-name`, Hinweis `bonus-unbekannt`), mit Ziel auf die Entscheidung.
- «Entscheidung bewirkt nichts» entfällt, wenn eine Entscheidung mit Dauer `boniLaufzeit` hat.
- Die Bonus-Prüfung der Geister wird in eine gemeinsame Funktion `pruefeBonus(bonus, sd) → Text | null` in `src/projekt/boni.js` ausgelagert. Geister, Eigenschaften, Baustein und Laufzeit benutzen sie gemeinsam.

## 5. Oberfläche

- Im Baustein zeigt das Feld `boni` den vorhandenen `BonusEditor` (Test-Präfix `<baustein-test>-boni`). Das Feld `ideenbild` zeigt eine kleine Galerie der Spielbilder für Geister mit Suche (Test-Präfix `<baustein-test>-bild`).
- Im Entscheidungs-Editor erscheint bei `dauer > 0` der Abschnitt «Bonus während der Laufzeit» mit `BonusEditor` (`test="entscheidung-laufzeit"`).
- Die Vorschau von Event-Antworten zeigt den Klartextsatz des Bausteins wie bei jeder Wirkung.

## 6. Tests

- Baustein: Erzeugung dauerhaft und mit Dauer, in `bei_land`, Prüfung (leer, Wert ausserhalb, ungültiger freier Name, Bild fehlt), Satz.
- Erzeuger: Fokus mit «Konsumgüter −10 % für 180 Tage» ergibt `add_timed_idea` und einen Geist mit `consumer_goods_factor = -0.1` in `common/ideas`. Nur Bonus-Bausteine ohne eigene Geister ergeben trotzdem die Datei. Entscheidung mit `boniLaufzeit` ergibt einen `modifier`-Block.
- Prüfung: `boniLaufzeit` mit ungültigem Wert; «bewirkt nichts» entfällt bei Laufzeit-Boni.
- Selbsttest:
  - Event-Antwort «Feiern» erhält «Bonus erhalten», Name «Festlaune», Konsumgüter −10 %, 180 Tage. Der Satz zeigt «Konsumgüter −10 %».
  - Die Entscheidung «Armee reformieren» erhält einen Laufzeit-Bonus.
  - Die gespeicherte Mod enthält `add_timed_idea` und den Geist.
