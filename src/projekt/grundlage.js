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

/** Chrome laesst Webseiten nicht in den Ordner Library des Macs; dort liegen die Workshop-Mods von Steam. */
export function brauchtKopie(mod) {
  return !!mod.absolut && /^\/Users\/[^/]+\/Library\//.test(mod.pfad || '')
}

const inHochkommas = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`

/** Terminal-Befehl: klont den Mod-Ordner nach Dokumente/HOI4-Grundlagen (APFS-Klon, sofort und ohne Zusatzspeicher). */
export function kopierBefehl(mod) {
  const bereinigt = String(mod.name || '').replace(/[^\p{L}\p{N} _-]/gu, ' ').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()
  const ordner = /[A-Za-z0-9]/.test(bereinigt) ? bereinigt : (mod.id || 'Mod')
  const ziel = `~/Documents/HOI4-Grundlagen/${inHochkommas(ordner)}`
  return `mkdir -p ~/Documents/HOI4-Grundlagen && rm -rf ${ziel} && cp -Rc ${inHochkommas(mod.pfad)} ${ziel}`
}
