// Reine Aenderungsfunktionen fuer Divisionsvorlagen und Startverbaende eines Landes (Etappe 4e).

import { neueId } from './modell.js'
import { zaehle } from './zaehler.js'

const leereSpalte = () => [null, null, null, null, null]
const leeresRaster = () => [leereSpalte(), leereSpalte(), leereSpalte(), leereSpalte(), leereSpalte()]

function mitArmee(p, landId, fn) {
  return { ...p, laender: p.laender.map(l => (l.id === landId ? { ...l, armee: fn(structuredClone(l.armee ?? { vorlagen: [], verbaende: [] })) } : l)) }
}

/** Vorgabe fuer neue Laender: «Infanterie-Division» (2 × 3 Infanterie) und anzahl Divisionen in der Hauptstadt. */
export function standardArmee(p, anzahl = 6) {
  const [q, nummer] = zaehle(p, 'vorlage')
  const bataillone = leeresRaster()
  for (const spalte of [0, 1]) for (const zeile of [0, 1, 2]) bataillone[spalte][zeile] = 'infantry'
  const vorlage = { id: neueId(), nummer, name: 'Infanterie-Division', bataillone, unterstuetzung: leereSpalte() }
  const verbaende = anzahl > 0 ? [{ id: neueId(), vorlage: vorlage.id, anzahl, staat: null }] : []
  return [q, { vorlagen: [vorlage], verbaende }]
}

/** Wandelt das alte Feld armee.divisionen (bis Etappe 4d) in Vorlagen und Verbaende um. */
export function wandleAlteArmee(p) {
  let q = p
  const laender = p.laender.map(l => {
    if (Array.isArray(l.armee?.vorlagen)) return l
    if (l.art !== 'neu') return { ...l, armee: { vorlagen: [], verbaende: [] } }
    let armee
    ;[q, armee] = standardArmee(q, Math.max(0, Math.round(Number(l.armee?.divisionen) || 0)))
    return { ...l, armee }
  })
  return { ...q, laender }
}

export function fuegeVorlageHinzu(p, landId) {
  const id = neueId()
  const [q, nummer] = zaehle(p, 'vorlage')
  return [mitArmee(q, landId, a => ({ ...a, vorlagen: [...a.vorlagen, { id, nummer, name: `Neue Vorlage ${nummer}`, bataillone: leeresRaster(), unterstuetzung: leereSpalte() }] })), id]
}

export function aendereVorlage(p, landId, vorlageId, patch) {
  return mitArmee(p, landId, a => ({ ...a, vorlagen: a.vorlagen.map(v => (v.id === vorlageId ? { ...v, ...structuredClone(patch) } : v)) }))
}

/** bereich: 'bataillon' (spalte, zeile) oder 'unterstuetzung' (nur zeile). */
export function setzeZelle(p, landId, vorlageId, bereich, spalte, zeile, artId) {
  return mitArmee(p, landId, a => ({
    ...a,
    vorlagen: a.vorlagen.map(v => {
      if (v.id !== vorlageId) return v
      if (bereich === 'unterstuetzung') v.unterstuetzung[zeile] = artId || null
      else v.bataillone[spalte][zeile] = artId || null
      return v
    }),
  }))
}

/** Entfernt die Vorlage und alle Verbaende, die sie benutzen. */
export function entferneVorlage(p, landId, vorlageId) {
  return mitArmee(p, landId, a => ({ vorlagen: a.vorlagen.filter(v => v.id !== vorlageId), verbaende: a.verbaende.filter(x => x.vorlage !== vorlageId) }))
}

export function fuegeVerbandHinzu(p, landId, vorlageId) {
  const id = neueId()
  return [mitArmee(p, landId, a => ({ ...a, verbaende: [...a.verbaende, { id, vorlage: vorlageId ?? a.vorlagen[0]?.id ?? null, anzahl: 1, staat: null }] })), id]
}

export function aendereVerband(p, landId, verbandId, patch) {
  return mitArmee(p, landId, a => ({ ...a, verbaende: a.verbaende.map(x => (x.id === verbandId ? { ...x, ...structuredClone(patch) } : x)) }))
}

export function entferneVerband(p, landId, verbandId) {
  return mitArmee(p, landId, a => ({ ...a, verbaende: a.verbaende.filter(x => x.id !== verbandId) }))
}

/** Summe der Kampfbreite der Bataillone (Kompanien zaehlen nicht). */
export function kampfbreite(sd, vorlage) {
  const breite = new Map((sd.einheitenArten ?? []).map(e => [e.id, e.kampfbreite]))
  return vorlage.bataillone.flat().filter(Boolean).reduce((summe, art) => summe + (breite.get(art) ?? 0), 0)
}
