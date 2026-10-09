// Kontext fuer die Bausteine: wandelt Projekt-IDs in Spielkennungen um (Fokusse, Events, Entscheidungen).

import { geistKennung, fokusKennung, merkerKennung, fraktionKennung, eventKennung } from './kennungen.js'

export function bausteinKontext(k, quelle) {
  const { projekt } = k
  const alleFokusse = (projekt.fokusbaeume ?? []).flatMap(b => b.fokusse)
  const event = (id) => (projekt.events ?? []).find(x => x.id === id)
  return {
    sprache: k.sprache,
    quelle,
    kennung: {
      geist: (id) => { const g = projekt.ideen.find(x => x.id === id); return g ? geistKennung(projekt, g) : 'unbekannt' },
      fokus: (id) => { const f = alleFokusse.find(x => x.id === id); return f ? fokusKennung(projekt, f) : 'unbekannt' },
      merker: (t) => merkerKennung(projekt, t),
      fraktion: (id) => fraktionKennung(projekt, id),
      event: (id) => { const ev = event(id); return ev ? eventKennung(projekt, ev) : 'unbekannt' },
      eventLand: (id) => event(id)?.land || '',
    },
  }
}
