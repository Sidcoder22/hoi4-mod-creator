# HOI4 Mod Creator – Etappe 2b (Geister, Anführer, Rekruten, Diplomatie) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Geister und Anführer-Eigenschaften mit allen Boni des Spiels, Geister aus dem Spiel kopieren oder zuweisen, Rekruten und Bevölkerung anpassen, Marionetten und Diplomatie zum Spielstart einstellen.

**Architecture:** Der Leser sammelt Modifikatoren, Spielgeister, Eigenschaften, Autonomiestufen, Marionetten und Fraktionen. Projektdaten und Bausteine werden ergänzt. Der Erzeuger-Kontext bekommt `startZeilen`, `verlaufEntfernen`, `staatManpower` und `neuerVerlauf`, darauf bauen ein neuer Diplomatie-Erzeuger und die erweiterten Land-Erzeuger auf. In der Oberfläche kommen Reiter und Abschnitte dazu.

**Tech Stack:** wie bisher (Vite 8, Preact 11, Vitest 5, puppeteer-core).

**Spec:** `docs/superpowers/specs/2026-10-08-etappe-2b-geister-anfuehrer-diplomatie-design.md` (ergänzt `2026-10-07-hoi4-mod-creator-design.md`)

## Global Constraints

Alle Global Constraints aus Etappe 1 und 2 gelten weiter, zusätzlich:

- `LESER_VERSION = 4`.
- Neue Kennungen:
  - Eigenschaft: `<modid>_eigenschaft_<nummer>`
  - Meinung: `<modid>_meinung_p<wert>` / `<modid>_meinung_m<betrag>`
  - Fraktion beim Start: `<modid>_fraktion_<tag klein>`
- Ein `frei`-Bonus speichert `wert` in Spieleinheit (0.05 = 5 %); `modifier` muss `/^[a-z0-9_]+$/` erfüllen.
- Projekte aus älteren Versionen (auch aus IndexedDB) werden beim Öffnen über `ergaenzeProjekt(p)` vervollständigt.
- Diplomatie und Rekruten gelten für den Start 1936. Datumsblöcke in Spieldateien bleiben unangetastet.

## Review Focus

1. **Altes Projekt aus dem Browser-Speicher** ohne neue Felder (`eigenschaften`, `diplomatie`, `spielIdeen`, `startwerte.rekruten`). Erwartet: öffnet ohne Absturz, alle Felder mit Vorgaben. Test in Task 2.
2. **Ein Staat wechselt den Besitzer und bekommt Bevölkerungsänderungen.** Erwartet: Es zählt nur der Faktor des Landes, dem der Staat zum Start gehört, und die Staatsdatei wird nur einmal geschrieben. Test in Task 4.
3. **Freilassen, wenn die Marionette im Spiel nur in einem Datumsblock entsteht.** Erwartet: Nur Einträge auf oberster Ebene werden entfernt, der Datumsblock bleibt. Test in Task 5.
4. **Freier Bonus mit Grossbuchstaben oder Leerzeichen** («Consumer Goods»). Erwartet: verständlicher Fehler in der Prüfung, kein kaputter Code. Test in Task 6.
5. **Dasselbe Ziel-Land zweimal in einer Diplomatie-Liste** (zwei Meinungen zu FRA, zwei Kriegsziele gegen GER). Erwartet: Fehler «doppelt» in der Prüfung. Test in Task 6.

---

### Task 1: Spieldaten für Etappe 2b

**Files:** Modify `src/leser/spielordner.js`, `src/selbsttest/mini-spielordner.js` · Test `tests/leser/spielordner.test.js`

**Interfaces:**
- Produces in `spieldaten` (Form wie im Konzept, Abschnitt 2):
  - `modifikatoren: [{ id, name, prozent }]`, sortiert nach `name`
  - `spielGeister: [{ id, name, beschreibung, sprite, boni: [{ modifier, wert }], nichtUebernommen, land }]`
  - `anfuehrerEigenschaften: [{ id, name, boni }]`
  - `autonomieStufen: [{ id, name }]`
  - `laender[tag].marionetten: [{ tag, autonomie }]`
  - `laender[tag].fraktion: string | null`
  - `bericht.spielGeister`, `bericht.eigenschaften`
- `LESER_VERSION = 4`

