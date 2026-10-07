// TGA lesen (Flaggen des Spiels).

/**
 * Liest TGA Typ 2 (unkomprimiert) und 10 (RLE) mit 24 oder 32 Bit.
 * @returns {{ breite: number, hoehe: number, rgba: Uint8ClampedArray }}
 */
export function leseTga(bytes) {
  const idLaenge = bytes[0]
  const farbtabelle = bytes[1]
  const typ = bytes[2]
  const tabellenLaenge = bytes[5] | (bytes[6] << 8)
  const tabellenBits = bytes[7]
  const breite = bytes[12] | (bytes[13] << 8)
  const hoehe = bytes[14] | (bytes[15] << 8)
  const bits = bytes[16]
  const beschreibung = bytes[17]
  if (typ !== 2 && typ !== 10) throw new Error(`TGA-Typ ${typ} wird nicht unterstuetzt`)
  if (bits !== 24 && bits !== 32) throw new Error(`TGA mit ${bits} Bit wird nicht unterstuetzt`)
  const bpp = bits / 8
  let pos = 18 + idLaenge + (farbtabelle ? tabellenLaenge * Math.ceil(tabellenBits / 8) : 0)
  const anzahl = breite * hoehe
  // Pixel in Dateireihenfolge sammeln
  const roh = new Uint8ClampedArray(anzahl * 4)
  const lesePixel = (ziel) => {
    roh[ziel] = bytes[pos + 2]
    roh[ziel + 1] = bytes[pos + 1]
    roh[ziel + 2] = bytes[pos]
    roh[ziel + 3] = bpp === 4 ? bytes[pos + 3] : 255
    pos += bpp
  }
  if (typ === 2) {
    for (let i = 0; i < anzahl; i++) lesePixel(i * 4)
  } else {
    let i = 0
    while (i < anzahl && pos < bytes.length) {
      const kopf = bytes[pos++]
      const laenge = (kopf & 0x7F) + 1
      if (kopf & 0x80) {
        lesePixel(i * 4)
        for (let k = 1; k < laenge && i + k < anzahl; k++) roh.copyWithin((i + k) * 4, i * 4, i * 4 + 4)
        i += laenge
      } else {
        for (let k = 0; k < laenge && i < anzahl; k++, i++) lesePixel(i * 4)
      }
    }
  }
  const obenNachUnten = (beschreibung & 0x20) !== 0
  if (obenNachUnten) return { breite, hoehe, rgba: roh }
  const rgba = new Uint8ClampedArray(anzahl * 4)
  const zeile = breite * 4
  for (let y = 0; y < hoehe; y++) rgba.set(roh.subarray((hoehe - 1 - y) * zeile, (hoehe - y) * zeile), y * zeile)
  return { breite, hoehe, rgba }
}
