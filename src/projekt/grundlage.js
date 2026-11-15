// Mods als Grundlage (Etappe 4g): die gewaehlten Mod-Ordner der laufenden Sitzung.

import { dateiquelleUeberlagert } from '../leser/dateiquelle.js'

/** Gleicher Name ersetzt den Eintrag an seiner Stelle, sonst wird angehaengt. */
export function fuegeGrundlageHinzu(liste, mod) {
  const i = liste.findIndex(m => m.name === mod.name)
  return i < 0 ? [...liste, mod] : liste.map((m, j) => (j === i ? mod : m))
}

export function entferneGrundlage(liste, i) {
  return liste.filter((_, j) => j !== i)
}

export function ueberlagerung(spielQuelle, liste) {
  return liste.length ? dateiquelleUeberlagert(spielQuelle, liste) : spielQuelle
}

export function grundlageDaten(liste) {
  return liste.map(({ name, version, id }) => ({ name, version, id }))
}
