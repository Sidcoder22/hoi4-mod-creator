import { test, expect } from 'vitest'
import { leseBmp, schreibeBmp24 } from '../../src/leser/bmp.js'
import { leseTga } from '../../src/leser/tga.js'
import { leseDds, ddsGroesse } from '../../src/leser/dds.js'
import { schreibeTga, schreibeDds, skaliereRgba } from '../../src/erzeuger/bilder.js'

function ddsMitBlock(fourCC, blockBytes) {
  const kopf = new Uint8Array(128)
  const dv = new DataView(kopf.buffer)
  kopf.set([0x44, 0x44, 0x53, 0x20])
  dv.setUint32(4, 124, true)
  dv.setUint32(8, 0x1007, true)
  dv.setUint32(12, 4, true)
  dv.setUint32(16, 4, true)
  dv.setUint32(76, 32, true)
  dv.setUint32(80, 0x4, true)
  for (let i = 0; i < 4; i++) kopf[84 + i] = fourCC.charCodeAt(i)
  return Uint8Array.from([...kopf, ...blockBytes])
}

test('BMP unten-nach-oben mit Zeilenauffuellung', () => {
  const rgb = Uint8Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 1, 1, 1, 2, 2, 2, 3, 3, 3]) // 3x2, oben zuerst
  const r = leseBmp(schreibeBmp24(rgb, 3, 2))
  expect([r.breite, r.hoehe]).toEqual([3, 2])
  expect([...r.rgb]).toEqual([...rgb])
})

test('BMP mit anderer Farbtiefe wird abgelehnt', () => {
  const b = schreibeBmp24(new Uint8Array(3), 1, 1)
  b[28] = 8
  expect(() => leseBmp(b)).toThrow()
})

test('TGA Rundreise und Kopf', () => {
  const rgba = Uint8ClampedArray.from([10, 20, 30, 255, 40, 50, 60, 128])
  const b = schreibeTga(rgba, 2, 1)
  expect([b[2], b[16], b[17]]).toEqual([2, 32, 8])
  expect([...leseTga(b).rgba]).toEqual([...rgba])
})

test('TGA Zeilen unten-nach-oben', () => {
  const rgba = Uint8ClampedArray.from([1, 1, 1, 255, 2, 2, 2, 255]) // 1x2: oben 1, unten 2
  const b = schreibeTga(rgba, 1, 2)
  expect([...b.slice(18, 22)]).toEqual([2, 2, 2, 255]) // erste gespeicherte Zeile ist die untere
  expect([...leseTga(b).rgba]).toEqual([...rgba])
})

test('TGA RLE', () => {
  const kopf = new Uint8Array(18)
  kopf[2] = 10; kopf[12] = 2; kopf[14] = 1; kopf[16] = 32; kopf[17] = 8 | 32
  const daten = Uint8Array.from([0x81, 30, 20, 10, 255]) // 2x dasselbe BGRA
  expect([...leseTga(Uint8Array.from([...kopf, ...daten])).rgba]).toEqual([10, 20, 30, 255, 10, 20, 30, 255])
})

test('DDS unkomprimiert Rundreise und Groesse', () => {
  const rgba = new Uint8ClampedArray(4 * 4 * 4)
  for (let i = 0; i < rgba.length; i++) rgba[i] = (i * 7) % 256
  const b = schreibeDds(rgba, 4, 4)
  expect(ddsGroesse(b)).toEqual([4, 4])
  expect([...leseDds(b).rgba]).toEqual([...rgba])
})

test('DXT1 und DXT5', () => {
  expect([...leseDds(ddsMitBlock('DXT1', [0x00, 0xF8, 0x00, 0x00, 0, 0, 0, 0])).rgba.slice(0, 4)]).toEqual([255, 0, 0, 255])
  expect([...leseDds(ddsMitBlock('DXT5', [128, 128, 0, 0, 0, 0, 0, 0, 0x00, 0xF8, 0x00, 0x00, 0, 0, 0, 0])).rgba.slice(0, 4)]).toEqual([255, 0, 0, 128])
  expect(leseDds(ddsMitBlock('DX10', new Array(16).fill(0)))).toBeNull()
})

test('skaliereRgba mittelt 2x2-Bloecke', () => {
  const q = new Uint8ClampedArray(4 * 4 * 4)
  for (let i = 0; i < 16; i++) q.set(i % 4 < 2 ? [0, 0, 0, 255] : [200, 100, 50, 255], i * 4)
  expect([...skaliereRgba(q, 4, 4, 2, 2).slice(4, 8)]).toEqual([200, 100, 50, 255])
})

test('skaliereRgba vergroessert', () => {
  const q = Uint8ClampedArray.from([100, 100, 100, 255])
  expect([...skaliereRgba(q, 1, 1, 3, 2)]).toEqual(new Array(6).fill([100, 100, 100, 255]).flat())
})
