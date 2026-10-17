// Reine Aenderungsfunktionen fuer neue Personen eines Landes (Generaele, Feldmarschaelle, Admirale, Berater).

import { neueId } from './modell.js'
import { zaehle } from './zaehler.js'

export const ROLLEN = ['general', 'feldmarschall', 'admiral', 'berater']
export const BERATER_PLAETZE = ['political_advisor', 'army_chief', 'navy_chief', 'air_chief', 'high_command', 'theorist']

/** Felder, die von der Rolle abhaengen, mit ihren Vorgaben. */
export function vorgabenFuer(rolle) {
  if (rolle === 'berater') return { platz: 'political_advisor', kosten: 150, beraterEigenschaft: null }
  if (rolle === 'admiral') return { stufe: 1, werte: { angriff: 1, verteidigung: 1, manoever: 1, koordination: 1 }, eigenschaften: [] }
  return { stufe: 1, werte: { angriff: 1, verteidigung: 1, planung: 1, logistik: 1 }, eigenschaften: [] }
}

function mitLand(p, landId, fn) {
  return { ...p, laender: p.laender.map(l => (l.id === landId ? { ...l, personen: fn(l.personen ?? []) } : l)) }
}

export function fuegePersonHinzu(p, sd, landId, rolle) {
  const id = neueId()
  const [q, nummer] = zaehle(p, 'person')
  const person = { id, nummer, rolle, name: '', bild: { art: 'spiel', pfad: sd?.portraets?.[0] ?? null }, ...vorgabenFuer(rolle) }
  return [mitLand(q, landId, liste => [...liste, person]), id]
}

/** Aendert eine Person; bei neuer Rolle gelten deren Vorgaben, nur Name und Bild bleiben. */
export function aenderePerson(p, sd, landId, personId, patch) {
  return mitLand(p, landId, liste => liste.map(x => {
    if (x.id !== personId) return x
    const neu = structuredClone(patch)
    if (neu.rolle && neu.rolle !== x.rolle) {
      return { id: x.id, nummer: x.nummer, name: x.name, bild: x.bild, ...vorgabenFuer(neu.rolle), ...neu }
    }
    return { ...x, ...neu }
  }))
}

export function entfernePerson(p, landId, personId) {
  return mitLand(p, landId, liste => liste.filter(x => x.id !== personId))
}
