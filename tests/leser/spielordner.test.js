import { test, expect } from 'vitest'
import { erstelleMiniSpielordner } from '../../src/selbsttest/mini-spielordner.js'
import { dateiquelleAusObjekt } from '../../src/leser/dateiquelle.js'
import { leseSpielordner, SpielordnerFehler, LESER_VERSION } from '../../src/leser/spielordner.js'

const fortschritte = []
const ergebnis = await leseSpielordner(dateiquelleAusObjekt(erstelleMiniSpielordner()), { fortschritt: (a) => fortschritte.push(a) })
const sd = ergebnis.spieldaten

test('Version und Laender', () => {
  expect(sd.leserVersion).toBe(LESER_VERSION)
  expect([sd.version, sd.supportedVersion]).toEqual(['1.15.4', '1.15.*'])
  expect(Object.keys(sd.laender).sort()).toEqual(['FRA', 'GER', 'SWI'])
  expect(sd.laender.GER).toMatchObject({ name: 'Deutschland', adjektiv: 'deutsch', farbe: [75, 75, 75], grafikstil: 'western_european_gfx',
    grafikstil2d: 'western_european_2d', hauptstadt: 1, regierung: 'fascism', anfuehrer: 'GER_adolf_hitler',
    verlaufDatei: 'history/countries/GER - Germany.txt', landDatei: 'common/countries/Germany.txt' })
  expect(sd.laender.SWI).toMatchObject({ name: 'Schweiz', nameDef: 'die Schweiz', anfuehrer: 'SWI_giuseppe_motta', regierung: 'democratic' })
  expect(sd.laender.FRA.anfuehrer).toBeNull()
  expect(sd.laender.GER.flaggen.sort()).toEqual(['GER', 'GER_fascism'])
  expect(sd.laender.GER.namensVarianten.sort()).toEqual(['GER_fascism', 'GER_fascism_ADJ', 'GER_fascism_DEF'])
})

test('Staaten inklusive Rueckfall auf Englisch und kaputter Datei', () => {
  expect(sd.staaten[6]).toMatchObject({ name: 'Alsace', besitzer: 'FRA', kerne: ['FRA', 'GER'], provinzen: [7] })
  expect(sd.staaten[4].name).toBe('Zürich')
  expect(sd.staaten[1]).toMatchObject({ kategorie: 'city', manpower: 2500000, datei: 'history/states/1-Brandenburg.txt' })
  expect(sd.staaten[99]).toBeUndefined()
  expect(ergebnis.warnungen.some(w => w.includes('99-Kaputt.txt'))).toBe(true)
})

test('Ideologien und Charaktere', () => {
  expect(sd.ideologien.map(i => i.id)).toEqual(['democratic', 'communism', 'fascism', 'neutrality'])
  expect(sd.ideologien[3]).toEqual({ id: 'neutrality', name: 'Blockfrei', unter: [{ id: 'despotism', name: 'Despotismus' }, { id: 'oligarchism', name: 'Oligarchie' }] })
  expect(sd.charaktere.SWI_giuseppe_motta).toMatchObject({ name: 'Giuseppe Motta', ideologie: 'conservatism' })
  expect(sd.charaktere.GER_adolf_hitler.portraet).toBe('gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds')
})

test('Provinzen, Bilder und Groessen', () => {
  expect(sd.provinzArten[8]).toBe('sea')
  expect(sd.provinzArten[1]).toBe('land')
  expect(sd.sprites.GFX_idea_generic_army).toBe('gfx/interface/ideas/idea_generic_army.dds')
  expect(sd.ideenBilder).toEqual(['GFX_idea_generic_army', 'GFX_idea_generic_industry'])
  expect(sd.portraets).toEqual(['gfx/leaders/Europe/portrait_europe_generic_1.dds', 'gfx/leaders/Europe/portrait_europe_generic_2.dds'])
  expect(sd.bildgroessen).toEqual({ flagge: [82, 52], idee: [64, 64], portraet: [156, 210], fokus: [94, 86], event: [210, 176], entscheidung: [32, 32], kategorie: [32, 32] })
  expect(ergebnis.bilder.get('flagge:SWI')).toMatchObject({ breite: 82, hoehe: 52 })
  expect(ergebnis.bilder.get('idee:GFX_idea_generic_army')).toMatchObject({ breite: 64, hoehe: 64 })
  expect(ergebnis.bilder.get('portraet:gfx/leaders/Europe/portrait_europe_generic_1.dds')).toMatchObject({ breite: 156 })
})

