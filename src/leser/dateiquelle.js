// Einheitlicher Zugriff auf Dateien: aus der Ordnerauswahl des Browsers oder aus einem Objekt (Tests).

const dekodierer = () => new TextDecoder('utf-8')

/**
 * @typedef {{ liste(): string[], hat(pfad: string): boolean, text(pfad: string): Promise<string>, bytes(pfad: string): Promise<Uint8Array> }} Dateiquelle
 */

/** Windows unterscheidet nicht zwischen Gross- und Kleinschreibung; Verweise im Spiel verlassen sich darauf. */
function aufloeser(pfade) {
  const exakt = new Set(pfade)
  const klein = new Map()
  for (const p of pfade) if (!klein.has(p.toLowerCase())) klein.set(p.toLowerCase(), p)
  return (pfad) => (exakt.has(pfad) ? pfad : klein.get(String(pfad).toLowerCase()))
}

/** Dateiquelle aus einem Objekt { pfad: string | Uint8Array }. */
export function dateiquelleAusObjekt(obj) {
  const finde = aufloeser(Object.keys(obj))
  const hole = (pfad) => {
    const echt = finde(pfad)
    if (echt === undefined) throw new Error(`Datei fehlt: ${pfad}`)
    return obj[echt]
  }
  return {
    liste: () => Object.keys(obj),
    hat: (pfad) => finde(pfad) !== undefined,
    async text(pfad) {
      const v = hole(pfad)
      return typeof v === 'string' ? v : dekodierer().decode(v)
    },
    async bytes(pfad) {
      const v = hole(pfad)
      return typeof v === 'string' ? new TextEncoder().encode(v) : v
    },
  }
}

/** Dateiquelle aus der Ordnerauswahl (<input webkitdirectory>). Der oberste Ordnername wird entfernt. */
export function dateiquelleAusFileList(files) {
  const karte = new Map()
  for (const f of files) {
    const teile = String(f.webkitRelativePath || f.name).replace(/\\/g, '/').split('/')
    if (teile.length > 1) teile.shift()
    karte.set(teile.join('/'), f)
  }
  const finde = aufloeser([...karte.keys()])
  const hole = (pfad) => {
    const echt = finde(pfad)
    if (echt === undefined) throw new Error(`Datei fehlt: ${pfad}`)
    return karte.get(echt)
  }
  return {
    liste: () => [...karte.keys()],
    hat: (pfad) => finde(pfad) !== undefined,
    async text(pfad) {
      return dekodierer().decode(new Uint8Array(await hole(pfad).arrayBuffer()))
    },
    async bytes(pfad) {
      return new Uint8Array(await hole(pfad).arrayBuffer())
    },
  }
}

/** Gehoert nicht zum Inhalt einer Mod, sondern beschreibt sie. */
const istModBeschreibung = (pfad) => !pfad.includes('/') && (/\.mod$/i.test(pfad) || pfad.toLowerCase() === 'thumbnail.png')

/**
 * Legt Mod-Ordner ueber den Spielordner (Etappe 4g): gleicher Pfad – spaetere Ebene gewinnt;
 * replace_path blendet die direkten Dateien frueherer Ebenen in diesem Ordner aus.
 * @param {Dateiquelle} spiel
 * @param {{ quelle: Dateiquelle, name: string, replacePaths: string[] }[]} mods
 */
export function dateiquelleUeberlagert(spiel, mods) {
  const eintraege = new Map()
  const ordnerVon = (p) => p.slice(0, Math.max(0, p.lastIndexOf('/'))).toLowerCase()
  for (const p of spiel.liste()) eintraege.set(p.toLowerCase(), { ebene: 0, quelle: spiel, pfad: p })
  mods.forEach((mod, i) => {
    const ersetzt = new Set((mod.replacePaths || []).map(r => r.toLowerCase()))
    if (ersetzt.size) for (const [k, v] of eintraege) if (ersetzt.has(ordnerVon(v.pfad))) eintraege.delete(k)
    for (const p of mod.quelle.liste()) {
      if (istModBeschreibung(p)) continue
      eintraege.set(p.toLowerCase(), { ebene: i + 1, quelle: mod.quelle, pfad: p })
    }
  })
  const hole = (pfad) => {
    const e = eintraege.get(String(pfad).toLowerCase())
    if (!e) throw new Error(`Datei fehlt: ${pfad}`)
    return e
  }
  return {
    liste: () => [...eintraege.values()].map(e => e.pfad),
    hat: (pfad) => eintraege.has(String(pfad).toLowerCase()),
    async text(pfad) {
      const e = hole(pfad)
      return e.quelle.text(e.pfad)
    },
    async bytes(pfad) {
      const e = hole(pfad)
      return e.quelle.bytes(e.pfad)
    },
    ebene: (pfad) => eintraege.get(String(pfad).toLowerCase())?.ebene ?? 0,
    ebenenName: (i) => (i === 0 ? 'Spiel' : mods[i - 1]?.name ?? 'Spiel'),
  }
}
