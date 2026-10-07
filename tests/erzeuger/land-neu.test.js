import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { aendereLand, fuegeBildHinzu } from '../../src/projekt/aenderungen.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { parseParadox, finde, findeAlle, wertText, zahlen } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'
import { leseTga } from '../../src/leser/tga.js'
import { leseDds } from '../../src/leser/dds.js'

const sd = await miniSpieldaten()
const p = testprojekt(sd)
const landId = p.laender[0].id
const { dateien, fehler } = erzeugeMod(p, sd)
const m = 'mod/mein_reich/'
const skript = (pfad) => parseParadox(text(dateien, m + pfad), { streng: true }).eintraege
const w = (inhalt, k) => wertText(finde(inhalt, k)?.wert)

test('keine Fehler', () => {
  expect(fehler).toEqual([])
})

test('Kuerzel- und Laenderdatei, Farbe', () => {
  expect(text(dateien, m + 'common/country_tags/mein_reich_countries.txt')).toContain('MRE = "countries/mein_reich_MRE.txt"')
  const land = skript('common/countries/mein_reich_MRE.txt')
  expect(w(land, 'graphical_culture')).toBe('western_european_gfx')
  expect(w(land, 'graphical_culture_2d')).toBe('western_european_2d')
  expect(zahlen(finde(land, 'color').wert)).toEqual([10, 20, 30])
  expect(text(dateien, m + 'common/countries/colors.txt')).toContain('MRE = {')
})

test('Verlaufsdatei', () => {
  const v = skript('history/countries/MRE - Mein Reich.txt')
  expect(w(v, 'capital')).toBe('1')
  expect(w(v, 'oob')).toBe('MRE_1936')
  expect(w(v, 'set_research_slots')).toBe('3')
  expect(w(v, 'set_stability')).toBe('0.5')
  expect(w(v, 'set_war_support')).toBe('0.2')
  const technik = finde(v, 'set_technology').wert.inhalt.map(e => e.schluessel)
  expect(technik).toContain('infantry_weapons1')
  expect(technik).not.toContain('infantry_weapons2')
  const politik = finde(v, 'set_politics').wert.inhalt
  expect(w(politik, 'ruling_party')).toBe('democratic')
  expect(w(politik, 'elections_allowed')).toBe('yes')
  expect(w(politik, 'last_election')).toBe('1933.3.5')
  const pop = finde(v, 'set_popularities').wert.inhalt
  expect(pop.reduce((s, e) => s + Number(e.wert.text), 0)).toBe(100)
  expect(w(v, 'recruit_character')).toBe('mein_reich_mre_anfuehrer')
  expect(finde(v, 'add_ideas').wert.inhalt.map(x => x.text)).toEqual(['mein_reich_geist_1'])
})

test('Einheiten', () => {
  const u = skript('history/units/MRE_1936.txt')
  const vorlage = finde(u, 'division_template').wert.inhalt
  expect(w(vorlage, 'name')).toBe('Infanterie-Division')
  expect(findeAlle(finde(vorlage, 'regiments').wert.inhalt, 'infantry').length).toBe(6)
  const divisionen = findeAlle(finde(u, 'units').wert.inhalt, 'division')
  expect(divisionen.length).toBe(6)
  for (const d of divisionen) expect(w(d.wert.inhalt, 'location')).toBe('1')
  expect(w(divisionen[0].wert.inhalt, 'name')).toBe('1. Infanterie-Division')
})

test('Charakter mit Spielportraet', () => {
  const c = finde(finde(skript('common/characters/mein_reich_MRE.txt'), 'characters').wert.inhalt, 'mein_reich_mre_anfuehrer').wert.inhalt
  expect(w(c, 'name')).toBe('mein_reich_mre_anfuehrer')
  expect(w(finde(finde(c, 'portraits').wert.inhalt, 'civilian').wert.inhalt, 'large')).toBe('gfx/leaders/Europe/portrait_europe_generic_1.dds')
  const leiter = finde(c, 'country_leader').wert.inhalt
  expect(w(leiter, 'ideology')).toBe('conservatism')
})

test('Flaggen in drei Groessen', () => {
  const gross = leseTga(dateien.find(d => d.pfad === m + 'gfx/flags/MRE.tga').inhalt)
  expect([gross.breite, gross.hoehe]).toEqual([82, 52])
  expect([...gross.rgba.slice((26 * 82 + 41) * 4, (26 * 82 + 41) * 4 + 4)]).toEqual([255, 255, 255, 255])
  const mittel = leseTga(dateien.find(d => d.pfad === m + 'gfx/flags/medium/MRE.tga').inhalt)
  expect([mittel.breite, mittel.hoehe]).toEqual([41, 26])
  const klein = leseTga(dateien.find(d => d.pfad === m + 'gfx/flags/small/MRE.tga').inhalt)
  expect([klein.breite, klein.hoehe]).toEqual([10, 7])
})