test('Originaltexte, Karte, Serialisierbarkeit, Fortschritt', () => {
  expect(sd.originaltexte['history/states/1-Brandenburg.txt']).toContain('owner = GER')
  expect(sd.originaltexte['history/countries/GER - Germany.txt']).toContain('recruit_character')
  expect(sd.originaltexte['common/countries/colors.txt']).toContain('SWI')
  expect(ergebnis.karte.staatIds.length).toBe(7)
  expect(JSON.parse(JSON.stringify(sd))).toEqual(sd)
  expect(fortschritte.length).toBeGreaterThanOrEqual(5)
  for (let i = 1; i < fortschritte.length; i++) expect(fortschritte[i]).toBeGreaterThanOrEqual(fortschritte[i - 1])
  expect(fortschritte.at(-1)).toBe(1)
})

test('falscher Ordner gibt verstaendliche Meldung', async () => {
  await expect(leseSpielordner(dateiquelleAusObjekt({ 'readme.txt': 'x' }))).rejects.toThrow(SpielordnerFehler)
  await expect(leseSpielordner(dateiquelleAusObjekt({ 'launcher-settings.json': '{}' }))).rejects.toThrow(/^Das ist nicht der Hearts-of-Iron-IV-Spielordner\./)
})

test('gfx-Schluessel und Texturpfade ohne Ruecksicht auf Gross-/Kleinschreibung (Review C1)', async () => {
  const o = erstelleMiniSpielordner()
  o['interface/ideas.gfx'] = o['interface/ideas.gfx'].replace(/spriteType =/g, 'SpriteType =').replace(/texturefile/g, 'textureFile').replace('idea_generic_army.dds', 'IDEA_Generic_Army.dds')
  o['interface/leaders.gfx'] = o['interface/leaders.gfx'].replace('spriteTypes', 'SpriteTypes').replace('spriteType =', 'SpriteType =')
  const { spieldaten } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(spieldaten.ideenBilder).toEqual(['GFX_idea_generic_army', 'GFX_idea_generic_industry'])
  expect(spieldaten.charaktere.GER_adolf_hitler.portraet).toBe('gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds')
})

test('Flaggen: Ideologie-Variante, Kleinschreibung, DDS und Bericht', async () => {
  const { schreibeDds, schreibeTga } = await import('../../src/erzeuger/bilder.js')
  const einfarbig = (b, h, [r, g, bl]) => { const x = new Uint8ClampedArray(b * h * 4); for (let i = 0; i < b * h; i++) x.set([r, g, bl, 255], i * 4); return x }
  const o = erstelleMiniSpielordner()
  delete o['gfx/flags/FRA.tga']
  o['gfx/flags/FRA_democratic.dds'] = schreibeDds(einfarbig(82, 52, [1, 2, 3]), 82, 52)
  delete o['gfx/flags/SWI.tga']
  o['gfx/flags/swi.tga'] = schreibeTga(einfarbig(82, 52, [200, 30, 30]), 82, 52)
  o['common/country_tags/00_countries.txt'] += 'ITA = "countries/Italy.txt"\n'
  o['common/countries/Italy.txt'] = 'color = { 0 128 0 }\n'
  const { spieldaten: sd, bilder } = await leseSpielordner(dateiquelleAusObjekt(o))
  // Deutschland wird faschistisch regiert: Vorschau aus GER_fascism (20,20,20)
  expect([...bilder.get('flagge:GER').rgba.slice(0, 3)]).toEqual([20, 20, 20])
  expect([...bilder.get('flagge:FRA').rgba.slice(0, 3)]).toEqual([1, 2, 3])
  expect(bilder.get('flagge:SWI')).toBeTruthy()
  expect(sd.laender.FRA.flaggen).toEqual(['FRA_democratic'])
  expect(sd.laender.SWI.flaggen).toEqual(['swi'])
  expect(sd.bericht.flaggen).toMatchObject({ dateien: 4, gelesen: 3, ohneFlagge: ['ITA'], fehler: [] })
  expect(sd.bericht).toMatchObject({ laender: 4, staaten: 6 })
  expect(sd.bericht.warnungen.length).toBeGreaterThan(0)
})

