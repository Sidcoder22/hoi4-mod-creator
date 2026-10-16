# HOI4 Mod Creator – Etappe 4d: Personen (Generäle, Admirale, Berater)

Stand: 16. Oktober 2026 · Status: zur Durchsicht · ergänzt `2026-10-07-hoi4-mod-creator-design.md`

## 1. Ziel

Neue und bestehende Länder bekommen neue Personen:

- **Generäle und Feldmarschälle**: Name, Porträt, Stufe, Angriff, Verteidigung, Planung, Logistik, Eigenschaften
- **Admirale**: Name, Porträt, Stufe, Angriff, Verteidigung, Manöver, Koordination, Eigenschaften
- **Berater**: Name, Porträt, Platz (politischer Berater, Generalstab Heer, Marine oder Luftwaffe, Oberkommando, Theoretiker), Kosten in politischer Macht, eine Eigenschaft

Alle Personen sind zum Spielstart im Land.

Nicht im Umfang:

- Personen aus dem Spiel ändern oder wegnehmen
- mehrere Rollen für eine Person
- Spionage-Agenten (Operative)

## 2. Spieldaten (`LESER_VERSION = 8`)

| Neu in `spieldaten` | Quelle | Inhalt |
|---|---|---|
| `fuehrerEigenschaften` | `common/unit_leader/*.txt`, Block `leader_traits` | `[{ id, name, rollen: ['general' \| 'feldmarschall' \| 'admiral'] }]`, sortiert nach Name |

Regeln:

- `type` bestimmt die Rollen:
  - `corps_commander` → General
  - `field_marshal` → Feldmarschall
  - `land` → General und Feldmarschall
  - `navy` → Admiral
  - `all` → alle drei
  - ohne `type`: alle drei
- Übersprungen werden Eigenschaften mit `trait_type = status_trait` (zum Beispiel «verwundet») und mit `type = operative`.
- Die Namen kommen aus den Sprachdateien (Schlüssel = id).
- Berater-Eigenschaften sind die vorhandenen `anfuehrerEigenschaften` (`common/country_leader`) sowie die eigenen Eigenschaften des Projekts (Etappe 2b).

## 3. Projektdaten

`land.personen: Person[]`, Vorgabe `[]`; `ergaenzeProjekt` ergänzt `[]`. `zaehler.person`.

```js
Person = {
  id, nummer, rolle: 'general' | 'feldmarschall' | 'admiral' | 'berater',
  name: '', bild: { art: 'spiel', pfad } | { art: 'eigen', bildId },
  stufe: 1,                                    // nicht bei Beratern
  werte: { angriff: 1, verteidigung: 1, planung: 1, logistik: 1 }      // Heer
       | { angriff: 1, verteidigung: 1, manoever: 1, koordination: 1 }, // Marine
  eigenschaften: [traitId],                    // nicht bei Beratern
  platz: 'political_advisor',                  // nur Berater
  kosten: 150,                                 // nur Berater
  beraterEigenschaft: { art: 'spiel' | 'eigen', id } | null,           // nur Berater
}
```

- `fuegePersonHinzu(p, sd, landId, rolle) → [p, personId]` setzt die Werte der Rolle als Vorgaben. Das Bild ist das erste Spielporträt.
- Ein Wechsel der Rolle setzt die rollenabhängigen Felder auf die Vorgaben der neuen Rolle zurück.
- Weitere Funktionen: `aenderePerson`, `entfernePerson`.
- Bei bestehenden Ländern gilt das Muster «ändern» mit dem Schalter `aendern.personen` («Personen hinzufügen»).

## 4. Erzeugte Mod

- **Kennungen:**
  - Person: `<modid>_person_<nummer>`
  - Berater: `idea_token = <modid>_person_<nummer>_berater`
