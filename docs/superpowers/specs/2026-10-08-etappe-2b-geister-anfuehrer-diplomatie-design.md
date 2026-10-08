# HOI4 Mod Creator – Etappe 2b: Geister, Anführer, Rekruten, Diplomatie

Stand: 8. Oktober 2026 · Status: zur Durchsicht · ergänzt `2026-10-07-hoi4-mod-creator-design.md`

## 1. Ziel

Nach Etappe 2 wünschte sich der Nutzer:

1. **Nationale Geister:**
   - Alle Boni des Spiels stehen zur Auswahl, auch Konsumgüter.
   - Geister aus dem Spiel lassen sich durchsuchen, als Vorlage kopieren, verändern und als neuer Geist speichern.
   - Geister aus dem Spiel lassen sich einem Land direkt zuweisen.
2. **Rekruten:** zusätzliche Rekruten zu Beginn **und** mehr oder weniger Bevölkerung in den eigenen Staaten.
3. **Anführer-Eigenschaften:** aus dem Spiel oder selbst erstellt; bei bestehenden Ländern auch für den bisherigen Anführer.
4. **Marionetten:** zuweisen und freilassen, Autonomiestatus ändern.
5. **Diplomatie zum Spielstart:** Meinung (−100 bis +100), Verträge (Garantie, Nichtangriffspakt, Militärzugang), Fraktion (gründen oder beitreten), Kriegsziele.

Alles gilt zum Spielstart 1936 und folgt den Grundsätzen aus dem Hauptkonzept: Anfänger-tauglich, Prüfung vor dem Speichern, kein sichtbarer Code.

## 2. Spieldaten (`LESER_VERSION = 4`)

| Neu in `spieldaten` | Quelle | Inhalt |
|---|---|---|
| `modifikatoren` | `common/ideas/**/*.txt` (Blöcke `modifier`), `common/country_leader/*.txt` (Zahlenwerte in Eigenschaften) | `[{ id, name, prozent }]`, sortiert nach Name |
| `spielGeister` | `common/ideas/**/*.txt`, nur Kategorie `country` | `[{ id, name, beschreibung, sprite, boni: [{ modifier, wert }], nichtUebernommen: [schluessel], land }]` |
| `anfuehrerEigenschaften` | `common/country_leader/*.txt`, Block `leader_traits` | `[{ id, name, boni: [{ modifier, wert }] }]` |
| `autonomieStufen` | `common/autonomous_states/*.txt`, Block `autonomy_state` mit `id` | `[{ id, name }]`; Rückfall: dominion, colony, puppet, integrated_puppet |
| `laender[tag].marionetten` | oberste Ebene der Verlaufsdatei: `puppet = X`, `set_autonomy = { target = X autonomous_state = Y }` | `[{ tag, autonomie }]` |
| `laender[tag].fraktion` | oberste Ebene der Verlaufsdatei: `create_faction = key` | Kennung oder `null` |

Regeln:

- **Name** eines Modifikators: der erste vorhandene Sprachschlüssel aus `id`, `MODIFIER_<ID>` (gross), `modifier_<id>`; sonst die `id`.
- **Prozent:** Endet die `id` auf `_factor`, oder sind alle beobachteten Werte nicht ganzzahlig und betragsmässig kleiner als 1, gilt der Modifikator als Prozentwert.
- **Spielgeist:**
  - Bild: `picture = x` ergibt `GFX_idea_x`, sonst `GFX_idea_<id>`.
  - Land: aus `allowed = { original_tag = X }` oder `tag = X`, sonst `null`.
  - `nichtUebernommen` sammelt Blöcke wie `research_bonus`, `equipment_bonus`, `targeted_modifier`, `on_add`, `rule`.
- **Eigenschaften:** Alle Zahlenwerte im Eigenschafts-Block gelten als Boni, ausser `random`, `ai_will_do`, `cost`, `sprite`.

## 3. Projektdaten

- **Boni**:
  - Die feste Liste `BONI` wächst um sieben Einträge: Konsumgüter (`consumer_goods_factor`), Ausbildungszeit (`training_time_factor`), Bau Zivilfabriken (`production_speed_industrial_complex_factor`), Bau Militärfabriken (`production_speed_arms_factory_factor`), Rohstoffförderung (`local_resources_factor`), Politische Macht in % (`political_power_factor`), Rekrutierbare Bevölkerung in % (`conscription_factor`).
  - Weitere Boni: `{ art: 'frei', modifier, wert }`. `wert` steht in Spieleinheit (0.05 = 5 %); die Oberfläche zeigt Prozent, wenn `prozent`.
