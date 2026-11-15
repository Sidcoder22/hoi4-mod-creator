import { test, expect } from 'vitest'
import { dateiquelleAusObjekt } from '../../src/leser/dateiquelle.js'
import { fuegeGrundlageHinzu, entferneGrundlage, ueberlagerung, grundlageDaten } from '../../src/projekt/grundlage.js'

const mod = (name, dateien = {}, extra = {}) => ({ name, version: '1', id: null, replacePaths: [], quelle: dateiquelleAusObjekt(dateien), ...extra })

test('fuegeGrundlageHinzu hängt an und ersetzt gleichen Namen an seiner Stelle', () => {
  let l = fuegeGrundlageHinzu([], mod('A'))
  l = fuegeGrundlageHinzu(l, mod('B'))
  const neuA = mod('A', {}, { version: '2' })
  l = fuegeGrundlageHinzu(l, neuA)
  expect(l.map(m => m.name)).toEqual(['A', 'B'])
  expect(l[0]).toBe(neuA)
})

test('entferneGrundlage', () => {
  expect(entferneGrundlage([mod('A'), mod('B'), mod('C')], 1).map(m => m.name)).toEqual(['A', 'C'])
})

test('ueberlagerung ohne Mods ist die Spielquelle selbst', () => {
  const spiel = dateiquelleAusObjekt({ 'a.txt': 'a' })
  expect(ueberlagerung(spiel, [])).toBe(spiel)
})

test('ueberlagerung mit Mod: Spielordner neu eingelesen behält die Mods', async () => {
  const liste = [mod('M', { 'a.txt': 'mod' })]
  const erst = ueberlagerung(dateiquelleAusObjekt({ 'a.txt': 'spiel 1' }), liste)
  const neu = ueberlagerung(dateiquelleAusObjekt({ 'a.txt': 'spiel 2', 'b.txt': 'b' }), liste)
  expect(await erst.text('a.txt')).toBe('mod')
  expect(await neu.text('a.txt')).toBe('mod')
  expect(await neu.text('b.txt')).toBe('b')
  expect(neu.ebenenName(1)).toBe('M')
})

test('grundlageDaten', () => {
  expect(grundlageDaten([mod('A', {}, { id: '7' })])).toEqual([{ name: 'A', version: '1', id: '7' }])
})

import { brauchtKopie, kopierBefehl } from '../../src/projekt/grundlage.js'

const KR = { name: 'Kaiserreich', id: '1521695605', pfad: '/Users/x/Library/Application Support/Steam/steamapps/workshop/content/394360/1521695605', absolut: true }

test('brauchtKopie: nur Mod-Ordner im gesperrten Ordner Library des Macs', () => {
  expect(brauchtKopie(KR)).toBe(true)
  expect(brauchtKopie({ ...KR, pfad: 'C:/Program Files (x86)/Steam/steamapps/workshop/content/394360/1' })).toBe(false)
  expect(brauchtKopie({ name: 'Eigen', pfad: 'mod/eigen', absolut: false })).toBe(false)
})

test('kopierBefehl: Klon nach Dokumente/HOI4-Grundlagen, alte Kopie wird ersetzt', () => {
  expect(kopierBefehl(KR)).toBe("mkdir -p ~/Documents/HOI4-Grundlagen && rm -rf ~/Documents/HOI4-Grundlagen/'Kaiserreich' && cp -Rc '/Users/x/Library/Application Support/Steam/steamapps/workshop/content/394360/1521695605' ~/Documents/HOI4-Grundlagen/'Kaiserreich'")
})

test('kopierBefehl: Sonderzeichen im Namen und Apostroph im Pfad sind sicher', () => {
  const b = kopierBefehl({ name: "Road to 56: Expanded / v2 ..", id: '3506850939', pfad: "/Users/o'neil/Library/x/3506850939", absolut: true })
  expect(b).toContain("~/Documents/HOI4-Grundlagen/'Road to 56 Expanded v2'")
  expect(b).toContain("cp -Rc '/Users/o'\\''neil/Library/x/3506850939'")
})

test('kopierBefehl: Name ohne erlaubte Zeichen nimmt die Steam-Nummer', () => {
  expect(kopierBefehl({ name: '将领系统扩展', id: '3688409168', pfad: '/Users/x/Library/y/3688409168', absolut: true })).toContain("HOI4-Grundlagen/'3688409168'")
  expect(kopierBefehl({ name: '..', id: null, pfad: '/Users/x/Library/y/z', absolut: true })).toContain("HOI4-Grundlagen/'Mod'")
})
