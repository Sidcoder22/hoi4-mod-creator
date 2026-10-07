// BMP lesen (fuer map/provinces.bmp) und schreiben (fuer den Mini-Spielordner).

/**
 * Liest ein unkomprimiertes 24-Bit-BMP.
 * @returns {{ breite: number, hoehe: number, rgb: Uint8Array }} Pixel oben-nach-unten, 3 Byte je Pixel
 */
export function leseBmp(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4D) throw new Error('Keine BMP-Datei')
  const datenStart = dv.getUint32(10, true)
  const breite = dv.getInt32(18, true)
  const hoeheRoh = dv.getInt32(22, true)
  const bits = dv.getUint16(28, true)
  const kompression = dv.getUint32(30, true)
  if (bits !== 24 || kompression !== 0) throw new Error(`BMP mit ${bits} Bit wird nicht unterstuetzt`)
  const hoehe = Math.abs(hoeheRoh)
  const untenNachOben = hoeheRoh > 0
  const zeilenLaenge = Math.ceil((breite * 3) / 4) * 4
  const rgb = new Uint8Array(breite * hoehe * 3)
  for (let y = 0; y < hoehe; y++) {
    const quellZeile = untenNachOben ? hoehe - 1 - y : y
    let q = datenStart + quellZeile * zeilenLaenge
    let z = y * breite * 3
    for (let x = 0; x < breite; x++) {
      rgb[z] = bytes[q + 2]
      rgb[z + 1] = bytes[q + 1]
      rgb[z + 2] = bytes[q]
      q += 3
      z += 3
    }
  }
  return { breite, hoehe, rgb }
}

/** Schreibt ein 24-Bit-BMP (unten-nach-oben). rgb ist oben-nach-unten. */
export function schreibeBmp24(rgb, breite, hoehe) {
  const zeilenLaenge = Math.ceil((breite * 3) / 4) * 4
  const groesse = 54 + zeilenLaenge * hoehe
  const b = new Uint8Array(groesse)
  const dv = new DataView(b.buffer)
  b[0] = 0x42; b[1] = 0x4D
  dv.setUint32(2, groesse, true)
  dv.setUint32(10, 54, true)
  dv.setUint32(14, 40, true)
  dv.setInt32(18, breite, true)
  dv.setInt32(22, hoehe, true)
  dv.setUint16(26, 1, true)
  dv.setUint16(28, 24, true)
  dv.setUint32(34, zeilenLaenge * hoehe, true)
  for (let y = 0; y < hoehe; y++) {
    let z = 54 + (hoehe - 1 - y) * zeilenLaenge
    let q = y * breite * 3
    for (let x = 0; x < breite; x++) {
      b[z] = rgb[q + 2]; b[z + 1] = rgb[q + 1]; b[z + 2] = rgb[q]
      z += 3; q += 3
    }
  }
  return b
}