**Ergänzung Mini-Spielordner:**
- `common/ideas/00_ideen.txt`:
  - `ideas = { country = { schweizer_neutralitaet = { picture = generic_army allowed = { original_tag = SWI } modifier = { consumer_goods_factor = -0.05 stability_factor = 0.1 } research_bonus = { industry = 0.1 } } deutsche_industrie = { modifier = { industrial_capacity_factory = 0.1 } } } economy = { civilian_economy = { modifier = { consumer_goods_factor = 0.35 } } } }`
  - dazu `interface/ideas.gfx` mit `GFX_idea_deutsche_industrie` → `gfx/interface/ideas/idea_generic_industry.dds`
- `common/country_leader/00_traits.txt`: `leader_traits = { popular_figurehead = { random = no stability_factor = 0.15 political_power_factor = -0.1 } war_monger = { random = no war_support_factor = 0.1 } }`
- `common/autonomous_states/01_dominion.txt` mit `autonomy_state = { id = autonomy_dominion min_freedom_level = 0.6 }`, `02_puppet.txt` mit `id = autonomy_puppet`
- Sprachschlüssel:
  - Geister: `schweizer_neutralitaet` «Schweizer Neutralität», `schweizer_neutralitaet_desc` «Wir bleiben draussen.», `deutsche_industrie` «Deutsche Industrie»
  - Modifikatoren: `MODIFIER_CONSUMER_GOODS_FACTOR` «Konsumgüter», `stability_factor` «Stabilität»
  - Eigenschaften: `popular_figurehead` «Volksheld»
  - Autonomie: `autonomy_dominion` «Dominion», `autonomy_puppet` «Marionette»
- Verlauf: GER erhält `create_faction = axis_faction`, FRA erhält `set_autonomy = { target = SWI autonomous_state = autonomy_dominion }` und `1939.1.1 = { puppet = GER }`.

- [ ] **Step 1: Failing tests**

```js
expect(LESER_VERSION).toBe(4)
expect(sd.modifikatoren.find(m => m.id === 'consumer_goods_factor')).toEqual({ id: 'consumer_goods_factor', name: 'Konsumgüter', prozent: true })
expect(sd.modifikatoren.find(m => m.id === 'industrial_capacity_factory')).toMatchObject({ prozent: true, name: 'industrial_capacity_factory' })
expect(sd.modifikatoren.find(m => m.id === 'stability_factor').name).toBe('Stabilität')
expect(sd.spielGeister.map(g => g.id)).toEqual(['deutsche_industrie', 'schweizer_neutralitaet'])
expect(sd.spielGeister.find(g => g.id === 'schweizer_neutralitaet')).toEqual({ id: 'schweizer_neutralitaet', name: 'Schweizer Neutralität',
  beschreibung: 'Wir bleiben draussen.', sprite: 'GFX_idea_generic_army', land: 'SWI',
  boni: [{ modifier: 'consumer_goods_factor', wert: -0.05 }, { modifier: 'stability_factor', wert: 0.1 }], nichtUebernommen: ['research_bonus'] })
expect(sd.spielGeister.find(g => g.id === 'deutsche_industrie').sprite).toBe('GFX_idea_deutsche_industrie')
expect(sd.anfuehrerEigenschaften.find(e => e.id === 'popular_figurehead')).toEqual({ id: 'popular_figurehead', name: 'Volksheld',
  boni: [{ modifier: 'stability_factor', wert: 0.15 }, { modifier: 'political_power_factor', wert: -0.1 }] })
expect(sd.autonomieStufen).toEqual([{ id: 'autonomy_dominion', name: 'Dominion' }, { id: 'autonomy_puppet', name: 'Marionette' }])
expect(sd.laender.FRA.marionetten).toEqual([{ tag: 'SWI', autonomie: 'autonomy_dominion' }])
expect(sd.laender.GER).toMatchObject({ marionetten: [], fraktion: 'axis_faction' })
```