- **Land**:
  - `spielIdeen: [ideeId]` mit Geistern aus dem Spiel, unverändert zugewiesen
  - `startwerte.rekruten` (0–5'000'000, Vorgabe 0) und `startwerte.bevoelkerung` (−50 … +200 %, Vorgabe 0)
  - `anfuehrer.eigenschaften: [{ art: 'spiel' | 'eigen', id }]`
  - `anfuehrer.modus: 'neu' | 'behalten'` (nur geänderte Länder; Vorgabe `'neu'`, wie bisher)
  - `diplomatie` und Schalter `aendern.diplomatie`:

```js
diplomatie = {
  marionetten: [{ tag, autonomie }],   // gewünschter Endzustand; bei geänderten Ländern aus dem Spiel vorbefüllt
  meinungen: [{ tag, wert, gegenseitig }],
  vertraege: [{ art: 'garantie' | 'nichtangriffspakt' | 'militaerzugang', tag }],
  fraktion: null | { art: 'gruenden', name, mitglieder: [tag] } | { art: 'beitreten', anfuehrer: tag },
  kriegsziele: [{ tag, art: 'annex_everything' | 'puppet_wargoal_focus' | 'topple_government' }],
}
```

- **Projekt**: `eigenschaften: [{ id, nummer, name, beschreibung, boni }]`, `zaehler.eigenschaft`. Alte Projekte bekommen die Felder beim Laden.
- **Neue Funktionen**: `kopiereSpielGeist(p, sd, ideeId) → [p, geistId]`. Name «Kopie von …», gleiche Beschreibung und gleiches Bild. Boni aus der festen Liste kommen in deren Einheit, alle anderen als `frei`.
- **Neue Bausteine**: «Geist aus dem Spiel hinzufügen/entfernen» (Feldtyp `spielgeist`).

## 4. Erzeugte Mod

| Bereich | Erzeugung |
|---|---|
| Geister | `add_ideas` enthält eigene und Spiel-Geister; `frei`-Boni als `<modifier> = <wert>` |
| Eigene Eigenschaften | `common/country_leader/<m>_eigenschaften.txt`: `leader_traits = { <kennung> = { random = no <modifier> = <wert> … } }`, Sprache `<kennung>` (Name) und `<kennung>_desc` |
| Neuer Anführer | im Charakter `country_leader = { … traits = { a b } }` |
| Bisheriger Anführer (`behalten`) | Anhang `add_country_leader_trait = <id>` je Eigenschaft |
| Rekruten | `add_manpower = <n>` in der Verlaufsdatei |
| Bevölkerung | In jeder Staatsdatei eines eigenen Staats wird `manpower` mit `1 + p/100` multipliziert und gerundet. Das kombiniert sich mit einem Besitzerwechsel derselben Datei. |
| Marionette neu | beim Oberherrn `puppet = X`, danach `set_autonomy = { target = X autonomous_state = Y }`, wenn Y ≠ `autonomy_puppet` |
| Autonomie geändert | `set_autonomy = { target = X autonomous_state = Y }` |
| Freilassen | In der kopierten Verlaufsdatei des Oberherrn werden `puppet = X` und `set_autonomy` mit `target = X` auf oberster Ebene **entfernt**. Datumsblöcke bleiben. |
| Meinung | Datei `common/opinion_modifiers/<m>_meinungen.txt` mit `opinion_modifiers = { <m>_meinung_p50 = { value = 50 } … }` (ein Eintrag je vorkommendem Wert, `m` für negativ). Sprache: «Beziehung (Mod) +50». Verlauf: `add_opinion_modifier = { target = X modifier = … }`; gegenseitig zusätzlich `X = { add_opinion_modifier = { target = TAG modifier = … } }`. |
| Verträge | `give_guarantee = X`; `diplomatic_relation = { country = X relation = non_aggression_pact \| military_access active = yes }` |
| Fraktion gründen | `create_faction = <m>_fraktion_<tag>` (Sprache = Name), danach `add_to_faction = X` je Mitglied |
| Fraktion beitreten | in der Verlaufsdatei des Fraktionsführers `add_to_faction = TAG` |
| Kriegsziele | `create_wargoal = { type = <art> target = X }` |

