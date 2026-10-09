// Liest aus dem HOI4-Spielordner alles, was der Creator braucht, und macht daraus «Spieldaten».
// Jede Datei wird einzeln behandelt: eine kaputte Datei erzeugt eine Warnung, aber keinen Abbruch.
// Schluessel und Pfade werden wie im Spiel ohne Ruecksicht auf Gross-/Kleinschreibung gelesen.

import { parseParadox, findeI as finde, findeAlleI as findeAlle, wertText, zahlen } from './paradox.js'
import { parseYml } from './yml.js'
import { leseBmp } from './bmp.js'
import { leseTga } from './tga.js'
import { leseDds } from './dds.js'
import { parseDefinition, berechneKarte } from './karte.js'

/** Wird erhoeht, wenn neue Spieldaten gebraucht werden (erzwingt neues Einlesen). */
export const LESER_VERSION = 5

export class SpielordnerFehler extends Error {
  constructor(meldung) {
    super(meldung)
    this.name = 'SpielordnerFehler'
  }
}

const STANDARD_KATEGORIEN = [
  ['industry', 'Industrie'], ['electronics', 'Elektronik'], ['infantry_weapons', 'Infanteriewaffen'], ['artillery', 'Artillerie'],
  ['armor', 'Panzer'], ['land_doctrine', 'Heeresdoktrin'], ['naval_doctrine', 'Marinedoktrin'], ['air_doctrine', 'Luftwaffendoktrin'],
  ['naval_equipment', 'Marineausrüstung'], ['air_equipment', 'Luftwaffenausrüstung'],
]

const STANDARD_AUTONOMIE = [
  ['autonomy_dominion', 'Dominion'], ['autonomy_colony', 'Kolonie'], ['autonomy_puppet', 'Marionette'], ['autonomy_integrated_puppet', 'Integrierte Marionette'],
]
const NICHT_UEBERNOMMEN = ['research_bonus', 'equipment_bonus', 'targeted_modifier', 'on_add', 'on_remove', 'rule']
const KEINE_EIGENSCHAFTS_BONI = new Set(['random', 'ai_will_do', 'cost', 'sprite'])

/** Zahlenwerte eines Blocks als Boni [{ modifier, wert }]. */
function zahlenBoni(inhalt, ohne = new Set()) {
  const boni = []
  for (const x of inhalt ?? []) {
    if (!x.schluessel || x.wert.typ === 'block' || ohne.has(x.schluessel.toLowerCase())) continue
    const wert = Number(x.wert.text)
    if (Number.isFinite(wert) && x.wert.text.trim() !== '') boni.push({ modifier: x.schluessel, wert })
  }
  return boni
}

const FALSCHER_ORDNER = 'Das ist nicht der Hearts-of-Iron-IV-Spielordner. Bitte wähle den Ordner «Hearts of Iron IV» ' +
  '(in Steam: Rechtsklick auf das Spiel → Verwalten → Lokale Dateien durchsuchen).'

function hsvZuRgb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s)
  const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][((i % 6) + 6) % 6]
  return [r, g, b].map(x => Math.round(x * 255))
}

function farbeAus(wert) {
  const z = zahlen(wert)
  if (z.length < 3) return null
  if (wert.tag === 'hsv') return hsvZuRgb(z[0], z[1], z[2])
  return z.slice(0, 3).map(x => Math.max(0, Math.min(255, Math.round(x))))
}

function haeufigsteGroesse(groessen, rueckfall) {
  const zaehler = new Map()
  for (const [b, h] of groessen) {
    const k = `${b}x${h}`
    zaehler.set(k, (zaehler.get(k) || 0) + 1)
  }
  let bester = null, anzahl = 0
  for (const [k, n] of zaehler) if (n > anzahl) { bester = k; anzahl = n }
  return bester ? bester.split('x').map(Number) : rueckfall
}

function dekodiereBild(pfad, bytes) {
  if (/\.dds$/i.test(pfad)) return leseDds(bytes)
  if (/\.tga$/i.test(pfad)) return leseTga(bytes)
  return null
}

/**
 * Liest den Spielordner.
 * @param {import('./dateiquelle.js').Dateiquelle} quelle
 * @returns {Promise<{ spieldaten, karte, bilder: Map<string, any>, warnungen: string[] }>}
 */