- [ ] **Step 2: Run** `npx vitest run tests/leser/spielordner.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
  - Modifikator-Werte werden über alle Fundstellen gesammelt, damit die Prozent-Regel greift.
  - Ohne `autonomous_states` gilt die Rückfallliste aus dem Konzept.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS. Bestehende Tests, die Länderzahlen oder Fixtures prüfen, bleiben grün oder werden mit Begründung angepasst.
- [ ] **Step 5: Commit** – `"Spieldaten fuer Etappe 2b"`

---

### Task 2: Projektdaten

**Files:** Modify `src/projekt/boni.js`, `src/projekt/modell.js`, `src/projekt/aenderungen.js`; Create `src/projekt/eigenschaften.js` · Test `tests/projekt/etappe2b.test.js`

**Interfaces:**
- `BONI` + 7 Einträge (alle `einheit: 'prozent'`):

| art | modifier | Bereich |
|---|---|---|
| `konsumgueter` | `consumer_goods_factor` | −50..50 |
| `ausbildungszeit` | `training_time_factor` | −50..50 |
| `bau_zivilfabrik` | `production_speed_industrial_complex_factor` | −50..100 |
| `bau_militaerfabrik` | `production_speed_arms_factory_factor` | −50..100 |
| `rohstoffe` | `local_resources_factor` | −50..50 |
| `politische_macht_prozent` | `political_power_factor` | −50..100 |
| `rekruten_prozent` | `conscription_factor` | −50..100 |

- `bonusWertImSpiel({ art: 'frei', modifier, wert }) → wert` (unverändert)
- `bonusModifier(bonus) → string` (feste Liste: `info.modifier`; frei: `bonus.modifier`)
- `bonusAusSpiel(modifier, wert) → Bonus`: Gibt es einen Eintrag der festen Liste mit diesem `modifier`, entsteht `{ art, wert }` in dessen Einheit, sonst `{ art: 'frei', modifier, wert }`.
- `modell.js`: `ergaenzeProjekt(p) → p` füllt fehlende Felder:
  - `eigenschaften`, `fokusbaeume`, `ideen`, `bilder`
  - `zaehler.*`
  - pro Land: `spielIdeen`, `startwerte.rekruten`, `startwerte.bevoelkerung`, `anfuehrer.eigenschaften`, `anfuehrer.modus`, `diplomatie` (leer), `aendern.diplomatie`
  - `ladeProjektAusJson` ruft `ergaenzeProjekt` auf.
- `aenderungen.js`:
  - `fuegeLandHinzu`:
    - neue Länder bekommen die Vorgaben
    - geänderte Länder bekommen `diplomatie.marionetten` aus `sd.laender[tag].marionetten`
    - `aendern.diplomatie = false`
  - `kopiereSpielGeist(p, sd, ideeId) → [p, geistId]`: Name `Kopie von <Name>`, `bild = { art: 'spiel', sprite }`, Boni über `bonusAusSpiel`
- `eigenschaften.js`:
  - `fuegeEigenschaftHinzu(p) → [p, id]`, `aendereEigenschaft(p, id, patch)`
  - `entferneEigenschaft(p, id)`: entfernt auch `{ art: 'eigen', id }` aus allen `anfuehrer.eigenschaften`
  - `eigenschaftKennung(p, e) → '<modid>_eigenschaft_<nummer>'` (in `erzeuger/kennungen.js`)
- `ui/zustand.js` `oeffneProjekt` ruft `ergaenzeProjekt` auf.

- [ ] **Step 1: Failing tests:**
  - `ergaenzeProjekt` auf einem Projekt in Etappe-1-Form (ohne `eigenschaften`, Land ohne `diplomatie` und `spielIdeen`) liefert alle Felder mit Vorgaben (**Review Focus 1**).
  - `kopiereSpielGeist(p, sd, 'schweizer_neutralitaet')`:
    - Name «Kopie von Schweizer Neutralität»
    - Boni `[{ art: 'konsumgueter', wert: -5 }, { art: 'stabilitaet', wert: 10 }]`
    - Sprite `GFX_idea_generic_army`
  - `bonusAusSpiel('army_speed_factor', 0.1)` → `{ art: 'frei', modifier: 'army_speed_factor', wert: 0.1 }`
  - SWI geändert → `diplomatie.marionetten` leer; FRA geändert → `[{ tag: 'SWI', autonomie: 'autonomy_dominion' }]`
  - Eigenschaft anlegen, zuweisen, löschen → Verweis entfernt
- [ ] **Step 2: Run** `npx vitest run tests/projekt`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Projektdaten fuer Etappe 2b"`

---

### Task 3: Bausteine «Geist aus dem Spiel»

**Files:** Modify `src/bausteine/felder.js`, `src/bausteine/wirkungen.js` · Test `tests/bausteine/bausteine.test.js`

