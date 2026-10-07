import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { pruefeProjekt, hatFehler } from '../../src/pruefung/regeln.js'
import { fuegeLandHinzu, aendereLand, schalteStaat, aendereGeist, setzeModFeld } from '../../src/projekt/aenderungen.js'

const sd = await miniSpieldaten()
const regeln = (p) => pruefeProjekt(p, sd).map(m => m.regel)

function gueltig() {
  let p = testprojekt(sd)
  const id = p.laender[0].id
  p = schalteStaat(p, id, 1)
  p = schalteStaat(p, id, 2)
  return aendereLand(p, sd, id, { hauptstadt: 2 })
}
const g = gueltig()
const id = g.laender[0].id
const land = (patch) => aendereLand(g, sd, id, patch)
const l0 = g.laender[0]

test('gueltiges Projekt hat keine Meldungen', () => {
  expect(regeln(g)).toEqual([])
  expect(hatFehler(pruefeProjekt(g, sd))).toBe(false)
})

const FAELLE = [
  ['mod-name', () => setzeModFeld(g, 'name', '')],
  ['modid', () => setzeModFeld(g, 'modid', 'Böse Id')],
  ['land-name', () => land({ name: '' })],
  ['tag-format', () => land({ tag: 'ab' })],
  ['tag-format', () => land({ tag: 'AND' })],
  ['tag-format', () => land({ tag: 'D07' })],
  ['tag-belegt', () => land({ tag: 'GER' })],
  ['land-doppelt', () => ({ ...g, laender: [...g.laender, { ...l0, id: 'zweites' }] })],
  ['ohne-staaten', () => land({ staaten: [], hauptstadt: null })],
  ['ohne-hauptstadt', () => land({ hauptstadt: null })],
  ['hauptstadt-fremd', () => land({ hauptstadt: 3 })],
  ['beliebtheit', () => land({ regierung: { ...l0.regierung, parteien: { ...l0.regierung.parteien, democratic: { ...l0.regierung.parteien.democratic, beliebtheit: 90 } } } })],
  ['staat-doppelt', () => { const [p, zwei] = fuegeLandHinzu(g, sd, 'neu'); return aendereLand(p, sd, zwei, { name: 'Zwei', staaten: [4], hauptstadt: 4 }) }],
  ['anfuehrer-ideologie', () => land({ anfuehrer: { ...l0.anfuehrer, unterideologie: 'nazism' } })],
  ['geist-verweis', () => land({ ideen: ['gibtsnicht'] })],
  ['geist-name', () => aendereGeist(g, g.ideen[0].id, { name: '' })],
  ['geist-bild-unbekannt', () => aendereGeist(g, g.ideen[0].id, { bild: { art: 'spiel', sprite: 'GFX_idea_gibtsnicht' } })],
  ['bild-fehlt', () => land({ flagge: { art: 'bild', bildId: 'weg' } })],
  ['bild-fehlt', () => land({ anfuehrer: { ...l0.anfuehrer, bild: { art: 'eigen', bildId: 'weg' } } })],
  ['ohne-anfuehrer', () => land({ anfuehrer: { ...l0.anfuehrer, name: '' } })],
  ['geist-beschreibung', () => aendereGeist(g, g.ideen[0].id, { beschreibung: '' })],
  ['spielversion', () => setzeModFeld(g, 'spielversion', '1.14.0')],
  ['modid-geaendert', () => setzeModFeld(g, 'gespeichertAls', 'alt_name')],
  ['start-1939', () => fuegeLandHinzu(g, sd, 'geaendert', 'FRA')[0]],
]

for (const [regel, erzeuge] of FAELLE) {
  test(`Regel ${regel}`, () => {
    expect(regeln(erzeuge())).toContain(regel)
  })
}

test('Schwere: Fehler und Hinweise', () => {
  const hinweise = ['land-verschwindet', 'ohne-anfuehrer', 'geist-beschreibung', 'spielversion', 'modid-geaendert', 'start-1939']
  for (const [regel, erzeuge] of FAELLE) {
    const m = pruefeProjekt(erzeuge(), sd).find(x => x.regel === regel)
    expect(m.schwere, regel).toBe(hinweise.includes(regel) ? 'hinweis' : 'fehler')
    expect(typeof m.text).toBe('string')
    expect(m.ziel.bereich).toMatch(/^(einstellungen|land|geist)$/)
  }
})

test('Hauptstadt verloren mit Behebung', () => {
  const p = testprojekt(sd)
  const meldung = pruefeProjekt(p, sd).find(m => m.regel === 'hauptstadt-verloren')
  expect(meldung.text).toContain('Deutschland')
  expect(meldung.text).toContain('Brandenburg')
  expect(meldung.behebung.text).toContain('Bayern')
  const behoben = meldung.behebung.anwenden(p, sd)
  const ger = behoben.laender.find(l => l.tag === 'GER')
  expect(ger).toMatchObject({ art: 'geaendert', hauptstadt: 2 })
  expect(ger.aendern.gebiet).toBe(true)
  expect(regeln(behoben)).not.toContain('hauptstadt-verloren')
  expect(hatFehler(pruefeProjekt(behoben, sd))).toBe(false)
})

test('Land verliert alle Staaten', () => {
  let p = testprojekt(sd)
  p = schalteStaat(p, p.laender[0].id, 2)
  const r = regeln(p)
  expect(r).not.toContain('hauptstadt-verloren')
  expect(r).toContain('land-verschwindet')
})

test('geaendertes Land ohne Gebietsaenderung zaehlt nicht doppelt', () => {
  const [p, swi] = fuegeLandHinzu(g, sd, 'geaendert', 'SWI')
  const q = aendereLand(p, sd, swi, { staaten: [2] })
  expect(regeln(q)).not.toContain('staat-doppelt')
})
