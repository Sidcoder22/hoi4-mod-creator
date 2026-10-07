// Sprachdateien (localisation/*.yml) lesen und schreiben.

const EINTRAG = /^([^\s:"#]+):(\d*)\s*"(.*)"/

/**
 * Liest eine Sprachdatei.
 * @returns {{ sprache: string|null, eintraege: Map<string,string> }}
 */
export function parseYml(text) {
  let sprache = null
  const eintraege = new Map()
  for (const roh of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const zeile = roh.trim()
    if (!zeile || zeile.startsWith('#')) continue
    const kopf = /^l_(\w+):\s*(#.*)?$/.exec(zeile)
    if (kopf) {
      sprache = kopf[1]
      continue
    }
    const m = EINTRAG.exec(zeile)
    if (m) eintraege.set(m[1], m[3].replace(/\\"/g, '"'))
  }
  return { sprache, eintraege }
}

/**
 * Schreibt eine Sprachdatei: UTF-8 mit BOM, CRLF.
 * @param {'german'|'english'} sprache
 * @param {Array<[string, string]>} eintraege
 * @returns {Uint8Array}
 */
export function schreibeYml(sprache, eintraege) {
  let text = `l_${sprache}:\r\n`
  for (const [schluessel, wert] of eintraege) {
    const maskiert = String(wert).replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')
    text += ` ${schluessel}:0 "${maskiert}"\r\n`
  }
  const inhalt = new TextEncoder().encode(text)
  const mitBom = new Uint8Array(inhalt.length + 3)
  mitBom.set([0xEF, 0xBB, 0xBF])
  mitBom.set(inhalt, 3)
  return mitBom
}
