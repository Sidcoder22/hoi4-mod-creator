// Hilfen fuer den Fokusbaum-Editor.
import { aktionen } from '../zustand.js'
import { aendereFokus } from '../../projekt/fokus.js'
import { landName } from '../../projekt/abgeleitet.js'

export const ZELLE_B = 110
export const ZELLE_H = 130

/** Aendert einen Fokus; patch ist ein Objekt oder (aktuellerFokus) → Objekt. */
export function aendereFokusFeld(baumId, fokusId, patch, gruppe) {
  aktionen.aendere((p) => {
    const f = p.fokusbaeume.find(b => b.id === baumId)?.fokusse.find(x => x.id === fokusId)
    if (!f) return p
    return aendereFokus(p, baumId, fokusId, typeof patch === 'function' ? patch(f) : patch)
  }, { gruppe: gruppe ? `fokus:${fokusId}:${gruppe}` : undefined })
}

/** Laender zur Auswahl: zuerst die des Projekts, dann alle Spiel-Laender nach Name. */
export function landOptionen(projekt, sd) {
  const eigene = projekt.laender.map(l => ({ wert: l.tag, text: `${landName(l.tag, projekt, sd)} (${l.art === 'neu' ? 'neues Land' : 'geändert'})` }))
  const vergeben = new Set(eigene.map(o => o.wert))
  const spiel = Object.keys(sd.laender).filter(t => !vergeben.has(t))
    .map(t => ({ wert: t, text: landName(t, projekt, sd) }))
    .sort((a, b) => a.text.localeCompare(b.text, 'de'))
  return [...eigene, ...spiel]
}
