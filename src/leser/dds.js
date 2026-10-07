// DDS lesen (Symbole, Portraets, Ideenbilder des Spiels).

function istDds(bytes) {
  return bytes.length >= 128 && bytes[0] === 0x44 && bytes[1] === 0x44 && bytes[2] === 0x53 && bytes[3] === 0x20
}

/** Breite und Hoehe aus dem DDS-Kopf. */
export function ddsGroesse(bytes) {
  if (!istDds(bytes)) return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return [dv.getUint32(16, true), dv.getUint32(12, true)]
}

function farbe565(c, ziel, o) {
  const r = (c >> 11) & 31, g = (c >> 5) & 63, b = c & 31
  ziel[o] = (r << 3) | (r >> 2)
  ziel[o + 1] = (g << 2) | (g >> 4)
  ziel[o + 2] = (b << 3) | (b >> 2)
  ziel[o + 3] = 255
}

// Farbtabelle (4 Eintraege x RGBA) eines DXT-Farbblocks
function farbBlock(bytes, p, dreiFarbenErlaubt) {
  const c0 = bytes[p] | (bytes[p + 1] << 8)
  const c1 = bytes[p + 2] | (bytes[p + 3] << 8)
  const t = new Uint8ClampedArray(16)
  farbe565(c0, t, 0)
  farbe565(c1, t, 4)
  if (c0 > c1 || !dreiFarbenErlaubt) {
    for (let k = 0; k < 3; k++) {
      t[8 + k] = Math.round((2 * t[k] + t[4 + k]) / 3)
      t[12 + k] = Math.round((t[k] + 2 * t[4 + k]) / 3)
    }
    t[11] = 255; t[15] = 255
  } else {
    for (let k = 0; k < 3; k++) t[8 + k] = Math.round((t[k] + t[4 + k]) / 2)
    t[11] = 255
    t[12] = 0; t[13] = 0; t[14] = 0; t[15] = 0
  }
  return t
}

function dekodiereDxt(bytes, start, breite, hoehe, art) {
  const rgba = new Uint8ClampedArray(breite * hoehe * 4)
  const blockGroesse = art === 'DXT1' ? 8 : 16
  const bx = Math.ceil(breite / 4), by = Math.ceil(hoehe / 4)
  let p = start
  const alpha = new Uint8Array(16)
  for (let j = 0; j < by; j++) {
    for (let i = 0; i < bx; i++) {
      if (p + blockGroesse > bytes.length) return rgba
      let farbStart = p
      if (art === 'DXT3') {
        for (let k = 0; k < 8; k++) {
          const b = bytes[p + k]
          alpha[k * 2] = (b & 15) * 17
          alpha[k * 2 + 1] = (b >> 4) * 17
        }
        farbStart = p + 8
      } else if (art === 'DXT5') {
        const a0 = bytes[p], a1 = bytes[p + 1]
        const werte = [a0, a1]
        if (a0 > a1) for (let k = 1; k <= 6; k++) werte.push(Math.round(((7 - k) * a0 + k * a1) / 7))
        else { for (let k = 1; k <= 4; k++) werte.push(Math.round(((5 - k) * a0 + k * a1) / 5)); werte.push(0, 255) }
        // 48 Bit Indizes, je 3 Bit
        let bitsLo = bytes[p + 2] | (bytes[p + 3] << 8) | (bytes[p + 4] << 16)
        let bitsHi = bytes[p + 5] | (bytes[p + 6] << 8) | (bytes[p + 7] << 16)
        for (let k = 0; k < 8; k++) { alpha[k] = werte[bitsLo & 7]; bitsLo >>= 3 }
        for (let k = 8; k < 16; k++) { alpha[k] = werte[bitsHi & 7]; bitsHi >>= 3 }
        farbStart = p + 8
      }
      const tabelle = farbBlock(bytes, farbStart, art === 'DXT1')
      const indizes = bytes[farbStart + 4] | (bytes[farbStart + 5] << 8) | (bytes[farbStart + 6] << 16) | (bytes[farbStart + 7] << 24)
      for (let py = 0; py < 4; py++) {
        for (let px = 0; px < 4; px++) {
          const x = i * 4 + px, y = j * 4 + py
          if (x >= breite || y >= hoehe) continue
          const k = py * 4 + px
          const idx = (indizes >>> (k * 2)) & 3
          const o = (y * breite + x) * 4
          rgba[o] = tabelle[idx * 4]
          rgba[o + 1] = tabelle[idx * 4 + 1]
          rgba[o + 2] = tabelle[idx * 4 + 2]
          rgba[o + 3] = art === 'DXT1' ? tabelle[idx * 4 + 3] : alpha[k]
        }
      }
      p += blockGroesse
    }
  }
  return rgba
}

function maskenInfo(maske) {
  if (!maske) return null
  let verschiebung = 0
  while (((maske >>> verschiebung) & 1) === 0) verschiebung++
  let bits = 0
  while (((maske >>> (verschiebung + bits)) & 1) === 1) bits++
  return { maske, verschiebung, max: (2 ** bits) - 1 }
}

/**
 * Liest ein DDS-Bild (erste Mipmap-Stufe).
 * @returns {{ breite, hoehe, rgba } | null} null bei unbekanntem Format
 */
export function leseDds(bytes) {
  if (!istDds(bytes)) return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const hoehe = dv.getUint32(12, true)
  const breite = dv.getUint32(16, true)
  const pfFlags = dv.getUint32(80, true)
  if (pfFlags & 0x4) {
    const fourCC = String.fromCharCode(bytes[84], bytes[85], bytes[86], bytes[87])
    if (fourCC === 'DXT1' || fourCC === 'DXT3' || fourCC === 'DXT5') {
      return { breite, hoehe, rgba: dekodiereDxt(bytes, 128, breite, hoehe, fourCC) }
    }
    return null
  }
  const bits = dv.getUint32(88, true)
  if (!(pfFlags & 0x40) || (bits !== 32 && bits !== 24)) return null
  const r = maskenInfo(dv.getUint32(92, true))
  const g = maskenInfo(dv.getUint32(96, true))
  const b = maskenInfo(dv.getUint32(100, true))
  const a = (pfFlags & 0x1) ? maskenInfo(dv.getUint32(104, true)) : null
  if (!r || !g || !b) return null
  const bpp = bits / 8
  const rgba = new Uint8ClampedArray(breite * hoehe * 4)
  const kanal = (wert, info) => Math.round((((wert & info.maske) >>> info.verschiebung) * 255) / info.max)
  let p = 128
  for (let i = 0; i < breite * hoehe; i++) {
    if (p + bpp > bytes.length) break
    const wert = bpp === 4 ? dv.getUint32(p, true) : (bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16))
    rgba[i * 4] = kanal(wert, r)
    rgba[i * 4 + 1] = kanal(wert, g)
    rgba[i * 4 + 2] = kanal(wert, b)
    rgba[i * 4 + 3] = a ? kanal(wert, a) : 255
    p += bpp
  }
  return { breite, hoehe, rgba }
}