**Interfaces:**
- Feldtyp `spielgeist`: Pflicht; Prüfung gegen `sd.spielGeister`; Anzeige ist der Name.
- Wirkungen `spielgeist_hinzu` («Geist «{spielgeist}» aus dem Spiel erhalten» → `add_ideas = <id>`) und `spielgeist_weg` (→ `remove_ideas = <id>`), Gruppe «Politik»

- [ ] **Step 1: Failing tests:** zwei neue Zeilen in `WIRKUNGS_FAELLE`
  - `['spielgeist_hinzu', { spielgeist: 'deutsche_industrie' }, 'add_ideas = deutsche_industrie\n']`
  - analog `spielgeist_weg`
  - Prüfung `{ spielgeist: 'gibtsnicht' }` → ein Fehler
  - `satzText` → «Geist «Deutsche Industrie» aus dem Spiel erhalten»
- [ ] **Step 2–4:** Run → FAIL; implementieren; Run → PASS.
- [ ] **Step 5: Commit** – `"Baustein Geist aus dem Spiel"`

---

### Task 4: Erzeuger – Kontext, Geister, Rekruten, Bevölkerung, Eigenschaften

**Files:** Modify `src/erzeuger/index.js`, `kern.js`, `ideen.js`, `land-neu.js`, `land-geaendert.js`, `kennungen.js`; Create `src/erzeuger/eigenschaften.js` · Test `tests/erzeuger/etappe2b.test.js`

**Interfaces:**
- Kontext neu:
  - `startZeilen(tag, zeilen)`: Ist der Tag ein neues Projektland, kommen die Zeilen an das Ende seiner Verlaufsdatei, sonst über `verlaufAnhaengen`.
  - `neuerVerlauf(tag, pfad, text)`: Statt `schreibe` für Verlaufsdateien neuer Länder; `index.js` schreibt am Ende Text plus Startzeilen.
  - `verlaufEntfernen(tag, pruefe: (eintrag) → boolean)`: Für Spiel-Länder wird beim Kopieren der Verlaufsdatei auf oberster Ebene entfernt, was `pruefe` trifft. Dann wird neu geschrieben und der Anhang angefügt; ohne Entfernung bleibt der Originaltext unverändert.
  - `staatManpower(staatId, faktor)`
- `aendereStaatsdatei(text, { neuerBesitzer?, kernAltEntfernen, manpowerFaktor? })`: ohne `neuerBesitzer` kein Besitzerwechsel; `manpower = round(manpower × faktor)`
- Bevölkerung: Für jeden Staat, der dem Land zum Start gehört (`effektiveBesitzer`), gilt `staatManpower(s, 1 + bevoelkerung/100)`, nur wenn `bevoelkerung ≠ 0`. Bei geänderten Ländern nur mit `aendern.startwerte`.
- Rekruten: `add_manpower = <n>` als Startzeile, wenn `> 0`.
- Geister: `add_ideas` enthält `geisterKennungen` und `spielIdeen`; `frei`-Boni schreibt `ideen.js` als `<modifier> = <wert>`.
- Eigenschaften (`eigenschaften.js`, `erzeugeEigenschaften(k)` in `ERZEUGER`):
  - Datei `common/country_leader/<m>_eigenschaften.txt` nur, wenn eigene Eigenschaften benutzt werden
  - Sprache `<kennung>` und `<kennung>_desc`
- Anführer:
  - Neuer Anführer: `country_leader` mit `traits = { … }` (Spiel-IDs und eigene Kennungen).
  - Geändertes Land mit `anfuehrer.modus === 'behalten'` und `aendern.anfuehrer`: kein neuer Charakter, dafür Startzeilen `add_country_leader_trait = <id>`.

