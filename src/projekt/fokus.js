// Reine Aenderungsfunktionen fuer Fokusbaeume und Fokusse.

import { neueId } from './modell.js'

const STANDARD_SYMBOL = 'GFX_goal_generic_construct_civ_factory'

function mitBaum(p, baumId, fn) {
  return { ...p, fokusbaeume: p.fokusbaeume.map(b => (b.id === baumId ? fn(structuredClone(b)) : b)) }
}

function zaehle(p, art) {
  const nummer = (p.zaehler?.[art] ?? 0) + 1
  return [{ ...p, zaehler: { ...p.zaehler, [art]: nummer } }, nummer]
}

export function fuegeBaumHinzu(p, land, name) {
  const id = neueId()
  const [q, nummer] = zaehle(p, 'baum')
  return [{ ...q, fokusbaeume: [...(q.fokusbaeume ?? []), { id, nummer, name: name || 'Neuer Fokusbaum', land, fokusse: [] }] }, id]
}

export function aendereBaum(p, baumId, patch) {
  return mitBaum(p, baumId, b => ({ ...b, ...structuredClone(patch) }))
}

export function entferneBaum(p, baumId) {
  return { ...p, fokusbaeume: p.fokusbaeume.filter(b => b.id !== baumId) }
}

const besetzt = (baum, x, y, ohneId) => baum.fokusse.some(f => f.id !== ohneId && f.x === x && f.y === y)

/** Legt einen Fokus auf einem freien Feld an; auf einem besetzten Feld kommt [p, null] zurueck. */
export function fuegeFokusHinzu(p, sd, baumId, x, y) {
  const baum = p.fokusbaeume.find(b => b.id === baumId)
  if (!baum || x < 0 || y < 0 || besetzt(baum, x, y)) return [p, null]
  const id = neueId()
  const [q, nummer] = zaehle(p, 'fokus')
  const fokus = {
    id, nummer, name: '', beschreibung: '', x, y, dauer: 10,
    symbol: { art: 'spiel', sprite: sd?.fokusSymbole?.includes(STANDARD_SYMBOL) ? STANDARD_SYMBOL : (sd?.fokusSymbole?.[0] ?? STANDARD_SYMBOL) },
    voraussetzungen: [], voraussetzungsArt: 'alle', ausschluss: [],
    verfuegbar: { modus: 'alle', liste: [] }, belohnung: [], kiGewicht: 1,
  }
  return [mitBaum(q, baumId, b => ({ ...b, fokusse: [...b.fokusse, fokus] })), id]
}

export function aendereFokus(p, baumId, fokusId, patch) {
  return mitBaum(p, baumId, b => ({ ...b, fokusse: b.fokusse.map(f => (f.id === fokusId ? { ...f, ...structuredClone(patch) } : f)) }))
}

/** Verschiebt nur auf ein freies Feld mit x, y >= 0; sonst bleibt das Projekt unveraendert. */
export function verschiebeFokus(p, baumId, fokusId, x, y) {
  const baum = p.fokusbaeume.find(b => b.id === baumId)
  if (!baum || x < 0 || y < 0 || besetzt(baum, x, y, fokusId)) return p
  return aendereFokus(p, baumId, fokusId, { x, y })
}

export function entferneFokus(p, baumId, fokusId) {
  return mitBaum(p, baumId, b => ({
    ...b,
    fokusse: b.fokusse.filter(f => f.id !== fokusId).map(f => ({
      ...f,
      voraussetzungen: f.voraussetzungen.filter(v => v !== fokusId),
      ausschluss: f.ausschluss.filter(v => v !== fokusId),
    })),
  }))
}

/** zu braucht von (an = true) bzw. nicht mehr (an = false). */
export function setzeVoraussetzung(p, baumId, vonId, zuId, an) {
  if (vonId === zuId) return p
  return mitBaum(p, baumId, b => ({
    ...b,
    fokusse: b.fokusse.map(f => {
      if (f.id !== zuId) return f
      const ohne = f.voraussetzungen.filter(v => v !== vonId)
      return { ...f, voraussetzungen: an ? [...ohne, vonId] : ohne }
    }),
  }))
}

/** Gegenseitiger Ausschluss, immer beidseitig gespeichert. */
export function setzeAusschluss(p, baumId, aId, bId, an) {
  if (aId === bId) return p
  return mitBaum(p, baumId, b => ({
    ...b,
    fokusse: b.fokusse.map(f => {
      const anderer = f.id === aId ? bId : f.id === bId ? aId : null
      if (!anderer) return f
      const ohne = f.ausschluss.filter(v => v !== anderer)
      return { ...f, ausschluss: an ? [...ohne, anderer] : ohne }
    }),
  }))
}

/** Liefert die Fokusse eines Kreises in den Voraussetzungen oder null. */
export function fokusZyklus(baum) {
  const nachId = new Map(baum.fokusse.map(f => [f.id, f]))
  const zustand = new Map()
  const pfad = []
  const besuche = (id) => {
    zustand.set(id, 'aktiv')
    pfad.push(id)
    for (const v of nachId.get(id)?.voraussetzungen ?? []) {
      if (!nachId.has(v)) continue
      if (zustand.get(v) === 'aktiv') return pfad.slice(pfad.indexOf(v))
      if (!zustand.has(v)) {
        const kreis = besuche(v)
        if (kreis) return kreis
      }
    }
    pfad.pop()
    zustand.set(id, 'fertig')
    return null
  }
  for (const f of baum.fokusse) {
    if (zustand.has(f.id)) continue
    const kreis = besuche(f.id)
    if (kreis) return kreis
  }
  return null
}

export function alleFokusse(p) {
  return (p.fokusbaeume ?? []).flatMap(baum => baum.fokusse.map(fokus => ({ baum, fokus })))
}
