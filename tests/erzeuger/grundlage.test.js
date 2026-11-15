import { test, expect } from 'vitest'
import { erstelleMiniSpielordner } from '../../src/selbsttest/mini-spielordner.js'
import { erstelleMiniMod } from '../../src/selbsttest/mini-mod.js'
import { dateiquelleAusObjekt, dateiquelleUeberlagert } from '../../src/leser/dateiquelle.js'
import { leseModOrdner } from '../../src/leser/mod-ordner.js'
import { leseSpielordner } from '../../src/leser/spielordner.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { importiereSpielbaum } from '../../src/projekt/fokus-import.js'
import { setzeModFeld } from '../../src/projekt/aenderungen.js'
import { pruefeProjekt, hatFehler } from '../../src/pruefung/regeln.js'
import { text, testprojekt, miniSpieldaten } from '../hilfe.js'

const mod = await leseModOrdner(dateiquelleAusObjekt(erstelleMiniMod()))
const { spieldaten: sd, spielfokus } = await leseSpielordner(
  dateiquelleUeberlagert(dateiquelleAusObjekt(erstelleMiniSpielordner()), [mod]),
  { grundlage: [{ name: mod.name, version: mod.version, id: mod.id }] })
const ABHAENGIG = 'dependencies={\n\t"Mini-Reich"\n}\n'

test('Submod: dependencies in descriptor.mod und <modid>.mod, Baum der Mod am gleichen Pfad', () => {
  let p = setzeModFeld(testprojekt(sd), 'grundlage', [{ name: 'Mini-Reich', id: '424242' }])
  ;[p] = importiereSpielbaum(p, sd, spielfokus, 'reich_focus', 'aendern')
  expect(pruefeProjekt(p, sd).filter(m => m.regel.startsWith('grundlage') || (m.regel.startsWith('fokus') && m.schwere === 'fehler'))).toEqual([])
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(text(dateien, 'mod/mein_reich/descriptor.mod')).toContain(ABHAENGIG)
  expect(text(dateien, 'mod/mein_reich.mod')).toContain(ABHAENGIG)
  expect(text(dateien, 'mod/mein_reich/common/national_focus/reich.txt')).toContain('id = reich_focus')
})

test('ohne Grundlage keine dependencies', async () => {
  const vanilla = await miniSpieldaten()
  const { dateien } = erzeugeMod(testprojekt(vanilla), vanilla)
  expect(text(dateien, 'mod/mein_reich/descriptor.mod')).not.toContain('dependencies')
  expect(text(dateien, 'mod/mein_reich.mod')).not.toContain('dependencies')
})

test('Umlaute im Namen der Grundlage', async () => {
  const vanilla = await miniSpieldaten()
  const grundlage = [{ name: 'Mittelmächte sieg', id: null }]
  const s = { ...vanilla, grundlage: [{ name: 'Mittelmächte sieg', version: '1.0', id: null }] }
  const p = setzeModFeld(testprojekt(vanilla), 'grundlage', grundlage)
  expect(hatFehler(pruefeProjekt(p, s).filter(m => m.regel === 'grundlage-abweichend'))).toBe(false)
  const { dateien, fehler } = erzeugeMod(p, s)
  expect(fehler).toEqual([])
  expect(text(dateien, 'mod/mein_reich/descriptor.mod')).toContain('dependencies={\n\t"Mittelmächte sieg"\n}\n')
})
