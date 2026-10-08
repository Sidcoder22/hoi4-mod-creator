// Eigene Anfuehrer-Eigenschaften (wiederverwendbar fuer mehrere Anfuehrer).

import { neueId } from './modell.js'

export function fuegeEigenschaftHinzu(p) {
  const id = neueId()
  const nummer = (p.zaehler?.eigenschaft ?? 0) + 1
  return [{ ...p, eigenschaften: [...(p.eigenschaften ?? []), { id, nummer, name: '', beschreibung: '', boni: [] }], zaehler: { ...p.zaehler, eigenschaft: nummer } }, id]
}

export function aendereEigenschaft(p, id, patch) {
  return { ...p, eigenschaften: p.eigenschaften.map(e => (e.id === id ? { ...e, ...structuredClone(patch) } : e)) }
}

export function entferneEigenschaft(p, id) {
  return {
    ...p,
    eigenschaften: p.eigenschaften.filter(e => e.id !== id),
    laender: p.laender.map(l => {
      const liste = l.anfuehrer?.eigenschaften ?? []
      if (!liste.some(x => x.art === 'eigen' && x.id === id)) return l
      return { ...l, anfuehrer: { ...l.anfuehrer, eigenschaften: liste.filter(x => !(x.art === 'eigen' && x.id === id)) } }
    }),
  }
}
