import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { pruefeProjekt } from '../../src/pruefung/regeln.js'
import { setzeModFeld } from '../../src/projekt/aenderungen.js'

const sd = await miniSpieldaten()
const meldung = (p, s) => pruefeProjekt(p, s).find(m => m.regel === 'grundlage-abweichend')

test('grundlage-abweichend: Projekt ohne Grundlage, eingelesen mit Mod', () => {
  const m = meldung(testprojekt(sd), { ...sd, grundlage: [{ name: 'Mini-Reich', version: '2.0', id: '424242' }] })
  expect(m).toEqual({
    regel: 'grundlage-abweichend', schwere: 'fehler', ziel: { bereich: 'einstellungen' },
    text: 'Dieses Projekt baut auf «Nur das Spiel» auf, eingelesen ist aber «Mini-Reich». Lies den Spielordner mit der richtigen Grundlage ein oder stelle sie in den Einstellungen um.',
  })
})

test('grundlage-abweichend: gleiche Namen geben keinen Fehler', () => {
  const p = setzeModFeld(testprojekt(sd), 'grundlage', [{ name: 'Mini-Reich', id: '424242' }])
  expect(meldung(p, { ...sd, grundlage: [{ name: 'Mini-Reich', version: '2.0', id: '424242' }] })).toBeUndefined()
})

test('grundlage-abweichend: Spieldaten ohne Feld grundlage und Projekt mit [] geben keinen Fehler', () => {
  const ohne = { ...sd }
  delete ohne.grundlage
  expect(meldung(testprojekt(sd), ohne)).toBeUndefined()
})

test('grundlage-abweichend: Reihenfolge zählt', () => {
  const p = setzeModFeld(testprojekt(sd), 'grundlage', [{ name: 'A', id: null }, { name: 'B', id: null }])
  expect(meldung(p, { ...sd, grundlage: [{ name: 'B' }, { name: 'A' }] })?.text).toContain('«A + B»')
})
