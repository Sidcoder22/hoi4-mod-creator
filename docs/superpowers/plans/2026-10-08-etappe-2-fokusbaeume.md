# HOI4 Mod Creator – Etappe 2 (Baukasten und Fokusbäume) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Anfänger baut einem neuen oder bestehenden Land einen eigenen Fokusbaum: Fokusse anlegen und verbinden, Belohnungen und Bedingungen per Baukasten zusammenklicken. Die Mod enthält danach einen gültigen `focus_tree`, der den Spielbaum dieses Landes ersetzt.

**Architecture:** Neue DOM-freie Schicht `src/bausteine/` mit einem Katalog von Wirkungen und Bedingungen. Jeder Baustein bringt Felder, Prüfung und Paradox-Erzeugung mit. Fokusbäume kommen als neue Projektdaten (`fokusbaeume`) dazu, mit eigenem Erzeuger (`erzeuger/fokus.js`) und eigenen Prüfregeln. Die Oberfläche bekommt einen Rastereditor (HTML-Karten plus SVG-Linien), eine Seitenleiste und wiederverwendbare Baustein-Editoren, die Etappe 3 weiterbenutzt.

**Tech Stack:** wie Etappe 1 (Vite 8, Preact 11, Vitest 5, puppeteer-core).

**Spec:** `docs/superpowers/specs/2026-10-07-hoi4-mod-creator-design.md` (Abschnitte 6.4, 6.5, 7.2 «Fokusbaum», 8)

## Global Constraints

Es gelten alle Global Constraints aus `docs/superpowers/plans/2026-10-07-etappe-1-laender.md`, zusätzlich:

- Spieldaten werden ohne Rücksicht auf Gross-/Kleinschreibung gelesen (Schlüssel und Pfade). Lesehilfen: `findeI`, `findeAlleI`.
- `LESER_VERSION` wird 3. Danach muss der Spielordner neu eingelesen werden.
- Kennungen:
  - Baum: `<modid>_baum_<nummer>`
  - Fokus: `<modid>_fokus_<nummer>`
  - Merker: `<modid>_<merker in ASCII, klein>`
  - Fraktion: `<modid>_fraktion_<n>`
- Die Nummern stammen aus `projekt.zaehler` und bleiben stabil.
- «Event auslösen» gehört zu Etappe 3 und ist in dieser Etappe nicht im Katalog.

## Review Focus

1. **Echte Fokus-Symbole:** Über 1000 `GFX_goal_*`, manche als BC7/DX10. Erwartet: Alle stehen zur Wahl, nicht lesbare mit Platzhalterbild. Das Einlesen bricht nicht ab. Test in Task 1.
2. **Gelöschter Fokus, auf den noch etwas verweist** (Voraussetzung, Ausschluss, Bedingung «Fokus erledigt»). Erwartet: Voraussetzungen und Ausschlüsse werden beim Löschen bereinigt, eine verwaiste Bedingung meldet die Prüfung als Fehler. Test in Task 2 und 5.
3. **Fokus auf ein besetztes Feld ziehen.** Erwartet: wird abgelehnt, nichts überlappt. Test in Task 2.
4. **«Eigener Code» mit Klammerfehler oder Umlaut.** Erwartet: verständlicher Fehler in der Prüfung statt «Interner Fehler». Test in Task 5.
5. **Baum für ein Land, das später gelöscht wird.** Erwartet: Fehler «Baum ohne Land» in der Prüfung. Test in Task 5.

---

## Dateistruktur (neu oder geändert)

```
src/bausteine/   felder.js  wirkungen.js  bedingungen.js  erzeugen.js
src/projekt/     modell.js (zaehler, fokusbaeume)  fokus.js (Aenderungen fuer Baeume/Fokusse)
src/erzeuger/    fokus.js  index.js (ERZEUGER)
src/leser/       spielordner.js (Fokus-Symbole, Technologie-Kategorien)
src/pruefung/    regeln.js (+ Fokus- und Baustein-Regeln)
src/ui/          bausteine/ felder.jsx  wirkungen.jsx  bedingungen.jsx
                 fokus/ baeume.jsx  baum-editor.jsx  raster.jsx  fokus-seite.jsx  symbole.jsx
                 app.jsx (Navigation)
src/selbsttest/  mini-spielordner.js (+ Ziele, Technologie)  szenario.js  helfer.js (zieheVon)
```

