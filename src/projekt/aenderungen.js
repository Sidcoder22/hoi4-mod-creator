// Reine Aenderungsfunktionen: Sie geben immer ein neues Projekt zurueck.

import { neueId, tagVorschlag, modidAusName } from './modell.js'
import { belegteTags, verlaufsWerte } from './abgeleitet.js'
import { zuBase64 } from './base64.js'

const STANDARD_GRUPPEN = ['democratic', 'communism', 'fascism', 'neutrality']

function gruppen(sd) {
  return sd.ideologien?.length ? sd.ideologien.map(g => g.id) : STANDARD_GRUPPEN
}

/** Verteilt summe auf Gewichte (Verfahren der groessten Reste). */
function verteile(summe, gewichte) {
  const gesamt = gewichte.reduce((a, b) => a + b, 0)
  const anteile = gesamt > 0 ? gewichte.map(g => (g / gesamt) * summe) : gewichte.map(() => summe / gewichte.length)
  const ganz = anteile.map(Math.floor)
  let rest = summe - ganz.reduce((a, b) => a + b, 0)
  const reihenfolge = anteile.map((a, i) => [a - Math.floor(a), i]).sort((x, y) => y[0] - x[0] || x[1] - y[1])
  for (const [, i] of reihenfolge) {
    if (rest <= 0) break
    ganz[i]++
    rest--
  }
  return ganz
}

function mitLand(p, landId, fn) {
  return { ...p, laender: p.laender.map(l => (l.id === landId ? fn(structuredClone(l)) : l)) }
}

function ersteUnterideologie(sd, gruppe) {
  return sd.ideologien?.find(g => g.id === gruppe)?.unter[0]?.id ?? null
}

function gruppeDerUnterideologie(sd, unter) {
  return sd.ideologien?.find(g => g.unter.some(u => u.id === unter))?.id ?? null
}

export function fuegeLandHinzu(p, sd, art, tag) {
  if (art === 'geaendert') {
    const vorhanden = p.laender.find(l => l.art === 'geaendert' && l.tag === tag)
    if (vorhanden) return [p, vorhanden.id]
  }
  const id = neueId()
  const ids = gruppen(sd)
  let land
  if (art === 'neu') {
    const anteile = verteile(100, ids.map(() => 1))
    land = {
      id, art: 'neu', tag: tagVorschlag('Neues Land', belegteTags(p, sd)), tagManuell: false,
      name: '', nameDef: '', adjektiv: '', farbe: [120, 120, 160],
      flagge: { art: 'designer', vorlage: 'drei_waagrecht', farben: ['#ffffff', '#3060a0', '#c03030'], symbol: null, symbolFarbe: '#ffd700' },
      grafikstil: 'western_european', staaten: [], hauptstadt: null, kerneAltBesitzerBehalten: true,
      regierung: {
        ideologie: ids.includes('neutrality') ? 'neutrality' : ids[0], wahlen: false, wahlintervall: 48,
        parteien: Object.fromEntries(ids.map((g, i) => [g, { name: '', langname: '', beliebtheit: anteile[i] }])),
      },
      anfuehrer: { name: '', unterideologie: ersteUnterideologie(sd, ids.includes('neutrality') ? 'neutrality' : ids[0]),
        bild: { art: 'spiel', pfad: sd.portraets?.[0] ?? null } },
      startwerte: { stabilitaet: 50, kriegsunterstuetzung: 20, forschungsplaetze: 3 },
      technikWie: null, armee: { divisionen: 6 }, ideen: [],
    }
  } else {
    const spiel = sd.laender[tag]
    if (!spiel) throw new Error(`Unbekanntes Land: ${tag}`)
    const werte = verlaufsWerte(sd, tag)
    const ideologie = werte.ideologie && ids.includes(werte.ideologie) ? werte.ideologie : ids[0]
    const leiter = spiel.anfuehrer ? sd.charaktere[spiel.anfuehrer] : null
    const unter = leiter?.ideologie && gruppeDerUnterideologie(sd, leiter.ideologie) === ideologie ? leiter.ideologie : ersteUnterideologie(sd, ideologie)
    land = {
      id, art: 'geaendert', tag, tagManuell: true,
      name: spiel.name, nameDef: spiel.nameDef, adjektiv: spiel.adjektiv, farbe: [...spiel.farbe],
      flagge: { art: 'designer', vorlage: 'drei_waagrecht', farben: ['#ffffff', '#3060a0', '#c03030'], symbol: null, symbolFarbe: '#ffd700' },
      grafikstil: (spiel.grafikstil || 'western_european_gfx').replace(/_gfx$/, ''),
      staaten: [], hauptstadt: spiel.hauptstadt, kerneAltBesitzerBehalten: true,
      regierung: {
        ideologie, wahlen: werte.wahlen, wahlintervall: 48,
        parteien: Object.fromEntries(ids.map(g => [g, { name: '', langname: '', beliebtheit: werte.beliebtheiten[g] ?? 0 }])),
      },
      anfuehrer: { name: leiter?.name ?? '', unterideologie: unter,
        bild: { art: 'spiel', pfad: leiter?.portraet ?? sd.portraets?.[0] ?? null } },
      startwerte: { stabilitaet: werte.stabilitaet, kriegsunterstuetzung: werte.kriegsunterstuetzung, forschungsplaetze: werte.forschungsplaetze },
      technikWie: null, armee: { divisionen: 0 }, ideen: [],
      aendern: { name: false, farbe: false, flagge: false, gebiet: false, regierung: false, anfuehrer: false, startwerte: false, geister: false },
    }
  }
  return [{ ...p, laender: [...p.laender, land] }, id]
}

