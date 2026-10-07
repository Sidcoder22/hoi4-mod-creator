// Bilder in der Oberflaeche: Spielbilder (zwischengespeichert) und Projektbilder.

import { ladeBild } from '../speicher/indexeddb.js'
import { ausBase64 } from '../projekt/base64.js'

let frischeBilder = null
const urlCache = new Map()
const projektCache = new Map()

/** Wandelt RGBA-Pixel fuer den Zwischenspeicher in ein kleines WebP-Bild um. */
export async function kodiereBild(rgba, breite, hoehe) {
  if (typeof OffscreenCanvas === 'undefined') return { breite, hoehe, rgba }
  const c = new OffscreenCanvas(breite, hoehe)
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), breite, hoehe), 0, 0)
  return c.convertToBlob({ type: 'image/webp', quality: 0.9 })
}

/** Nach neuem Einlesen: alte Adressen freigeben und die frischen Bilder direkt nutzen. */
export function leereBildCache(neueBilder) {
  for (const url of urlCache.values()) if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
  urlCache.clear()
  frischeBilder = neueBilder || null
}

export function rgbaZuUrl({ breite, hoehe, rgba }) {
  const c = document.createElement('canvas')
  c.width = breite
  c.height = hoehe
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), breite, hoehe), 0, 0)
  return c.toDataURL()
}

/** Adresse eines Spielbilds (z. B. «flagge:GER») oder null. */
export async function bildUrl(db, schluessel) {
  if (urlCache.has(schluessel)) return urlCache.get(schluessel)
  let wert = frischeBilder?.get(schluessel) ?? null
  if (!wert && db) {
    try {
      wert = await ladeBild(db, schluessel)
    } catch {
      wert = null
    }
  }
  let url = null
  if (wert instanceof Blob) url = URL.createObjectURL(wert)
  else if (wert && wert.rgba) url = rgbaZuUrl(wert)
  urlCache.set(schluessel, url)
  return url
}

/** Adresse eines Projektbilds (Base64-RGBA). */
export function projektBildUrl(projekt, bildId) {
  const b = projekt?.bilder?.[bildId]
  if (!b) return null
  const schluessel = `${bildId}:${b.rgba.length}`
  if (!projektCache.has(schluessel)) {
    const bytes = ausBase64(b.rgba)
    projektCache.set(schluessel, rgbaZuUrl({ breite: b.breite, hoehe: b.hoehe, rgba: bytes }))
  }
  return projektCache.get(schluessel)
}

/** Liest eine Bilddatei des Nutzers als ImageBitmap. */
export async function ladeBenutzerBild(datei) {
  return createImageBitmap(datei)
}

const rgbaCache = new Map()

/** Projektbild als { breite, hoehe, rgba } (fuer den Flaggen-Designer). */
export function projektBildRgba(projekt, bildId) {
  const b = projekt?.bilder?.[bildId]
  if (!b) return null
  const schluessel = `${bildId}:${b.rgba.length}`
  if (!rgbaCache.has(schluessel)) {
    const bytes = ausBase64(b.rgba)
    rgbaCache.set(schluessel, { breite: b.breite, hoehe: b.hoehe, rgba: new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.byteLength) })
  }
  return rgbaCache.get(schluessel)
}
