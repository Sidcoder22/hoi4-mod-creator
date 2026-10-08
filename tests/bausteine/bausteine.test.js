import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { WIRKUNGEN } from '../../src/bausteine/wirkungen.js'
import { BEDINGUNGEN } from '../../src/bausteine/bedingungen.js'
import { erzeugeWirkungen, erzeugeBedingungen, pruefeBausteine, satzText, neueWirkung, neueBedingung } from '../../src/bausteine/erzeugen.js'
import { schreibeParadox } from '../../src/leser/paradox.js'
import { fuegeBaumHinzu, fuegeFokusHinzu, aendereFokus } from '../../src/projekt/fokus.js'

const sd = await miniSpieldaten()
let projekt = testprojekt(sd)
let baum, fokusId
;[projekt, baum] = fuegeBaumHinzu(projekt, 'MRE', 'Baum')
;[projekt, fokusId] = fuegeFokusHinzu(projekt, sd, baum, 0, 0)
projekt = aendereFokus(projekt, baum, fokusId, { name: 'Aufbruch' })
const geistId = projekt.ideen[0].id
const kontext = { projekt, spieldaten: sd }
const gesetzt = []
const k = {
  kennung: { geist: () => 'm_geist_1', fokus: () => 'm_fokus_1', merker: (t) => `m_${t.toLowerCase()}`, fraktion: () => 'm_fraktion_x' },
  sprache: { setze: (a, b) => gesetzt.push([a, b]) },
  quelle: 'm_fokus_1',
}
const text = (eintraege) => schreibeParadox(eintraege)
const w = (art, werte = {}) => { const b = neueWirkung(art); return { ...b, werte: { ...b.werte, ...werte } } }
const b = (art, werte = {}) => { const x = neueBedingung(art); return { ...x, werte: { ...x.werte, ...werte } } }

const WIRKUNGS_FAELLE = [
  ['politische_macht', { menge: 50 }, 'add_political_power = 50\n'],
  ['stabilitaet', { prozent: 5 }, 'add_stability = 0.05\n'],
  ['kriegsunterstuetzung', { prozent: -10 }, 'add_war_support = -0.1\n'],
  ['rekruten', { menge: 10000 }, 'add_manpower = 10000\n'],
  ['forschungsplatz', {}, 'add_research_slot = 1\n'],
  ['forschungsbonus', { prozent: 50, anzahl: 2, kategorie: 'industry' }, 'add_tech_bonus = {\n\tname = m_fokus_1\n\tbonus = 0.5\n\tuses = 2\n\tcategory = industry\n}\n'],
  ['erfahrung', { teilstreitkraft: 'navy_experience', menge: 25 }, 'navy_experience = 25\n'],
  ['geist_hinzu', { geist: geistId }, 'add_ideas = m_geist_1\n'],
  ['geist_weg', { geist: geistId }, 'remove_ideas = m_geist_1\n'],
  ['gebaeude', { gebaeude: 'industrial_complex', anzahl: 2, wo: 'staat', staat: 1 },
    '1 = {\n\tadd_extra_state_shared_building_slots = 2\n\tadd_building_construction = {\n\t\ttype = industrial_complex\n\t\tlevel = 2\n\t\tinstant_build = yes\n\t}\n}\n'],
  ['gebaeude', { gebaeude: 'dockyard', anzahl: 1, wo: 'irgendwo' },
    'random_owned_controlled_state = {\n\tlimit = {\n\t\tis_coastal = yes\n\t}\n\tadd_extra_state_shared_building_slots = 1\n\tadd_building_construction = {\n\t\ttype = dockyard\n\t\tlevel = 1\n\t\tinstant_build = yes\n\t}\n}\n'],
  ['gebaeude', { gebaeude: 'infrastructure', anzahl: 2, wo: 'irgendwo' },
    'random_owned_controlled_state = {\n\tlimit = {\n\t\tfree_building_slots = {\n\t\t\tbuilding = infrastructure\n\t\t\tsize > 1\n\t\t\tinclude_locked = yes\n\t\t}\n\t}\n\tadd_building_construction = {\n\t\ttype = infrastructure\n\t\tlevel = 2\n\t\tinstant_build = yes\n\t}\n}\n'],
  ['gebaeude', { gebaeude: 'air_base', anzahl: 1, wo: 'irgendwo' },
    'random_owned_controlled_state = {\n\tlimit = {\n\t\tfree_building_slots = {\n\t\t\tbuilding = air_base\n\t\t\tsize > 0\n\t\t\tinclude_locked = yes\n\t\t}\n\t}\n\tadd_building_construction = {\n\t\ttype = air_base\n\t\tlevel = 1\n\t\tinstant_build = yes\n\t}\n}\n'],
  ['staat_bekommen', { staat: 3 }, 'transfer_state = 3\n'],
  ['kern', { staat: 3 }, 'add_state_core = 3\n'],
  ['beliebtheit', { ideologie: 'fascism', prozent: 10 }, 'add_popularity = {\n\tideology = fascism\n\tpopularity = 0.1\n}\n'],
  ['regierung', { ideologie: 'communism', wahlen: 'no' }, 'set_politics = {\n\truling_party = communism\n\telections_allowed = no\n}\n'],
  ['krieg', { land: 'GER' }, 'declare_war_on = {\n\ttarget = GER\n\ttype = annex_everything\n}\n'],
  ['kriegsziel', { land: 'GER' }, 'create_wargoal = {\n\ttype = annex_everything\n\ttarget = GER\n}\n'],
  ['garantie', { land: 'SWI' }, 'give_guarantee = SWI\n'],
  ['nichtangriffspakt', { land: 'FRA' }, 'diplomatic_relation = {\n\tcountry = FRA\n\trelation = non_aggression_pact\n\tactive = yes\n}\n'],
  ['fraktion_gruenden', { name: 'Alpenbund' }, 'create_faction = m_fraktion_x\n'],
  ['fraktion_beitreten', { land: 'GER' }, 'GER = {\n\tadd_to_faction = ROOT\n}\n'],
  ['annektieren', { land: 'SWI' }, 'annex_country = {\n\ttarget = SWI\n\ttransfer_troops = yes\n}\n'],
  ['marionette', { land: 'SWI' }, 'puppet = SWI\n'],
  ['ausruestung', { ausruestung: 'infantry_equipment_1', menge: 1000 }, 'add_equipment_to_stockpile = {\n\ttype = infantry_equipment_1\n\tamount = 1000\n\tproducer = ROOT\n}\n'],
  ['merker_setzen', { merker: 'Armee' }, 'set_country_flag = m_armee\n'],
  ['merker_weg', { merker: 'Armee' }, 'clr_country_flag = m_armee\n'],
  ['code', { code: 'add_command_power = 10' }, 'add_command_power = 10\n'],
]