---

### Task 1: Spieldaten für Etappe 2 (Fokus-Symbole, Technologie-Kategorien)

**Files:** Modify `src/leser/spielordner.js`, `src/selbsttest/mini-spielordner.js` · Test `tests/leser/spielordner.test.js`

**Interfaces:**
- Produces, neu in `spieldaten`:
  - `fokusSymbole: string[]`: alle Sprite-Namen mit Präfix `GFX_goal_`, ohne `_shine`, sortiert. Auch Sprites, deren Bild nicht lesbar ist.
  - `technologieKategorien: [{ id, name }]` aus `common/technology_tags/*.txt` (Block `technology_categories`). Namen aus den Sprachdateien; ohne Datei der Rückfall `industry, electronics, infantry_weapons, artillery, armor, land_doctrine, naval_doctrine, air_doctrine, naval_equipment, air_equipment`.
  - `bildgroessen.fokus` (häufigste Grösse, Rückfall `[94, 86]`)
  - `bericht.fokusSymbole` (Anzahl) und `bericht.fokusSymboleGelesen`
- Bilder: `fokus:<GFX-Name>` für jedes lesbare Symbol
- `LESER_VERSION = 3`

**Ergänzung Mini-Spielordner:**
- `interface/goals.gfx` mit `SpriteType`-Schreibweise und drei Einträgen:
  - `GFX_goal_generic_construct_civ_factory` (DDS 94×86, blau)
  - `GFX_goal_generic_army_doctrines` (DDS 94×86, rot)
  - `GFX_goal_kaputt` (DDS mit `DX10`-Kopf, nicht lesbar)
- `interface/goals_shine.gfx` mit `GFX_goal_generic_construct_civ_factory_shine`
- `common/technology_tags/00_technology.txt` mit `technology_categories = { industry electronics land_doctrine }`
- Sprachschlüssel `industry` Industrie, `electronics` Elektronik, `land_doctrine` Heeresdoktrin

- [ ] **Step 1: Failing test**

```js
expect(sd.fokusSymbole).toEqual(['GFX_goal_generic_army_doctrines', 'GFX_goal_generic_construct_civ_factory', 'GFX_goal_kaputt'])
expect(ergebnis.bilder.get('fokus:GFX_goal_generic_construct_civ_factory')).toMatchObject({ breite: 94, hoehe: 86 })
expect(ergebnis.bilder.has('fokus:GFX_goal_kaputt')).toBe(false)
expect(sd.technologieKategorien).toEqual([{ id: 'industry', name: 'Industrie' }, { id: 'electronics', name: 'Elektronik' }, { id: 'land_doctrine', name: 'Heeresdoktrin' }])
expect(sd.bildgroessen.fokus).toEqual([94, 86])
expect(sd.bericht).toMatchObject({ fokusSymbole: 3, fokusSymboleGelesen: 2 })
expect(LESER_VERSION).toBe(3)
```

- [ ] **Step 2: Run** `npx vitest run tests/leser/spielordner.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.** Fortschrittsstufe «Fokus-Symbole werden gelesen …» zwischen Geistern und Porträts.
- [ ] **Step 4: Run** `npx vitest run`. Expected: alles grün; vorhandene Erwartungen an `bildgroessen` werden um `fokus` ergänzt.
- [ ] **Step 5: Commit** – `"Spieldaten fuer Fokusbaeume"`

---

### Task 2: Projektdaten für Fokusbäume

**Files:** Create `src/projekt/fokus.js` · Modify `src/projekt/modell.js` · Test `tests/projekt/fokus.test.js`

**Interfaces:**
- `neuesProjekt` erhält `fokusbaeume: []` und `zaehler: { geist: 0, baum: 0, fokus: 0, fraktion: 0 }`. `ladeProjektAusJson` ergänzt fehlende Felder in alten Projekten.
- Datenform:

```js
Fokusbaum = { id, nummer, name, land /* tag */, fokusse: Fokus[] }
Fokus = { id, nummer, name: '', beschreibung: '', x, y, dauer: 10,
          symbol: { art: 'spiel', sprite } | { art: 'eigen', bildId },
          voraussetzungen: [fokusId], voraussetzungsArt: 'alle' | 'eine',
          ausschluss: [fokusId],                 // immer beidseitig gespeichert
          verfuegbar: Bedingungsblock, belohnung: Wirkung[], kiGewicht: 1 }
