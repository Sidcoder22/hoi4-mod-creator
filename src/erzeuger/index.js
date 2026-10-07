// Erzeugt aus Projekt und Spieldaten alle Dateien der Mod.
// Ergebnis: Pfade relativ zum Ordner «Hearts of Iron IV» im Benutzerverzeichnis.

import { parseParadox, finde, findeAlle, wertText } from '../leser/paradox.js'
import { ausBase64 } from '../projekt/base64.js'
import { erstelleSprachsammler } from './sprache.js'
import { aendereStaatsdatei, aendereColors, verlaufMitAnhang } from './kern.js'
import { pruefeAusgabe } from './ausgabepruefung.js'
import { modPfad } from './kennungen.js'

/** Erzeuger fuer Laender, Geister usw.; jeder bekommt den Kontext. */
export const ERZEUGER = []

function deskriptor(projekt, spieldaten) {
  const m = projekt.mod
  const name = String(m.name || m.modid).replace(/"/g, '')
  let t = `version="${String(m.version || '1.0').replace(/"/g, '')}"\ntags={\n\t"Alternative History"\n}\nname="${name}"\n`
  t += `supported_version="${spieldaten.supportedVersion || '1.*'}"\n`
  if (m.vorschaubild?.pngBase64) t += 'picture="thumbnail.png"\n'
  return t
}

function modGfxNamen(dateien) {
  const namen = new Set()
  for (const d of dateien) {
    if (!d.pfad.endsWith('.gfx')) continue
    const text = typeof d.inhalt === 'string' ? d.inhalt : new TextDecoder().decode(d.inhalt)
    for (const block of findeAlle(parseParadox(text).eintraege, 'spriteTypes')) {
      for (const s of findeAlle(block.wert.inhalt || [], 'spriteType')) {
        const n = wertText(finde(s.wert.inhalt || [], 'name')?.wert)
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

  for (const [staatId, { tag, kernAltEntfernen }] of staatsAenderungen) {
    const staat = spieldaten.staaten[staatId]
    const original = staat && spieldaten.originaltexte[staat.datei]
    if (!original) {
      fehler.push(`Staat ${staatId} gibt es im Spiel nicht`)
      continue
    }
    kontext.schreibe(modPfad(modid, staat.datei), aendereStaatsdatei(original, { neuerBesitzer: tag, kernAltEntfernen }), { kopie: true })
  }
  for (const [tag, zeilen] of anhaenge) {
    const datei = spieldaten.laender[tag]?.verlaufDatei
    if (!datei || spieldaten.originaltexte[datei] === undefined) {
      fehler.push(`Für ${tag} gibt es keine Verlaufsdatei im Spiel.`)
      continue
    }
    kontext.schreibe(modPfad(modid, datei), verlaufMitAnhang(spieldaten.originaltexte[datei], zeilen, modid), { kopie: true })
  }
  if (farben.size) {
    kontext.schreibe(modPfad(modid, 'common/countries/colors.txt'), aendereColors(spieldaten.originaltexte['common/countries/colors.txt'] ?? null, farben), { kopie: true })
  }
  for (const d of sprache.dateien(modid)) kontext.schreibe(d.pfad, d.inhalt)

  const beschreibung = deskriptor(projekt, spieldaten)
  kontext.schreibe(modPfad(modid, 'descriptor.mod'), beschreibung)
  const benutzer = String(projekt.mod.windowsBenutzer || '').trim().replace(/["\\/]/g, '')
  const pfad = benutzer ? `C:/Users/${benutzer}/Documents/Paradox Interactive/Hearts of Iron IV/mod/${modid}` : `mod/${modid}`
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