- [ ] **Step 1: Failing tests**
  - Neues Land MRE mit Rekruten 200000 und Bevölkerung +50 (Staaten 1, 4):
    - Verlauf enthält `add_manpower = 200000`
    - `1-Brandenburg.txt` hat `manpower = 3750000` und `owner = MRE`
    - `4-Zuerich.txt` hat `1800000`
  - **Review Focus 2:**
    - GER geändert mit Bevölkerung −50 und `aendern.startwerte`, MRE besitzt Staat 1
    - Brandenburg bekommt nur den Faktor von MRE (3750000), Bayern den von GER (1500000)
    - Jede Staatsdatei existiert genau einmal.
  - Spiel-Geist `deutsche_industrie` bei MRE → `add_ideas` enthält ihn neben `mein_reich_geist_1`.
  - `frei`-Bonus `army_speed_factor = 0.1` landet in `modifier`.
  - Eigene Eigenschaft mit Bonus Stabilität 5:
    - Datei parst streng und enthält `stability_factor = 0.05`
    - Anführer von MRE hat `traits = { popular_figurehead mein_reich_eigenschaft_1 }`
  - SWI geändert, `modus 'behalten'`, Eigenschaft `war_monger`:
    - Anhang enthält `add_country_leader_trait = war_monger`
    - Es gibt keine Charakterdatei für SWI.
  - `fehler` ist überall `[]`.
- [ ] **Step 2–4:** Run → FAIL; implementieren; Run `npx vitest run` → PASS.
- [ ] **Step 5: Commit** – `"Erzeuger: Rekruten, Bevoelkerung, Spielgeister, Eigenschaften"`

---

### Task 5: Erzeuger – Diplomatie

**Files:** Create `src/erzeuger/diplomatie.js` · Modify `src/erzeuger/index.js` · Test `tests/erzeuger/diplomatie.test.js`

**Interfaces:** `erzeugeDiplomatie(k)` in `ERZEUGER`. Er gilt für neue Länder sowie für geänderte Länder mit `aendern.diplomatie`. Sprachschlüssel und Dateien wie im Konzept, Abschnitt 4:

| Teil | Erzeugung |
|---|---|
| Marionetten | Vergleich `diplomatie.marionetten` mit `sd.laender[tag].marionetten`. Neue → `puppet = X` und bei Bedarf `set_autonomy`. Geänderte Autonomie → `set_autonomy`. Fehlende → `verlaufEntfernen(tag, e => (e.schluessel === 'puppet' && e.wert.text === X) \|\| (e.schluessel === 'set_autonomy' && target === X))` |
| Meinung | Opinion-Datei `common/opinion_modifiers/<m>_meinungen.txt`; Zeilen `add_opinion_modifier`; gegenseitig zusätzlich `X = { add_opinion_modifier = { target = TAG modifier = … } }` |
| Verträge | `give_guarantee`, `diplomatic_relation` |
| Fraktion gründen | `create_faction = <m>_fraktion_<tag klein>` + `add_to_faction` je Mitglied; Sprache = Name |
| Fraktion beitreten | `startZeilen(anfuehrer, ['add_to_faction = TAG'])` |
| Kriegsziele | `create_wargoal = { type target }` |

- [ ] **Step 1: Failing tests**
  - MRE (neu):
    - Marionette SWI als Dominion → im Verlauf von MRE `puppet = SWI`, danach `set_autonomy = { target = SWI autonomous_state = autonomy_dominion }`
    - Meinung FRA +50 gegenseitig → Opinion-Datei mit `mein_reich_meinung_p50 = { value = 50 }`, Zeilen in beide Richtungen
    - Garantie SWI, Nichtangriffspakt FRA
    - Fraktion «Alpenbund» mit SWI → `create_faction = mein_reich_fraktion_mre`, danach `add_to_faction = SWI`
    - Kriegsziel GER `topple_government`
  - FRA geändert mit `aendern.diplomatie` und `marionetten: []`:
    - Die Kopie von FRAs Verlauf enthält kein `set_autonomy` mehr auf oberster Ebene.
    - `1939.1.1 = { puppet = GER }` bleibt (**Review Focus 3**).
  - FRA geändert mit `autonomie: 'autonomy_puppet'` statt Dominion → Anhang `set_autonomy … autonomy_puppet`.
  - SWI (geändert) tritt der Fraktion von GER bei → Anhang in GERs Verlauf `add_to_faction = SWI`.
  - Alle Dateien parsen streng; `fehler` ist `[]`.
- [ ] **Step 2–4:** Run → FAIL; implementieren; Run → PASS.
- [ ] **Step 5: Commit** – `"Erzeuger: Diplomatie zum Spielstart"`

---

### Task 6: Prüfregeln Etappe 2b

**Files:** Modify `src/pruefung/regeln.js` · Test `tests/pruefung/regeln.test.js`

