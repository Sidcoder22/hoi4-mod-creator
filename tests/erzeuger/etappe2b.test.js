import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { aendereLand, aendereGeist, fuegeLandHinzu } from '../../src/projekt/aenderungen.js'
import { fuegeEigenschaftHinzu, aendereEigenschaft } from '../../src/projekt/eigenschaften.js'
import { parseParadox, finde, findeAlle, wertText } from '../../src/leser/paradox.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const land = (p, tag) => p.laender.find(l => l.tag === tag)
const staatsManpower = (dateien, datei) => wertText(finde(finde(parseParadox(text(dateien, m + datei)).eintraege, 'state').wert.inhalt, 'manpower').wert)

function projekt() {
  let p = testprojekt(sd)
  const mre = land(p, 'MRE')
  let eig
  ;[p, eig] = fuegeEigenschaftHinzu(p)
  p = aendereEigenschaft(p, eig, { name: 'Eiserner Wille', beschreibung: 'Unbeugsam.', boni: [{ art: 'stabilitaet', wert: 5 }] })
  p = aendereGeist(p, p.ideen[0].id, { boni: [{ art: 'stabilitaet', wert: 5 }, { art: 'frei', modifier: 'army_speed_factor', wert: 0.1 }] })
  p = aendereLand(p, sd, mre.id, {
    startwerte: { ...mre.startwerte, rekruten: 200000, bevoelkerung: 50 },
    spielIdeen: ['deutsche_industrie'],
    anfuehrer: { ...mre.anfuehrer, eigenschaften: [{ art: 'spiel', id: 'popular_figurehead' }, { art: 'eigen', id: eig }] },
  })
  return p
}

test('Rekruten, Bevoelkerung, Spielgeister, freie Boni, Eigenschaften', () => {
  const { dateien, fehler } = erzeugeMod(projekt(), sd)
  expect(fehler).toEqual([])
  const verlauf = parseParadox(text(dateien, m + 'history/countries/MRE - Mein Reich.txt'), { streng: true }).eintraege
  expect(wertText(finde(verlauf, 'add_manpower').wert)).toBe('200000')
  expect(finde(verlauf, 'add_ideas').wert.inhalt.map(x => x.text)).toEqual(['mein_reich_geist_1', 'deutsche_industrie'])
  expect(staatsManpower(dateien, 'history/states/1-Brandenburg.txt')).toBe('3750000')
  expect(staatsManpower(dateien, 'history/states/4-Zuerich.txt')).toBe('1800000')
  expect(text(dateien, m + 'history/states/1-Brandenburg.txt')).toContain('owner = MRE')
  const ideen = text(dateien, m + 'common/ideas/mein_reich_ideas.txt')
  expect(ideen).toContain('army_speed_factor = 0.1')
  expect(ideen).toContain('stability_factor = 0.05')
  const eig = parseParadox(text(dateien, m + 'common/country_leader/mein_reich_eigenschaften.txt'), { streng: true }).eintraege
  const e1 = finde(finde(eig, 'leader_traits').wert.inhalt, 'mein_reich_eigenschaft_1').wert.inhalt
  expect([wertText(finde(e1, 'random').wert), wertText(finde(e1, 'stability_factor').wert)]).toEqual(['no', '0.05'])
  const leiter = finde(finde(finde(parseParadox(text(dateien, m + 'common/characters/mein_reich_MRE.txt')).eintraege, 'characters').wert.inhalt, 'mein_reich_mre_anfuehrer').wert.inhalt, 'country_leader').wert.inhalt
  expect(finde(leiter, 'traits').wert.inhalt.map(x => x.text)).toEqual(['popular_figurehead', 'mein_reich_eigenschaft_1'])
  const de = text(dateien, m + 'localisation/german/mein_reich_l_german.yml')
  expect(de).toContain('mein_reich_eigenschaft_1:0 "Eiserner Wille"')
  expect(de).toContain('mein_reich_eigenschaft_1_desc:0 "Unbeugsam."')
})

test('Bevoelkerung: nur der Faktor des Besitzers zum Start (Review Focus 2)', () => {
  let p = projekt()
  let ger
  ;[p, ger] = fuegeLandHinzu(p, sd, 'geaendert', 'GER')
  const l = p.laender.find(x => x.id === ger)
  p = aendereLand(p, sd, ger, { startwerte: { ...l.startwerte, bevoelkerung: -50 }, aendern: { ...l.aendern, startwerte: true } })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(staatsManpower(dateien, 'history/states/1-Brandenburg.txt')).toBe('3750000')
  expect(staatsManpower(dateien, 'history/states/2-Bayern.txt')).toBe('1500000')
  expect(dateien.filter(d => d.pfad.includes('1-Brandenburg')).length).toBe(1)
})

test('bisherigen Anfuehrer behalten und Eigenschaft geben', () => {
  let p = projekt()
  let swi
  ;[p, swi] = fuegeLandHinzu(p, sd, 'geaendert', 'SWI')
  const l = p.laender.find(x => x.id === swi)
  p = aendereLand(p, sd, swi, { anfuehrer: { ...l.anfuehrer, modus: 'behalten', eigenschaften: [{ art: 'spiel', id: 'war_monger' }] }, aendern: { ...l.aendern, anfuehrer: true } })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(text(dateien, m + 'history/countries/SWI - Switzerland.txt')).toContain('add_country_leader_trait = war_monger')
  expect(dateien.some(d => d.pfad.endsWith('characters/mein_reich_SWI.txt'))).toBe(false)
})

test('Spielgeister bei bestehenden Laendern und Rekruten im Anhang', () => {
  let p = projekt()
  let fra
  ;[p, fra] = fuegeLandHinzu(p, sd, 'geaendert', 'FRA')
  const l = p.laender.find(x => x.id === fra)
  p = aendereLand(p, sd, fra, { spielIdeen: ['schweizer_neutralitaet'], startwerte: { ...l.startwerte, rekruten: 50000 }, aendern: { ...l.aendern, geister: true, startwerte: true } })
  const v = text(erzeugeMod(p, sd).dateien, m + 'history/countries/FRA - France.txt')
  expect(v).toContain('add_ideas = { schweizer_neutralitaet }')
  expect(v).toContain('add_manpower = 50000')
})

test('kleine freie Werte bleiben genau (Review)', () => {
  let p = projekt()
  p = aendereGeist(p, p.ideen[0].id, { boni: [{ art: 'frei', modifier: 'monthly_population', wert: 0.0025 }] })
  expect(text(erzeugeMod(p, sd).dateien, m + 'common/ideas/mein_reich_ideas.txt')).toContain('monthly_population = 0.0025')
})