test('Flaggen-Bericht nennt unlesbare Dateien mit Grund', async () => {
  const o = erstelleMiniSpielordner()
  o['gfx/flags/FRA.tga'] = Uint8Array.from([0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 8, 0, 0])
  const { spieldaten: sd } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(sd.bericht.flaggen.fehler).toEqual([{ datei: 'gfx/flags/FRA.tga', grund: 'TGA-Typ 1 wird nicht unterstuetzt' }])
  expect(sd.bericht.flaggen.ohneFlagge).toEqual(['FRA'])
})

test('Fokus-Symbole und Technologie-Kategorien (Etappe 2)', () => {
  expect(LESER_VERSION).toBeGreaterThanOrEqual(3)
  expect(sd.fokusSymbole).toEqual(['GFX_goal_generic_army_doctrines', 'GFX_goal_generic_construct_civ_factory', 'GFX_goal_kaputt'])
  expect(ergebnis.bilder.get('fokus:GFX_goal_generic_construct_civ_factory')).toMatchObject({ breite: 94, hoehe: 86 })
  expect(ergebnis.bilder.has('fokus:GFX_goal_kaputt')).toBe(false)
  expect(sd.technologieKategorien).toEqual([{ id: 'industry', name: 'Industrie' }, { id: 'electronics', name: 'Elektronik' }, { id: 'land_doctrine', name: 'Heeresdoktrin' }])
  expect(sd.bildgroessen.fokus).toEqual([94, 86])
  expect(sd.bericht).toMatchObject({ fokusSymbole: 3, fokusSymboleGelesen: 2 })
})

test('Technologie-Kategorien: Rueckfall ohne Datei', async () => {
  const o = erstelleMiniSpielordner()
  delete o['common/technology_tags/00_technology.txt']
  const { spieldaten } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(spieldaten.technologieKategorien.map(k => k.id)).toEqual(['industry', 'electronics', 'infantry_weapons', 'artillery', 'armor', 'land_doctrine', 'naval_doctrine', 'air_doctrine', 'naval_equipment', 'air_equipment'])
})

test('Fokus-Symbole aus allen goals-Dateien, ohne Rahmen-Sprites (Review I1)', async () => {
  const { schreibeDds } = await import('../../src/erzeuger/bilder.js')
  const o = erstelleMiniSpielordner()
  o['interface/goals.gfx'] = o['interface/goals.gfx'].replace(/\}\s*$/, '\tSpriteType = {\n\t\tname = "GFX_focus_swi_alpen"\n\t\ttexturefile = "gfx/interface/goals/focus_swi_alpen.dds"\n\t}\n}\n')
  o['gfx/interface/goals/focus_swi_alpen.dds'] = schreibeDds(new Uint8ClampedArray(94 * 86 * 4).fill(200), 94, 86)
  o['interface/nationalfocusview.gfx'] = 'spriteTypes = {\n\tspriteType = {\n\t\tname = "GFX_focus_frame"\n\t\ttexturefile = "gfx/interface/focus_frame.dds"\n\t}\n}\n'
  const { spieldaten } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(spieldaten.fokusSymbole).toContain('GFX_focus_swi_alpen')
  expect(spieldaten.fokusSymbole).not.toContain('GFX_focus_frame')
  expect(spieldaten.fokusSymbole.some(n => n.endsWith('_shine'))).toBe(false)
})

