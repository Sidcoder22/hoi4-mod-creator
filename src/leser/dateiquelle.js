// Einheitlicher Zugriff auf Dateien: aus der Ordnerauswahl des Browsers oder aus einem Objekt (Tests).

const dekodierer = () => new TextDecoder('utf-8')

/**
 * @typedef {{ liste(): string[], hat(pfad: string): boolean, text(pfad: string): Promise<string>, bytes(pfad: string): Promise<Uint8Array> }} Dateiquelle
 */

/** Dateiquelle aus einem Objekt { pfad: string | Uint8Array }. */
export function dateiquelleAusObjekt(obj) {
  return {
    liste: () => Object.keys(obj),
    hat: (pfad) => Object.prototype.hasOwnProperty.call(obj, pfad),
    async text(pfad) {
      const v = obj[pfad]
      if (v === undefined) throw new Error(`Datei fehlt: ${pfad}`)
      return typeof v === 'string' ? v : dekodierer().decode(v)
    },
    async bytes(pfad) {
      const v = obj[pfad]
      if (v === undefined) throw new Error(`Datei fehlt: ${pfad}`)
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
  const hole = (pfad) => {
    const f = karte.get(pfad)
    if (!f) throw new Error(`Datei fehlt: ${pfad}`)
    return f
  }
  return {
    liste: () => [...karte.keys()],
    hat: (pfad) => karte.has(pfad),
    async text(pfad) {
      return dekodierer().decode(new Uint8Array(await hole(pfad).arrayBuffer()))
    },
    async bytes(pfad) {
      return new Uint8Array(await hole(pfad).arrayBuffer())
    },
  }
}
