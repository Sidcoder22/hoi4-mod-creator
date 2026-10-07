// Weltkarte: Pixel -> Provinz -> Staat, und Einfaerben nach Besitzer.

/** Liest map/definition.csv. */
export function parseDefinition(text) {
  const provinzen = []
  for (const zeile of text.split(/\r?\n/)) {
    const t = zeile.split(';')
    if (t.length < 5) continue
    const id = Number(t[0]), r = Number(t[1]), g = Number(t[2]), b = Number(t[3])
    if (!Number.isInteger(id) || id <= 0 || [r, g, b].some(Number.isNaN)) continue
    const art = t[4].trim() === 'sea' ? 'sea' : t[4].trim() === 'lake' ? 'lake' : 'land'
    provinzen.push({ id, r, g, b, art })
  }
  return provinzen
}

/**
 * Berechnet fuer jedes Pixel den Staatsindex.
 * @returns {{ breite, hoehe, staatIndex: Uint16Array, staatIds: number[] }} Index 0 = kein Staat
 */
export function berechneKarte(bmp, provinzen, staaten) {
  const staatIds = [0]
  const provinzZuIndex = new Map()
  for (const id of Object.keys(staaten).map(Number).sort((a, b) => a - b)) {
    const index = staatIds.length
    staatIds.push(id)
    for (const p of staaten[id].provinzen) provinzZuIndex.set(p, index)
  }
  const farbeZuIndex = new Map()
  for (const p of provinzen) {
    const index = provinzZuIndex.get(p.id)
    if (index) farbeZuIndex.set((p.r << 16) | (p.g << 8) | p.b, index)
  }
  const { breite, hoehe, rgb } = bmp
  const staatIndex = new Uint16Array(breite * hoehe)
  let letzteFarbe = -1, letzterIndex = 0
  for (let i = 0, q = 0; i < staatIndex.length; i++, q += 3) {
    const farbe = (rgb[q] << 16) | (rgb[q + 1] << 8) | rgb[q + 2]
    if (farbe !== letzteFarbe) {
      letzteFarbe = farbe
      letzterIndex = farbeZuIndex.get(farbe) || 0
    }
    staatIndex[i] = letzterIndex
  }
  return { breite, hoehe, staatIndex, staatIds }
}

/** Staats-ID an einem Pixel oder null. */
export function staatAn(karte, x, y) {
  x = Math.floor(x); y = Math.floor(y)
  if (x < 0 || y < 0 || x >= karte.breite || y >= karte.hoehe) return null
  const index = karte.staatIndex[y * karte.breite + x]
  return index ? karte.staatIds[index] : null
}

/** Mittelpunkt aller Pixel eines Staats. */
export function schwerpunkt(karte, staatId) {
  const gesucht = karte.staatIds.indexOf(staatId)
  if (gesucht <= 0) return null
  let sx = 0, sy = 0, n = 0
  const { breite, staatIndex } = karte
  for (let i = 0; i < staatIndex.length; i++) {
    if (staatIndex[i] === gesucht) {
      sx += i % breite
      sy += Math.floor(i / breite)
      n++
    }
  }
  return n ? [sx / n, sy / n] : null
}

/**
 * Faerbt die Karte in ein RGBA-Ziel.
 * @param farben Uint8Array mit 3 Byte je Staatsindex
 */
export function faerbeKarte(karte, farben, ziel, { meer, hervorheben } = {}) {
  const { breite, hoehe, staatIndex } = karte
  const [mr, mg, mb] = meer || [30, 50, 70]
  const hell = hervorheben && hervorheben.size ? new Uint8Array(karte.staatIds.length) : null
  if (hell) for (const i of hervorheben) if (i > 0 && i < hell.length) hell[i] = 1
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = y * breite + x
      const o = i * 4
      const index = staatIndex[i]
      if (!index) {
        ziel[o] = mr; ziel[o + 1] = mg; ziel[o + 2] = mb; ziel[o + 3] = 255
        continue
      }
      let r = farben[index * 3], g = farben[index * 3 + 1], b = farben[index * 3 + 2]
      const rechts = x + 1 < breite ? staatIndex[i + 1] : index
      const unten = y + 1 < hoehe ? staatIndex[i + breite] : index
      if ((rechts !== index && rechts !== 0) || (unten !== index && unten !== 0)) {
        r *= 0.6; g *= 0.6; b *= 0.6
      }
      if (hell && hell[index]) {
        r += (255 - r) * 0.35; g += (255 - g) * 0.35; b += (255 - b) * 0.35
      }
      ziel[o] = r; ziel[o + 1] = g; ziel[o + 2] = b; ziel[o + 3] = 255
    }
  }
  return ziel
}