Technik:
- Der Erzeuger-Kontext bekommt `startZeilen(tag, zeilen)`. Bei neuen Ländern landen die Zeilen am Ende ihrer eigenen Verlaufsdatei, bei Spiel-Ländern im Anhang der kopierten Datei.
- Dazu kommen `verlaufEntfernen(tag, prüffunktion)` für das Freilassen und `staatManpower(staatId, faktor)` für die Bevölkerung.

## 5. Oberfläche

- **Nationale Geister**: zwei Reiter.
  - «Eigene Geister» wie bisher.
  - «Aus dem Spiel»: Galerie mit Suche nach Name, Land und Bonus. Jede Karte zeigt Bild, Name, Land, Boni und den Knopf «Als Vorlage kopieren». Danach öffnet sich der Editor des neuen Geists.
- **Bonus-Auswahl** (Geister und eigene Eigenschaften): Die Art-Auswahl zeigt oben die feste Liste. Der Eintrag «Weitere Boni aus dem Spiel …» öffnet eine Suche über `modifikatoren`. Ganz unten steht «Eigener Bonus (für Profis)» mit freiem Namen.
- **Land-Editor**:
  - «Startwerte»: zwei neue Regler, «Zusätzliche Rekruten zu Beginn» und «Bevölkerung der eigenen Staaten».
  - «Nationale Geister»: zusätzlich eine Suche über die Geister des Spiels mit «Hinzufügen» sowie eine Liste der zugewiesenen Spiel-Geister mit «Entfernen».
  - «Anführer»: Abschnitt «Eigenschaften» mit Suche über die Spiel-Eigenschaften, Liste eigener Eigenschaften und Knopf «Neue Eigenschaft» (Name, Beschreibung, Boni). Bei bestehenden Ländern die Wahl «Bisherigen Anführer behalten» oder «Neuen Anführer einsetzen».
  - Neuer Reiter **«Diplomatie»** mit fünf Abschnitten: Marionetten, Meinung, Verträge, Fraktion, Kriegsziele.

## 6. Prüfung

**Fehler:**
- Ein freier Bonus hat einen ungültigen Namen (erlaubt sind nur `a–z`, `0–9` und `_`).
- Ein Spiel-Geist oder eine Spiel-Eigenschaft fehlt im eingelesenen Spiel.
- Eine eigene Eigenschaft hat keinen Namen.
- Diplomatie zielt auf ein unbekanntes Land oder auf das Land selbst.
- Eine Marionette hat zwei Oberherren.
- «Fraktion beitreten» zielt auf ein Land ohne Fraktion.
- Ein Land ist Mitglied in zwei Fraktionen.
- Ein Bonus-Wert ist ausserhalb des erlaubten Bereichs.

**Hinweise:**
- Ein freier Bonus ist dem Spiel unbekannt.
- Ein Diplomatie-Ziel hat zum Start keine Staaten.

## 7. Tests

- **Mini-Spielordner**, neu:
  - `common/ideas` mit drei Geistern: einer mit `consumer_goods_factor` und `research_bonus`, einer mit `allowed = { original_tag = GER }`, einer in Kategorie `economy`, der ausgelassen wird
  - `common/country_leader` mit zwei Eigenschaften
  - `common/autonomous_states`
  - Verlauf von GER mit `create_faction`
  - Verlauf von FRA mit `set_autonomy` für SWI
- Unit-Tests für Leser, Modell, Erzeuger und Regeln; Selbsttest-Schritte für Kopieren, Zuweisen, Eigenschaften, Rekruten und Diplomatie.

## 8. Risiken

| Risiko | Umgang |
|---|---|
| Sprachschlüssel der Modifikatoren unbekannt | drei Schlüsselformen probieren, sonst `id` anzeigen |
| `puppet`/`set_autonomy` in Verlaufsdateien verhalten sich anders als erwartet | Spieltest; Spielfehler-Anzeige |
| Fraktionen zum Start 1936: Vanilla hat nur wenige | Beitritt nur zu Ländern mit `create_faction` im Verlauf (Spiel oder Projekt) |
| Eigene Meinungs-Modifikatoren | einfache `value`-Einträge, im Spiel bewährt |