- **Eine Charakterdatei pro Land** (`common/characters/<modid>_<TAG>.txt`) mit Anführer und Personen. Der Anführer-Erzeuger und der Personen-Erzeuger melden ihre Charaktere an einen gemeinsamen Sammler im Kontext (`k.charakter(tag, kennung, inhalt)`). Am Ende entsteht je Land eine Datei.
- **Generäle:**
  - Block: `corps_commander = { skill = <stufe> attack_skill = … defense_skill = … planning_skill = … logistics_skill = … traits = { … } legacy_id = -1 }`
  - Feldmarschälle bekommen denselben Block als `field_marshal`.
- **Admirale:** `navy_leader = { skill = … attack_skill = … defense_skill = … maneuvering_skill = … coordination_skill = … traits = { … } legacy_id = -1 }`
- **Berater:** `advisor = { slot = <platz> idea_token = … cost = <kosten> allowed = { original_tag = <TAG> } traits = { <eigenschaft> } ai_will_do = { factor = 1 } }`
- **Porträts:**
  - Generäle und Feldmarschälle stehen unter `portraits = { army = { large = … } }`, Admirale unter `navy`, Berater unter `civilian = { large = … small = … }` (beide auf dasselbe Bild).
  - Eigene Bilder: DDS in `bildgroessen.portraet` unter `gfx/leaders/<TAG>/<kennung>.dds`.
- **Verlauf:** `recruit_character = <kennung>` je Person, bei neuen Ländern in der eigenen Datei, bei bestehenden im Anhang.
- **Sprache:** `<kennung>` = Name.

## 5. Prüfung

Ziel jeder Meldung: `{ bereich: 'land', id, reiter: 'personen' }`.

| Regel | Schwere | Bedingung |
|---|---|---|
| `person-name` | Fehler | Name leer |
| `person-wert` | Fehler | Stufe oder ein Wert ausserhalb 1–9, Kosten ausserhalb 0–500 |
| `person-eigenschaft` | Fehler | Eigenschaft unbekannt oder passt nicht zur Rolle; Berater-Eigenschaft unbekannt oder gelöscht |
| `person-bild` | Fehler | Eigenes Bild fehlt |
| `berater-platz-doppelt` | Hinweis | Zwei Berater desselben Landes auf demselben Platz |
| `berater-ohne-eigenschaft` | Hinweis | Berater ohne Eigenschaft (er bringt im Spiel nichts) |

## 6. Oberfläche

- Neuer Reiter «Personen» (`reiter-personen`) nach «Anführer».
- Liste der Personen als Karten `person-<id>`. Darunter die Knöpfe `person-neu-general`, `person-neu-feldmarschall`, `person-neu-admiral` und `person-neu-berater`.
- Jede Karte zeigt:
  - `person-<id>-rolle` (Auswahl), `person-<id>-name` und das Porträt (Galerie wie beim Anführer, eigenes Bild über `person-<id>-bild`)
  - Heer und Marine: `person-<id>-stufe` und `person-<id>-<wert>` (Zahlen 1–9), dazu Häkchen `person-<id>-eig-<trait>` mit den Eigenschaften der Rolle und einer Suche
  - Berater: `person-<id>-platz`, `person-<id>-kosten` und `person-<id>-beratereig` (Auswahl: zuerst die eigenen Eigenschaften, dann die aus dem Spiel)
  - `person-<id>-entfernen`

## 7. Tests

- **Leser:** `fuehrerEigenschaften` mit Rollen; `status_trait` und `operative` werden übersprungen. Der Mini-Spielordner bekommt `common/unit_leader/00_traits.txt` im Format des Spiels.
- **Projekt:** Vorgaben je Rolle, Rollenwechsel, ergänzen alter Projekte.
- **Erzeuger:**
  - je Rolle der Block, streng zurückgeparst
  - eine Charakterdatei mit Anführer und Personen
  - `recruit_character` bei neuem und bestehendem Land
  - eigenes Porträt
  - Sprache
- **Prüfung:** jede Regel mit Fall und Gegenfall.
- **Selbsttest:** dem neuen Land einen General mit Eigenschaft und einen Berater geben, der Schweiz einen Admiral. Danach speichern und die Charakterdateien prüfen.
