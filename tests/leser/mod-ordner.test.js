import { test, expect } from 'vitest'
import { dateiquelleAusObjekt } from '../../src/leser/dateiquelle.js'
import { leseDeskriptor, leseModOrdner, ModOrdnerFehler } from '../../src/leser/mod-ordner.js'

const KAISERREICH = `name="Kaiserreich"
replace_path="common/national_focus"
replace_path="history/states/"
tags={
	"Alternative History"
}
picture="thumbnail.png"
version="0.27.1"
supported_version="1.15.*"
path="C:\\Users\\x\\Steam\\steamapps\\workshop\\content\\394360\\1521695605"
remote_file_id="1521695605"
`

test('leseDeskriptor liest name, version, remote_file_id, path und mehrere replace_path', () => {
  const d = leseDeskriptor(KAISERREICH)
  expect(d.name).toBe('Kaiserreich')
  expect(d.version).toBe('0.27.1')
  expect(d.id).toBe('1521695605')
  expect(d.replacePaths).toEqual(['common/national_focus', 'history/states'])
  expect(d.pfad).toContain('1521695605')
})

test('leseDeskriptor ohne remote_file_id und ohne version', () => {
  const d = leseDeskriptor('name="Eigene Mod"\npath="mod/eigen"\n')
  expect(d).toEqual({ name: 'Eigene Mod', version: null, id: null, replacePaths: [], pfad: 'mod/eigen' })
})

test('leseModOrdner wirft ModOrdnerFehler, wenn descriptor.mod nicht oben liegt', async () => {
  const quelle = dateiquelleAusObjekt({ '1521695605/descriptor.mod': 'name="X"', '1521695605/common/a.txt': 'a = 1' })
  await expect(leseModOrdner(quelle)).rejects.toThrow(ModOrdnerFehler)
  await expect(leseModOrdner(quelle)).rejects.toThrow('Das ist kein Mod-Ordner. Wähle den Ordner, in dem die Datei descriptor.mod liegt.')
})

test('leseModOrdner wirft auch ohne Namen', async () => {
  await expect(leseModOrdner(dateiquelleAusObjekt({ 'descriptor.mod': 'version="1"' }))).rejects.toThrow(ModOrdnerFehler)
})

test('leseModOrdner liefert name und quelle', async () => {
  const quelle = dateiquelleAusObjekt({ 'descriptor.mod': KAISERREICH, 'common/a.txt': 'a = 1' })
  const mod = await leseModOrdner(quelle)
  expect(mod.name).toBe('Kaiserreich')
  expect(mod.replacePaths).toEqual(['common/national_focus', 'history/states'])
  expect(mod.quelle).toBe(quelle)
})

import { leseModListe } from '../../src/leser/mod-ordner.js'
import { erstelleFakeOrdner } from '../../src/selbsttest/fake-ordner.js'

const benutzerOrdner = () => erstelleFakeOrdner({
  'settings.txt': '',
  'mod/ugc_1.mod': 'name="Zeta Mod"\nversion="3"\npath="/Users/x/Library/Application Support/Steam/steamapps/workshop/content/394360/1"\nremote_file_id="1"\n',
  'mod/eigen.mod': 'name="Alpha Mod"\npath="mod/eigen"\n',
  'mod/kaputt.mod': 'name=\n',
  'mod/eigen/descriptor.mod': 'name="Alpha Mod"\n',
})

test('leseModListe liest .mod-Dateien, erkennt absolute Pfade, sortiert', async () => {
  const liste = await leseModListe(benutzerOrdner())
  expect(liste.map(m => m.name)).toEqual(['Alpha Mod', 'Zeta Mod'])
  expect(liste[0]).toEqual({ datei: 'eigen.mod', name: 'Alpha Mod', version: null, id: null, pfad: 'mod/eigen', absolut: false })
  expect(liste[1]).toMatchObject({ datei: 'ugc_1.mod', version: '3', id: '1', absolut: true })
})

test('leseModListe erkennt Windows-Pfade als absolut', async () => {
  const liste = await leseModListe(erstelleFakeOrdner({ 'mod/w.mod': 'name="W"\npath="C:/Program Files (x86)/Steam/steamapps/workshop/content/394360/2"\n' }))
  expect(liste[0].absolut).toBe(true)
})

test('leseModListe ohne Ordner mod → []', async () => {
  expect(await leseModListe(erstelleFakeOrdner({ 'settings.txt': '' }))).toEqual([])
})

test('leseModListe mit ausser lässt die eigene Mod weg', async () => {
  const liste = await leseModListe(benutzerOrdner(), { ausser: 'eigen.mod' })
  expect(liste.map(m => m.datei)).toEqual(['ugc_1.mod'])
})
