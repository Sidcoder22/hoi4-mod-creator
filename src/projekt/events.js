// Reine Aenderungsfunktionen fuer Events und ihre Antworten.

import { neueId } from './modell.js'
import { zaehle } from './zaehler.js'

const STANDARD_BILD = 'GFX_report_event_generic_rally'
export const MAX_ANTWORTEN = 4

function mitEvent(p, eventId, fn) {
  return { ...p, events: p.events.map(ev => (ev.id === eventId ? fn(structuredClone(ev)) : ev)) }
}

const neueAntwort = (text, kiProzent) => ({ id: neueId(), text, wirkungen: [], kiProzent })

export function fuegeEventHinzu(p, sd) {
  const id = neueId()
  const [q, nummer] = zaehle(p, 'event')
  const bilder = sd?.eventBilder ?? []
  const event = {
    id, nummer, titel: '', text: '',
    bild: { art: 'spiel', sprite: bilder.includes(STANDARD_BILD) ? STANDARD_BILD : (bilder[0] ?? STANDARD_BILD) },
    ausloeser: 'ausgeloest', land: '', datum: '1936.6.1', tage: 30, nurEinmal: true,
    bedingungen: { modus: 'alle', liste: [] },
    antworten: [neueAntwort('Verstanden', 100)],
  }
  return [{ ...q, events: [...(q.events ?? []), event] }, id]
}

export function aendereEvent(p, eventId, patch) {
  return mitEvent(p, eventId, ev => ({ ...ev, ...structuredClone(patch) }))
}

export function entferneEvent(p, eventId) {
  return { ...p, events: p.events.filter(ev => ev.id !== eventId) }
}

/** Neue Antwort; bei vier Antworten bleibt das Projekt unveraendert. */
export function fuegeAntwortHinzu(p, eventId) {
  const ev = p.events.find(x => x.id === eventId)
  if (!ev || ev.antworten.length >= MAX_ANTWORTEN) return p
  return mitEvent(p, eventId, e => ({ ...e, antworten: [...e.antworten, neueAntwort('', 50)] }))
}

export function aendereAntwort(p, eventId, antwortId, patch) {
  return mitEvent(p, eventId, e => ({ ...e, antworten: e.antworten.map(a => (a.id === antwortId ? { ...a, ...structuredClone(patch) } : a)) }))
}

export function entferneAntwort(p, eventId, antwortId) {
  return mitEvent(p, eventId, e => ({ ...e, antworten: e.antworten.filter(a => a.id !== antwortId) }))
}
