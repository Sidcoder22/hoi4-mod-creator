import { test, expect } from 'vitest'
import { erstelleFakeOrdner } from '../../src/selbsttest/fake-ordner.js'
import { pruefeZielordner, schreibeMod, leseFehlerlog, modOrdnerVorhanden } from '../../src/speicher/ordner.js'

const datei = (pfad) => ({ pfad, inhalt: `Inhalt von ${pfad}` })

test('Zielordner erkennen', async () => {
  expect(await pruefeZielordner(erstelleFakeOrdner({ 'settings.txt': '' }))).toBe(true)
  expect(await pruefeZielordner(erstelleFakeOrdner({ 'mod/x.mod': '' }))).toBe(true)
  expect(await pruefeZielordner(erstelleFakeOrdner())).toBe(false)
})

test('Schreiben und Aufraeumen nur eigener Dateien (Review Focus 4)', async () => {
  const o = erstelleFakeOrdner({ 'settings.txt': '', 'mod/mein_reich/eigene_notiz.txt': 'meins', 'mod/fremd.mod': 'x' })
  const fortschritt = []
  const r1 = await schreibeMod(o, 'mein_reich', [datei('mod/mein_reich.mod'), datei('mod/mein_reich/a.txt'), datei('mod/mein_reich/b/c.txt')], (a) => fortschritt.push(a))
  expect(r1).toEqual({ geschrieben: 3, geloescht: [] })
  expect(fortschritt.at(-1)).toBe(1)
  expect(new TextDecoder().decode(o.alsObjekt()['mod/mein_reich/b/c.txt'])).toBe('Inhalt von mod/mein_reich/b/c.txt')
  const r = await schreibeMod(o, 'mein_reich', [datei('mod/mein_reich.mod'), datei('mod/mein_reich/a.txt')])
  expect(r.geloescht).toEqual(['mod/mein_reich/b/c.txt'])
  expect(Object.keys(o.alsObjekt()).sort()).toEqual(['mod/fremd.mod', 'mod/mein_reich.mod', 'mod/mein_reich/a.txt',
    'mod/mein_reich/eigene_notiz.txt', 'mod/mein_reich/hoi4-mod-creator-dateien.json', 'settings.txt'])
  expect(JSON.parse(new TextDecoder().decode(o.alsObjekt()['mod/mein_reich/hoi4-mod-creator-dateien.json']))).toEqual(['mod/mein_reich.mod', 'mod/mein_reich/a.txt'])
})

test('Dateiliste mit fremden Pfaden wird ignoriert', async () => {
  const liste = JSON.stringify(['settings.txt', 'mod/anders/x.txt', 'mod/mein_reich/alt.txt'])
  const o = erstelleFakeOrdner({ 'settings.txt': 's', 'mod/anders/x.txt': 'x', 'mod/mein_reich/alt.txt': 'a', 'mod/mein_reich/hoi4-mod-creator-dateien.json': liste })
  const r = await schreibeMod(o, 'mein_reich', [datei('mod/mein_reich.mod')])
  expect(r.geloescht).toEqual(['mod/mein_reich/alt.txt'])
  expect(Object.keys(o.alsObjekt())).toContain('settings.txt')
  expect(Object.keys(o.alsObjekt())).toContain('mod/anders/x.txt')
})

test('Fehlerprotokoll lesen', async () => {
  expect(await leseFehlerlog(erstelleFakeOrdner({ 'logs/error.log': 'zeile' }))).toBe('zeile')
  expect(await leseFehlerlog(erstelleFakeOrdner({ 'settings.txt': '' }))).toBeNull()
})

test('Umbenennung nur in Gross-/Kleinschreibung loescht die neue Datei nicht (Review I1, Windows)', async () => {
  const o = erstelleFakeOrdner({ 'settings.txt': '' })
  await schreibeMod(o, 'm', [datei('mod/m.mod'), datei('mod/m/history/countries/MRE - Mein reich.txt')])
  const r = await schreibeMod(o, 'm', [datei('mod/m.mod'), datei('mod/m/history/countries/MRE - Mein Reich.txt')])
  expect(r.geloescht).toEqual([])
})

test('modOrdnerVorhanden (Review I2)', async () => {
  const o = erstelleFakeOrdner({ 'mod/alt/descriptor.mod': 'x' })
  expect(await modOrdnerVorhanden(o, 'alt')).toBe(true)
  expect(await modOrdnerVorhanden(o, 'neu')).toBe(false)
})