test('jede Wirkung hat einen Fall und keine Event-Wirkung', () => {
  const arten = new Set(WIRKUNGS_FAELLE.map(f => f[0]))
  arten.add('bei_land')
  expect(WIRKUNGEN.map(d => d.art).filter(a => !arten.has(a))).toEqual([])
  expect(WIRKUNGEN.some(d => d.art === 'event')).toBe(false)
})

for (const [art, werte, erwartet] of WIRKUNGS_FAELLE) {
  test(`Wirkung ${art} ${JSON.stringify(werte)}`, () => {
    expect(text(erzeugeWirkungen([w(art, werte)], k))).toBe(erwartet)
    expect(pruefeBausteine([w(art, werte)], kontext, 'Fokus A')).toEqual([])
  })
}

test('Fraktionsname kommt in die Sprachdatei', () => {
  gesetzt.length = 0
  erzeugeWirkungen([w('fraktion_gruenden', { name: 'Alpenbund' })], k)
  expect(gesetzt).toEqual([['m_fraktion_x', 'Alpenbund']])
})

test('verschachtelt: bei Land ausfuehren', () => {
  const aussen = { ...w('bei_land', { land: 'GER' }), wirkungen: [w('politische_macht', { menge: 50 })] }
  expect(text(erzeugeWirkungen([aussen], k))).toBe('GER = {\n\tadd_political_power = 50\n}\n')
  const kaputt = { ...w('bei_land', { land: 'GER' }), wirkungen: [w('staat_bekommen', { staat: 999 })] }
  expect(pruefeBausteine([kaputt], kontext, 'A').length).toBe(1)
})

const BEDINGUNGS_FAELLE = [
  ['ist_land', { land: 'GER' }, 'tag = GER\n'],
  ['im_krieg', {}, 'has_war = yes\n'],
  ['krieg_mit', { land: 'FRA' }, 'has_war_with = FRA\n'],
  ['stabilitaet', { vergleich: '>', prozent: 50 }, 'has_stability > 0.5\n'],
  ['kriegsunterstuetzung', { vergleich: '<', prozent: 20 }, 'has_war_support < 0.2\n'],
  ['politische_macht', { vergleich: '>', menge: 100 }, 'has_political_power > 100\n'],
  ['fokus_erledigt', { fokus: fokusId }, 'has_completed_focus = m_fokus_1\n'],
  ['datum', { vergleich: '>', datum: '1938.3.12' }, 'date > 1938.3.12\n'],
  ['regierung', { ideologie: 'fascism' }, 'has_government = fascism\n'],
  ['besitzt_staat', { staat: 4 }, 'owns_state = 4\n'],
  ['kontrolliert_staat', { staat: 4 }, 'controls_state = 4\n'],
  ['in_fraktion', {}, 'is_in_faction = yes\n'],
  ['fraktion_mit', { land: 'GER' }, 'is_in_faction_with = GER\n'],
  ['fabriken', { menge: 20 }, 'num_of_factories > 20\n'],
  ['merker', { merker: 'Armee' }, 'has_country_flag = m_armee\n'],
  ['geist', { geist: geistId }, 'has_idea = m_geist_1\n'],
  ['land_existiert', { land: 'MRE' }, 'country_exists = MRE\n'],
  ['code', { code: 'has_capitulated = no' }, 'has_capitulated = no\n'],
]

