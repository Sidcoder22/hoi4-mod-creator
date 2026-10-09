// Bausteine erzeugen, pruefen und als Klartext anzeigen.

import { neueId } from '../projekt/modell.js'
import { WIRKUNGEN } from './wirkungen.js'
import { BEDINGUNGEN } from './bedingungen.js'
import { pruefeFeld, feldAktiv, feldAnzeige } from './felder.js'
import { e, block } from './hilfen.js'

const wirkungsDef = (art) => WIRKUNGEN.find(d => d.art === art)
const bedingungsDef = (art) => BEDINGUNGEN.find(d => d.art === art)

function mitStandard(def, werte) {
  const voll = {}
  for (const f of def.felder) voll[f.name] = werte?.[f.name] ?? f.standard
  return voll
}

function standardWerte(def) {
  return Object.fromEntries(def.felder.map(f => [f.name, structuredClone(f.standard)]))
}

export function neueWirkung(art) {
  const def = wirkungsDef(art)
  const b = { id: neueId(), art, werte: standardWerte(def) }
  if (art === 'bei_land') b.wirkungen = []
  return b
}

export function neueBedingung(art) {
  return { id: neueId(), art, nicht: false, werte: standardWerte(bedingungsDef(art)) }
}

export function erzeugeWirkungen(liste, k) {
  const ergebnis = []
  for (const b of liste ?? []) {
    const def = wirkungsDef(b.art)
    if (!def) continue
    if (b.art === 'bei_land') ergebnis.push(e(b.werte.land, block(erzeugeWirkungen(b.wirkungen, k))))
    else ergebnis.push(...def.erzeuge(mitStandard(def, b.werte), k, b))
  }
  return ergebnis
}

export function erzeugeBedingungen(bedingungsblock, k) {
  const teile = []
  for (const b of bedingungsblock?.liste ?? []) {
    const def = bedingungsDef(b.art)
    if (!def) continue
    const eintraege = def.erzeuge(mitStandard(def, b.werte), k, b)
    teile.push(...(b.nicht ? [e('NOT', block(eintraege))] : eintraege))
  }
  if (bedingungsblock?.modus === 'eine' && (bedingungsblock.liste?.length ?? 0) > 1) return [e('OR', block(teile))]
  return teile
}

function pruefeEinen(def, b, kontext, ort, fehler) {
  if (!def) {
    fehler.push({ text: `${ort}: unbekannter Baustein «${b.art}»`, ort })
    return
  }
  const werte = mitStandard(def, b.werte)
  for (const feld of def.felder) {
    if (!feldAktiv(feld, werte)) continue
    const f = pruefeFeld(feld, werte[feld.name], kontext)
    if (f) fehler.push({ text: `${ort}: «${def.name}» – ${f}`, ort })
  }
}

/** Prueft eine Wirkungsliste oder einen Bedingungsblock. */
export function pruefeBausteine(listeOderBlock, kontext, ort) {
  const fehler = []
  if (Array.isArray(listeOderBlock)) {
    for (const b of listeOderBlock) {
      pruefeEinen(wirkungsDef(b.art), b, kontext, ort, fehler)
      if (b.art === 'bei_land') fehler.push(...pruefeBausteine(b.wirkungen ?? [], kontext, ort))
    }
  } else {
    for (const b of listeOderBlock?.liste ?? []) pruefeEinen(bedingungsDef(b.art), b, kontext, ort, fehler)
  }
  return fehler
}

/** Klartext wie «Staat Brandenburg bekommen». */
export function satzText(def, werte, kontext) {
  const voll = mitStandard(def, werte)
  const t = (name) => {
    const feld = def.felder.find(f => f.name === name)
    return feld ? feldAnzeige(feld, voll[name], kontext) : '…'
  }
  if (typeof def.satz === 'function') return def.satz(t, voll)
  return def.satz.replace(/\{(\w+)\}/g, (_, name) => t(name))
}

export { WIRKUNGEN, BEDINGUNGEN, wirkungsDef, bedingungsDef }
