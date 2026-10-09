import { test, expect } from 'vitest'
import { miniSpieldaten } from '../hilfe.js'
import { neuesProjekt, ergaenzeProjekt, ladeProjektAusJson } from '../../src/projekt/modell.js'
import { fuegeEventHinzu, aendereEvent, entferneEvent, fuegeAntwortHinzu, aendereAntwort, entferneAntwort } from '../../src/projekt/events.js'

const sd = await miniSpieldaten()

test('neues Event mit Vorgaben', () => {
  const [p, ev] = fuegeEventHinzu(neuesProjekt('M'), sd)
  expect(p.events[0]).toMatchObject({ id: ev, nummer: 1, titel: '', text: '', ausloeser: 'ausgeloest', land: '', datum: '1936.6.1', tage: 30, nurEinmal: true,
    bild: { art: 'spiel', sprite: 'GFX_report_event_generic_rally' }, bedingungen: { modus: 'alle', liste: [] } })
  expect(p.events[0].antworten).toEqual([expect.objectContaining({ text: 'Verstanden', kiProzent: 100, wirkungen: [] })])
  expect(p.zaehler.event).toBe(1)
  expect(fuegeEventHinzu(p, sd)[0].events[1].nummer).toBe(2)
})

test('Bild-Rueckfall ohne Spielbilder', () => {
  const [p] = fuegeEventHinzu(neuesProjekt('M'), { ...sd, eventBilder: ['GFX_report_event_x'] })
  expect(p.events[0].bild.sprite).toBe('GFX_report_event_x')
  expect(fuegeEventHinzu(neuesProjekt('M'), {})[0].events[0].bild.sprite).toBe('GFX_report_event_generic_rally')
})

test('Antworten: hoechstens vier, aendern, entfernen', () => {
  let [p, ev] = fuegeEventHinzu(neuesProjekt('M'), sd)
  p = fuegeAntwortHinzu(fuegeAntwortHinzu(fuegeAntwortHinzu(p, ev), ev), ev)
  expect(p.events[0].antworten).toHaveLength(4)
  expect(p.events[0].antworten[1]).toMatchObject({ text: '', kiProzent: 50, wirkungen: [] })
  expect(fuegeAntwortHinzu(p, ev)).toBe(p)
  const zweite = p.events[0].antworten[1].id
  p = aendereAntwort(p, ev, zweite, { text: 'Absagen', kiProzent: 20 })
  expect(p.events[0].antworten[1]).toMatchObject({ text: 'Absagen', kiProzent: 20 })
  p = entferneAntwort(p, ev, zweite)
  expect(p.events[0].antworten.map(a => a.id)).not.toContain(zweite)
})

test('Event aendern und entfernen', () => {
  let [p, ev] = fuegeEventHinzu(neuesProjekt('M'), sd)
  const patch = { titel: 'Volksfest', ausloeser: 'datum', land: 'MRE' }
  const q = aendereEvent(p, ev, patch)
  patch.titel = 'geaendert'
  expect(q.events[0]).toMatchObject({ titel: 'Volksfest', ausloeser: 'datum', land: 'MRE' })
  expect(p.events[0].titel).toBe('')
  expect(entferneEvent(q, ev).events).toEqual([])
})

test('Review Focus 5: altes Projekt ohne Events-Felder', () => {
  const alt = { ...neuesProjekt('A'), events: undefined, entscheidungen: undefined, kategorien: undefined, zaehler: { geist: 2 } }
  expect(ergaenzeProjekt(alt, sd)).toMatchObject({ events: [], entscheidungen: [], kategorien: [],
    zaehler: { geist: 2, event: 0, entscheidung: 0, kategorie: 0 } })
  const json = JSON.stringify(alt)
  expect(ladeProjektAusJson(json)).toMatchObject({ events: [], entscheidungen: [], kategorien: [] })
  expect(neuesProjekt('N')).toMatchObject({ events: [], entscheidungen: [], kategorien: [], zaehler: { event: 0, entscheidung: 0, kategorie: 0 } })
})
