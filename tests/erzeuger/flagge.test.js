import { test, expect } from 'vitest'
import { zeichneFlagge, VORLAGEN, SYMBOLE } from '../../src/erzeuger/flagge.js'

const f = (vorlage, farben, extra = {}) => zeichneFlagge({ art: 'designer', vorlage, farben, symbol: null, symbolFarbe: '#ffff00', ...extra }, 82, 52)
const px = (rgba, x, y, b = 82) => [...rgba.slice((y * b + x) * 4, (y * b + x) * 4 + 4)]

test('Vorlagen und Symbole', () => {
  expect(VORLAGEN.map(v => [v.id, v.farben])).toEqual([['einfarbig', 1], ['zwei_waagrecht', 2], ['drei_waagrecht', 3], ['zwei_senkrecht', 2],
    ['drei_senkrecht', 3], ['nordisches_kreuz', 2], ['schweizer_kreuz', 2], ['diagonale', 2], ['rand', 2]])
  expect(SYMBOLE.map(s => s.id)).toEqual(['stern', 'kreis', 'kreuz', 'halbmond', 'raute', 'adler'])
})

test('Streifen', () => {
  const d = f('drei_senkrecht', ['#0000ff', '#ffffff', '#ff0000'])
  expect(px(d, 10, 26)).toEqual([0, 0, 255, 255])
  expect(px(d, 41, 26)).toEqual([255, 255, 255, 255])
  expect(px(d, 72, 26)).toEqual([255, 0, 0, 255])
  expect(px(f('zwei_waagrecht', ['#000000', '#00ff00']), 41, 40)).toEqual([0, 255, 0, 255])
  expect(px(f('drei_waagrecht', ['#000000', '#00ff00', '#0000ff']), 41, 50)).toEqual([0, 0, 255, 255])
})

test('Kreuze, Diagonale, Rand', () => {
  const s = f('schweizer_kreuz', ['#ff0000', '#ffffff'])
  expect(px(s, 41, 26)).toEqual([255, 255, 255, 255])
  expect(px(s, 2, 2)).toEqual([255, 0, 0, 255])
  const n = f('nordisches_kreuz', ['#0000ff', '#ffff00'])
  expect(px(n, 28, 5)).toEqual([255, 255, 0, 255])
  expect(px(n, 70, 26)).toEqual([255, 255, 0, 255])
  expect(px(n, 70, 5)).toEqual([0, 0, 255, 255])
  const d = f('diagonale', ['#ff0000', '#00ff00'])
  expect(px(d, 5, 5)).toEqual([255, 0, 0, 255])
  expect(px(d, 76, 46)).toEqual([0, 255, 0, 255])
  const r = f('rand', ['#000000', '#ffffff'])
  expect(px(r, 1, 1)).toEqual([0, 0, 0, 255])
  expect(px(r, 41, 26)).toEqual([255, 255, 255, 255])
})

test('Symbole decken die Mitte', () => {
  for (const symbol of ['stern', 'kreis', 'kreuz', 'raute', 'adler']) {
    expect(px(f('einfarbig', ['#000000'], { symbol }), 41, 26), symbol).toEqual([255, 255, 0, 255])
  }
  const halbmond = f('einfarbig', ['#000000'], { symbol: 'halbmond' })
  expect(px(halbmond, 41 - 11, 26)).toEqual([255, 255, 0, 255])
  expect(px(halbmond, 41 + 6, 26)).toEqual([0, 0, 0, 255])
})

test('kleine Groessen und eigenes Bild', () => {
  expect(zeichneFlagge({ art: 'designer', vorlage: 'rand', farben: ['#000000', '#ffffff'] }, 10, 7).length).toBe(10 * 7 * 4)
  const rot = { breite: 4, hoehe: 2, rgba: new Uint8ClampedArray(4 * 2 * 4).fill(255).map((v, i) => (i % 4 === 1 || i % 4 === 2 ? 0 : 255)) }
  const b = zeichneFlagge({ art: 'bild', bildId: 'x' }, 82, 52, () => rot)
  expect(px(b, 41, 26)).toEqual([255, 0, 0, 255])
})
