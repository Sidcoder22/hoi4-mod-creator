// Leser und Schreiber fuer Paradox-Skriptdateien (Clausewitz-Format).
// Der Baum ist eine geordnete Liste, damit doppelte Schluessel erhalten bleiben.

export class ParadoxFehler extends Error {
  constructor(meldung, zeile) {
    super(`${meldung} (Zeile ${zeile})`)
    this.name = 'ParadoxFehler'
    this.zeile = zeile
  }
}

const LEER = new Set([' ', '\t', '\r', '\n', '﻿', '\f', '\v'])
const TRENNER = new Set(['{', '}', '=', '<', '>', '"', '#'])

function zerlege(text) {
  const tokens = []
  let i = 0
  let zeile = 1
  const n = text.length
  while (i < n) {
    const c = text[i]
    if (c === '\n') { zeile++; i++; continue }
    if (LEER.has(c)) { i++; continue }
    if (c === '#') {
      while (i < n && text[i] !== '\n') i++
      continue
    }
    if (c === '{') { tokens.push({ art: 'auf', zeile }); i++; continue }
    if (c === '}') { tokens.push({ art: 'zu', zeile }); i++; continue }
    if (c === '"') {
      const startZeile = zeile
      let s = ''
      i++
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\' && text[i + 1] === '"') { s += '"'; i += 2; continue }
        if (text[i] === '\n') zeile++
        s += text[i]
        i++
      }
      i++ // schliessendes Anfuehrungszeichen
      tokens.push({ art: 'text', text: s, zeile: startZeile })
      continue
    }
    if (c === '=' || c === '<' || c === '>' || ((c === '!' || c === '?') && text[i + 1] === '=')) {
      let op = c
      if (text[i + 1] === '=' && c !== '=') { op += '='; i++ }
      else if (c === '=' && text[i + 1] === '=') { i++ } // "==" wie "=" behandeln
      i++
      tokens.push({ art: 'op', text: op, zeile })
      continue
    }
    let s = ''
    while (i < n && !LEER.has(text[i]) && !TRENNER.has(text[i])) {
      if ((text[i] === '!' || text[i] === '?') && text[i + 1] === '=') break
      s += text[i]
      i++
    }
    tokens.push({ art: 'wort', text: s, zeile })
  }
  return tokens
}

/**
 * Liest einen Paradox-Text.
 * @returns {{ eintraege: Array, warnungen: string[] }}
 */
export function parseParadox(text, { streng = false } = {}) {
  const tokens = zerlege(text)
  const warnungen = []
  let pos = 0

  function warne(meldung, zeile) {
    if (streng) throw new ParadoxFehler(meldung, zeile)
    warnungen.push(`${meldung} (Zeile ${zeile})`)
  }

  function leseWert() {
    const t = tokens[pos]
    if (!t) return null
    if (t.art === 'auf') {
      pos++
      return { typ: 'block', inhalt: leseInhalt(t.zeile) }
    }
    if (t.art === 'wort') {
      pos++
      const naechstes = tokens[pos]
      if ((t.text === 'rgb' || t.text === 'hsv') && naechstes && naechstes.art === 'auf') {
        pos++
        return { typ: 'block', tag: t.text, inhalt: leseInhalt(naechstes.zeile) }
      }
      return { typ: 'wort', text: t.text }
    }
    if (t.art === 'text') {
      pos++
      return { typ: 'text', text: t.text }
    }
    return null
  }

  function leseInhalt(startZeile) {
    const inhalt = []
    const imBlock = startZeile !== undefined
    while (pos < tokens.length) {
      const t = tokens[pos]
      if (t.art === 'zu') {
        pos++
        if (imBlock) return inhalt
        warne('Ueberzaehlige schliessende Klammer', t.zeile)
        continue
      }
      if (t.art === 'op') {
        warne(`Operator "${t.text}" ohne Schluessel`, t.zeile)
        pos++
        continue
      }
      const naechstes = tokens[pos + 1]
      if ((t.art === 'wort' || t.art === 'text') && naechstes && naechstes.art === 'op') {
        pos += 2
        const wert = leseWert()
        if (!wert) {
          warne(`Wert fuer "${t.text}" fehlt`, t.zeile)
          continue
        }
        inhalt.push({ schluessel: t.text, op: naechstes.text, wert })
        continue
      }
      // "schluessel { ... }" ohne Gleichheitszeichen
      if (t.art === 'wort' && t.text !== 'rgb' && t.text !== 'hsv' && naechstes && naechstes.art === 'auf') {
        pos += 2
        inhalt.push({ schluessel: t.text, op: '=', wert: { typ: 'block', inhalt: leseInhalt(naechstes.zeile) } })
        continue
      }
      const wert = leseWert()
      if (wert) inhalt.push(wert)
      else pos++
    }
    if (imBlock) warne('Schliessende Klammer fehlt am Dateiende', startZeile)
    return inhalt
  }

  const eintraege = leseInhalt(undefined)
  return { eintraege, warnungen }
}

