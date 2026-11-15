// Erzeugt aus Projekt und Spieldaten alle Dateien der Mod.
// Ergebnis: Pfade relativ zum Ordner «Hearts of Iron IV» im Benutzerverzeichnis.

import { parseParadox, schreibeParadox, findeI, findeAlleI, wertText } from '../leser/paradox.js'
import { ausBase64 } from '../projekt/base64.js'
import { erstelleSprachsammler } from './sprache.js'
import { aendereStaatsdatei, aendereColors, verlaufMitAnhang } from './kern.js'
import { pruefeAusgabe } from './ausgabepruefung.js'
import { modPfad } from './kennungen.js'
import { erzeugeIdeen } from './ideen.js'
import { erzeugeNeueLaender } from './land-neu.js'
import { erzeugeGeaenderteLaender } from './land-geaendert.js'
import { erzeugeFokusbaeume } from './fokus.js'
import { erzeugeEigenschaften } from './eigenschaften.js'
import { erzeugeDiplomatie } from './diplomatie.js'
import { erzeugeEvents } from './events.js'
import { erzeugeEntscheidungen } from './entscheidungen.js'
import { erzeugeStaaten } from './staaten.js'
import { erzeugePersonen } from './personen.js'

/** Erzeuger fuer Laender, Geister usw.; jeder bekommt den Kontext. */
// Die Geister kommen zuletzt: Bausteine «Bonus erhalten» der anderen Erzeuger melden ihnen noch Geister.
export const ERZEUGER = [erzeugeEigenschaften, erzeugeNeueLaender, erzeugeGeaenderteLaender, erzeugePersonen, erzeugeDiplomatie, erzeugeFokusbaeume, erzeugeEvents, erzeugeEntscheidungen, erzeugeStaaten, erzeugeIdeen]

function deskriptor(projekt, spieldaten) {
  const m = projekt.mod
  const name = String(m.name || m.modid).replace(/"/g, '')
  let t = `version="${String(m.version || '1.0').replace(/"/g, '')}"\ntags={\n\t"Alternative History"\n}\nname="${name}"\n`
  t += `supported_version="${spieldaten.supportedVersion || '1.*'}"\n`
  if (m.vorschaubild?.pngBase64) t += 'picture="thumbnail.png"\n'
  // Submod (Etappe 4g): Der Launcher laedt die Grundlage zuerst
  if (m.grundlage?.length) t += `dependencies={\n${m.grundlage.map(g => `\t"${String(g.name).replace(/"/g, '')}"\n`).join('')}}\n`
  return t
}

function modGfxNamen(dateien) {
  const namen = new Set()
  for (const d of dateien) {
    if (!d.pfad.endsWith('.gfx')) continue
    const text = typeof d.inhalt === 'string' ? d.inhalt : new TextDecoder().decode(d.inhalt)
    for (const block of findeAlleI(parseParadox(text).eintraege, 'spriteTypes')) {
      for (const s of findeAlleI(block.wert.inhalt || [], 'spriteType')) {
        const n = wertText(findeI(s.wert.inhalt || [], 'name')?.wert)
        if (n) namen.add(n)
      }
    }
  }
  return namen
}