export function aendereLand(p, sd, landId, patch) {
  return mitLand(p, landId, (l) => {
    Object.assign(l, structuredClone(patch))
    if ('tag' in patch) l.tagManuell = true
    if ('name' in patch && l.art === 'neu' && !l.tagManuell) {
      l.tag = tagVorschlag(l.name || 'Neues Land', belegteTags(p, sd, landId))
    }
    return l
  })
}

export function entferneLand(p, landId) {
  return { ...p, laender: p.laender.filter(l => l.id !== landId) }
}

export function schalteStaat(p, landId, staatId) {
  const land = p.laender.find(l => l.id === landId)
  if (!land) return p
  if (land.staaten.includes(staatId)) {
    return mitLand(p, landId, (l) => {
      l.staaten = l.staaten.filter(s => s !== staatId)
      if (l.hauptstadt === staatId) l.hauptstadt = l.staaten[0] ?? null
      return l
    })
  }
  const laender = p.laender.map((l) => {
    if (l.id === landId) {
      const k = structuredClone(l)
      k.staaten = [...k.staaten, staatId]
      if (k.art === 'neu' && k.hauptstadt == null) k.hauptstadt = staatId
      return k
    }
    if (l.staaten.includes(staatId)) {
      const k = structuredClone(l)
      k.staaten = k.staaten.filter(s => s !== staatId)
      if (k.hauptstadt === staatId) k.hauptstadt = k.staaten[0] ?? null
      return k
    }
    return l
  })
  return { ...p, laender }
}

export function setzeBeliebtheit(p, landId, ideologie, wert) {
  return mitLand(p, landId, (l) => {
    const parteien = l.regierung.parteien
    const v = Math.max(0, Math.min(100, Math.round(Number(wert) || 0)))
    const andere = Object.keys(parteien).filter(k => k !== ideologie)
    const neu = verteile(100 - v, andere.map(k => parteien[k].beliebtheit))
    parteien[ideologie].beliebtheit = v
    andere.forEach((k, i) => { parteien[k].beliebtheit = neu[i] })
    return l
  })
}

export function fuegeGeistHinzu(p, sd) {
  const id = neueId()
  const nummer = (p.zaehler?.geist ?? 0) + 1
  const geist = { id, nummer, name: '', beschreibung: '', bild: { art: 'spiel', sprite: sd?.ideenBilder?.[0] ?? 'GFX_idea_generic_army' }, boni: [] }
  return [{ ...p, ideen: [...p.ideen, geist], zaehler: { ...p.zaehler, geist: nummer } }, id]
}

export function aendereGeist(p, geistId, patch) {
  return { ...p, ideen: p.ideen.map(g => (g.id === geistId ? { ...structuredClone(g), ...structuredClone(patch) } : g)) }
}

export function entferneGeist(p, geistId) {
  return {
    ...p,
    ideen: p.ideen.filter(g => g.id !== geistId),
    laender: p.laender.map(l => (l.ideen.includes(geistId) ? { ...l, ideen: l.ideen.filter(i => i !== geistId) } : l)),
  }
}

export function fuegeBildHinzu(p, { breite, hoehe, rgba }) {
  const id = neueId()
  const bytes = new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength)
  return [{ ...p, bilder: { ...p.bilder, [id]: { breite, hoehe, rgba: zuBase64(bytes) } } }, id]
}

export function setzeModFeld(p, feld, wert) {
  const mod = { ...p.mod, [feld]: wert }
  if (feld === 'name' && !mod.modidManuell && !mod.gespeichertAls) mod.modid = modidAusName(wert)
  if (feld === 'modid') mod.modidManuell = true
  return { ...p, mod }
}
