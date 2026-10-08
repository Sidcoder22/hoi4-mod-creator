import { test, expect } from 'vitest'
import { zielAnsicht } from '../../src/ui/pruefung.jsx'

test('Sprungziel fuer Fokus-Meldungen', () => {
  expect(zielAnsicht({ bereich: 'fokus', id: 'b1', fokus: 'f1' })).toEqual({ bereich: 'fokus', id: 'b1', fokus: 'f1' })
  expect(zielAnsicht({ bereich: 'fokus' })).toEqual({ bereich: 'fokusbaeume' })
})
