import { test, expect } from 'vitest'
import { zielAnsicht } from '../../src/ui/pruefung.jsx'

test('Sprungziel fuer Fokus-Meldungen', () => {
  expect(zielAnsicht({ bereich: 'fokus', id: 'b1', fokus: 'f1' })).toEqual({ bereich: 'fokus', id: 'b1', fokus: 'f1' })
  expect(zielAnsicht({ bereich: 'fokus' })).toEqual({ bereich: 'fokusbaeume' })
})

test('Sprungziele fuer Events, Entscheidungen und Kategorien', () => {
  expect(zielAnsicht({ bereich: 'event', id: 'x' })).toEqual({ bereich: 'event', id: 'x' })
  expect(zielAnsicht({ bereich: 'event' })).toEqual({ bereich: 'events' })
  expect(zielAnsicht({ bereich: 'entscheidung', id: 'd' })).toEqual({ bereich: 'entscheidung', id: 'd' })
  expect(zielAnsicht({ bereich: 'kategorie', id: 'k' })).toEqual({ bereich: 'kategorie', id: 'k' })
  expect(zielAnsicht({ bereich: 'entscheidung' })).toEqual({ bereich: 'entscheidungen' })
})

test('Sprungziel fuer Staaten', () => {
  expect(zielAnsicht({ bereich: 'staat', id: 3 })).toEqual({ bereich: 'staat', id: 3 })
  expect(zielAnsicht({ bereich: 'staat' })).toEqual({ bereich: 'staaten' })
})
