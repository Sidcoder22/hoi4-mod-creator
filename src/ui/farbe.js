// Umrechnung zwischen Farbwaehler (#rrggbb) und [r, g, b].
export { hexZuRgb } from '../erzeuger/flagge.js'

export function rgbZuHex(rgb) {
  return '#' + (rgb || [0, 0, 0]).map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
}