| regel | Schwere | Bedingung |
|---|---|---|
| `bonus-name` | fehler | `frei`-Bonus mit `modifier` ausserhalb von `/^[a-z0-9_]+$/` (Geist oder Eigenschaft) |
| `bonus-unbekannt` | hinweis | `frei`-Bonus nicht in `sd.modifikatoren` |
| `bonus-wert` | fehler | Bonus der festen Liste ausserhalb `min..max` |
| `spielgeist-fehlt` | fehler | `spielIdeen` enthält eine ID, die nicht in `sd.spielGeister` steht |
| `eigenschaft-name` | fehler | eigene Eigenschaft ohne Namen |
| `eigenschaft-fehlt` | fehler | Anführer verweist auf eine unbekannte Spiel- oder eigene Eigenschaft |
| `diplomatie-ziel` | fehler | Ziel-Land unbekannt oder das Land selbst |
| `diplomatie-doppelt` | fehler | dasselbe Ziel zweimal in derselben Liste |
| `marionette-doppelt` | fehler | ein Land ist Marionette von zwei Oberherren (Projekt und Spiel zusammen) |
| `fraktion-ohne` | fehler | «beitreten» zu einem Land ohne Fraktion (weder Spiel noch Projekt) |
| `fraktion-doppelt` | fehler | ein Land ist Mitglied in zwei Fraktionen |
| `diplomatie-ohne-staaten` | hinweis | Ziel besitzt zum Start keinen Staat |

- [ ] **Step 1: Failing tests:** je Regel ein Fall und das gültige Projekt ohne neue Meldungen. **Review Focus 4:** `{ art: 'frei', modifier: 'Consumer Goods', wert: 0.1 }` → `bonus-name`. **Review Focus 5:** zwei Meinungen zu FRA → `diplomatie-doppelt`.
- [ ] **Step 2–4:** Run → FAIL; implementieren; Run → PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln Etappe 2b"`

---

### Task 7: Oberfläche – Geister aus dem Spiel, Bonus-Auswahl, Rekruten

**Files:** Create `src/ui/geister/spielgeister.jsx`, `src/ui/bonus-editor.jsx` · Modify `src/ui/geister/geister-liste.jsx`, `geist-editor.jsx`, `src/ui/laender/reiter-geister.jsx`, `reiter-startwerte.jsx`, `src/selbsttest/szenario.js`

**Interfaces:**
- `<BonusEditor boni onAendere spieldaten test />`:
  - Zeilen `<test>-art-<i>`: Auswahl der festen Liste plus «Weiterer Bonus aus dem Spiel …» (Wert `frei`)
  - bei `frei`: Suchfeld `<test>-frei-<i>` mit Trefferliste `<test>-frei-<i>-<modifier>` und freier Eingabe
  - Wert `<test>-wert-<i>`, bei Prozent-Modifikatoren in % angezeigt und als Spieleinheit gespeichert
  - `<test>-entfernen-<i>`, `<test>-neu`
  - Ersetzt die Boni-Zeilen im Geist-Editor (`test="bonus"`; vorhandene `data-test`-Namen `bonus-art-<i>`, `bonus-wert-<i>`, `bonus-neu` bleiben).
- Geister-Liste: Reiter `geister-eigene` / `geister-spiel`. Spielgalerie mit `spielgeist-suche`, Karten `spielgeist-<id>`, Knopf `kopieren-<id>`, der danach den Editor öffnet.
- Reiter «Nationale Geister» im Land-Editor: Suche `land-spielgeist-suche`, Treffer `land-spielgeist-hinzu-<id>`, Liste `land-spielgeist-<id>` mit `land-spielgeist-weg-<id>`.
- «Startwerte»: `start-rekruten` (Zahl, Schritt 10000) und `start-bevoelkerung` (Regler −50..200 %).

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Geist zuweisen»:
  - «Geist aus dem Spiel kopieren»:
    - `nav-geister`, `geister-spiel`, `tippe('spielgeist-suche', 'Schweiz')`, `kopieren-schweizer_neutralitaet`
    - Editor offen, Name «Kopie von Schweizer Neutralität», `bonus-art-0` hat Wert `konsumgueter`
    - danach `bonus-neu`, `waehle('bonus-art-2', 'frei')`, `tippe('bonus-frei-2', 'industrial')`, `klicke('bonus-frei-2-industrial_capacity_factory')`, `tippe('bonus-wert-2', '10')`
    - Im Zustand gilt `{ art: 'frei', modifier: 'industrial_capacity_factory', wert: 0.1 }`.
  - «Spielgeist zuweisen»: MRE öffnen, `reiter-geister`, `tippe('land-spielgeist-suche', 'Industrie')`, `land-spielgeist-hinzu-deutsche_industrie` → `spielIdeen` enthält sie
  - «Rekruten»: `reiter-startwerte`, `tippe('start-rekruten', '200000')`, `tippe('start-bevoelkerung', '50')` → Zustand stimmt
