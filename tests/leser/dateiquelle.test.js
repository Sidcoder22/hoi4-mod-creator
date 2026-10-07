import { test, expect } from 'vitest'
import { erstelleMiniSpielordner } from '../../src/selbsttest/mini-spielordner.js'
import { dateiquelleAusObjekt, dateiquelleAusFileList } from '../../src/leser/dateiquelle.js'
import { leseBmp } from '../../src/leser/bmp.js'
import { parseParadox } from '../../src/leser/paradox.js'

test('Mini-Spielordner hat Karte und kaputte Datei', () => {
  const o = erstelleMiniSpielordner()
  expect(o['map/provinces.bmp']).toBeInstanceOf(Uint8Array)
  expect(o['history/states/99-Kaputt.txt']).toContain('STATE_99')
})

test('Mini-Spielordner: Karte 64x32, Provinz 3 oben im dritten Feld', () => {
  const k = leseBmp(erstelleMiniSpielordner()['map/provinces.bmp'])
  expect([k.breite, k.hoehe]).toEqual([64, 32])
  const o = (2 * 64 + 40) * 3
  expect([...k.rgb.slice(o, o + 3)]).toEqual([60, 0, 0])
  const meer = (20 * 64 + 60) * 3
  expect([...k.rgb.slice(meer, meer + 3)]).toEqual([0, 0, 200])
})

test('Mini-Spielordner: alle Skriptdateien parsen ohne Warnung (ausser der kaputten)', () => {
  const o = erstelleMiniSpielordner()
  for (const [pfad, inhalt] of Object.entries(o)) {
    if (!/\.(txt|gfx)$/.test(pfad) || pfad.includes('Kaputt')) continue
    expect(parseParadox(inhalt).warnungen, pfad).toEqual([])
  }
  expect(o['history/states/6-Elsass.txt'].startsWith('﻿')).toBe(true)
  expect(o['history/states/6-Elsass.txt']).toContain('\r\n')
})

test('Dateiquelle aus FileList entfernt Ordnernamen und Backslashes', async () => {
  const f = (p, t) => ({ webkitRelativePath: p, text: async () => t, arrayBuffer: async () => new TextEncoder().encode(t).buffer })
  const q = dateiquelleAusFileList([f('Hearts of Iron IV/map/definition.csv', 'x'), f('Hearts of Iron IV\\common\\a.txt', 'y')])
  expect(q.liste().sort()).toEqual(['common/a.txt', 'map/definition.csv'])
  expect(q.hat('common/a.txt')).toBe(true)
  expect(q.hat('fehlt.txt')).toBe(false)
  expect(await q.text('common/a.txt')).toBe('y')
  expect([...(await q.bytes('map/definition.csv'))]).toEqual([120])
})

test('Dateiquelle aus Objekt liefert Text auch fuer Bytes', async () => {
  const q = dateiquelleAusObjekt({ 'a.txt': 'hallo', 'b.bin': Uint8Array.from([1]), 'c.txt': new TextEncoder().encode('ä') })
  expect(await q.text('a.txt')).toBe('hallo')
  expect([...(await q.bytes('b.bin'))]).toEqual([1])
  expect(await q.text('c.txt')).toBe('ä')
  expect([...(await q.bytes('a.txt'))]).toEqual([104, 97, 108, 108, 111])
})

test('Dateiquelle findet Pfade ohne Ruecksicht auf Gross-/Kleinschreibung (Review C1)', async () => {
  const q = dateiquelleAusObjekt({ 'gfx/Interface/Idea_A.dds': Uint8Array.from([7]) })
  expect(q.hat('gfx/interface/idea_a.dds')).toBe(true)
  expect([...(await q.bytes('GFX/INTERFACE/IDEA_A.DDS'))]).toEqual([7])
  const f = (p, t) => ({ webkitRelativePath: p, text: async () => t, arrayBuffer: async () => new TextEncoder().encode(t).buffer })
  const q2 = dateiquelleAusFileList([f('HOI4/Map/Definition.csv', 'x')])
  expect(q2.hat('map/definition.csv')).toBe(true)
  expect(await q2.text('map/definition.csv')).toBe('x')
})