test('Etappe 2b: Modifikatoren, Spielgeister, Eigenschaften, Autonomie, Marionetten, Fraktion', () => {
  expect(LESER_VERSION).toBeGreaterThanOrEqual(4)
  expect(sd.modifikatoren.find(m => m.id === 'consumer_goods_factor')).toEqual({ id: 'consumer_goods_factor', name: 'Konsumgüter', prozent: true })
  expect(sd.modifikatoren.find(m => m.id === 'industrial_capacity_factory')).toMatchObject({ prozent: true, name: 'industrial_capacity_factory' })
  expect(sd.modifikatoren.find(m => m.id === 'stability_factor').name).toBe('Stabilität')
  expect(sd.spielGeister.map(g => g.id)).toEqual(['deutsche_industrie', 'schweizer_neutralitaet'])
  expect(sd.spielGeister.find(g => g.id === 'schweizer_neutralitaet')).toEqual({ id: 'schweizer_neutralitaet', name: 'Schweizer Neutralität',
    beschreibung: 'Wir bleiben draussen.', sprite: 'GFX_idea_generic_army', land: 'SWI',
    boni: [{ modifier: 'consumer_goods_factor', wert: -0.05 }, { modifier: 'stability_factor', wert: 0.1 }], nichtUebernommen: ['research_bonus'] })
  expect(sd.spielGeister.find(g => g.id === 'deutsche_industrie')).toMatchObject({ sprite: 'GFX_idea_deutsche_industrie', land: null, beschreibung: '' })
  expect(sd.anfuehrerEigenschaften.find(e => e.id === 'popular_figurehead')).toEqual({ id: 'popular_figurehead', name: 'Volksheld',
    boni: [{ modifier: 'stability_factor', wert: 0.15 }, { modifier: 'political_power_factor', wert: -0.1 }] })
  expect(sd.anfuehrerEigenschaften.map(e => e.id).sort()).toEqual(['popular_figurehead', 'war_monger'])
  expect(sd.autonomieStufen).toEqual([{ id: 'autonomy_dominion', name: 'Dominion' }, { id: 'autonomy_puppet', name: 'Marionette' }])
  expect(sd.laender.FRA.marionetten).toEqual([{ tag: 'SWI', autonomie: 'autonomy_dominion' }])
  expect(sd.laender.GER).toMatchObject({ marionetten: [], fraktion: 'axis_faction' })
  expect(sd.laender.SWI.fraktion).toBeNull()
  expect(sd.bericht).toMatchObject({ spielGeister: 2, eigenschaften: 2 })
})

test('Autonomiestufen: Rueckfall ohne Dateien', async () => {
  const o = erstelleMiniSpielordner()
  for (const k of Object.keys(o)) if (k.startsWith('common/autonomous_states/')) delete o[k]
  const { spieldaten } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(spieldaten.autonomieStufen.map(a => a.id)).toEqual(['autonomy_dominion', 'autonomy_colony', 'autonomy_puppet', 'autonomy_integrated_puppet'])
})

test('Marionetten in if/else und in Blockform werden gelesen (Review I4)', async () => {
  const o = erstelleMiniSpielordner()
  o['history/countries/GER - Germany.txt'] += 'if = {\n\tlimit = { has_dlc = "Together for Victory" }\n\tset_autonomy = { target = FRA autonomous_state = autonomy_dominion }\n}\nelse = {\n\tpuppet = FRA\n}\n'
  o['history/countries/SWI - Switzerland.txt'] += 'puppet = { target = GER }\n'
  const { spieldaten } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(spieldaten.laender.GER.marionetten).toEqual([{ tag: 'FRA', autonomie: 'autonomy_dominion', bedingt: true }])
  expect(spieldaten.laender.SWI.marionetten).toEqual([{ tag: 'GER', autonomie: 'autonomy_puppet' }])
})

test('Etappe 3: Eventbilder, Entscheidungssymbole, Kategorien', () => {
  expect(LESER_VERSION).toBeGreaterThanOrEqual(5)
  expect(sd.eventBilder).toEqual(['GFX_report_event_generic_rally', 'GFX_report_event_soldiers_marching'])
  expect(sd.entscheidungsSymbole).toEqual(['GFX_decision_generic_industry'])
  expect(sd.kategorieSymbole).toEqual(['GFX_decision_category_generic_political_actions'])
  expect(sd.entscheidungsKategorien).toEqual([
    { id: 'political_actions', name: 'Politische Massnahmen', sprite: 'GFX_decision_category_generic_political_actions' },
    { id: 'economy_decisions', name: 'Wirtschaft', sprite: 'GFX_decision_category_generic_political_actions' },
  ])
  expect(sd.bildgroessen).toMatchObject({ event: [210, 176], entscheidung: [32, 32], kategorie: [32, 32] })
  expect(ergebnis.bilder.has('event:GFX_report_event_generic_rally')).toBe(true)
  expect(ergebnis.bilder.has('entscheidung:GFX_decision_generic_industry')).toBe(true)
  expect(ergebnis.bilder.has('kategorie:GFX_decision_category_generic_political_actions')).toBe(true)
  expect(sd.bericht).toMatchObject({ eventBilder: 2, entscheidungsSymbole: 1, entscheidungsKategorien: 2 })
})

