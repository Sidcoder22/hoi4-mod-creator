import { test, expect } from 'vitest'
import { miniSpieldaten, text } from '../hilfe.js'
import { neuesProjekt } from '../../src/projekt/modell.js'
import { fuegeLandHinzu, aendereLand, fuegeGeistHinzu, aendereGeist, setzeBeliebtheit } from '../../src/projekt/aenderungen.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { parseParadox, finde, zahlen, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const AUS = { name: false, farbe: false, flagge: false, gebiet: false, regierung: false, anfuehrer: false, startwerte: false, geister: false }

function mitLand(tag, patch, aendern) {
  const [p, id] = fuegeLandHinzu(neuesProjekt('Mein Reich'), sd, 'geaendert', tag)
  return [aendereLand(p, sd, id, { ...patch, aendern: { ...AUS, ...aendern } }), id]
}

test('Name und Anfuehrer der Schweiz', () => {
  const [p] = mitLand('SWI', { name: 'Helvetien', anfuehrer: { name: 'Wilhelm Tell', unterideologie: 'conservatism', bild: { art: 'spiel', pfad: null } } },
    { name: true, anfuehrer: true })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const ersetzt = parseYml(text(dateien, m + 'localisation/german/replace/mein_reich_replace_l_german.yml')).eintraege
  expect(ersetzt.get('SWI')).toBe('Helvetien')
  const v = text(dateien, m + 'history/countries/SWI - Switzerland.txt')
  expect(v.startsWith(sd.originaltexte['history/countries/SWI - Switzerland.txt'])).toBe(true)
  expect(v).toContain('recruit_character = mein_reich_swi_anfuehrer')
  expect(v).toContain('promote_character = mein_reich_swi_anfuehrer')
  expect(text(dateien, m + 'common/characters/mein_reich_SWI.txt')).toContain('ideology = conservatism')
  expect(dateien.some(d => d.pfad.includes('gfx/flags'))).toBe(false)
  expect(dateien.some(d => d.pfad.includes('colors.txt'))).toBe(false)
})

test('Name ersetzt auch Ideologie-Varianten', () => {
  const [p] = mitLand('GER', { name: 'Grossreich', nameDef: 'das Grossreich', adjektiv: 'grossreichisch' }, { name: true })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const e = parseYml(text(dateien, m + 'localisation/german/replace/mein_reich_replace_l_german.yml')).eintraege
  expect(e.get('GER')).toBe('Grossreich')
  expect(e.get('GER_fascism')).toBe('Grossreich')
  expect(e.get('GER_fascism_DEF')).toBe('das Grossreich')
  expect(e.get('GER_fascism_ADJ')).toBe('grossreichisch')
  expect(e.get('GER_ADJ')).toBe('grossreichisch')
})

test('Flagge ersetzt alle Varianten in drei Groessen', () => {
  const [p] = mitLand('GER', {}, { flagge: true })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(dateien.filter(d => d.pfad.includes('gfx/flags')).map(d => d.pfad).sort()).toEqual([
    m + 'gfx/flags/GER.tga', m + 'gfx/flags/GER_fascism.tga', m + 'gfx/flags/medium/GER.tga', m + 'gfx/flags/medium/GER_fascism.tga',
    m + 'gfx/flags/small/GER.tga', m + 'gfx/flags/small/GER_fascism.tga'])
})

test('Gebiet: neue Hauptstadt wird angehaengt', () => {
  const [p] = mitLand('GER', { staaten: [], hauptstadt: 2 }, { gebiet: true })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(text(dateien, m + 'history/countries/GER - Germany.txt')).toMatch(/Mod Creator \(mein_reich\) ---\ncapital = 2\n/)
})

test('Gebiet: zusaetzliche Staaten', () => {
  const [p] = mitLand('SWI', { staaten: [6] }, { gebiet: true })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(text(dateien, m + 'history/states/6-Elsass.txt')).toContain('owner = SWI')
  expect(dateien.some(d => d.pfad.includes('history/countries'))).toBe(false)
})

test('Farbe', () => {
  const [p] = mitLand('GER', { farbe: [1, 2, 3] }, { farbe: true })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(zahlen(finde(parseParadox(text(dateien, m + 'common/countries/Germany.txt')).eintraege, 'color').wert)).toEqual([1, 2, 3])
  expect(text(dateien, m + 'common/countries/colors.txt')).toMatch(/GER = \{\s*color = rgb \{ 1 2 3 \}/)
})

test('Regierung, Startwerte, Geister', () => {
  let [p, id] = mitLand('GER', { startwerte: { stabilitaet: 70, kriegsunterstuetzung: 40, forschungsplaetze: 5 }, technikWie: 'SWI' },
    { regierung: true, startwerte: true, geister: true })
  p = setzeBeliebtheit(p, id, 'democratic', 50)
  let geist
  ;[p, geist] = fuegeGeistHinzu(p, sd)
  p = aendereGeist(p, geist, { name: 'Geist' })
  const land = p.laender[0]
  p = aendereLand(p, sd, id, { ideen: [geist], regierung: { ...land.regierung, ideologie: 'democratic', parteien: { ...land.regierung.parteien, democratic: { ...land.regierung.parteien.democratic, name: 'Neue Partei' } } } })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const v = text(dateien, m + 'history/countries/GER - Germany.txt')
  const anhang = parseParadox(v.split('---\n').at(-1), { streng: true }).eintraege
  expect(wertText(finde(anhang, 'set_stability').wert)).toBe('0.7')
  expect(wertText(finde(anhang, 'set_war_support').wert)).toBe('0.4')
  expect(wertText(finde(anhang, 'set_research_slots').wert)).toBe('5')
  expect(finde(anhang, 'set_technology').wert.inhalt.map(e => e.schluessel)).toEqual(['infantry_weapons'])
  expect(wertText(finde(finde(anhang, 'set_politics').wert.inhalt, 'ruling_party').wert)).toBe('democratic')
  expect(finde(anhang, 'set_popularities').wert.inhalt.reduce((s, e) => s + Number(e.wert.text), 0)).toBe(100)
  expect(finde(anhang, 'add_ideas').wert.inhalt.map(x => x.text)).toEqual(['mein_reich_geist_1'])
  const ersetzt = parseYml(text(dateien, m + 'localisation/german/replace/mein_reich_replace_l_german.yml')).eintraege
  expect(ersetzt.get('GER_democratic_party')).toBe('Neue Partei')
  expect(ersetzt.has('GER_fascism_party')).toBe(false)
})

test('ohne aktiven Reiter keine Dateien fuer das Land', () => {
  const [p] = mitLand('GER', { name: 'Egal' }, {})
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(dateien.map(d => d.pfad).sort()).toEqual(['mod/mein_reich.mod', m + 'descriptor.mod', m + 'hoi4-mod-creator-projekt.json'])
})
