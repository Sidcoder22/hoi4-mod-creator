import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { fuegeBaumHinzu, fuegeFokusHinzu, aendereFokus, setzeVoraussetzung, setzeAusschluss } from '../../src/projekt/fokus.js'
import { fuegeBildHinzu } from '../../src/projekt/aenderungen.js'
import { neueWirkung, neueBedingung } from '../../src/bausteine/erzeugen.js'
import { parseParadox, finde, findeAlle, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'
import { leseDds } from '../../src/leser/dds.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const PFAD = m + 'common/national_focus/mein_reich_mein_reich_baum_1.txt'
const mit = (b, werte) => ({ ...b, werte: { ...b.werte, ...werte } })

function aufbau() {
  let p = testprojekt(sd)
  let baum, a, b, c
  ;[p, baum] = fuegeBaumHinzu(p, 'MRE', 'Weg zur Grösse')
  ;[p, a] = fuegeFokusHinzu(p, sd, baum, 0, 0)
  ;[p, b] = fuegeFokusHinzu(p, sd, baum, 1, 1)
  ;[p, c] = fuegeFokusHinzu(p, sd, baum, 2, 1)
  p = aendereFokus(p, baum, a, { name: 'Aufbruch', beschreibung: 'Los geht es.', belohnung: [mit(neueWirkung('politische_macht'), { menge: 50 })] })
  p = aendereFokus(p, baum, b, { name: 'Alpen', belohnung: [mit(neueWirkung('geist_hinzu'), { geist: p.ideen[0].id })],
    verfuegbar: { modus: 'alle', liste: [mit(neueBedingung('stabilitaet'), { vergleich: '>', prozent: 50 })] } })
  p = aendereFokus(p, baum, c, { name: 'Fabriken', belohnung: [mit(neueWirkung('gebaeude'), { gebaeude: 'industrial_complex', wo: 'irgendwo' })] })
  p = setzeVoraussetzung(p, baum, a, b, true)
  p = setzeVoraussetzung(p, baum, a, c, true)
  p = setzeAusschluss(p, baum, b, c, true)
  return { p, baum, a, b, c }
}

const fokusse = (dateien) => findeAlle(finde(parseParadox(text(dateien, PFAD), { streng: true }).eintraege, 'focus_tree').wert.inhalt, 'focus').map(f => f.wert.inhalt)
const fokusMit = (dateien, id) => fokusse(dateien).find(f => wertText(finde(f, 'id').wert) === id)

test('Fokusbaum wird erzeugt', () => {
  const { p } = aufbau()
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const baum = finde(parseParadox(text(dateien, PFAD), { streng: true }).eintraege, 'focus_tree').wert.inhalt
  expect(wertText(finde(baum, 'id').wert)).toBe('mein_reich_baum_1')
  const modifier = finde(finde(baum, 'country').wert.inhalt, 'modifier').wert.inhalt
  expect([wertText(finde(modifier, 'add').wert), wertText(finde(modifier, 'tag').wert)]).toEqual(['100', 'MRE'])
  expect(wertText(finde(baum, 'default').wert)).toBe('no')
  const a = fokusMit(dateien, 'mein_reich_fokus_1')
  expect(wertText(finde(a, 'cost').wert)).toBe('10')
  expect(wertText(finde(a, 'icon').wert)).toBe('GFX_goal_generic_construct_civ_factory')
  expect(wertText(finde(finde(a, 'completion_reward').wert.inhalt, 'add_political_power').wert)).toBe('50')
  expect(finde(a, 'prerequisite')).toBeUndefined()
  const b = fokusMit(dateien, 'mein_reich_fokus_2')
  expect(findeAlle(finde(b, 'prerequisite').wert.inhalt, 'focus').map(x => x.wert.text)).toEqual(['mein_reich_fokus_1'])
  const stab = finde(finde(b, 'available').wert.inhalt, 'has_stability')
  expect([stab.op, stab.wert.text]).toEqual(['>', '0.5'])
  expect(wertText(finde(finde(b, 'completion_reward').wert.inhalt, 'add_ideas').wert)).toBe('mein_reich_geist_1')
  expect(findeAlle(finde(b, 'mutually_exclusive').wert.inhalt, 'focus').map(x => x.wert.text)).toEqual(['mein_reich_fokus_3'])
  const c = fokusMit(dateien, 'mein_reich_fokus_3')
  expect(findeAlle(finde(c, 'mutually_exclusive').wert.inhalt, 'focus').map(x => x.wert.text)).toEqual(['mein_reich_fokus_2'])
  const bau = finde(finde(finde(c, 'completion_reward').wert.inhalt, 'random_owned_controlled_state').wert.inhalt, 'add_building_construction').wert.inhalt
  expect(wertText(finde(bau, 'type').wert)).toBe('industrial_complex')
  expect(wertText(finde(finde(a, 'ai_will_do').wert.inhalt, 'factor').wert)).toBe('1')
  expect(finde(a, 'available')).toBeUndefined()
  const de = parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege
  expect(de.get('mein_reich_fokus_1')).toBe('Aufbruch')
  expect(de.get('mein_reich_fokus_1_desc')).toBe('Los geht es.')
})

test('Voraussetzungsart alle oder eine', () => {
  let { p, baum, a, b, c } = aufbau()
  p = setzeVoraussetzung(p, baum, b, c, true)
  const alle = fokusMit(erzeugeMod(p, sd).dateien, 'mein_reich_fokus_3')
  expect(findeAlle(alle, 'prerequisite').length).toBe(2)
  const eine = fokusMit(erzeugeMod(aendereFokus(p, baum, c, { voraussetzungsArt: 'eine' }), sd).dateien, 'mein_reich_fokus_3')
  expect(findeAlle(eine, 'prerequisite').length).toBe(1)
  expect(findeAlle(finde(eine, 'prerequisite').wert.inhalt, 'focus').length).toBe(2)
  expect(a).toBeTruthy()
})

test('eigenes Symbol mit Schimmer', () => {
  let { p, baum, a } = aufbau()
  let bild
  ;[p, bild] = fuegeBildHinzu(p, { breite: 10, hoehe: 10, rgba: new Uint8ClampedArray(400).fill(255) })
  p = aendereFokus(p, baum, a, { symbol: { art: 'eigen', bildId: bild } })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const dds = leseDds(dateien.find(d => d.pfad === m + 'gfx/interface/goals/mein_reich_fokus_1.dds').inhalt)
  expect([dds.breite, dds.hoehe]).toEqual([94, 86])
  const gfx = parseParadox(text(dateien, m + 'interface/mein_reich_goals.gfx'), { streng: true }).eintraege
  expect(wertText(finde(findeAlle(finde(gfx, 'spriteTypes').wert.inhalt, 'spriteType')[0].wert.inhalt, 'name').wert)).toBe('GFX_mein_reich_fokus_1')
  const shine = text(dateien, m + 'interface/mein_reich_goals_shine.gfx')
  parseParadox(shine, { streng: true })
  expect(shine).toContain('GFX_mein_reich_fokus_1_shine')
  expect(shine).toContain('shine_overlay.dds')
  expect(wertText(finde(fokusMit(dateien, 'mein_reich_fokus_1'), 'icon').wert)).toBe('GFX_mein_reich_fokus_1')
})

test('unbekanntes Spielsymbol wird gemeldet', () => {
  let { p, baum, a } = aufbau()
  p = aendereFokus(p, baum, a, { symbol: { art: 'spiel', sprite: 'GFX_goal_gibtsnicht' } })
  expect(erzeugeMod(p, sd).fehler.some(f => f.includes('GFX_goal_gibtsnicht'))).toBe(true)
})

test('Merker und Fraktion im Fokus', () => {
  let { p, baum, a } = aufbau()
  p = aendereFokus(p, baum, a, { belohnung: [mit(neueWirkung('merker_setzen'), { merker: 'Armee Reform' }), mit(neueWirkung('fraktion_gruenden'), { name: 'Alpenbund' }), mit(neueWirkung('forschungsbonus'), { kategorie: 'industry' })] })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const belohnung = finde(fokusMit(dateien, 'mein_reich_fokus_1'), 'completion_reward').wert.inhalt
  expect(wertText(finde(belohnung, 'set_country_flag').wert)).toBe('mein_reich_armee_reform')
  const fraktion = wertText(finde(belohnung, 'create_faction').wert)
  expect(fraktion).toMatch(/^mein_reich_fraktion_e[0-9a-z]{10}$/)
  expect(parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege.get(fraktion)).toBe('Alpenbund')
  expect(wertText(finde(finde(belohnung, 'add_tech_bonus').wert.inhalt, 'name').wert)).toBe('mein_reich_fokus_1')
})

test('Dauer-Fokus-Leiste unterhalb des tiefsten Fokus (Review)', () => {
  let { p, baum } = aufbau()
  const pos = (q) => finde(finde(finde(parseParadox(text(erzeugeMod(q, sd).dateien, PFAD)).eintraege, 'focus_tree').wert.inhalt, 'continuous_focus_position').wert.inhalt, 'y').wert.text
  expect(pos(p)).toBe('1200')
  ;[p] = fuegeFokusHinzu(p, sd, baum, 0, 12)
  expect(pos(p)).toBe('1820')
})