test('Etappe 3: Kategorie ohne icon und Rueckfall-Groessen', async () => {
  const o = erstelleMiniSpielordner()
  for (const k of Object.keys(o)) if (k.startsWith('gfx/event_pictures/') || k.startsWith('gfx/interface/decisions/')) delete o[k]
  o['common/decisions/categories/01_mehr.txt'] = 'ohne_symbol = {\n\tpriority = 5\n}\n'
  const { spieldaten } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(spieldaten.entscheidungsKategorien.find(k => k.id === 'ohne_symbol')).toEqual({ id: 'ohne_symbol', name: 'ohne_symbol', sprite: null })
  expect(spieldaten.eventBilder).toHaveLength(2)
  expect(spieldaten.bildgroessen).toMatchObject({ event: [210, 176], entscheidung: [32, 32], kategorie: [32, 32] })
})

test('Etappe 4b: Gebaeude, Ressourcen, Kategorien, Kueste, Werte pro Staat', () => {
  expect(LESER_VERSION).toBeGreaterThanOrEqual(6)
  expect(sd.gebaeudeArten.slice(0, 3).map(g => g.id)).toEqual(['arms_factory', 'dockyard', 'industrial_complex'])
  expect(sd.gebaeudeArten.find(g => g.id === 'naval_base')).toEqual({ id: 'naval_base', name: 'Marinestützpunkt', maxStufe: 10, provinz: true, kueste: true, gemeinsamerPlatz: false })
  expect(sd.gebaeudeArten.find(g => g.id === 'industrial_complex')).toMatchObject({ name: 'Zivilfabrik', maxStufe: 15, gemeinsamerPlatz: true, provinz: false })
  expect(sd.ressourcenArten).toEqual([{ id: 'oil', name: 'Öl' }, { id: 'steel', name: 'Stahl' }])
  expect(sd.staatsKategorien.map(k => [k.id, k.bauplaetze])).toEqual([['town', 4], ['large_town', 5], ['city', 6], ['megalopolis', 12]])
  expect(sd.staatsKategorien.find(k => k.id === 'city').name).toBe('Stadt')
  expect(sd.provinzKueste).toEqual({ 4: true, 8: true })
  expect(sd.staaten[1]).toMatchObject({ nameSchluessel: 'STATE_1', gebaeude: { infrastructure: 4, industrial_complex: 3 },
    provinzGebaeude: { 1: { bunker: 2 } }, ressourcen: { steel: 12 }, siegpunkte: { 1: 20 } })
  expect(sd.staaten[3]).toMatchObject({ gebaeude: {}, provinzGebaeude: {}, ressourcen: {}, siegpunkte: {} })
  expect(sd.siegpunktNamen).toEqual({ 1: 'Berlin' })
  expect(sd.bericht).toMatchObject({ gebaeudeArten: 6, ressourcenArten: 2, staatsKategorien: 4 })
  // Review: Format seit 1.12 mit level_cap und only_costal
  expect(sd.gebaeudeArten.find(g => g.id === 'infrastructure')).toMatchObject({ maxStufe: 5, provinz: false, gemeinsamerPlatz: false })
  expect(sd.gebaeudeArten.find(g => g.id === 'dockyard')).toMatchObject({ name: 'Werft', maxStufe: 15, provinz: false, kueste: true, gemeinsamerPlatz: true })
  expect(sd.gebaeudeArten.find(g => g.id === 'bunker')).toMatchObject({ maxStufe: 10, provinz: true, kueste: false })
  // Review: Sondergebaeude wie Eisenbahnen kommen nicht in die Liste
  expect(sd.gebaeudeArten.some(g => g.id === 'rail_way')).toBe(false)
  // Review: zusaetzliche Bauplaetze aus dem Spiel
  expect(sd.staaten[6].extraBauplaetze).toBe(1)
  expect(sd.staaten[3].extraBauplaetze).toBe(0)
})

