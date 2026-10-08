// Kennungen, Pfade und Zahlenformat fuer die erzeugte Mod.

import { transliteriere } from '../projekt/modell.js'

export function modPfad(modid, rest) {
  return `mod/${modid}/${rest}`
}

export function geistKennung(p, geist) {
  return `${p.mod.modid}_geist_${geist.nummer}`
}

export function anfuehrerKennung(p, land) {
  return `${p.mod.modid}_${land.tag.toLowerCase()}_anfuehrer`
}

/** Dateiname nur aus Buchstaben, Ziffern und Leerzeichen. */
export function asciiDateiname(text) {
  return transliteriere(text).replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Zahl mit hoechstens `stellen` Nachkommastellen (Vorgabe 3), ohne Nullen am Ende. */
export function zahl(x, stellen = 3) {
  const faktor = 10 ** stellen
  const gerundet = Math.round(Number(x) * faktor) / faktor
  return String(Object.is(gerundet, -0) ? 0 : gerundet)
}

export function baumKennung(p, baum) {
  return `${p.mod.modid}_baum_${baum.nummer}`
}

export function fokusKennung(p, fokus) {
  return `${p.mod.modid}_fokus_${fokus.nummer}`
}

/** Merker aus Freitext: «Armee Reform» → <modid>_armee_reform */
export function merkerKennung(p, text) {
  const teil = transliteriere(String(text ?? '')).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30)
  return `${p.mod.modid}_${teil || 'merker'}`
}

export function fraktionKennung(p, bausteinId) {
  return `${p.mod.modid}_fraktion_${bausteinId}`
}

export function eigenschaftKennung(p, eigenschaft) {
  return `${p.mod.modid}_eigenschaft_${eigenschaft.nummer}`
}