test('Staaten wechseln den Besitzer', () => {
  const s1 = finde(finde(skript('history/states/1-Brandenburg.txt'), 'state').wert.inhalt, 'history').wert.inhalt
  expect(w(s1, 'owner')).toBe('MRE')
  expect(findeAlle(s1, 'add_core_of').map(e => e.wert.text)).toEqual(['GER', 'MRE'])
  const s4 = finde(finde(skript('history/states/4-Zuerich.txt'), 'state').wert.inhalt, 'history').wert.inhalt
  expect(w(s4, 'owner')).toBe('MRE')
})

test('Sprachdateien', () => {
  const de = text(dateien, m + 'localisation/german/mein_reich_l_german.yml')
  const en = text(dateien, m + 'localisation/english/mein_reich_l_english.yml')
  expect(de.replace('l_german:', '')).toBe(en.replace('l_english:', ''))
  const e = parseYml(de).eintraege
  expect(e.get('MRE')).toBe('Mein Reich')
  expect(e.get('MRE_DEF')).toBe('Mein Reich')
  expect(e.get('MRE_ADJ')).toBe('reichisch')
  expect(e.get('MRE_democratic_party')).toBe('Volkspartei')
  expect(e.get('MRE_democratic_party_long')).toBe('Demokratische Volkspartei')
  expect(e.get('MRE_fascism_party')).toBe('Faschistisch')
  expect(e.get('mein_reich_mre_anfuehrer')).toBe('Max Muster')
})

test('eigenes Portraet', () => {
  let [q, bild] = fuegeBildHinzu(p, { breite: 20, hoehe: 30, rgba: new Uint8ClampedArray(20 * 30 * 4).fill(200) })
  q = aendereLand(q, sd, landId, { anfuehrer: { ...p.laender[0].anfuehrer, bild: { art: 'eigen', bildId: bild } } })
  const r = erzeugeMod(q, sd)
  expect(r.fehler).toEqual([])
  const dds = leseDds(r.dateien.find(d => d.pfad === m + 'gfx/leaders/MRE/mein_reich_anfuehrer.dds').inhalt)
  expect([dds.breite, dds.hoehe]).toEqual([156, 210])
  expect(text(r.dateien, m + 'common/characters/mein_reich_MRE.txt')).toContain('"gfx/leaders/MRE/mein_reich_anfuehrer.dds"')
})

test('Sonderzeichen im Namen (Review Focus 3)', () => {
  const q = aendereLand(aendereLand(p, sd, landId, { name: 'Grossherzogtum «Über» "Test"' }), sd, landId, { tag: 'GRT' })
  const r = erzeugeMod(q, sd)
  expect(r.fehler).toEqual([])
  expect(r.dateien.some(d => d.pfad === m + 'history/countries/GRT - Grossherzogtum Ueber Test.txt')).toBe(true)
  expect(text(r.dateien, m + 'localisation/german/mein_reich_l_german.yml')).toContain('GRT:0 "Grossherzogtum «Über» \\"Test\\""')
})

test('ohne Armee kein oob, ohne Anfuehrer kein Charakter', () => {
  const q = aendereLand(p, sd, landId, { armee: { divisionen: 0 }, anfuehrer: { ...p.laender[0].anfuehrer, name: '' } })
  const r = erzeugeMod(q, sd)
  expect(r.fehler).toEqual([])
  expect(r.dateien.some(d => d.pfad.includes('history/units'))).toBe(false)
  expect(r.dateien.some(d => d.pfad.includes('common/characters'))).toBe(false)
  const v = parseParadox(text(r.dateien, m + 'history/countries/MRE - Mein Reich.txt')).eintraege
  expect(finde(v, 'oob')).toBeUndefined()
  expect(finde(v, 'recruit_character')).toBeUndefined()
})

test('Technik wie anderes Land und Rueckfall', () => {
  const wie = erzeugeMod(aendereLand(p, sd, landId, { technikWie: 'SWI' }), sd)
  const t = finde(parseParadox(text(wie.dateien, m + 'history/countries/MRE - Mein Reich.txt')).eintraege, 'set_technology').wert.inhalt.map(e => e.schluessel)
  expect(t).toEqual(['infantry_weapons'])
  const ohne = erzeugeMod(aendereLand(p, sd, landId, { technikWie: 'FRA' }), sd)
  const t2 = finde(parseParadox(text(ohne.dateien, m + 'history/countries/MRE - Mein Reich.txt')).eintraege, 'set_technology').wert.inhalt.map(e => e.schluessel)
  expect(t2).toEqual(['infantry_weapons', 'infantry_weapons1', 'tech_support', 'tech_engineers', 'gw_artillery'])
})
