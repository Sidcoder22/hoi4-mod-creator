// Werte, die sich aus Projekt und Spieldaten zusammen ergeben.

import { parseParadox, finde, wertText } from '../leser/paradox.js'

function projektLand(p, tag) {
  return p.laender.find(l => l.tag === tag)
}

export function belegteTags(p, sd, ohneLandId) {
  const tags = new Set(Object.keys(sd.laender))
  for (const l of p.laender) if (l.art === 'neu' && l.id !== ohneLandId) tags.add(l.tag)
  return tags
}

/** Besitzer jedes Staats zum Start, mit den Aenderungen des Projekts. */
export function effektiveBesitzer(p, sd) {
  const besitzer = new Map()
  for (const s of Object.values(sd.staaten)) besitzer.set(s.id, s.besitzer)
  for (const l of p.laender) {
    if (l.art === 'geaendert' && !l.aendern?.gebiet) continue
    for (const s of l.staaten) besitzer.set(s, l.tag)
  }
  return besitzer
}

function zaehlt(l, feld) {
  return l && (l.art === 'neu' || l.aendern?.[feld])
}

export function landFarbe(tag, p, sd) {
  const l = projektLand(p, tag)
  if (zaehlt(l, 'farbe')) return l.farbe
  return sd.laender[tag]?.farbe ?? [128, 128, 128]
}

export function landName(tag, p, sd) {
  const l = projektLand(p, tag)
  if (zaehlt(l, 'name')) return l.name || (l.art === 'neu' ? 'Neues Land' : sd.laender[tag]?.name ?? tag)
  return sd.laender[tag]?.name ?? tag
}

export function hauptstadtVon(tag, p, sd) {
  const l = projektLand(p, tag)
  if (l && l.art === 'neu') return l.hauptstadt
  if (l && l.aendern?.gebiet && l.hauptstadt) return l.hauptstadt
  return sd.laender[tag]?.hauptstadt ?? null
}

/** Startwerte eines Spiel-Landes aus seiner Verlaufsdatei (ohne Datumsbloecke). */
export function verlaufsWerte(sd, tag) {
  const werte = { stabilitaet: 50, kriegsunterstuetzung: 20, forschungsplaetze: 2, beliebtheiten: {}, ideologie: null, wahlen: false }
  const land = sd.laender[tag]
  const text = land?.verlaufDatei ? sd.originaltexte[land.verlaufDatei] : null
  if (!text) return werte
  const e = parseParadox(text).eintraege
  const zahl = (k) => Number(wertText(finde(e, k)?.wert))
  if (finde(e, 'set_stability')) werte.stabilitaet = Math.round(zahl('set_stability') * 100)
  if (finde(e, 'set_war_support')) werte.kriegsunterstuetzung = Math.round(zahl('set_war_support') * 100)
  if (finde(e, 'set_research_slots')) werte.forschungsplaetze = zahl('set_research_slots')
  const pop = finde(e, 'set_popularities')
  if (pop && pop.wert.typ === 'block') {
    for (const x of pop.wert.inhalt) if (x.schluessel) werte.beliebtheiten[x.schluessel] = Math.round(Number(wertText(x.wert)) || 0)
  }
  const politik = finde(e, 'set_politics')
  if (politik && politik.wert.typ === 'block') {
    werte.ideologie = wertText(finde(politik.wert.inhalt, 'ruling_party')?.wert) || null
    werte.wahlen = wertText(finde(politik.wert.inhalt, 'elections_allowed')?.wert) === 'yes'
  }
  return werte
}
