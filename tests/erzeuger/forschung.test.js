import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { fuegeLandHinzu, aendereLand } from '../../src/projekt/aenderungen.js'
import { parseParadox, finde, findeAlle } from '../../src/leser/paradox.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const MRE = m + 'history/countries/MRE - Mein Reich.txt'
const SWI = m + 'history/countries/SWI - Switzerland.txt'
const GER = m + 'history/countries/GER - Germany.txt'
const technik = (eintraege) => findeAlle(eintraege, 'set_technology').flatMap(b => b.wert.inhalt.map(x => x.schluessel))

function mitNeu(forschung, extra = {}) {
  const p = testprojekt(sd)
  return aendereLand(p, sd, p.laender[0].id, { forschung, ...extra })
}

function mitGeaendert(tag, forschung) {
  let [p, id] = fuegeLandHinzu(testprojekt(sd), sd, 'geaendert', tag)
  const l = p.laender.find(x => x.id === id)
  return aendereLand(p, sd, id, { forschung, aendern: { ...l.aendern, forschung: true } })
}

test('neues Land mit Liste und mit leerer Liste', () => {
  const { dateien, fehler } = erzeugeMod(mitNeu(['tech_support', 'basic_machine_tools']), sd)
  expect(fehler).toEqual([])
  expect(technik(parseParadox(text(dateien, MRE), { streng: true }).eintraege)).toEqual(['tech_support', 'basic_machine_tools'])
  expect(findeAlle(parseParadox(text(erzeugeMod(mitNeu([]), sd).dateien, MRE)).eintraege, 'set_technology')).toEqual([])
})

test('Review Focus 4: null mit technikWie wie bisher', () => {
  const t = technik(parseParadox(text(erzeugeMod(mitNeu(null, { technikWie: 'SWI' }), sd).dateien, MRE)).eintraege)
  expect(t).toEqual(['infantry_weapons'])
})

test('Review Focus 2: bestehendes Land, Entfernen auch aus if, Hinzufuegen im Anhang', () => {
  const { dateien, fehler } = erzeugeMod(mitGeaendert('SWI', ['infantry_weapons', 'basic_machine_tools']), sd)
  expect(fehler).toEqual([])
  const inhalt = text(dateien, SWI)
  const e = parseParadox(inhalt, { streng: true }).eintraege
  const wenn = finde(e, 'if').wert.inhalt
  expect(finde(wenn, 'set_technology')).toBeUndefined()
  expect(inhalt).not.toContain('tech_support')
  expect(technik(e)).toEqual(['infantry_weapons', 'basic_machine_tools'])
})

test('Review Focus 2: Datumsblock bleibt beim Entfernen unveraendert', () => {
  const { dateien } = erzeugeMod(mitGeaendert('GER', ['infantry_weapons', 'tech_support']), sd)
  const e = parseParadox(text(dateien, GER), { streng: true }).eintraege
  expect(technik(e)).toEqual(['infantry_weapons', 'tech_support'])
  expect(technik(finde(e, '1939.1.1').wert.inhalt)).toEqual(['infantry_weapons2'])
})

test('Review Focus 3: Schalter an, Liste wie im Spiel: keine Verlaufsdatei', () => {
  const { dateien } = erzeugeMod(mitGeaendert('SWI', ['infantry_weapons', 'tech_support']), sd)
  expect(dateien.some(d => d.pfad === SWI)).toBe(false)
})
