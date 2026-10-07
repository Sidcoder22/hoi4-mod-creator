// Flaggen-Designer: zeichnet eine Flagge ohne Canvas als RGBA-Pixel.

import { skaliereRgba } from './bilder.js'

export const VORLAGEN = [
  { id: 'einfarbig', name: 'Einfarbig', farben: 1 },
  { id: 'zwei_waagrecht', name: 'Zwei Streifen waagrecht', farben: 2 },
  { id: 'drei_waagrecht', name: 'Drei Streifen waagrecht', farben: 3 },
  { id: 'zwei_senkrecht', name: 'Zwei Streifen senkrecht', farben: 2 },
  { id: 'drei_senkrecht', name: 'Drei Streifen senkrecht', farben: 3 },
  { id: 'nordisches_kreuz', name: 'Nordisches Kreuz', farben: 2 },
  { id: 'schweizer_kreuz', name: 'Schweizer Kreuz', farben: 2 },
  { id: 'diagonale', name: 'Diagonal geteilt', farben: 2 },
  { id: 'rand', name: 'Mit Rand', farben: 2 },
]

export const SYMBOLE = [
  { id: 'stern', name: 'Stern' },
  { id: 'kreis', name: 'Kreis' },
  { id: 'kreuz', name: 'Kreuz' },
  { id: 'halbmond', name: 'Halbmond' },
  { id: 'raute', name: 'Raute' },
  { id: 'adler', name: 'Adler' },
]

export function hexZuRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
  if (!m) return [128, 128, 128]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function imPolygon(punkte, x, y) {
  let drin = false
  for (let i = 0, j = punkte.length - 1; i < punkte.length; j = i++) {
    const [xi, yi] = punkte[i], [xj, yj] = punkte[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) drin = !drin
  }
  return drin
}

// Stilisierter Adler (rechte Haelfte, in Einheiten der Flaggenhoehe, Mitte 0/0, y nach unten)
const ADLER_RECHTS = [
  [0, -0.30], [0.05, -0.27], [0.045, -0.20], [0.10, -0.17], [0.30, -0.29], [0.37, -0.21], [0.30, -0.15],
  [0.35, -0.09], [0.26, -0.05], [0.29, 0.02], [0.16, 0.01], [0.11, 0.09], [0.15, 0.22], [0.07, 0.18],
  [0.09, 0.30], [0, 0.25],
]
const ADLER = [...ADLER_RECHTS, ...ADLER_RECHTS.slice(1, -1).reverse().map(([x, y]) => [-x, y])]

function sternPunkte(aussen, innen) {
  const p = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? aussen : innen
    const w = -Math.PI / 2 + (i * Math.PI) / 5
    p.push([Math.cos(w) * r, Math.sin(w) * r])
  }
  return p
}

function symbolPruefer(symbol, h) {
  switch (symbol) {
    case 'stern': {
      const p = sternPunkte(0.28 * h, 0.11 * h)
      return (x, y) => imPolygon(p, x, y)
    }
    case 'kreis': return (x, y) => x * x + y * y <= (0.22 * h) ** 2
    case 'kreuz': {
      const d = 0.06 * h, l = 0.25 * h
      return (x, y) => (Math.abs(x) <= d && Math.abs(y) <= l) || (Math.abs(y) <= d && Math.abs(x) <= l)
    }
    case 'halbmond': {
      const r1 = 0.25 * h, r2 = 0.21 * h, v = 0.08 * h
      return (x, y) => x * x + y * y <= r1 * r1 && (x - v) ** 2 + y * y > r2 * r2
    }
    case 'raute': return (x, y) => Math.abs(x) / (0.2 * h) + Math.abs(y) / (0.3 * h) <= 1
    case 'adler': {
      const p = ADLER.map(([x, y]) => [x * h, y * h])
      return (x, y) => imPolygon(p, x, y)
    }
    default: return null
  }
}

// Hintergrundfarbe eines Pixels (Mittelpunkt x+0.5 / y+0.5)
function hintergrund(vorlage, farben, w, h) {
  const f = (i) => farben[Math.min(i, farben.length - 1)] || [128, 128, 128]
  switch (vorlage) {
    case 'zwei_waagrecht': return (x, y) => f(y + 0.5 < h / 2 ? 0 : 1)
    case 'drei_waagrecht': return (x, y) => f(Math.min(2, Math.floor(((y + 0.5) * 3) / h)))
    case 'zwei_senkrecht': return (x) => f(x + 0.5 < w / 2 ? 0 : 1)
    case 'drei_senkrecht': return (x) => f(Math.min(2, Math.floor(((x + 0.5) * 3) / w)))
    case 'nordisches_kreuz': {
      const t = Math.round(0.2 * h), links = Math.round(0.3 * w), oben = Math.round((h - t) / 2)
      return (x, y) => f((x >= links && x < links + t) || (y >= oben && y < oben + t) ? 1 : 0)
    }
    case 'schweizer_kreuz': {
      const d = 0.1 * h, l = 0.3 * h, cx = w / 2, cy = h / 2
      return (x, y) => {
        const dx = Math.abs(x + 0.5 - cx), dy = Math.abs(y + 0.5 - cy)
        return f((dx <= d && dy <= l) || (dy <= d && dx <= l) ? 1 : 0)
      }
    }
    case 'diagonale': return (x, y) => f(y + 0.5 < h - ((x + 0.5) * h) / w ? 0 : 1)
    case 'rand': {
      const r = Math.round(0.15 * h)
      return (x, y) => f(x < r || y < r || x >= w - r || y >= h - r ? 0 : 1)
    }
    default: return () => f(0)
  }
}

/**
 * Zeichnet eine Flagge.
 * @param flagge { art: 'designer', vorlage, farben[], symbol, symbolFarbe } | { art: 'bild', bildId }
 * @param holeBild (bildId) → { breite, hoehe, rgba }
 * @returns {Uint8ClampedArray} RGBA, oben-nach-unten
 */
export function zeichneFlagge(flagge, breite, hoehe, holeBild) {
  if (flagge.art === 'bild') {
    const bild = holeBild && flagge.bildId ? holeBild(flagge.bildId) : null
    if (bild) return skaliereRgba(bild.rgba, bild.breite, bild.hoehe, breite, hoehe)
    return new Uint8ClampedArray(breite * hoehe * 4).fill(128)
  }
  const farben = (flagge.farben || []).map(hexZuRgb)
  const grund = hintergrund(flagge.vorlage, farben, breite, hoehe)
  const rgba = new Uint8ClampedArray(breite * hoehe * 4)
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const [r, g, b] = grund(x, y)
      rgba.set([r, g, b, 255], (y * breite + x) * 4)
    }
  }
  const pruefe = symbolPruefer(flagge.symbol, hoehe)
  if (pruefe) {
    const [sr, sg, sb] = hexZuRgb(flagge.symbolFarbe)
    const cx = breite / 2, cy = hoehe / 2
    for (let y = 0; y < hoehe; y++) {
      for (let x = 0; x < breite; x++) {
        let treffer = 0
        for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (pruefe(x + (i + 0.5) / 4 - cx, y + (j + 0.5) / 4 - cy)) treffer++
        if (!treffer) continue
        const a = treffer / 16, o = (y * breite + x) * 4
        rgba[o] = rgba[o] * (1 - a) + sr * a
        rgba[o + 1] = rgba[o + 1] * (1 - a) + sg * a
        rgba[o + 2] = rgba[o + 2] * (1 - a) + sb * a
      }
    }
  }
  return rgba
}