test('jede Bedingung hat einen Fall', () => {
  const arten = new Set(BEDINGUNGS_FAELLE.map(f => f[0]))
  expect(BEDINGUNGEN.map(d => d.art).filter(a => !arten.has(a))).toEqual([])
})

for (const [art, werte, erwartet] of BEDINGUNGS_FAELLE) {
  test(`Bedingung ${art}`, () => {
    expect(text(erzeugeBedingungen({ modus: 'alle', liste: [b(art, werte)] }, k))).toBe(erwartet)
    expect(pruefeBausteine({ modus: 'alle', liste: [b(art, werte)] }, kontext, 'Fokus A')).toEqual([])
  })
}

test('nicht und eine genuegt', () => {
  expect(text(erzeugeBedingungen({ modus: 'eine', liste: [b('im_krieg'), { ...b('ist_land', { land: 'GER' }), nicht: true }] }, k)))
    .toBe('OR = {\n\thas_war = yes\n\tNOT = {\n\t\ttag = GER\n\t}\n}\n')
  expect(text(erzeugeBedingungen({ modus: 'eine', liste: [b('im_krieg')] }, k))).toBe('has_war = yes\n')
  expect(erzeugeBedingungen({ modus: 'alle', liste: [] }, k)).toEqual([])
})

test('Pruefung: Code, Verweise, Pflichtfelder (Review Focus 4)', () => {
  expect(pruefeBausteine([w('code', { code: 'x = {' })], kontext, 'Fokus A')[0].text).toMatch(/Eigener Code/)
  expect(pruefeBausteine([w('code', { code: 'x = "ä"' })], kontext, 'Fokus A')[0].text).toMatch(/Sonderzeichen/)
  expect(pruefeBausteine([w('staat_bekommen', { staat: 999 })], kontext, 'A')[0].text).toMatch(/Staat/)
  expect(pruefeBausteine([w('geist_hinzu', { geist: 'weg' })], kontext, 'A').length).toBe(1)
  expect(pruefeBausteine([w('krieg', { land: 'XYZ' })], kontext, 'A').length).toBe(1)
  expect(pruefeBausteine([w('krieg', { land: '' })], kontext, 'A')[0].text).toMatch(/^A: «Krieg erklären» – /)
  expect(pruefeBausteine({ modus: 'alle', liste: [b('fokus_erledigt', { fokus: 'weg' })] }, kontext, 'A').length).toBe(1)
  expect(pruefeBausteine([w('gebaeude', { wo: 'irgendwo', staat: null })], kontext, 'A')).toEqual([])
  expect(pruefeBausteine([w('gebaeude', { wo: 'staat', staat: null })], kontext, 'A').length).toBe(1)
  expect(pruefeBausteine({ modus: 'alle', liste: [b('datum', { datum: '1938.13.40' })] }, kontext, 'A').length).toBe(1)
})

test('Klartext', () => {
  expect(satzText(WIRKUNGEN.find(d => d.art === 'staat_bekommen'), { staat: 1 }, kontext)).toBe('Staat Brandenburg bekommen')
  expect(satzText(BEDINGUNGEN.find(d => d.art === 'stabilitaet'), { vergleich: '>', prozent: 50 }, kontext)).toBe('Stabilität über 50 %')
  expect(satzText(WIRKUNGEN.find(d => d.art === 'geist_hinzu'), { geist: geistId }, kontext)).toBe('Nationalen Geist «Alpenfestung» erhalten')
  expect(satzText(BEDINGUNGEN.find(d => d.art === 'fokus_erledigt'), { fokus: fokusId }, kontext)).toBe('Fokus «Aufbruch» ist erledigt')
  expect(satzText(WIRKUNGEN.find(d => d.art === 'krieg'), { land: 'MRE' }, kontext)).toBe('Krieg erklären an Mein Reich')
})

test('neue Bausteine haben Standardwerte', () => {
  expect(neueWirkung('politische_macht')).toMatchObject({ art: 'politische_macht', werte: { menge: 50 } })
  expect(neueWirkung('bei_land').wirkungen).toEqual([])
  expect(neueBedingung('stabilitaet')).toMatchObject({ art: 'stabilitaet', nicht: false, werte: { vergleich: '>', prozent: 50 } })
  expect(neueWirkung('politische_macht').id).not.toBe(neueWirkung('politische_macht').id)
})
