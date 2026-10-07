// Nachbildung der Ordner-Schnittstelle des Browsers (FileSystemDirectoryHandle) fuer Tests und Selbsttest.

function nichtGefunden(name) {
  const e = new Error(`Nicht gefunden: ${name}`)
  e.name = 'NotFoundError'
  return e
}

function dateiHandle(ordner, name) {
  return {
    kind: 'file',
    name,
    async getFile() {
      const daten = ordner.dateien.get(name)
      if (!daten) throw nichtGefunden(name)
      return {
        name, size: daten.length,
        text: async () => new TextDecoder().decode(daten),
        arrayBuffer: async () => daten.slice().buffer,
      }
    },
    async createWritable() {
      const stuecke = []
      return {
        async write(daten) {
          if (typeof daten === 'string') stuecke.push(new TextEncoder().encode(daten))
          else if (daten instanceof Uint8Array) stuecke.push(daten.slice())
          else if (daten && typeof daten.arrayBuffer === 'function') stuecke.push(new Uint8Array(await daten.arrayBuffer()))
          else stuecke.push(new Uint8Array(daten))
        },
        async close() {
          const laenge = stuecke.reduce((s, x) => s + x.length, 0)
          const alles = new Uint8Array(laenge)
          let p = 0
          for (const s of stuecke) { alles.set(s, p); p += s.length }
          ordner.dateien.set(name, alles)
        },
      }
    },
  }
}

function ordnerHandle(ordner, name) {
  return {
    kind: 'directory',
    name,
    async getDirectoryHandle(n, { create = false } = {}) {
      if (!ordner.ordner.has(n)) {
        if (!create) throw nichtGefunden(n)
        ordner.ordner.set(n, { ordner: new Map(), dateien: new Map() })
      }
      return ordnerHandle(ordner.ordner.get(n), n)
    },
    async getFileHandle(n, { create = false } = {}) {
      if (!ordner.dateien.has(n)) {
        if (!create) throw nichtGefunden(n)
        ordner.dateien.set(n, new Uint8Array(0))
      }
      return dateiHandle(ordner, n)
    },
    async removeEntry(n) {
      if (ordner.dateien.delete(n)) return
      if (ordner.ordner.delete(n)) return
      throw nichtGefunden(n)
    },
    async *entries() {
      for (const n of ordner.ordner.keys()) yield [n, ordnerHandle(ordner.ordner.get(n), n)]
      for (const n of ordner.dateien.keys()) yield [n, dateiHandle(ordner, n)]
    },
    async queryPermission() { return 'granted' },
    async requestPermission() { return 'granted' },
  }
}

/** Erstellt einen Ordner im Speicher, vorbefuellt mit { pfad: string | Uint8Array }. */
export function erstelleFakeOrdner(anfang = {}, name = 'Hearts of Iron IV') {
  const wurzel = { ordner: new Map(), dateien: new Map() }
  for (const [pfad, inhalt] of Object.entries(anfang)) {
    const teile = pfad.split('/')
    let o = wurzel
    for (const t of teile.slice(0, -1)) {
      if (!o.ordner.has(t)) o.ordner.set(t, { ordner: new Map(), dateien: new Map() })
      o = o.ordner.get(t)
    }
    o.dateien.set(teile.at(-1), typeof inhalt === 'string' ? new TextEncoder().encode(inhalt) : inhalt)
  }
  const handle = ordnerHandle(wurzel, name)
  handle.alsObjekt = () => {
    const ergebnis = {}
    const lauf = (o, praefix) => {
      for (const [n, d] of o.dateien) ergebnis[praefix + n] = d
      for (const [n, u] of o.ordner) lauf(u, praefix + n + '/')
    }
    lauf(wurzel, '')
    return ergebnis
  }
  return handle
}
