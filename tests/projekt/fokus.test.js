import { test, expect } from 'vitest'
import { miniSpieldaten } from '../hilfe.js'
import { neuesProjekt, ladeProjektAusJson } from '../../src/projekt/modell.js'
import { fuegeBaumHinzu, aendereBaum, entferneBaum, fuegeFokusHinzu, aendereFokus, verschiebeFokus, entferneFokus,
  setzeVoraussetzung, setzeAusschluss, fokusZyklus, alleFokusse } from '../../src/projekt/fokus.js'

const sd = await miniSpieldaten()
const fokus = (p, id) => p.fokusbaeume.flatMap(b => b.fokusse).find(f => f.id === id)

function aufbau() {
  let [p, b] = fuegeBaumHinzu(neuesProjekt('M'), 'MRE', 'Weg zur Grösse')
  let a, c
  ;[p, a] = fuegeFokusHinzu(p, sd, b, 0, 0)
  ;[p, c] = fuegeFokusHinzu(p, sd, b, 1, 1)
  return { p, b, a, c }
}

test('neues Projekt hat Fokusbaeume und Zaehler', () => {
  const p = neuesProjekt('M')
  expect(p.fokusbaeume).toEqual([])
  expect(p.zaehler).toEqual({ geist: 0, baum: 0, fokus: 0, fraktion: 0 })
})

test('Baum und Fokusse anlegen', () => {
  const { p, b, a } = aufbau()
  expect(p.fokusbaeume[0]).toMatchObject({ id: b, nummer: 1, name: 'Weg zur Grösse', land: 'MRE' })
  expect(p.fokusbaeume[0].fokusse.map(f => f.nummer)).toEqual([1, 2])
  expect(fokus(p, a)).toEqual({ id: a, nummer: 1, name: '', beschreibung: '', x: 0, y: 0, dauer: 10,
    symbol: { art: 'spiel', sprite: 'GFX_goal_generic_army_doctrines' }, voraussetzungen: [], voraussetzungsArt: 'alle',
    ausschluss: [], verfuegbar: { modus: 'alle', liste: [] }, belohnung: [], kiGewicht: 1 })
  expect(fuegeFokusHinzu(p, sd, b, 0, 0)[1]).toBeNull()
  expect(aendereBaum(p, b, { name: 'Neu' }).fokusbaeume[0].name).toBe('Neu')
  expect(aendereFokus(p, b, a, { name: 'A' }).fokusbaeume[0].fokusse[0].name).toBe('A')
  expect(entferneBaum(p, b).fokusbaeume).toEqual([])
  expect(alleFokusse(p).map(x => x.fokus.id)).toEqual([a, expect.any(String)])
})

test('Verschieben nur auf freie Felder (Review Focus 3)', () => {
  const { p, b, c } = aufbau()
  expect(verschiebeFokus(p, b, c, 0, 0)).toBe(p)
  expect(verschiebeFokus(p, b, c, -1, 0)).toBe(p)
  expect(fokus(verschiebeFokus(p, b, c, 3, 2), c)).toMatchObject({ x: 3, y: 2 })
})

test('Voraussetzungen, Ausschluss, Kreis, Loeschen (Review Focus 2)', () => {
  let { p, b, a, c } = aufbau()
  p = setzeVoraussetzung(p, b, a, c, true)
  expect(fokus(p, c).voraussetzungen).toEqual([a])
  expect(setzeVoraussetzung(p, b, a, a, true)).toBe(p)
  expect(fokus(setzeVoraussetzung(p, b, a, c, false), c).voraussetzungen).toEqual([])
  p = setzeAusschluss(p, b, a, c, true)
  expect([fokus(p, a).ausschluss, fokus(p, c).ausschluss]).toEqual([[c], [a]])
  expect(fokusZyklus(p.fokusbaeume[0])).toBeNull()
  expect(fokusZyklus(setzeVoraussetzung(p, b, c, a, true).fokusbaeume[0])).toEqual(expect.arrayContaining([a, c]))
  const ohne = entferneFokus(p, b, a)
  expect(fokus(ohne, c)).toMatchObject({ voraussetzungen: [], ausschluss: [] })
  expect(ohne.fokusbaeume[0].fokusse.length).toBe(1)
})

test('alte Projektdatei bekommt die neuen Felder', () => {
  const alt = { ...neuesProjekt('A'), zaehler: { geist: 2 } }
  delete alt.fokusbaeume
  const p = ladeProjektAusJson(JSON.stringify(alt))
  expect(p.zaehler).toEqual({ geist: 2, baum: 0, fokus: 0, fraktion: 0 })
  expect(p.fokusbaeume).toEqual([])
})