test('Etappe 4b: Rueckfall-Listen ohne Dateien', async () => {
  const o = erstelleMiniSpielordner()
  for (const k of Object.keys(o)) if (/^common\/(buildings|resources|state_category)\//.test(k)) delete o[k]
  const { spieldaten: ohne } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(ohne.gebaeudeArten.map(g => g.id)).toEqual(expect.arrayContaining(['industrial_complex', 'arms_factory', 'dockyard', 'infrastructure', 'air_base', 'anti_air_building', 'radar_station', 'naval_base', 'bunker', 'coastal_bunker']))
  expect(ohne.gebaeudeArten.find(g => g.id === 'dockyard')).toMatchObject({ gemeinsamerPlatz: true, maxStufe: 15 })
  expect(ohne.ressourcenArten.map(r => r.id)).toEqual(['oil', 'aluminium', 'rubber', 'tungsten', 'steel', 'chromium'])
  expect(ohne.ressourcenArten.find(r => r.id === 'rubber').name).toBe('Gummi')
  expect(ohne.staatsKategorien.find(k => k.id === 'megalopolis').bauplaetze).toBe(12)
})

test('Review: altes Gebaeude-Format (max_level, provincial, only_coastal) bleibt lesbar', async () => {
  const o = erstelleMiniSpielordner()
  o['common/buildings/00_buildings.txt'] = 'buildings = {\n\tnaval_base = {\n\t\tmax_level = 10\n\t\tprovincial = yes\n\t\tonly_coastal = yes\n\t}\n\tarms_factory = {\n\t\tmax_level = 20\n\t\tshares_slots = yes\n\t}\n}\n'
  const { spieldaten } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(spieldaten.gebaeudeArten.find(g => g.id === 'naval_base')).toMatchObject({ maxStufe: 10, provinz: true, kueste: true })
  expect(spieldaten.gebaeudeArten.find(g => g.id === 'arms_factory')).toMatchObject({ maxStufe: 20, gemeinsamerPlatz: true })
})

test('Etappe 4c: Technologien, Bereiche, Forschung pro Land', () => {
  expect(LESER_VERSION).toBeGreaterThanOrEqual(7)
  expect(sd.technologieBereiche).toEqual([{ id: 'infantry_folder', name: 'Infanterie' }, { id: 'support_folder', name: 'Unterstützung' },
    { id: 'industry_folder', name: 'Industrie' }, { id: 'land_doctrine_folder', name: 'Heeresdoktrin' }])
  expect(sd.technologien.map(t => t.id)).toEqual(['infantry_weapons', 'infantry_weapons1', 'infantry_weapons2', 'tech_support', 'basic_machine_tools', 'improved_machine_tools', 'grand_battle_plan'])
  expect(sd.technologien.find(t => t.id === 'infantry_weapons1')).toEqual({ id: 'infantry_weapons1', name: 'Infanteriewaffen I', bereich: 'infantry_folder', jahr: 1936, voraussetzungen: ['infantry_weapons'], doktrin: false })
  expect(sd.technologien.find(t => t.id === 'improved_machine_tools')).toMatchObject({ voraussetzungen: ['basic_machine_tools'], jahr: 1940 })
  expect(sd.technologien.find(t => t.id === 'grand_battle_plan')).toMatchObject({ doktrin: true, voraussetzungen: [] })
  expect(sd.laender.GER.forschung).toEqual(['infantry_weapons', 'infantry_weapons1', 'tech_support'])
  expect(sd.laender.SWI.forschung).toEqual(['infantry_weapons', 'tech_support'])
  expect(sd.laender.FRA.forschung).toEqual([])
  expect(sd.bericht.technologien).toBe(7)
})

test('Review: Technologie ohne start_year hat kein Jahr und faellt nicht in die Jahres-Schnellwahl', async () => {
  const o = erstelleMiniSpielordner()
  o['common/technologies/industry.txt'] = 'technologies = {\n\t@1936 = 2\n\tconcentrated_industry = {\n\t\tresearch_cost = 2\n\t\tfolder = { name = industry_folder position = { x = 0 y = @1936 } }\n\t}\n}\n'
  const { spieldaten } = await leseSpielordner(dateiquelleAusObjekt(o))
  expect(spieldaten.technologien.find(t => t.id === 'concentrated_industry').jahr).toBeNull()
  const { schnellwahl } = await import('../../src/projekt/forschung.js')
  expect(schnellwahl(spieldaten, 'jahr', 1950)).not.toContain('concentrated_industry')
})

test('Etappe 4d: Eigenschaften fuer Heer- und Flottenfuehrer', () => {
  expect(LESER_VERSION).toBe(8)
  expect(sd.fuehrerEigenschaften).toEqual([
    { id: 'offensive_doctrine', name: 'offensive_doctrine', rollen: ['general', 'feldmarschall'] },
    { id: 'panzer_leader', name: 'Panzerexperte', rollen: ['general'] },
    { id: 'seawolf', name: 'Seewolf', rollen: ['admiral'] },
  ])
  expect(sd.bericht.fuehrerEigenschaften).toBe(3)
})