Bedingungsblock = { modus: 'alle' | 'eine', liste: Bedingung[] }
Bedingung = { id, art, nicht: false, werte: {} }
Wirkung = { id, art, werte: {}, wirkungen?: Wirkung[] }   // wirkungen nur bei 'bei_land'
```

- `src/projekt/fokus.js` (rein):
  - `fuegeBaumHinzu(p, land, name) → [p, baumId]`
  - `aendereBaum(p, baumId, patch)`
  - `entferneBaum(p, baumId)`
  - `fuegeFokusHinzu(p, sd, baumId, x, y) → [p, fokusId]`: Symbol `sd.fokusSymbole[0]` oder `GFX_goal_generic_construct_civ_factory`. Ist das Feld besetzt, kommt `[p, null]` zurück.
  - `aendereFokus(p, baumId, fokusId, patch)`
  - `verschiebeFokus(p, baumId, fokusId, x, y)`: Ein besetztes Feld oder `x/y < 0` gibt `p` unverändert zurück.
  - `entferneFokus(p, baumId, fokusId)`: entfernt auch alle Verweise in `voraussetzungen` und `ausschluss` des Baums.
  - `setzeVoraussetzung(p, baumId, vonId, zuId, an)`: `zu` braucht `von`. `von === zu` ändert nichts.
  - `setzeAusschluss(p, baumId, aId, bId, an)`: beidseitig.
  - `fokusZyklus(baum) → fokusId[] | null`
  - `alleFokusse(p) → [{ baum, fokus }]`

- [ ] **Step 1: Failing tests** (Auszug)

```js
let [p, b] = fuegeBaumHinzu(neuesProjekt('M'), 'MRE', 'Weg zur Grösse')
let a, c
;[p, a] = fuegeFokusHinzu(p, sd, b, 0, 0); ;[p, c] = fuegeFokusHinzu(p, sd, b, 1, 1)
expect(fuegeFokusHinzu(p, sd, b, 0, 0)[1]).toBeNull()
expect(p.fokusbaeume[0].fokusse.map(f => f.nummer)).toEqual([1, 2])
expect(verschiebeFokus(p, b, c, 0, 0)).toBe(p)
expect(verschiebeFokus(p, b, c, -1, 0)).toBe(p)
p = setzeVoraussetzung(p, b, a, c, true)
expect(fokus(p, c).voraussetzungen).toEqual([a])
p = setzeAusschluss(p, b, a, c, true)
expect([fokus(p, a).ausschluss, fokus(p, c).ausschluss]).toEqual([[c], [a]])
expect(fokusZyklus(setzeVoraussetzung(p, b, c, a, true).fokusbaeume[0])).toEqual(expect.arrayContaining([a, c]))
const ohne = entferneFokus(p, b, a)
expect(fokus(ohne, c)).toMatchObject({ voraussetzungen: [], ausschluss: [] })
expect(ladeProjektAusJson(JSON.stringify({ ...neuesProjekt('A'), fokusbaeume: undefined, zaehler: { geist: 2 } })).zaehler).toEqual({ geist: 2, baum: 0, fokus: 0, fraktion: 0 })
```

- [ ] **Step 2: Run** `npx vitest run tests/projekt`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (bestehende `neuesProjekt`-Erwartung wird um die neuen Felder ergänzt).
- [ ] **Step 5: Commit** – `"Projektdaten fuer Fokusbaeume"`

---

### Task 3: Baustein-Katalog (Wirkungen und Bedingungen)

**Files:** Create `src/bausteine/felder.js`, `wirkungen.js`, `bedingungen.js`, `erzeugen.js` · Test `tests/bausteine/*.test.js`

**Interfaces:**
- `felder.js`:
  - Feldtypen `zahl`, `prozent`, `land`, `staat`, `geist`, `fokus`, `ideologie`, `kategorie`, `auswahl`, `merker`, `datum`, `text`, `code`
  - `pruefeFeld(feld, wert, kontext) → string | null` (Fehlertext)
  - `kontext = { projekt, spieldaten }`
- Baustein-Definition: `{ art, gruppe, name, satz, felder: [{ name, typ, label, standard, min?, max?, schritt?, optionen? }], erzeuge(werte, k) → Eintrag[] }`
  - `satz`: Anzeigetext mit `{feld}`-Platzhaltern, z. B. `'{menge} politische Macht erhalten'`
  - `k`: Erzeuger-Kontext (Task 4) mit `kennung.geist(id)`, `kennung.fokus(id)`, `kennung.merker(text)`, `kennung.fraktion(wirkungId)`, `sprache`, `quelle` (Kennung des Fokus, für `add_tech_bonus`)
- `WIRKUNGEN` (genau diese Arten und diese Syntax):

| art | Syntax |
|---|---|
| `politische_macht` | `add_political_power = {menge}` |
| `stabilitaet` | `add_stability = {prozent/100}` |
| `kriegsunterstuetzung` | `add_war_support = {prozent/100}` |
| `rekruten` | `add_manpower = {menge}` |
| `forschungsplatz` | `add_research_slot = 1` |
| `forschungsbonus` | `add_tech_bonus = { name = {quelle} bonus = {prozent/100} uses = {anzahl} category = {kategorie} }` |
| `erfahrung` | `army_experience` / `navy_experience` / `air_experience = {menge}` (Auswahl `teilstreitkraft`) |
| `geist_hinzu` / `geist_weg` | `add_ideas = <geist>` / `remove_ideas = <geist>` |
| `gebaeude` | Gebäude, siehe Regel unten |
| `staat_bekommen` | `transfer_state = {staat}` |
| `kern` | `add_state_core = {staat}` |
| `beliebtheit` | `add_popularity = { ideology = {ideologie} popularity = {prozent/100} }` |
| `regierung` | `set_politics = { ruling_party = {ideologie} elections_allowed = {yes/no} }` |
| `krieg` | `declare_war_on = { target = {land} type = annex_everything }` |
| `kriegsziel` | `create_wargoal = { type = annex_everything target = {land} }` |
| `garantie` | `give_guarantee = {land}` |
| `nichtangriffspakt` | `diplomatic_relation = { country = {land} relation = non_aggression_pact active = yes }` |
| `fraktion_gruenden` | `create_faction = <fraktion>`; Sprache `<fraktion>` = Name |
| `fraktion_beitreten` | `{land} = { add_to_faction = ROOT }` |
| `annektieren` | `annex_country = { target = {land} transfer_troops = yes }` |
| `marionette` | `puppet = {land}` |
| `ausruestung` | `add_equipment_to_stockpile = { type = {ausruestung} amount = {menge} producer = ROOT }`, Auswahl `infantry_equipment_1`, `support_equipment_1`, `artillery_equipment_1`, `anti_tank_equipment_1`, `anti_air_equipment_1`, `motorized_equipment_1` |
| `merker_setzen` / `merker_weg` | `set_country_flag = <merker>` / `clr_country_flag = <merker>` |
| `bei_land` | `{land} = { …verschachtelte Wirkungen… }` |
| `code` | eigener Code, geparst und eingefügt |

Regel für `gebaeude`:
- Typen `industrial_complex`, `arms_factory`, `dockyard`, `infrastructure`, `air_base`.
- `ort`: Staat oder `irgendwo`.
- Mit Staat: `{staat} = { add_extra_state_shared_building_slots = {anzahl} add_building_construction = { type = X level = {anzahl} instant_build = yes } }`. Die Bauplätze nur für die drei Fabriktypen.
- `irgendwo`: dasselbe in `random_owned_controlled_state = { … }`, bei `dockyard` mit `limit = { is_coastal = yes }`.

- `BEDINGUNGEN`:

| art | Syntax |
|---|---|
| `ist_land` | `tag = {land}` |
| `im_krieg` | `has_war = yes` |
| `krieg_mit` | `has_war_with = {land}` |
| `stabilitaet` / `kriegsunterstuetzung` | `has_stability` / `has_war_support {>|<} {prozent/100}` |
| `politische_macht` | `has_political_power {>|<} {menge}` |
| `fokus_erledigt` | `has_completed_focus = <fokus>` |
| `datum` | `date {>|<} {Y.M.D}` |
| `regierung` | `has_government = {ideologie}` |
| `besitzt_staat` / `kontrolliert_staat` | `owns_state` / `controls_state = {staat}` |
| `in_fraktion` | `is_in_faction = yes` |
| `fraktion_mit` | `is_in_faction_with = {land}` |
| `fabriken` | `num_of_factories > {menge}` |
| `merker` | `has_country_flag = <merker>` |
| `geist` | `has_idea = <geist>` |
| `land_existiert` | `country_exists = {land}` |
| `code` | eigener Code |

- `erzeugen.js`:
  - `erzeugeWirkungen(liste, k) → Eintrag[]`
  - `erzeugeBedingungen(block, k) → Eintrag[]`: «nicht» ergibt `NOT = { … }`, `modus 'eine'` mit mehr als einem Eintrag ergibt `OR = { … }`.
  - `pruefeBausteine(liste|block, kontext, ort) → [{ text, ort }]`: Pflichtfelder; Verweise auf Land, Staat, Geist und Fokus; eigener Code lässt sich streng parsen und ist ASCII.
  - `satzText(def, werte, kontext) → string`: Anzeige mit Namen statt Kennungen.
  - `neueWirkung(art)` und `neueBedingung(art)` mit Standardwerten.

- [ ] **Step 1: Failing tests:** Ein Tabellentest erzeugt für jede Art mit Beispielwerten den Text über `schreibeParadox` und vergleicht ihn mit der Syntax oben. Dazu:

```js
expect(text(erzeugeBedingungen({ modus: 'eine', liste: [b('im_krieg'), { ...b('ist_land', { land: 'GER' }), nicht: true }] }, k)))
  .toBe('OR = {\n\thas_war = yes\n\tNOT = {\n\t\ttag = GER\n\t}\n}\n')
expect(text(erzeugeWirkungen([{ ...w('bei_land', { land: 'GER' }), wirkungen: [w('politische_macht', { menge: 50 })] }], k)))
  .toBe('GER = {\n\tadd_political_power = 50\n}\n')
expect(pruefeBausteine([w('code', { code: 'x = {' })], kontext, 'Fokus A')[0].text).toMatch(/Eigener Code/)
expect(pruefeBausteine([w('code', { code: 'x = "ä"' })], kontext, 'Fokus A')[0].text).toMatch(/Sonderzeichen/)
expect(pruefeBausteine([w('staat_bekommen', { staat: 999 })], kontext, 'A')[0].text).toMatch(/Staat/)
expect(pruefeBausteine([w('geist_hinzu', { geist: 'weg' })], kontext, 'A').length).toBe(1)
expect(satzText(WIRKUNGEN.find(d => d.art === 'staat_bekommen'), { staat: 1 }, kontext)).toBe('Staat Brandenburg bekommen')
expect(WIRKUNGEN.some(d => d.art === 'event')).toBe(false)
```

- [ ] **Step 2: Run** `npx vitest run tests/bausteine`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Baukasten fuer Wirkungen und Bedingungen"`

---

### Task 4: Fokusbäume erzeugen

**Files:** Create `src/erzeuger/fokus.js` · Modify `src/erzeuger/index.js`, `src/erzeuger/kennungen.js` · Test `tests/erzeuger/fokus.test.js`

**Interfaces:**
- `kennungen.js`: `baumKennung(p, baum)`, `fokusKennung(p, fokus)`, `merkerKennung(p, text)` (Transliteration, klein, `[a-z0-9_]`, max. 30 Zeichen), `fraktionKennung(p, wirkung)`
- `erzeugeFokusbaeume(kontext)` in `ERZEUGER`. Pro Baum entsteht `mod/<m>/common/national_focus/<m>_<baumKennung>.txt`:

```
focus_tree = {
	id = <baum>
	country = {
		factor = 0
		modifier = {
			add = 100
			tag = <land>
		}
	}
	default = no
	continuous_focus_position = { x = 50 y = 1200 }
	focus = {
		id = <fokus>
		icon = <GFX>
		x = <x>
		y = <y>
		cost = <dauer>
		prerequisite = { focus = <a> }        # 'alle': ein Block je Voraussetzung; 'eine': ein Block mit allen
		mutually_exclusive = { focus = <b> }  # nur wenn vorhanden
		available = { … }                     # nur wenn Bedingungen vorhanden
		completion_reward = { … }
		ai_will_do = { factor = <kiGewicht> }
	}
}
```

- Eigene Symbole:
  - DDS `mod/<m>/gfx/interface/goals/<fokus>.dds` in `bildgroessen.fokus`
  - Sprite `GFX_<fokus>` in `interface/<m>_goals.gfx`
  - Schimmer-Sprite `GFX_<fokus>_shine` in `interface/<m>_goals_shine.gfx`. Vorlage ist der Schimmer des Spiels: `effectFile = "gfx/FX/buttonstate.lua"`, zwei `animation`-Blöcke mit `animationmaskfile` = eigenes DDS, `animationtexturefile = "gfx/interface/goals/shine_overlay.dds"`, `animationrotation` −90 / 90, `animationlooping = no`, `animationtime = 0.75`, `animationdelay = 0`, `animationblendmode = "add"`, `animationtype = "scrolling"`, `animationrotationoffset = { x = 0.0 y = 0.0 }`, `animationtexturescale = { x = 1.0 y = 1.0 }`, `legacy_lazy_load = no`.
- Sprache: `<fokus>` = Name, `<fokus>_desc` = Beschreibung. Bei `fraktion_gruenden` zusätzlich `<fraktion>` = Fraktionsname.
- `braucheGfx` für Spielsymbole, damit die Ausgabeprüfung fehlende Symbole meldet.

- [ ] **Step 1: Failing tests**
  - Projekt mit Baum für MRE und drei Fokussen:
    - A (0,0) mit Belohnung politische Macht 50
    - B (1,1) braucht A, Belohnung Geist Alpenfestung, verfügbar wenn Stabilität über 50 %
    - C (2,1) braucht A, schliesst B aus, Gebäude Zivilfabrik irgendwo
  - Die Datei parst streng.
  - `country.modifier.tag = MRE`, `add = 100`
  - A: `cost = 10`, `completion_reward` mit `add_political_power = 50`
  - B: `prerequisite = { focus = mein_reich_fokus_1 }`, `available.has_stability > 0.5`, `add_ideas = mein_reich_geist_1`
  - C: `mutually_exclusive = { focus = mein_reich_fokus_2 }`, `random_owned_controlled_state` mit `add_building_construction.type = industrial_complex`
  - B hat die Gegenrichtung `mutually_exclusive = { focus = mein_reich_fokus_3 }`.
  - `voraussetzungsArt 'eine'` mit zwei Voraussetzungen ergibt einen `prerequisite`-Block mit zwei `focus`; `'alle'` ergibt zwei Blöcke.
  - Eigenes Symbol: DDS 94×86, `.gfx` und `_shine.gfx` parsen streng, `icon = GFX_mein_reich_fokus_1`.
  - Die Sprachdatei enthält Fokusname und `_desc`.
  - `fehler` ist `[]`.
  - Ein unbekanntes Spielsymbol meldet `Bild fehlt`.
- [ ] **Step 2: Run** `npx vitest run tests/erzeuger/fokus.test.js`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** – `"Fokusbaeume erzeugen"`

---

### Task 5: Prüfregeln für Fokusbäume und Bausteine

**Files:** Modify `src/pruefung/regeln.js`, `src/ui/pruefung.jsx` (`zielAnsicht` für `bereich: 'fokus'`) · Test `tests/pruefung/regeln.test.js`

**Interfaces:** neue Regeln. Das Ziel ist `{ bereich: 'fokus', id: baumId, fokus?: fokusId }`.

| regel | Schwere | Bedingung |
|---|---|---|
| `baum-land` | fehler | Land des Baums fehlt im Spiel und im Projekt |
| `baum-doppelt` | fehler | zwei Bäume für dasselbe Land |
| `baum-leer` | hinweis | Baum ohne Fokusse |
| `fokus-name` | fehler | Fokus ohne Namen |
| `fokus-ueberlappung` | fehler | zwei Fokusse auf demselben Feld |
| `fokus-kreis` | fehler | `fokusZyklus` findet einen Kreis |
| `fokus-verweis` | fehler | Voraussetzung oder Ausschluss zeigt ins Leere |
| `fokus-symbol` | fehler | Spielsymbol nicht in `sd.sprites`, oder eigenes Bild fehlt |
| `baustein` | fehler | `pruefeBausteine` meldet etwas in `verfuegbar` oder `belohnung` (Text nennt Fokus und Baustein) |
| `fokus-ohne-belohnung` | hinweis | `belohnung` leer |
| `fokus-beschreibung` | hinweis | Beschreibung leer |

- [ ] **Step 1: Failing tests:**
  - Ein gültiges Projekt mit Baum ergibt keine neuen Meldungen.
  - Je Regel ein Fall.
  - **Review Focus 2:** Fokus löschen, auf den eine Bedingung «Fokus erledigt» zeigt, ergibt `baustein`.
  - **Review Focus 4:** eigener Code `x = {` sowie `x = "ä"` ergeben `baustein`.
  - **Review Focus 5:** Land MRE löschen, dessen Baum bleibt, ergibt `baum-land`.
- [ ] **Step 2: Run** `npx vitest run tests/pruefung`. Expected: FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** – `"Pruefregeln fuer Fokusbaeume"`

---

### Task 6: Oberfläche – Baumliste, Rastereditor, Fokus-Seitenleiste (ohne Baukasten)

**Files:** Create `src/ui/fokus/baeume.jsx`, `baum-editor.jsx`, `raster.jsx`, `fokus-seite.jsx`, `symbole.jsx` · Modify `src/ui/app.jsx`, `src/ui/stil.css`, `src/selbsttest/szenario.js`, `src/selbsttest/helfer.js`

**Interfaces:**
- Navigation `nav-fokus` («Fokusbäume»), Unteransicht `{ bereich: 'fokus', id: baumId, fokus?: fokusId }`
- Baumliste:
  - Kacheln `baum-<id>`
  - `neuer-baum` öffnet einen Dialog mit `baum-land` (Auswahl: Projektländer zuerst, dann Spielländer) und `baum-name`, Bestätigung über `baum-anlegen`
- Raster:
  - Zellen 110 × 130 px, Hintergrund im Spiel-Look
  - Fokuskarten `fokus-<id>` (Symbol, Name), ausgewählt mit Messingrahmen
  - Doppelklick auf eine leere Zelle `zelle-<x>-<y>` legt einen Fokus an
  - Ziehen einer Karte verschiebt sie (rastet ein; besetztes Feld wird abgelehnt)
  - Der Griff `griff-<id>` unten an der Karte, auf eine andere Karte gezogen, setzt eine Voraussetzung; mit Umschalttaste einen Ausschluss
  - SVG-Linien: Voraussetzung als goldene Linie mit Knick; «eine davon» gestrichelt; Ausschluss als rote Linie mit Symbol ⊘
  - Das Raster wächst mit: höchstes x + 3 und höchstes y + 3, mindestens 8 × 6.
- Seitenleiste für den gewählten Fokus:
  - `fokus-name`, `fokus-beschreibung`, `fokus-dauer` (Wochen, 1–100)
  - Symbol-Galerie `fokussymbol-<GFX>` mit Suche `fokussymbol-suche` (höchstens 300 Treffer), eigenes Bild `<BildZuschnitt test="fokusbild">`
  - Voraussetzungen als Häkchen `voraussetzung-<id>` plus `voraussetzungsart` (alle/eine)
  - Ausschluss als Häkchen `ausschluss-<id>`
  - `fokus-ki` (0–10), `fokus-loeschen`
- `helfer.zieheVon(testStart, testZiel, { shift })`: Pointer-Events vom Mittelpunkt des Start-Elements zum Mittelpunkt des Ziels

- [ ] **Step 1: Selbsttest-Schritte (failing)** nach «Schweiz Anführer»:
  - «Fokusbaum anlegen»: `nav-fokus`, `neuer-baum`, `waehle('baum-land', 'MRE')`, `tippe('baum-name', 'Weg zur Grösse')`, `baum-anlegen` → Editor sichtbar
  - «Fokusse anlegen»: Doppelklick auf `zelle-0-0`, `zelle-1-1`, `zelle-2-1`, je Name A/B/C über `fokus-name`; drei Karten vorhanden
  - «Verbinden»:
    - `zieheVon('griff-<A>', 'fokus-<B>')` → B hat Voraussetzung A
    - Häkchen `voraussetzung-<A>` bei C → C hat Voraussetzung A
    - `zieheVon('griff-<B>', 'fokus-<C>', { shift: true })` → beidseitiger Ausschluss
  - «Verschieben»: `zieheVon('fokus-<C>', 'zelle-3-1')` → C auf (3,1); auf `zelle-0-0` ziehen wird abgelehnt
  - «Symbol»: bei A `fokussymbol-GFX_goal_generic_army_doctrines` → Symbol gesetzt
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER bei «Fokusbaum anlegen».
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: OK.
- [ ] **Step 5: Commit** – `"Fokusbaum-Editor: Raster und Seitenleiste"`

---

### Task 7: Oberfläche – Baukasten für Belohnungen und Bedingungen

**Files:** Create `src/ui/bausteine/felder.jsx`, `wirkungen.jsx`, `bedingungen.jsx` · Modify `src/ui/fokus/fokus-seite.jsx`, `src/selbsttest/szenario.js`

**Interfaces:**
- `<WirkungenEditor liste onAendere kontext test />`:
  - Zeilen `<test>-<i>`, Art-Auswahl `<test>-art-<i>` (nach Gruppen), Felder `<test>-<i>-<feld>`, `<test>-entfernen-<i>`, `<test>-neu`
  - Bei `bei_land` ein eingerückter `<WirkungenEditor test="<test>-<i>-innen">`
  - Unter jeder Zeile der Satz in Klartext (`satzText`); Fehler aus `pruefeBausteine` direkt am Baustein
- `<BedingungenEditor block onAendere kontext test />`: wie oben, dazu `<test>-modus` (alle/eine) und Häkchen `<test>-nicht-<i>`
- Feld-Widgets:

| Typ | Widget |
|---|---|
| zahl, prozent | Zahl mit Einheit |
| land | Auswahl: Projektländer, dann Spielländer nach Name |
| staat | Suchfeld wie `Staatsuche`, zeigt den gewählten Namen |
| geist | Auswahl aus dem Projekt |
| fokus | Auswahl aller Fokusse im Projekt |
| ideologie, kategorie, auswahl | Auswahl |
| merker, text | Text |
| datum | drei Zahlen Jahr/Monat/Tag, 1936–1950 |
| code | mehrzeilig, Monospace |

- In der Fokus-Seite: «Verfügbar wenn» (`test="verfuegbar"`) und «Belohnungen» (`test="belohnung"`)

- [ ] **Step 1: Selbsttest-Schritte (failing):**
  - «Belohnungen»:
    - bei A `belohnung-neu`, `waehle('belohnung-art-0', 'politische_macht')`, `tippe('belohnung-0-menge', '50')`
    - bei B `belohnung-neu`, Art `geist_hinzu`, `waehle('belohnung-0-geist', <Alpenfestung-ID>)`
    - bei C Art `gebaeude`, Typ `industrial_complex`, Ort `irgendwo`
  - «Bedingungen»: bei B `verfuegbar-neu`, Art `stabilitaet`, Vergleich `>`, `tippe('verfuegbar-0-prozent', '50')`. Der Klartextsatz enthält «Stabilität über 50 %».
- [ ] **Step 2: Run** `npm run selbsttest`. Expected: FEHLER.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Run.** Expected: OK.
- [ ] **Step 5: Commit** – `"Baukasten in der Oberflaeche"`

---

### Task 8: Durchgang bis zur gespeicherten Mod, Anleitung

**Files:** Modify `src/selbsttest/szenario.js`, `README.md`, `src/ui/pruefung.jsx`

- [ ] **Step 1: Selbsttest-Schritte (failing).** Die Schritte für Prüfung, Speichern und ZIP aus Etappe 1 laufen nach den Fokus-Schritten. Zusätzlich:
  - Der Fake-Ordner enthält `mod/selbsttest_reich/common/national_focus/selbsttest_reich_selbsttest_reich_baum_1.txt`. Die Datei parst streng und enthält `add_political_power = 50` und `mutually_exclusive`.
  - Ein Klick auf eine Fokus-Meldung in der Prüfung springt in den Baum-Editor mit dem gewählten Fokus.
- [ ] **Step 2: Run.** Expected: FEHLER, bis die Reihenfolge und die Sprungziele stimmen.
- [ ] **Step 3: Implementieren.** README um den Abschnitt Fokusbäume ergänzen: Was der Editor kann; dass der eigene Baum den Spielbaum des Landes ersetzt; dass «Event auslösen» mit Etappe 3 kommt.
- [ ] **Step 4: Run** `npx vitest run && npm run selbsttest`. Expected: alles grün.
- [ ] **Step 5: Commit** – `"Etappe 2: Durchgang und Anleitung"`
