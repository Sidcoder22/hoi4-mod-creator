import { test, expect } from 'vitest'
import { crc32, erstelleZip } from '../../src/speicher/zip.js'

function eintraegeAusZip(z) {
  const dv = new DataView(z.buffer, z.byteOffset, z.byteLength)
  let ende = z.length - 22
  while (dv.getUint32(ende, true) !== 0x06054b50) ende--
  const anzahl = dv.getUint16(ende + 10, true)
  let p = dv.getUint32(ende + 16, true)
  const ergebnis = []
  for (let i = 0; i < anzahl; i++) {
    expect(dv.getUint32(p, true)).toBe(0x02014b50)
    const groesse = dv.getUint32(p + 20, true)
    const nameLaenge = dv.getUint16(p + 28, true)
    const extra = dv.getUint16(p + 30, true)
    const kommentar = dv.getUint16(p + 32, true)
    const lokal = dv.getUint32(p + 42, true)
    const name = new TextDecoder().decode(z.slice(p + 46, p + 46 + nameLaenge))
    const datenStart = lokal + 30 + dv.getUint16(lokal + 26, true) + dv.getUint16(lokal + 28, true)
    const daten = z.slice(datenStart, datenStart + groesse)
    expect(dv.getUint32(p + 16, true)).toBe(crc32(daten))
    ergebnis.push([name, [...daten]])
    p += 46 + nameLaenge + extra + kommentar
  }
  return ergebnis
}

test('crc32 Pruefwert', () => {
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xCBF43926)
  expect(crc32(new Uint8Array(0))).toBe(0)
})

test('ZIP mit Text und Bytes', () => {
  const z = erstelleZip([{ pfad: 'mod/a.mod', inhalt: 'x' }, { pfad: 'mod/a/b.bin', inhalt: Uint8Array.from([1, 2]) }])
  expect(new DataView(z.buffer).getUint32(0, true)).toBe(0x04034b50)
  expect(eintraegeAusZip(z)).toEqual([['mod/a.mod', [120]], ['mod/a/b.bin', [1, 2]]])
})

test('Umlaute im Dateinamen mit UTF-8-Kennzeichen', () => {
  const z = erstelleZip([{ pfad: 'mod/ä.txt', inhalt: 'x' }])
  expect(new DataView(z.buffer).getUint16(6, true) & 0x800).toBe(0x800)
  expect(eintraegeAusZip(z)[0][0]).toBe('mod/ä.txt')
})
