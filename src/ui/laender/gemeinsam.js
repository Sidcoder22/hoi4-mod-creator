// Hilfen fuer die Reiter des Land-Editors.
import { aktionen } from '../zustand.js'
import { aendereLand } from '../../projekt/aenderungen.js'

/** Aendert Felder eines Landes; gruppe fasst Tippen zu einem Rueckgaengig-Schritt zusammen. */
export function aendereFeld(land, patch, gruppe) {
  aktionen.aendere((p, sd) => aendereLand(p, sd, land.id, patch), { gruppe: gruppe ? `land:${land.id}:${gruppe}` : undefined })
}

/** Darf der Reiter bearbeitet werden? Neue Laender immer, geaenderte nur mit Schalter. */
export function bearbeitbar(land, reiter) {
  return land.art === 'neu' || !!land.aendern?.[reiter]
}
