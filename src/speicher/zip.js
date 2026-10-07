// Einfacher ZIP-Schreiber (unkomprimiert), damit die Mod auch ohne Ordnerzugriff gespeichert werden kann.

const TABELLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(bytes) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) c = TABELLE[(c ^ bytes[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

// 1.1.2026 00:00 im DOS-Format
const DOS_ZEIT = 0
const DOS_DATUM = ((2026 - 1980) << 9) | (1 << 5) | 1

export function erstelleZip(dateien) {
  const kodierer = new TextEncoder()
  const teile = []
  const zentral = []
  let versatz = 0
  for (const d of dateien) {
    const name = kodierer.encode(d.pfad)
    const daten = typeof d.inhalt === 'string' ? kodierer.encode(d.inhalt) : d.inhalt
    const pruef = crc32(daten)
    const lokal = new Uint8Array(30 + name.length)
    const l = new DataView(lokal.buffer)
    l.setUint32(0, 0x04034b50, true)
    l.setUint16(4, 20, true)
    l.setUint16(6, 0x800, true)
    l.setUint16(8, 0, true)
    l.setUint16(10, DOS_ZEIT, true)
    l.setUint16(12, DOS_DATUM, true)
    l.setUint32(14, pruef, true)
    l.setUint32(18, daten.length, true)
    l.setUint32(22, daten.length, true)
    l.setUint16(26, name.length, true)
    lokal.set(name, 30)
    const z = new Uint8Array(46 + name.length)
    const c = new DataView(z.buffer)
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, 0x800, true)
    c.setUint16(12, DOS_ZEIT, true)
    c.setUint16(14, DOS_DATUM, true)
    c.setUint32(16, pruef, true)
    c.setUint32(20, daten.length, true)
    c.setUint32(24, daten.length, true)
    c.setUint16(28, name.length, true)
    c.setUint32(42, versatz, true)
    z.set(name, 46)
    teile.push(lokal, daten)
    zentral.push(z)
    versatz += lokal.length + daten.length
  }
  const zentralGroesse = zentral.reduce((s, z) => s + z.length, 0)
  const ende = new Uint8Array(22)
  const e = new DataView(ende.buffer)
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, dateien.length, true)
  e.setUint16(10, dateien.length, true)
  e.setUint32(12, zentralGroesse, true)
  e.setUint32(16, versatz, true)
  const alle = [...teile, ...zentral, ende]
  const zip = new Uint8Array(alle.reduce((s, t) => s + t.length, 0))
  let p = 0
  for (const t of alle) {
    zip.set(t, p)
    p += t.length
  }
  return zip
}
