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

import { dateiquelleUeberlagert } from '../../src/leser/dateiquelle.js'

const ebeneMod = (name, dateien, replacePaths = []) => ({ name, replacePaths, quelle: dateiquelleAusObjekt(dateien) })

test('ueberlagert: spätere Ebene gewinnt bei gleichem Pfad, auch bei anderer Gross-/Kleinschreibung', async () => {
  const q = dateiquelleUeberlagert(dateiquelleAusObjekt({ 'common/a.txt': 'spiel', 'common/b.txt': 'b' }), [ebeneMod('M', { 'Common/A.txt': 'mod' })])
  expect(await q.text('common/a.txt')).toBe('mod')
  expect(q.liste().filter(p => p.toLowerCase() === 'common/a.txt')).toHaveLength(1)
  expect(q.ebene('common/a.txt')).toBe(1)
  expect(q.ebene('common/b.txt')).toBe(0)
  expect(await q.text('common/b.txt')).toBe('b')
})

test('ueberlagert: replace_path entfernt direkte Dateien früherer Ebenen, Unterordner bleiben', async () => {
  const spiel = dateiquelleAusObjekt({ 'common/national_focus/germany.txt': 'g', 'common/national_focus/sub/x.txt': 'x' })
  const q = dateiquelleUeberlagert(spiel, [ebeneMod('M', { 'common/national_focus/reich.txt': 'r' }, ['common/national_focus'])])
  expect(q.hat('common/national_focus/germany.txt')).toBe(false)
  expect(q.hat('common/national_focus/sub/x.txt')).toBe(true)
  expect(q.hat('common/national_focus/reich.txt')).toBe(true)
  expect(q.liste()).not.toContain('common/national_focus/germany.txt')
  await expect(q.text('common/national_focus/germany.txt')).rejects.toThrow()
})

test('ueberlagert: zwei Mods hintereinander, ebenenName', async () => {
  const q = dateiquelleUeberlagert(dateiquelleAusObjekt({ 'a.txt': '0' }), [ebeneMod('Eins', { 'a.txt': '1', 'b.txt': '1' }), ebeneMod('Zwei', { 'a.txt': '2' })])
  expect(await q.text('a.txt')).toBe('2')
  expect(await q.text('b.txt')).toBe('1')
  expect(q.ebene('a.txt')).toBe(2)
  expect(q.ebenenName(0)).toBe('Spiel')
  expect(q.ebenenName(2)).toBe('Zwei')
  expect(new TextDecoder().decode(await q.bytes('b.txt'))).toBe('1')
})

test('ueberlagert: descriptor.mod, thumbnail.png und *.mod einer Mod gehören nicht dazu', () => {
  const q = dateiquelleUeberlagert(dateiquelleAusObjekt({ 'a.txt': '0' }),
    [ebeneMod('M', { 'descriptor.mod': 'name="M"', 'thumbnail.png': 'x', 'alt.mod': 'x', 'common/c.txt': 'c' })])
  expect(q.liste().sort()).toEqual(['a.txt', 'common/c.txt'])
})