export async function leseSpielordner(quelle, { fortschritt = () => {}, kodiereBild } = {}) {
  const kodiere = kodiereBild || (async (rgba, breite, hoehe) => ({ breite, hoehe, rgba }))
  if (!quelle.hat('launcher-settings.json') || !quelle.hat('map/provinces.bmp') || !quelle.hat('map/definition.csv')) {
    throw new SpielordnerFehler(FALSCHER_ORDNER)
  }
  const warnungen = []
  const alle = quelle.liste()
  const imOrdner = (praefix, endung) => alle.filter(p => p.startsWith(praefix) && p.toLowerCase().endsWith(endung)).sort()
  const direktImOrdner = (praefix, endung) => imOrdner(praefix, endung).filter(p => !p.slice(praefix.length).includes('/'))
  const originaltexte = {}

  async function leseSkript(pfad, merken = false) {
    try {
      const text = await quelle.text(pfad)
      if (merken) originaltexte[pfad] = text
      const { eintraege, warnungen: w } = parseParadox(text)
      for (const x of w) warnungen.push(`${pfad}: ${x}`)
      return eintraege
    } catch (e) {
      warnungen.push(`${pfad}: ${e.message}`)
      return null
    }
  }

  // Version
  fortschritt(0.02, 'Spielversion wird gelesen …')
  let version = null
  try {
    const roh = JSON.parse(await quelle.text('launcher-settings.json'))
    const m = /(\d+)\.(\d+)\.(\d+)/.exec(roh.rawVersion || roh.version || '')
    if (m) version = `${m[1]}.${m[2]}.${m[3]}`
  } catch (e) {
    warnungen.push(`launcher-settings.json: ${e.message}`)
  }
  const supportedVersion = version ? version.split('.').slice(0, 2).join('.') + '.*' : '1.*'

  // Texte
  fortschritt(0.08, 'Texte werden gelesen …')
  const texte = { german: new Map(), english: new Map() }
  for (const sprache of ['english', 'german']) {
    const dateien = imOrdner(`localisation/${sprache}/`, '.yml')
    // Ersetzungen (replace-Ordner) zuletzt, damit sie gewinnen
    dateien.sort((a, b) => Number(a.includes('/replace/')) - Number(b.includes('/replace/')) || a.localeCompare(b))
    for (const pfad of dateien) {
      try {
        for (const [k, v] of parseYml(await quelle.text(pfad)).eintraege) texte[sprache].set(k, v)
      } catch (e) {
        warnungen.push(`${pfad}: ${e.message}`)
      }
    }
  }
  const text = (schluessel) => texte.german.get(schluessel) ?? texte.english.get(schluessel)
  const name = (schluessel) => text(schluessel) ?? schluessel

  // Grafik-Verweise
  fortschritt(0.15, 'Grafiken werden verzeichnet …')
  const sprites = {}
  const spriteDatei = {}
  for (const pfad of imOrdner('interface/', '.gfx')) {
    const e = await leseSkript(pfad)
    if (!e) continue
    for (const block of findeAlle(e, 'spriteTypes')) {
      if (block.wert.typ !== 'block') continue
      for (const s of findeAlle(block.wert.inhalt, 'spriteType')) {
        if (s.wert.typ !== 'block') continue
        const n = wertText(finde(s.wert.inhalt, 'name')?.wert)
        const t = wertText(finde(s.wert.inhalt, 'texturefile')?.wert)
        if (n && t) {
          sprites[n] = t.replace(/\\/g, '/').replace(/^\//, '')
          spriteDatei[n] = pfad
        }
      }
    }
  }

  // Ideologien
  fortschritt(0.22, 'Ideologien werden gelesen …')
  const ideologien = []
  for (const pfad of imOrdner('common/ideologies/', '.txt')) {
    const e = await leseSkript(pfad)
    const block = finde(e, 'ideologies')
    if (!block || block.wert.typ !== 'block') continue
    for (const gruppe of block.wert.inhalt) {
      if (!gruppe.schluessel || gruppe.wert.typ !== 'block') continue
      const typen = finde(gruppe.wert.inhalt, 'types')
      const unter = typen && typen.wert.typ === 'block'
        ? typen.wert.inhalt.filter(x => x.schluessel).map(x => ({ id: x.schluessel, name: name(x.schluessel) }))
        : []
      ideologien.push({ id: gruppe.schluessel, name: name(gruppe.schluessel), unter })
    }
  }
  const gruppeVon = new Map()
  for (const g of ideologien) for (const u of g.unter) gruppeVon.set(u.id, g.id)

  // Laender
  fortschritt(0.3, 'Länder werden gelesen …')
  const laender = {}
  for (const pfad of imOrdner('common/country_tags/', '.txt')) {
    const e = await leseSkript(pfad)
    if (!e || wertText(finde(e, 'dynamic_tags')?.wert) === 'yes') continue
    for (const x of e) {
      if (!x.schluessel || !/^[A-Z][A-Z0-9]{2}$/.test(x.schluessel) || x.wert.typ === 'block') continue
      const tag = x.schluessel
      laender[tag] = {
        tag, name: name(tag), nameDef: text(`${tag}_DEF`) ?? name(tag), adjektiv: text(`${tag}_ADJ`) ?? name(tag),
        farbe: [128, 128, 128], grafikstil: 'western_european_gfx', grafikstil2d: 'western_european_2d',
        landDatei: 'common/' + x.wert.text.replace(/\\/g, '/'), verlaufDatei: null, hauptstadt: null, regierung: null,
        anfuehrer: null, flaggen: [], namensVarianten: [], marionetten: [], fraktion: null,
      }
    }
  }
  for (const land of Object.values(laender)) {
    if (!quelle.hat(land.landDatei)) {
      warnungen.push(`${land.landDatei}: Datei fehlt`)
      continue
    }
    const e = await leseSkript(land.landDatei, true)
    if (!e) continue
    const farbe = finde(e, 'color')
    if (farbe) land.farbe = farbeAus(farbe.wert) || land.farbe
    land.grafikstil = wertText(finde(e, 'graphical_culture')?.wert) || land.grafikstil
    land.grafikstil2d = wertText(finde(e, 'graphical_culture_2d')?.wert) || land.grafikstil2d
  }
  if (quelle.hat('common/countries/colors.txt')) {
    const e = await leseSkript('common/countries/colors.txt', true)
    for (const x of e || []) {
      if (!x.schluessel || !laender[x.schluessel] || x.wert.typ !== 'block') continue
      const farbe = finde(x.wert.inhalt, 'color')
      if (farbe) laender[x.schluessel].farbe = farbeAus(farbe.wert) || laender[x.schluessel].farbe
    }
  }
  for (const land of Object.values(laender)) {
    for (const g of ideologien) {
      for (const endung of ['', '_DEF', '_ADJ']) {
        const k = `${land.tag}_${g.id}${endung}`
        if (text(k) !== undefined) land.namensVarianten.push(k)
      }
    }
  }

  // Charaktere
  fortschritt(0.38, 'Charaktere werden gelesen …')
  const charaktere = {}
  for (const pfad of imOrdner('common/characters/', '.txt')) {
    const e = await leseSkript(pfad)
    const block = finde(e, 'characters')
    if (!block || block.wert.typ !== 'block') continue
    for (const c of block.wert.inhalt) {
      if (!c.schluessel || c.wert.typ !== 'block') continue
      const inhalt = c.wert.inhalt
      const leiter = finde(inhalt, 'country_leader')
      const ideologie = leiter && leiter.wert.typ === 'block' ? wertText(finde(leiter.wert.inhalt, 'ideology')?.wert) || null : null
      let portraet = null
      const portraits = finde(inhalt, 'portraits')
      if (portraits && portraits.wert.typ === 'block') {
        for (const art of ['civilian', 'army', 'navy']) {
          const a = finde(portraits.wert.inhalt, art)
          const gross = a && a.wert.typ === 'block' ? wertText(finde(a.wert.inhalt, 'large')?.wert) : ''
          if (gross) {
            portraet = gross.startsWith('GFX_') ? (sprites[gross] || null) : gross.replace(/\\/g, '/')
            break
          }
        }
      }
      charaktere[c.schluessel] = { id: c.schluessel, name: name(wertText(finde(inhalt, 'name')?.wert) || c.schluessel), ideologie, portraet }
    }
  }

  // Verlauf der Laender
  fortschritt(0.45, 'Startzustand der Länder wird gelesen …')
  for (const pfad of imOrdner('history/countries/', '.txt')) {
    const dateiname = pfad.slice('history/countries/'.length)
    const m = /^([A-Z][A-Z0-9]{2})(\s|-|$|\.)/.exec(dateiname)
    if (!m || !laender[m[1]]) continue
    const land = laender[m[1]]
    const e = await leseSkript(pfad, true)
    if (!e) continue
    land.verlaufDatei = pfad
    const hauptstadt = Number(wertText(finde(e, 'capital')?.wert))
    land.hauptstadt = Number.isInteger(hauptstadt) && hauptstadt > 0 ? hauptstadt : null
    const politik = finde(e, 'set_politics')
    land.regierung = politik && politik.wert.typ === 'block' ? wertText(finde(politik.wert.inhalt, 'ruling_party')?.wert) || null : null
    // Marionetten und Fraktion: oberste Ebene und bedingte Bloecke (if/else_if/else), keine Datumsbloecke
    const merkeMarionette = (ziel, stufe, bedingt) => {
      const alt = land.marionetten.find(m => m.tag === ziel)
      land.marionetten = land.marionetten.filter(m => m.tag !== ziel)
      const eintrag = { tag: ziel, autonomie: alt && stufe === 'autonomy_puppet' ? alt.autonomie : stufe }
      if (bedingt || alt?.bedingt) eintrag.bedingt = true
      land.marionetten.push(eintrag)
    }
    const durchsuche = (inhalt, bedingt) => {
      for (const x of inhalt) {
        if (!x.schluessel) continue
        const k = x.schluessel.toLowerCase()
        if (k === 'puppet') {
          const ziel = x.wert.typ === 'block' ? wertText(finde(x.wert.inhalt, 'target')?.wert) : x.wert.text
          if (ziel) merkeMarionette(ziel, 'autonomy_puppet', bedingt)
        } else if (k === 'set_autonomy' && x.wert.typ === 'block') {
          const ziel = wertText(finde(x.wert.inhalt, 'target')?.wert)
          const stufe = wertText(finde(x.wert.inhalt, 'autonomous_state')?.wert) || wertText(finde(x.wert.inhalt, 'autonomy_state')?.wert)
          if (ziel && stufe) merkeMarionette(ziel, stufe, bedingt)
        } else if (k === 'create_faction' && x.wert.typ !== 'block') {
          land.fraktion = x.wert.text
        } else if (['if', 'else_if', 'else'].includes(k) && x.wert.typ === 'block') {
          durchsuche(x.wert.inhalt, true)
        }
      }
    }
    durchsuche(e, false)
    for (const r of findeAlle(e, 'recruit_character')) {
      const c = charaktere[wertText(r.wert)]
      if (c && c.ideologie && gruppeVon.get(c.ideologie) === land.regierung) {
        land.anfuehrer = c.id
        break
      }
    }
  }

  // Staaten
  fortschritt(0.55, 'Staaten werden gelesen …')
  const staaten = {}
  for (const pfad of imOrdner('history/states/', '.txt')) {
    const e = await leseSkript(pfad, true)
    const s = finde(e, 'state')
    if (!s || s.wert.typ !== 'block') {
      warnungen.push(`${pfad}: kein Staat gefunden, übersprungen`)
      delete originaltexte[pfad]
      continue
    }
    const inhalt = s.wert.inhalt
    const id = Number(wertText(finde(inhalt, 'id')?.wert))
    const provinzen = zahlen(finde(inhalt, 'provinces')?.wert)
    if (!Number.isInteger(id) || id <= 0 || provinzen.length === 0) {
      warnungen.push(`${pfad}: Staat ohne ID oder Provinzen, übersprungen`)
      delete originaltexte[pfad]
      continue
    }
    const hist = finde(inhalt, 'history')
    const histInhalt = hist && hist.wert.typ === 'block' ? hist.wert.inhalt : []
    const nameSchluessel = wertText(finde(inhalt, 'name')?.wert) || `STATE_${id}`
    staaten[id] = {
      id, name: name(nameSchluessel), provinzen,
      besitzer: wertText(finde(histInhalt, 'owner')?.wert) || null,
      kerne: findeAlle(histInhalt, 'add_core_of').map(x => wertText(x.wert)),
      kategorie: wertText(finde(inhalt, 'state_category')?.wert) || null,
      manpower: Number(wertText(finde(inhalt, 'manpower')?.wert)) || 0,
      datei: pfad,
    }
  }

  // Karte
  fortschritt(0.65, 'Karte wird berechnet …')
  const provinzListe = parseDefinition(await quelle.text('map/definition.csv'))
  const provinzArten = {}
  for (const p of provinzListe) provinzArten[p.id] = p.art
  let karte
  try {
    karte = berechneKarte(leseBmp(await quelle.bytes('map/provinces.bmp')), provinzListe, staaten)
  } catch (e) {
    throw new SpielordnerFehler(`Die Karte (map/provinces.bmp) konnte nicht gelesen werden: ${e.message}`)
  }

  // Flaggen: TAG.tga oder Ideologie-Varianten (TAG_fascism.tga …), auch .dds und andere Schreibweise
  fortschritt(0.75, 'Flaggen werden gelesen …')
  const bilder = new Map()
  const flaggenGroessen = []
  const flaggenBericht = { dateien: 0, gelesen: 0, ohneFlagge: [], fehler: [] }
  const flaggenDateien = new Map()
  for (const pfad of [...direktImOrdner('gfx/flags/', '.tga'), ...direktImOrdner('gfx/flags/', '.dds')]) {
    flaggenBericht.dateien++
    const datei = pfad.slice('gfx/flags/'.length).replace(/\.(tga|dds)$/i, '')
    const tag = datei.slice(0, 3).toUpperCase()
    const land = laender[tag]
    if (!land || (datei.length > 3 && datei[3] !== '_')) continue
    if (!land.flaggen.includes(datei)) land.flaggen.push(datei)
    flaggenDateien.set(datei.toUpperCase(), pfad)
  }
  for (const land of Object.values(laender)) {
    const kandidaten = [`${land.tag}_${land.regierung}`, land.tag, ...land.flaggen].map(k => k.toUpperCase())
    let gelesen = false
    for (const k of [...new Set(kandidaten)]) {
      const pfad = flaggenDateien.get(k)
      if (!pfad) continue
      try {
        const bytes = await quelle.bytes(pfad)
        const bild = /\.dds$/i.test(pfad) ? leseDds(bytes) : leseTga(bytes)
        if (!bild) throw new Error('DDS-Format wird nicht unterstuetzt')
        flaggenGroessen.push([bild.breite, bild.hoehe])
        bilder.set(`flagge:${land.tag}`, await kodiere(bild.rgba, bild.breite, bild.hoehe))
        gelesen = true
        break
      } catch (e) {
        flaggenBericht.fehler.push({ datei: pfad, grund: e.message })
        warnungen.push(`${pfad}: ${e.message}`)
      }
    }
    if (gelesen) flaggenBericht.gelesen++
    else flaggenBericht.ohneFlagge.push(land.tag)
  }

  fortschritt(0.85, 'Bilder für nationale Geister werden gelesen …')
  const ideenBilder = []
  const ideenGroessen = []
  for (const sprite of Object.keys(sprites).filter(n => n.startsWith('GFX_idea_')).sort()) {
    const pfad = sprites[sprite]
    if (!quelle.hat(pfad)) {
      warnungen.push(`${pfad}: Bild zu ${sprite} fehlt`)
      continue
    }
    try {
      const bild = dekodiereBild(pfad, await quelle.bytes(pfad))
      if (!bild) continue
      ideenGroessen.push([bild.breite, bild.hoehe])
      bilder.set(`idee:${sprite}`, await kodiere(bild.rgba, bild.breite, bild.hoehe))
      ideenBilder.push(sprite)
    } catch (e) {
      warnungen.push(`${pfad}: ${e.message}`)
    }
  }

  fortschritt(0.88, 'Fokus-Symbole werden gelesen …')
  // Alle Symbole aus den goals-Dateien (GFX_goal_* und GFX_focus_*), dazu GFX_goal_* von anderswo; ohne Schimmer
  const fokusSymbole = Object.keys(sprites)
    .filter(n => !/_shine$/i.test(n) && (/goals/i.test(spriteDatei[n].split('/').pop()) || n.startsWith('GFX_goal_')))
    .sort()
  /** Liest die Bilder zu Sprites; nicht lesbare bleiben ohne Bild in der Liste. */
  async function leseSymbole(namen, praefix) {
    const groessen = []
    for (const sprite of namen) {
      const pfad = sprites[sprite]
      if (!quelle.hat(pfad)) continue
      try {
        const bild = dekodiereBild(pfad, await quelle.bytes(pfad))
        if (!bild) continue
        groessen.push([bild.breite, bild.hoehe])
        bilder.set(`${praefix}:${sprite}`, await kodiere(bild.rgba, bild.breite, bild.hoehe))
      } catch (e) {
        warnungen.push(`${pfad}: ${e.message}`)
      }
    }
    return groessen
  }
  const fokusGroessen = await leseSymbole(fokusSymbole, 'fokus')
  const fokusSymboleGelesen = fokusGroessen.length

  // Etappe 3: Eventbilder, Symbole fuer Entscheidungen und Kategorien, Kategorien des Spiels
  fortschritt(0.89, 'Eventbilder und Entscheidungen werden gelesen …')
  const mitPraefix = (p) => Object.keys(sprites).filter(n => n.toLowerCase().startsWith(p.toLowerCase())).sort()
  const eventBilder = mitPraefix('GFX_report_event_')
  const kategorieSymbole = mitPraefix('GFX_decision_category_')
  const entscheidungsSymbole = mitPraefix('GFX_decision_').filter(n => !/^GFX_decision_(category|cat_picture)_/i.test(n))
  const eventGroessen = await leseSymbole(eventBilder, 'event')
  const entscheidungsGroessen = await leseSymbole(entscheidungsSymbole, 'entscheidung')
  const kategorieGroessen = await leseSymbole(kategorieSymbole, 'kategorie')
  const entscheidungsKategorien = []
  for (const pfad of imOrdner('common/decisions/categories/', '.txt')) {
    const e = await leseSkript(pfad)
    for (const k of e ?? []) {
      if (!k.schluessel || k.wert.typ !== 'block' || entscheidungsKategorien.some(x => x.id === k.schluessel)) continue
      const icon = wertText(finde(k.wert.inhalt, 'icon')?.wert)
      entscheidungsKategorien.push({ id: k.schluessel, name: name(k.schluessel), sprite: icon ? (/^GFX_/i.test(icon) ? icon : `GFX_decision_category_${icon}`) : null })
    }
  }
  entscheidungsKategorien.sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id))

  // Technologie-Kategorien fuer Forschungsboni
  const kategorien = []
  for (const pfad of imOrdner('common/technology_tags/', '.txt')) {
    const e = await leseSkript(pfad)
    const block = finde(e, 'technology_categories')
    if (!block || block.wert.typ !== 'block') continue
    for (const x of block.wert.inhalt) if (!x.schluessel && x.typ === 'wort' && !kategorien.includes(x.text)) kategorien.push(x.text)
  }
  const standardNamen = new Map(STANDARD_KATEGORIEN)
  const technologieKategorien = (kategorien.length ? kategorien : STANDARD_KATEGORIEN.map(([id]) => id))
    .map(id => ({ id, name: text(id) ?? standardNamen.get(id) ?? id }))

  // Etappe 2b: Geister und Anfuehrer-Eigenschaften des Spiels, alle Modifikatoren, Autonomiestufen
  fortschritt(0.9, 'Geister und Eigenschaften werden gelesen …')
  const modWerte = new Map()
  const merkeBoni = (boni) => { for (const b of boni) { if (!modWerte.has(b.modifier)) modWerte.set(b.modifier, []); modWerte.get(b.modifier).push(b.wert) } }
  const spielGeister = []
  for (const pfad of imOrdner('common/ideas/', '.txt')) {
    const e = await leseSkript(pfad)
    const block = finde(e, 'ideas')
    if (!block || block.wert.typ !== 'block') continue
    for (const kategorie of block.wert.inhalt) {
      if (!kategorie.schluessel || kategorie.wert.typ !== 'block') continue
      for (const idee of kategorie.wert.inhalt) {
        if (!idee.schluessel || idee.wert.typ !== 'block') continue
        const inhalt = idee.wert.inhalt
        const boni = zahlenBoni(finde(inhalt, 'modifier')?.wert?.inhalt)
        merkeBoni(boni)
        if (kategorie.schluessel.toLowerCase() !== 'country') continue
        const bild = wertText(finde(inhalt, 'picture')?.wert)
        const erlaubt = finde(inhalt, 'allowed')?.wert?.inhalt
        const land = wertText(finde(erlaubt, 'original_tag')?.wert) || wertText(finde(erlaubt, 'tag')?.wert) || null
        spielGeister.push({
          id: idee.schluessel, name: name(idee.schluessel), beschreibung: text(`${idee.schluessel}_desc`) ?? '',
          sprite: `GFX_idea_${bild || idee.schluessel}`, boni,
          nichtUebernommen: NICHT_UEBERNOMMEN.filter(k => finde(inhalt, k)), land,
        })
      }
    }
  }
  spielGeister.sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id))
  const anfuehrerEigenschaften = []
  for (const pfad of imOrdner('common/country_leader/', '.txt')) {
    const e = await leseSkript(pfad)
    for (const block of findeAlle(e, 'leader_traits')) {
      if (block.wert.typ !== 'block') continue
      for (const t of block.wert.inhalt) {
        if (!t.schluessel || t.wert.typ !== 'block') continue
        const boni = zahlenBoni(t.wert.inhalt, KEINE_EIGENSCHAFTS_BONI)
        merkeBoni(boni)
        anfuehrerEigenschaften.push({ id: t.schluessel, name: name(t.schluessel), boni })
      }
    }
  }
  anfuehrerEigenschaften.sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id))
  const modifikatoren = [...modWerte].map(([id, werte]) => ({
    id,
    name: text(id) ?? text(`MODIFIER_${id.toUpperCase()}`) ?? text(`modifier_${id}`) ?? id,
    prozent: id.endsWith('_factor') || werte.every(w => !Number.isInteger(w) && Math.abs(w) < 1),
  })).sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id))
  const autonomieStufen = []
  for (const pfad of imOrdner('common/autonomous_states/', '.txt')) {
    const e = await leseSkript(pfad)
    for (const block of findeAlle(e, 'autonomy_state')) {
      const id = wertText(finde(block.wert.inhalt ?? [], 'id')?.wert)
      if (id && !autonomieStufen.some(a => a.id === id)) autonomieStufen.push({ id, name: name(id) })
    }
  }
  if (!autonomieStufen.length) for (const [id, n] of STANDARD_AUTONOMIE) autonomieStufen.push({ id, name: text(id) ?? n })

  fortschritt(0.93, 'Porträts werden gelesen …')
  const portraets = []
  const portraetGroessen = []
  for (const pfad of imOrdner('gfx/leaders/', '.dds').filter(p => /generic/i.test(p))) {
    try {
      const bild = leseDds(await quelle.bytes(pfad))
      if (!bild) continue
      portraetGroessen.push([bild.breite, bild.hoehe])
      bilder.set(`portraet:${pfad}`, await kodiere(bild.rgba, bild.breite, bild.hoehe))
      portraets.push(pfad)
    } catch (e) {
      warnungen.push(`${pfad}: ${e.message}`)
    }
  }

  const spieldaten = {
    leserVersion: LESER_VERSION, version, supportedVersion,
    laender, ideologien, charaktere, staaten, provinzArten, sprites, ideenBilder, portraets, fokusSymbole, technologieKategorien,
    modifikatoren, spielGeister, anfuehrerEigenschaften, autonomieStufen,
    eventBilder, entscheidungsSymbole, kategorieSymbole, entscheidungsKategorien,
    bildgroessen: {
      flagge: haeufigsteGroesse(flaggenGroessen, [82, 52]),
      idee: haeufigsteGroesse(ideenGroessen, [64, 64]),
      portraet: haeufigsteGroesse(portraetGroessen, [156, 210]),
      fokus: haeufigsteGroesse(fokusGroessen, [94, 86]),
      event: haeufigsteGroesse(eventGroessen, [210, 176]),
      entscheidung: haeufigsteGroesse(entscheidungsGroessen, [32, 32]),
      kategorie: haeufigsteGroesse(kategorieGroessen, [32, 32]),
    },
    originaltexte,
    bericht: {
      laender: Object.keys(laender).length,
      staaten: Object.keys(staaten).length,
      flaggen: flaggenBericht,
      ideenBilder: ideenBilder.length,
      portraets: portraets.length,
      fokusSymbole: fokusSymbole.length,
      fokusSymboleGelesen,
      spielGeister: spielGeister.length,
      eigenschaften: anfuehrerEigenschaften.length,
      eventBilder: eventBilder.length,
      entscheidungsSymbole: entscheidungsSymbole.length,
      entscheidungsKategorien: entscheidungsKategorien.length,
      warnungen: warnungen.slice(0, 200),
      warnungenGesamt: warnungen.length,
    },
  }
  fortschritt(1, 'Fertig')
  return { spieldaten, karte, bilder, warnungen }
}
