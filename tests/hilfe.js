// Gemeinsame Testhilfen.
import { erstelleMiniSpielordner } from '../src/selbsttest/mini-spielordner.js'
import { dateiquelleAusObjekt } from '../src/leser/dateiquelle.js'
import { leseSpielordner } from '../src/leser/spielordner.js'

let zwischenspeicher = null

/** Spieldaten des Mini-Spielordners (einmal gelesen, danach zwischengespeichert). */
export async function miniSpieldaten() {
  if (!zwischenspeicher) zwischenspeicher = await leseSpielordner(dateiquelleAusObjekt(erstelleMiniSpielordner()))
  return zwischenspeicher.spieldaten
}

/** Inhalt einer erzeugten Datei als Text; wirft, wenn der Pfad fehlt. */
export function text(dateien, pfad) {
  const d = dateien.find(x => x.pfad === pfad)
  if (!d) throw new Error(`Datei fehlt: ${pfad}\nVorhanden:\n${dateien.map(x => x.pfad).join('\n')}`)
  return typeof d.inhalt === 'string' ? d.inhalt : new TextDecoder().decode(d.inhalt)
}
