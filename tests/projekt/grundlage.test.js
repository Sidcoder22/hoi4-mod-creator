import { test, expect } from 'vitest'
import { dateiquelleAusObjekt } from '../../src/leser/dateiquelle.js'
import { fuegeGrundlageHinzu, entferneGrundlage, ueberlagerung, grundlageDaten } from '../../src/projekt/grundlage.js'

const mod = (name, dateien = {}, extra = {}) => ({ name, version: '1', id: null, replacePaths: [], quelle: dateiquelleAusObjekt(dateien), ...extra })

test('fuegeGrundlageHinzu hängt an und ersetzt gleichen Namen an seiner Stelle', () => {
  let l = fuegeGrundlageHinzu([], mod('A'))
  l = fuegeGrundlageHinzu(l, mod('B'))
  const neuA = mod('A', {}, { version: '2' })
  l = fuegeGrundlageHinzu(l, neuA)
  expect(l.map(m => m.name)).toEqual(['A', 'B'])
  expect(l[0]).toBe(neuA)
})

test('entferneGrundlage', () => {
  expect(entferneGrundlage([mod('A'), mod('B'), mod('C')], 1).map(m => m.name)).toEqual(['A', 'C'])
})

test('ueberlagerung ohne Mods ist die Spielquelle selbst', () => {
  const spiel = dateiquelleAusObjekt({ 'a.txt': 'a' })
  expect(ueberlagerung(spiel, [])).toBe(spiel)
})

test('ueberlagerung mit Mod: Spielordner neu eingelesen behält die Mods', async () => {
  const liste = [mod('M', { 'a.txt': 'mod' })]
  const erst = ueberlagerung(dateiquelleAusObjekt({ 'a.txt': 'spiel 1' }), liste)
  const neu = ueberlagerung(dateiquelleAusObjekt({ 'a.txt': 'spiel 2', 'b.txt': 'b' }), liste)
  expect(await erst.text('a.txt')).toBe('mod')
  expect(await neu.text('a.txt')).toBe('mod')
  expect(await neu.text('b.txt')).toBe('b')
  expect(neu.ebenenName(1)).toBe('M')
})

test('grundlageDaten', () => {
  expect(grundlageDaten([mod('A', {}, { id: '7' })])).toEqual([{ name: 'A', version: '1', id: '7' }])
})