function istEintrag(x) {
  return x && typeof x === 'object' && 'schluessel' in x
}

function textMaskiert(s) {
  return '"' + String(s).replace(/"/g, '\\"') + '"'
}

function wertZuText(wert, einzug) {
  if (wert.typ === 'wort') return wert.text
  if (wert.typ === 'text') return textMaskiert(wert.text)
  const praefix = wert.tag ? wert.tag + ' ' : ''
  const inhalt = wert.inhalt
  if (inhalt.length === 0) return praefix + '{ }'
  const einfach = inhalt.every(x => !istEintrag(x) && x.typ !== 'block')
  if (einfach) return praefix + '{ ' + inhalt.map(x => wertZuText(x, 0)).join(' ') + ' }'
  return praefix + '{\n' + zeilen(inhalt, einzug + 1) + '\t'.repeat(einzug) + '}'
}

function zeilen(inhalt, einzug) {
  let s = ''
  for (const x of inhalt) {
    s += '\t'.repeat(einzug)
    if (istEintrag(x)) s += `${x.schluessel} ${x.op} ${wertZuText(x.wert, einzug)}`
    else s += wertZuText(x, einzug)
    s += '\n'
  }
  return s
}

/** Schreibt einen Baum wieder als Paradox-Text. */
export function schreibeParadox(inhalt) {
  return zeilen(inhalt, 0)
}

/** Erster Eintrag mit diesem Schluessel. */
export function finde(inhalt, schluessel) {
  if (!inhalt) return undefined
  return inhalt.find(x => istEintrag(x) && x.schluessel === schluessel)
}

/** Alle Eintraege mit diesem Schluessel, in Reihenfolge. */
export function findeAlle(inhalt, schluessel) {
  if (!inhalt) return []
  return inhalt.filter(x => istEintrag(x) && x.schluessel === schluessel)
}

/** Wie finde, aber ohne Ruecksicht auf Gross-/Kleinschreibung (Clausewitz-Schluessel). */
export function findeI(inhalt, schluessel) {
  if (!inhalt) return undefined
  const k = schluessel.toLowerCase()
  return inhalt.find(x => istEintrag(x) && x.schluessel.toLowerCase() === k)
}

/** Wie findeAlle, aber ohne Ruecksicht auf Gross-/Kleinschreibung. */
export function findeAlleI(inhalt, schluessel) {
  if (!inhalt) return []
  const k = schluessel.toLowerCase()
  return inhalt.filter(x => istEintrag(x) && x.schluessel.toLowerCase() === k)
}

/** Text eines einfachen Werts (Wort oder Text), sonst ''. */
export function wertText(wert) {
  if (!wert) return ''
  return wert.typ === 'block' ? '' : wert.text
}

/** Zahlen eines Listenblocks wie "{ 1 2 3 }". */
export function zahlen(wert) {
  if (!wert || wert.typ !== 'block') return []
  return wert.inhalt.filter(x => !istEintrag(x) && x.typ !== 'block').map(x => Number(x.text)).filter(z => !Number.isNaN(z))
}

export { istEintrag }
