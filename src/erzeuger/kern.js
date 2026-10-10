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

const block = (inhalt = []) => ({ typ: 'block', inhalt })
const istDatum = (schluessel) => /^\d+\.\d+\.\d+$/.test(schluessel ?? '')

/** Fuegt einen Eintrag vor dem ersten Datumsblock ein, damit der Startzustand oben bleibt. */
function fuegeEin(inhalt, eintrag) {
  const i = inhalt.findIndex(x => istDatum(x.schluessel))
  if (i < 0) inhalt.push(eintrag)
  else inhalt.splice(i, 0, eintrag)
}

/** Block unter schluessel holen oder anlegen. */
function blockVon(inhalt, schluessel) {
  let e = finde(inhalt, schluessel)
  if (!e || e.wert.typ !== 'block') {
    e = { schluessel, op: '=', wert: block() }
    fuegeEin(inhalt, e)
  }
  return e
}

/** Zahlenwerte in einem Block setzen; 0 entfernt den Eintrag. */
function setzeStufen(inhalt, werte) {
  for (const [art, n] of Object.entries(werte ?? {})) {
    const e = finde(inhalt, art)
    if (Number(n) > 0) {
      if (e) e.wert = wort(n)
      else inhalt.push({ schluessel: art, op: '=', wert: wort(n) })
    } else if (e) {
      inhalt.splice(inhalt.indexOf(e), 1)
    }
  }
}

function entferneWennLeer(inhalt, eintrag) {
  if (eintrag.wert.inhalt.length === 0) inhalt.splice(inhalt.indexOf(eintrag), 1)
}

/** Aenderungen aus dem Staaten-Editor (Etappe 4b) auf den Staatsblock anwenden. */
function wendeStaatsaenderungAn(inhalt, a, history) {
  if (a.kategorie) setze(inhalt, 'state_category', wort(a.kategorie))
  if (a.ressourcen) {
    const r = blockVon(inhalt, 'resources')
    setzeStufen(r.wert.inhalt, a.ressourcen)
    entferneWennLeer(inhalt, r)
  }
  const hist = history()
  const h = hist.wert.inhalt
  const provinzGebaeude = Object.entries(a.provinzen ?? {}).filter(([, p]) => p.gebaeude)
  if (a.gebaeude || provinzGebaeude.length) {
    const b = blockVon(h, 'buildings')
    setzeStufen(b.wert.inhalt, a.gebaeude)
    for (const [provinz, p] of provinzGebaeude) {
      const pb = blockVon(b.wert.inhalt, String(provinz))
      setzeStufen(pb.wert.inhalt, p.gebaeude)
      entferneWennLeer(b.wert.inhalt, pb)
    }
    entferneWennLeer(h, b)
  }
  for (const [provinz, p] of Object.entries(a.provinzen ?? {})) {
    if (p.siegpunkte === undefined) continue
    const alt = findeAlle(h, 'victory_points').filter(v => v.wert.typ === 'block' && v.wert.inhalt[0]?.text === String(provinz))
    for (const v of alt) h.splice(h.indexOf(v), 1)
    if (Number(p.siegpunkte) > 0) fuegeEin(h, { schluessel: 'victory_points', op: '=', wert: block([wort(provinz), wort(p.siegpunkte)]) })
  }
  if (a.extraBauplaetze !== undefined) {
    const e = finde(h, 'add_extra_state_shared_building_slots')
    if (e) h.splice(h.indexOf(e), 1)
    if (Number(a.extraBauplaetze) > 0) fuegeEin(h, { schluessel: 'add_extra_state_shared_building_slots', op: '=', wert: wort(a.extraBauplaetze) })
  }
}

/**
 * Neuer Besitzer, geaenderte Bevoelkerung und Aenderungen aus dem Staaten-Editor fuer einen Staat.
 * Datumsbloecke bleiben unangetastet; eine feste Einwohnerzahl (staat.einwohner) hat Vorrang vor dem Faktor.
 */
export function aendereStaatsdatei(text, { neuerBesitzer, kernAltEntfernen, manpowerFaktor, staat: aenderung } = {}) {
  const { eintraege } = parseParadox(text)
  const staat = finde(eintraege, 'state')
  if (!staat || staat.wert.typ !== 'block') throw new Error('Kein Staat in der Datei')
  const mp = finde(staat.wert.inhalt, 'manpower')
  if (aenderung?.einwohner !== undefined) setze(staat.wert.inhalt, 'manpower', wort(Math.max(0, Math.round(Number(aenderung.einwohner) || 0))))
  else if (manpowerFaktor && manpowerFaktor !== 1 && mp && mp.wert.typ !== 'block') mp.wert = wort(Math.max(0, Math.round(Number(mp.wert.text) * manpowerFaktor)))
  const history = () => {
    let hist = finde(staat.wert.inhalt, 'history')
    if (!hist || hist.wert.typ !== 'block') {
      hist = { schluessel: 'history', op: '=', wert: block() }
      staat.wert.inhalt.push(hist)
    }
    return hist
  }
  if (aenderung) wendeStaatsaenderungAn(staat.wert.inhalt, aenderung, history)
  if (!neuerBesitzer) return '# Geaendert durch HOI4 Mod Creator\n' + schreibeParadox(eintraege)
  const hist = history()
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