- [ ] **Step 2–4:** `npm run selbsttest` → FEHLER; implementieren; → OK.
- [ ] **Step 5: Commit** – `"Oberflaeche: Spielgeister, Bonus-Auswahl, Rekruten"`

---

### Task 8: Oberfläche – Eigenschaften, Diplomatie, Durchgang

**Files:** Create `src/ui/laender/reiter-diplomatie.jsx`, `src/ui/laender/eigenschaften.jsx` · Modify `reiter-anfuehrer.jsx`, `land-editor.jsx`, `src/selbsttest/szenario.js`, `README.md`

**Interfaces:**
- Anführer-Reiter, Abschnitt «Eigenschaften»:
  - Suche `eigenschaft-suche` mit Treffern `eigenschaft-hinzu-<id>`
  - Liste `eigenschaft-<art>-<id>` mit `eigenschaft-weg-<i>`
  - `neue-eigenschaft` öffnet einen eingebetteten Editor: `eigenschaft-name`, `eigenschaft-beschreibung`, `<BonusEditor test="eigenschaft-bonus">`, `eigenschaft-fertig`
  - bei geänderten Ländern Auswahl `anfuehrer-modus` (`neu` / `behalten`)
- Reiter «Diplomatie» (`reiter-diplomatie`, Schalter `aendern-diplomatie`) mit fünf Abschnitten:
  - Marionetten `marionette-<i>-land` / `-autonomie` / `-weg`, `marionette-neu`
  - Meinung `meinung-<i>-land` / `-wert` / `-gegenseitig`, `meinung-neu`
  - Verträge `vertrag-<i>-art` / `-land`, `vertrag-neu`
  - Fraktion `fraktion-art` (keine / gründen / beitreten), `fraktion-name`, `fraktion-mitglied-<tag>` (Häkchen), `fraktion-anfuehrer`
  - Kriegsziele `kriegsziel-<i>-land` / `-art`, `kriegsziel-neu`
  - Bestehende Marionetten aus dem Spiel erscheinen mit dem Vermerk «aus dem Spiel».

- [ ] **Step 1: Selbsttest-Schritte (failing)** vor «Fokusbaum anlegen»:
  - «Eigenschaften»: MRE `reiter-anfuehrer`, `tippe('eigenschaft-suche', 'Volks')`, `eigenschaft-hinzu-popular_figurehead`, `neue-eigenschaft`, Name «Eiserner Wille», Bonus Stabilität 5, `eigenschaft-fertig` → `anfuehrer.eigenschaften` hat zwei Einträge
  - «Diplomatie»: MRE `reiter-diplomatie`:
    - Marionette SWI mit `autonomy_dominion`
    - Meinung FRA 50 gegenseitig
    - Vertrag Nichtangriffspakt FRA
    - Kriegsziel GER `topple_government`
    - Fraktion gründen «Alpenbund» mit Mitglied SWI
  - «Speichern in Ordner» prüft zusätzlich:
    - `mod/selbsttest_reich/common/opinion_modifiers/selbsttest_reich_meinungen.txt` existiert
    - der Verlauf von MRE enthält `puppet = SWI`, `create_faction` und `add_manpower = 200000`
    - `common/country_leader/selbsttest_reich_eigenschaften.txt` parst streng
  - Die Ampel bleibt nach der Behebung von «hauptstadt-verloren» gelb.
- [ ] **Step 2–4:** `npm run selbsttest` → FEHLER; implementieren; README-Abschnitt «Etappe 2b» ergänzen; `npx vitest run && npm run selbsttest` → grün.
- [ ] **Step 5: Commit** – `"Oberflaeche: Eigenschaften, Diplomatie, Durchgang"`