export function erzeugeMod(projekt, spieldaten) {
  const modid = projekt.mod.modid
  const dateien = new Map()
  const fehler = []
  const sprache = erstelleSprachsammler()
  const benutzteSprache = new Set()
  const benutzteGfx = new Set()
  const anhaenge = new Map()
  const farben = new Map()
  const staatsAenderungen = new Map()
  const manpower = new Map()
  const neueVerlaeufe = new Map()
  const neueZeilen = new Map()
  const entfernen = new Map()
  const umformen = new Map()
  const bonusGeister = new Map()
  const staatsEditor = new Map()
  const charaktere = new Map()
  const neueTags = new Set(projekt.laender.filter(l => l.art === 'neu').map(l => l.tag))

  const kontext = {
    projekt, spieldaten, modid, sprache,
    holeBild(bildId) {
      const b = projekt.bilder?.[bildId]
      if (!b) return null
      const bytes = ausBase64(b.rgba)
      return { breite: b.breite, hoehe: b.hoehe, rgba: new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.byteLength) }
    },
    schreibe(pfad, inhalt, { kopie } = {}) {
      if (dateien.has(pfad)) fehler.push(`Datei doppelt erzeugt: ${pfad}`)
      dateien.set(pfad, kopie ? { pfad, inhalt, kopie: true } : { pfad, inhalt })
    },
    braucheSprache: (k) => benutzteSprache.add(k),
    braucheGfx: (g) => benutzteGfx.add(g),
    verlaufAnhaengen(tag, zeilen) {
      if (!anhaenge.has(tag)) anhaenge.set(tag, [])
      anhaenge.get(tag).push(...zeilen)
    },
    neueFarbe: (tag, rgb) => farben.set(tag, rgb),
    /** Geist fuer den Baustein «Bonus erhalten»; dieselbe Kennung zaehlt nur einmal. */
    bonusGeist: (kennung, daten) => { if (!bonusGeister.has(kennung)) bonusGeister.set(kennung, daten) },
    bonusGeister,
    /** Verlaufsdatei eines neuen Landes; wird am Schluss mit allen Startzeilen geschrieben. */
    neuerVerlauf: (tag, pfad, text) => neueVerlaeufe.set(tag, { pfad, text }),
    /** Zeilen fuer den Spielstart: bei neuen Laendern in ihre Datei, sonst als Anhang an die Spieldatei. */
    startZeilen(tag, zeilen) {
      if (neueTags.has(tag)) {
        if (!neueZeilen.has(tag)) neueZeilen.set(tag, [])
        neueZeilen.get(tag).push(...zeilen)
      } else {
        kontext.verlaufAnhaengen(tag, zeilen)
      }
    },
    /** Entfernt in der kopierten Verlaufsdatei eines Spiel-Landes Eintraege auf oberster Ebene. */
    verlaufEntfernen(tag, pruefe) {
      if (!entfernen.has(tag)) entfernen.set(tag, [])
      entfernen.get(tag).push(pruefe)
    },
    /** Formt in der kopierten Verlaufsdatei Eintraege um (fn → Eintrag oder null zum Entfernen); keine Datumsbloecke. */
    verlaufUmformen(tag, fn) {
      if (!umformen.has(tag)) umformen.set(tag, [])
      umformen.get(tag).push(fn)
    },
    /** Charakter eines Landes (Anfuehrer, Personen); am Ende entsteht je Land eine Datei common/characters. */
    charakter(tag, kennung, inhalt) {
      if (!charaktere.has(tag)) charaktere.set(tag, [])
      charaktere.get(tag).push({ schluessel: kennung, op: '=', wert: { typ: 'block', inhalt } })
    },
    staatManpower: (staatId, faktor) => manpower.set(staatId, faktor),
    /** Aenderung aus dem Staaten-Editor; wird mit Besitzer und Bevoelkerung in dieselbe Datei geschrieben. */
    staatAenderung: (staatId, aenderung) => staatsEditor.set(staatId, aenderung),
    staatAnLand(staatId, tag, { kernAltEntfernen = false } = {}) {
      const vorher = staatsAenderungen.get(staatId)
      if (vorher && vorher.tag !== tag) fehler.push(`Staat ${staatId} ist zwei Ländern zugewiesen (${vorher.tag}, ${tag})`)
      staatsAenderungen.set(staatId, { tag, kernAltEntfernen })
    },
  }

  for (const erzeuger of ERZEUGER) {
    try {
      erzeuger(kontext)
    } catch (e) {
      fehler.push(`Interner Fehler: ${e.message}`)
    }
  }

  for (const [tag, eintraege] of charaktere) {
    kontext.schreibe(modPfad(modid, `common/characters/${modid}_${tag}.txt`), schreibeParadox([{ schluessel: 'characters', op: '=', wert: { typ: 'block', inhalt: eintraege } }]))
  }
  for (const [tag, { pfad, text }] of neueVerlaeufe) {
    const extra = neueZeilen.get(tag) ?? []
    kontext.schreibe(pfad, extra.length ? `${text}${extra.join('\n')}\n` : text)
  }
  for (const staatId of new Set([...staatsAenderungen.keys(), ...manpower.keys(), ...staatsEditor.keys()])) {
    const staat = spieldaten.staaten[staatId]
    const original = staat && spieldaten.originaltexte[staat.datei]
    if (!original) {
      fehler.push(`Staat ${staatId} gibt es im Spiel nicht`)
      continue
    }
    const aenderung = staatsAenderungen.get(staatId)
    kontext.schreibe(modPfad(modid, staat.datei), aendereStaatsdatei(original, {
      neuerBesitzer: aenderung?.tag, kernAltEntfernen: aenderung?.kernAltEntfernen, manpowerFaktor: manpower.get(staatId), staat: staatsEditor.get(staatId),
    }), { kopie: true })
  }
  for (const tag of new Set([...anhaenge.keys(), ...entfernen.keys(), ...umformen.keys()])) {
    const datei = spieldaten.laender[tag]?.verlaufDatei
    if (!datei || spieldaten.originaltexte[datei] === undefined) {
      fehler.push(`Für ${tag} gibt es keine Verlaufsdatei im Spiel.`)
      continue
    }
    let basis = spieldaten.originaltexte[datei]
    const pruefungen = entfernen.get(tag) ?? []
    const formen = umformen.get(tag) ?? []
    if (pruefungen.length || formen.length) {
      // Oberste Ebene und bedingte Bloecke (if/else_if/else), aber keine Datumsbloecke
      const forme = (x) => formen.reduce((e, f) => (e ? f(e) : e), x)
      const filtere = (inhalt) => inhalt
        .filter(x => !(x.schluessel && pruefungen.some(f => f(x))))
        .map(x => (x.schluessel ? forme(x) : x))
        .filter(Boolean)
        .map(x => (x.schluessel && ['if', 'else_if', 'else'].includes(x.schluessel.toLowerCase()) && x.wert.typ === 'block'
          ? { ...x, wert: { ...x.wert, inhalt: filtere(x.wert.inhalt) } } : x))
      basis = schreibeParadox(filtere(parseParadox(basis).eintraege))
    }
    const zeilen = anhaenge.get(tag) ?? []
    kontext.schreibe(modPfad(modid, datei), zeilen.length ? verlaufMitAnhang(basis, zeilen, modid) : basis, { kopie: true })
  }
  if (farben.size) {
    kontext.schreibe(modPfad(modid, 'common/countries/colors.txt'), aendereColors(spieldaten.originaltexte['common/countries/colors.txt'] ?? null, farben), { kopie: true })
  }
  for (const d of sprache.dateien(modid)) kontext.schreibe(d.pfad, d.inhalt)

  const beschreibung = deskriptor(projekt, spieldaten)
  kontext.schreibe(modPfad(modid, 'descriptor.mod'), beschreibung)
  const ordner = String(projekt.mod.benutzerOrdner || '').trim().replace(/"/g, '').replace(/\\/g, '/').replace(/\/+$/, '')
  const pfad = ordner ? `${ordner}/mod/${modid}` : `mod/${modid}`
  kontext.schreibe(`mod/${modid}.mod`, beschreibung + `path="${pfad}"\n`)
  if (projekt.mod.vorschaubild?.pngBase64) kontext.schreibe(modPfad(modid, 'thumbnail.png'), ausBase64(projekt.mod.vorschaubild.pngBase64))
  kontext.schreibe(modPfad(modid, 'hoi4-mod-creator-projekt.json'), JSON.stringify(projekt))

  const liste = [...dateien.values()]
  const definierteSprache = sprache.definiert()
  for (const land of Object.values(spieldaten.laender)) {
    for (const k of [land.tag, `${land.tag}_DEF`, `${land.tag}_ADJ`, ...land.namensVarianten]) definierteSprache.add(k)
  }
  const bekannteGfx = new Set([...Object.keys(spieldaten.sprites || {}), ...modGfxNamen(liste)])
  fehler.push(...pruefeAusgabe(liste, { benutzteSprache, definierteSprache, benutzteGfx, bekannteGfx }))
  return { dateien: liste, fehler }
}
