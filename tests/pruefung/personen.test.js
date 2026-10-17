import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { pruefeProjekt } from '../../src/pruefung/regeln.js'
import { aendereLand, schalteStaat, fuegeLandHinzu } from '../../src/projekt/aenderungen.js'
import { fuegePersonHinzu, aenderePerson } from '../../src/projekt/personen.js'

const sd = await miniSpieldaten()

function gueltig() {
  let p = testprojekt(sd)
  const id = p.laender[0].id
  p = aendereLand(schalteStaat(schalteStaat(p, id, 1), id, 2), sd, id, { hauptstadt: 2 })
  let g, b
  ;[p, g] = fuegePersonHinzu(p, sd, id, 'general')
  p = aenderePerson(p, sd, id, g, { name: 'Hans', eigenschaften: ['panzer_leader'] })
  ;[p, b] = fuegePersonHinzu(p, sd, id, 'berater')
  p = aenderePerson(p, sd, id, b, { name: 'Erika', beraterEigenschaft: { art: 'spiel', id: 'popular_figurehead' } })
  return { p, id, g, b }
}
const { p: g0, id, g, b } = gueltig()
const aendere = (personId, patch, p = g0) => aenderePerson(p, sd, id, personId, patch)
const meldungen = (p) => pruefeProjekt(p, sd)
const regeln = (p) => meldungen(p).map(m => m.regel)
const ziel = { bereich: 'land', id, reiter: 'personen' }

test('gueltige Personen melden nichts', () => {
  expect(regeln(g0)).toEqual([])
})

const FAELLE = [
  ['person-name', () => aendere(g, { name: ' ' }), 'fehler'],
  ['person-wert', () => aendere(g, { werte: { angriff: 10, verteidigung: 1, planung: 1, logistik: 1 } }), 'fehler'],
  ['person-wert', () => aendere(g, { stufe: 0 }), 'fehler'],
  ['person-wert', () => aendere(b, { kosten: 600 }), 'fehler'],
  ['person-eigenschaft', () => aendere(g, { eigenschaften: ['seawolf'] }), 'fehler'],
  ['person-eigenschaft', () => aendere(g, { eigenschaften: ['gibtsnicht'] }), 'fehler'],
  ['person-eigenschaft', () => aendere(b, { beraterEigenschaft: { art: 'eigen', id: 'geloescht' } }), 'fehler'],
  ['person-bild', () => aendere(g, { bild: { art: 'eigen', bildId: 'weg' } }), 'fehler'],
  ['berater-ohne-eigenschaft', () => aendere(b, { beraterEigenschaft: null }), 'hinweis'],
]

for (const [regel, bau, schwere] of FAELLE) {
  test(`Regel ${regel}`, () => {
    const m = meldungen(bau()).find(x => x.regel === regel)
    expect(m).toMatchObject({ schwere, ziel })
  })
}

test('zwei Berater auf demselben Platz', () => {
  let [p, b2] = fuegePersonHinzu(g0, sd, id, 'berater')
  p = aendere(b2, { name: 'Otto', beraterEigenschaft: { art: 'spiel', id: 'war_monger' } }, p)
  expect(meldungen(p).find(x => x.regel === 'berater-platz-doppelt')).toMatchObject({ schwere: 'hinweis', ziel })
  expect(regeln(aendere(b2, { platz: 'theorist' }, p))).not.toContain('berater-platz-doppelt')
})

test('bestehendes Land ohne Schalter wird nicht geprueft', () => {
  let [p, swi] = fuegeLandHinzu(g0, sd, 'geaendert', 'SWI')
  let x
  ;[p, x] = fuegePersonHinzu(p, sd, swi, 'admiral')
  expect(regeln(p)).not.toContain('person-name')
  const l = p.laender.find(l => l.id === swi)
  expect(regeln(aendereLand(p, sd, swi, { aendern: { ...l.aendern, personen: true } }))).toContain('person-name')
  expect(x).toBeTruthy()
})
