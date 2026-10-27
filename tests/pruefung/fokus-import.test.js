import { test, expect } from 'vitest'
import { erstelleMiniSpielordner } from '../../src/selbsttest/mini-spielordner.js'
import { dateiquelleAusObjekt } from '../../src/leser/dateiquelle.js'
import { leseSpielordner } from '../../src/leser/spielordner.js'
import { testprojekt } from '../hilfe.js'
import { pruefeProjekt } from '../../src/pruefung/regeln.js'
import { aendereLand, schalteStaat } from '../../src/projekt/aenderungen.js'
import { importiereSpielbaum } from '../../src/projekt/fokus-import.js'
import { entferneFokus, aendereFokus } from '../../src/projekt/fokus.js'

const { spieldaten: sd, spielfokus } = await leseSpielordner(dateiquelleAusObjekt(erstelleMiniSpielordner()))

function basis() {
  let p = testprojekt(sd)
  const id = p.laender[0].id
  return aendereLand(schalteStaat(schalteStaat(p, id, 1), id, 2), sd, id, { hauptstadt: 2 })
}
const meldungen = (p) => pruefeProjekt(p, sd)
const regeln = (p) => meldungen(p).map(m => m.regel)
const fehler = (p) => meldungen(p).filter(m => m.schwere === 'fehler').map(m => m.regel)

test('aendern ohne Aenderung: keine Fehler, keine Symbol-Meldung fuer gesperrte Fokusse', () => {
  const [p] = importiereSpielbaum(basis(), sd, spielfokus, 'german_focus', 'aendern')
  expect(fehler(p)).toEqual([])
  expect(regeln(p)).not.toContain('fokus-symbol')
  expect(regeln(p)).not.toContain('fokus-spiel-geloescht')
})

test('geloeschter Spielfokus ergibt einen Hinweis', () => {
  const [p, baumId] = importiereSpielbaum(basis(), sd, spielfokus, 'german_focus', 'aendern')
  const navy = p.fokusbaeume.find(b => b.id === baumId).fokusse.find(f => f.spielId === 'GER_navy')
  const m = meldungen(entferneFokus(p, baumId, navy.id)).find(x => x.regel === 'fokus-spiel-geloescht')
  expect(m).toMatchObject({ schwere: 'hinweis', ziel: { bereich: 'fokus', id: baumId } })
  expect(m.text).toContain('GER_navy')
})

test('Vorlage mit Spielcode ergibt einen Hinweis mit Anzahl', () => {
  const [p, baumId] = importiereSpielbaum(basis(), sd, spielfokus, 'german_focus', 'vorlage', 'FRA')
  const m = meldungen(p).find(x => x.regel === 'fokus-spielcode-vorlage')
  expect(m).toMatchObject({ schwere: 'hinweis', ziel: { bereich: 'fokus', id: baumId } })
  expect(m.ziel.fokus).toBeTruthy()
  expect(m.text).toContain('2')
  const [q] = importiereSpielbaum(basis(), sd, spielfokus, 'german_focus', 'aendern')
  expect(regeln(q)).not.toContain('fokus-spielcode-vorlage')
})

test('kaputter Code aus dem Spiel ist ein Fehler', () => {
  const [p, baumId] = importiereSpielbaum(basis(), sd, spielfokus, 'german_focus', 'aendern')
  const r = p.fokusbaeume.find(b => b.id === baumId).fokusse.find(f => f.spielId === 'GER_rhineland')
  const belohnung = r.belohnung.map(b => (b.art === 'code' ? { ...b, werte: { code: 'GER = {' } } : b))
  expect(fehler(aendereFokus(p, baumId, r.id, { belohnung }))).toContain('baustein')
})
