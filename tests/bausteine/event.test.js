import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { erzeugeWirkungen, pruefeBausteine, satzText, neueWirkung, wirkungsDef } from '../../src/bausteine/erzeugen.js'
import { bausteinKontext } from '../../src/erzeuger/baustein-kontext.js'
import { eventKennung, entscheidungKennung, kategorieKennung } from '../../src/erzeuger/kennungen.js'
import { fuegeEventHinzu, aendereEvent } from '../../src/projekt/events.js'
import { schreibeParadox, parseParadox } from '../../src/leser/paradox.js'

const sd = await miniSpieldaten()
let projekt = testprojekt(sd)
let e1, e2
;[projekt, e1] = fuegeEventHinzu(projekt, sd)
;[projekt, e2] = fuegeEventHinzu(projekt, sd)
projekt = aendereEvent(aendereEvent(projekt, e1, { titel: 'Volksfest' }), e2, { land: 'GER' })
const kontext = { projekt, spieldaten: sd }
const k = bausteinKontext({ projekt, sprache: { setze() {} } }, 'quelle')
const text = (eintraege) => schreibeParadox(eintraege)
const w = (art, werte = {}) => { const b = neueWirkung(art); return { ...b, werte: { ...b.werte, ...werte } } }
const modid = projekt.mod.modid

test('Kennungen fuer Events, Entscheidungen, Kategorien', () => {
  expect(eventKennung(projekt, { nummer: 3 })).toBe(`${modid}.3`)
  expect(entscheidungKennung(projekt, { nummer: 2 })).toBe(`${modid}_entscheidung_2`)
  expect(kategorieKennung(projekt, { nummer: 1 })).toBe(`${modid}_kategorie_1`)
  expect(k.kennung.event(e1)).toBe(`${modid}.1`)
  expect(k.kennung.eventLand(e2)).toBe('GER')
  expect(k.kennung.eventLand(e1)).toBe('')
  expect(k.kennung.event('weg')).toBe('unbekannt')
})

test('Event ausloesen: sofort, mit Verzoegerung und fuer ein bestimmtes Land', () => {
  expect(neueWirkung('event').werte).toEqual({ event: '', tage: 0 })
  expect(text(erzeugeWirkungen([w('event', { event: e1, tage: 0 })], k))).toBe(`country_event = {\n\tid = ${modid}.1\n}\n`)
  expect(text(erzeugeWirkungen([w('event', { event: e2, tage: 7 })], k))).toBe(`GER = {\n\tcountry_event = {\n\t\tid = ${modid}.2\n\t\tdays = 7\n\t}\n}\n`)
  // Die Kennung mit Punkt bleibt beim strengen Zuruecklesen ein Wort
  const zurueck = parseParadox(text(erzeugeWirkungen([w('event', { event: e1 })], k)), { streng: true }).eintraege
  expect(zurueck[0].wert.inhalt[0].wert).toMatchObject({ typ: 'wort', text: `${modid}.1` })
})

test('Event ausloesen pruefen und anzeigen', () => {
  expect(pruefeBausteine([w('event', { event: e1, tage: 5 })], kontext, 'Fokus A')).toEqual([])
  expect(pruefeBausteine([w('event', { event: 'weg' })], kontext, 'Fokus A')[0].text).toMatch(/Event wurde gelöscht/)
  expect(pruefeBausteine([w('event', { event: '' })], kontext, 'Fokus A')[0].text).toMatch(/Event fehlt/)
  expect(pruefeBausteine([w('event', { event: e1, tage: 400 })], kontext, 'Fokus A')[0].text).toMatch(/Verzögerung/)
  expect(satzText(wirkungsDef('event'), { event: e1, tage: 5 }, kontext)).toBe('Event «Volksfest» auslösen – nach 5 Tagen')
  expect(satzText(wirkungsDef('event'), { event: e1, tage: 0 }, kontext)).toBe('Event «Volksfest» auslösen')
  expect(satzText(wirkungsDef('event'), { event: e2, tage: 0 }, kontext)).toBe('Event «(ohne Titel)» auslösen')
})

test('Review Focus 2: geloeschtes Event wirft beim Erzeugen nicht', () => {
  expect(() => erzeugeWirkungen([w('event', { event: 'weg' })], k)).not.toThrow()
})

test('Etappe 4a: Verzoegerung nur in ganzen Tagen', () => {
  expect(pruefeBausteine([w('event', { event: e1, tage: 1.5 })], kontext, 'A')[0].text).toMatch(/ganze Zahl/)
  expect(pruefeBausteine([w('event', { event: e1, tage: 2 })], kontext, 'A')).toEqual([])
})
