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

/** Zahl mit hoechstens 3 Nachkommastellen, ohne Nullen am Ende. */
export function zahl(x) {
  const gerundet = Math.round(Number(x) * 1000) / 1000
  return String(Object.is(gerundet, -0) ? 0 : gerundet)
}
