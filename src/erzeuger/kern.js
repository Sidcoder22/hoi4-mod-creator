// Textfunktionen fuer kopierte Spieldateien: Staaten, Farben, Laenderdateien, Verlauf.

import { parseParadox, schreibeParadox, finde, findeAlle } from '../leser/paradox.js'

const wort = (text) => ({ typ: 'wort', text: String(text) })
const farbBlock = (rgb, tag) => ({ typ: 'block', ...(tag ? { tag } : {}), inhalt: rgb.map(wort) })

export function farbeUi(rgb) {
  return rgb.map(c => Math.min(255, Math.round(c * 1.2 + 25)))
}

function setze(inhalt, schluessel, wert) {
  const e = finde(inhalt, schluessel)
  if (e) e.wert = wert
  else inhalt.push({ schluessel, op: '=', wert })
}

/** Neuer Besitzer fuer einen Staat; Datumsbloecke bleiben unangetastet. */
export function aendereStaatsdatei(text, { neuerBesitzer, kernAltEntfernen }) {
  const { eintraege } = parseParadox(text)
  const staat = finde(eintraege, 'state')
  if (!staat || staat.wert.typ !== 'block') throw new Error('Kein Staat in der Datei')
  let hist = finde(staat.wert.inhalt, 'history')
  if (!hist || hist.wert.typ !== 'block') {
    hist = { schluessel: 'history', op: '=', wert: { typ: 'block', inhalt: [] } }
    staat.wert.inhalt.push(hist)
  }
  const inhalt = hist.wert.inhalt
  const owner = finde(inhalt, 'owner')
  const alt = owner ? owner.wert.text : null
  setze(inhalt, 'owner', wort(neuerBesitzer))
  const controller = finde(inhalt, 'controller')
  if (controller) controller.wert = wort(neuerBesitzer)
  if (kernAltEntfernen && alt && alt !== neuerBesitzer) {
    hist.wert.inhalt = inhalt.filter(x => !(x.schluessel === 'add_core_of' && x.wert.text === alt))
  }
  const neuInhalt = hist.wert.inhalt
  const kerne = findeAlle(neuInhalt, 'add_core_of')
  if (!kerne.some(k => k.wert.text === neuerBesitzer)) {
    const nach = kerne.length ? neuInhalt.indexOf(kerne.at(-1)) : neuInhalt.indexOf(finde(neuInhalt, 'owner'))
    neuInhalt.splice(nach + 1, 0, { schluessel: 'add_core_of', op: '=', wert: wort(neuerBesitzer) })
  }
  return '# Geaendert durch HOI4 Mod Creator\n' + schreibeParadox(eintraege)
}

/** colors.txt mit neuen oder geaenderten Farben. */
export function aendereColors(text, farben) {
  const eintraege = text ? parseParadox(text).eintraege : []
  for (const [tag, rgb] of farben) {
    let e = finde(eintraege, tag)
    if (!e || e.wert.typ !== 'block') {
      e = { schluessel: tag, op: '=', wert: { typ: 'block', inhalt: [] } }
      eintraege.push(e)
    }
    setze(e.wert.inhalt, 'color', farbBlock(rgb, 'rgb'))
    setze(e.wert.inhalt, 'color_ui', farbBlock(farbeUi(rgb), 'rgb'))
  }
  return schreibeParadox(eintraege)
}

/** Laenderdatei (common/countries) mit neuer Farbe. */
export function aendereLandDatei(text, farbe) {
  const { eintraege } = parseParadox(text)
  setze(eintraege, 'color', farbBlock(farbe))
  return schreibeParadox(eintraege)
}

/** Originale Verlaufsdatei plus angehaengte Aenderungen. */
export function verlaufMitAnhang(text, zeilen, modid) {
  const basis = text.endsWith('\n') ? text : text + '\n'
  return `${basis}\n# --- Aenderungen aus dem HOI4 Mod Creator (${modid}) ---\n${zeilen.join('\n')}\n`
}
