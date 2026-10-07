// Bilder fuer die Mod schreiben (TGA fuer Flaggen, DDS fuer alles andere) und skalieren.

/** 32-Bit-TGA, unkomprimiert, Ursprung unten links. rgba ist oben-nach-unten. */
export function schreibeTga(rgba, breite, hoehe) {
  const b = new Uint8Array(18 + breite * hoehe * 4)
  b[2] = 2
  b[12] = breite & 255; b[13] = breite >> 8
  b[14] = hoehe & 255; b[15] = hoehe >> 8
  b[16] = 32
  b[17] = 8
  let z = 18
  for (let y = hoehe - 1; y >= 0; y--) {
    for (let x = 0; x < breite; x++) {
      const q = (y * breite + x) * 4
      b[z] = rgba[q + 2]; b[z + 1] = rgba[q + 1]; b[z + 2] = rgba[q]; b[z + 3] = rgba[q + 3]
      z += 4
    }
  }
  return b
}

/** Unkomprimiertes 32-Bit-DDS (A8R8G8B8). */
export function schreibeDds(rgba, breite, hoehe) {
  const b = new Uint8Array(128 + breite * hoehe * 4)
  const dv = new DataView(b.buffer)
  b.set([0x44, 0x44, 0x53, 0x20])
  dv.setUint32(4, 124, true)
  dv.setUint32(8, 0x100F, true)
  dv.setUint32(12, hoehe, true)
  dv.setUint32(16, breite, true)
  dv.setUint32(20, breite * 4, true)
  dv.setUint32(76, 32, true)
  dv.setUint32(80, 0x41, true)
  dv.setUint32(88, 32, true)
  dv.setUint32(92, 0x00FF0000, true)
  dv.setUint32(96, 0x0000FF00, true)
  dv.setUint32(100, 0x000000FF, true)
  dv.setUint32(104, 0xFF000000, true)
  dv.setUint32(108, 0x1000, true)
  let z = 128
  for (let i = 0; i < breite * hoehe; i++) {
    const q = i * 4
    b[z] = rgba[q + 2]; b[z + 1] = rgba[q + 1]; b[z + 2] = rgba[q]; b[z + 3] = rgba[q + 3]
    z += 4
  }
  return b
}

function verkleinere(rgba, b, h, zb, zh) {
  const ziel = new Uint8ClampedArray(zb * zh * 4)
  const sx = b / zb, sy = h / zh
  for (let ty = 0; ty < zh; ty++) {
    const y0 = ty * sy, y1 = y0 + sy
    for (let tx = 0; tx < zb; tx++) {
      const x0 = tx * sx, x1 = x0 + sx
      const summe = [0, 0, 0, 0]
      let gewicht = 0
      for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0)
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0))
          const q = (y * b + x) * 4
          for (let k = 0; k < 4; k++) summe[k] += rgba[q + k] * w
          gewicht += w
        }
      }
      const o = (ty * zb + tx) * 4
      for (let k = 0; k < 4; k++) ziel[o + k] = Math.round(summe[k] / gewicht)
    }
  }
  return ziel
}

function bilinear(rgba, b, h, zb, zh) {
  const ziel = new Uint8ClampedArray(zb * zh * 4)
  for (let ty = 0; ty < zh; ty++) {
    const fy = Math.min(Math.max(((ty + 0.5) * h) / zh - 0.5, 0), h - 1)
    const y0 = Math.floor(fy), y1 = Math.min(y0 + 1, h - 1), dy = fy - y0
    for (let tx = 0; tx < zb; tx++) {
      const fx = Math.min(Math.max(((tx + 0.5) * b) / zb - 0.5, 0), b - 1)
      const x0 = Math.floor(fx), x1 = Math.min(x0 + 1, b - 1), dx = fx - x0
      const o = (ty * zb + tx) * 4
      for (let k = 0; k < 4; k++) {
        const oben = rgba[(y0 * b + x0) * 4 + k] * (1 - dx) + rgba[(y0 * b + x1) * 4 + k] * dx
        const unten = rgba[(y1 * b + x0) * 4 + k] * (1 - dx) + rgba[(y1 * b + x1) * 4 + k] * dx
        ziel[o + k] = Math.round(oben * (1 - dy) + unten * dy)
      }
    }
  }
  return ziel
}

/** Skaliert ein RGBA-Bild: Flaechenmittel beim Verkleinern, bilinear sonst. */
export function skaliereRgba(rgba, b, h, zielB, zielH) {
  if (b === zielB && h === zielH) return new Uint8ClampedArray(rgba)
  if (zielB <= b && zielH <= h) return verkleinere(rgba, b, h, zielB, zielH)
  return bilinear(rgba, b, h, zielB, zielH)
}
