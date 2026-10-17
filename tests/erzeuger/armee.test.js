import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { ergaenzeProjekt } from '../../src/projekt/modell.js'
import { fuegeLandHinzu, aendereLand } from '../../src/projekt/aenderungen.js'
import { fuegeVorlageHinzu, aendereVorlage, setzeZelle, fuegeVerbandHinzu, aendereVerband } from '../../src/projekt/armee.js'
import { parseParadox, finde, findeAlle, wertText } from '../../src/leser/paradox.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const MRE_OOB = m + 'history/units/MRE_1936.txt'
const wert = (inhalt, k) => wertText(finde(inhalt, k)?.wert)
const lies = (dateien, pfad) => parseParadox(text(dateien, pfad), { streng: true }).eintraege
const divisionen = (e) => findeAlle(finde(e, 'units').wert.inhalt, 'division').map(d => d.wert.inhalt)
const armee = (p) => p.laender[0].armee

test('Vorgabe-Armee wie bisher: 6 Divisionen in Provinz 1', () => {
  const { dateien, fehler } = erzeugeMod(testprojekt(sd), sd)
  expect(fehler).toEqual([])
  const d = divisionen(lies(dateien, MRE_OOB))
  expect(d).toHaveLength(6)
  expect(d.map(x => wert(x, 'location'))).toEqual(Array(6).fill('1'))
  expect(wert(d[0], 'name')).toBe('1. Infanterie-Division')
  expect(text(dateien, m + 'history/countries/MRE - Mein Reich.txt')).toContain('oob = "MRE_1936"')
})

test('Raster, Kompanien, Namen ueber mehrere Verbaende, Vorlage ohne Verband', () => {
  let p = testprojekt(sd)
  const mre = p.laender[0].id
  const v = armee(p).vorlagen[0].id
  p = setzeZelle(p, mre, v, 'bataillon', 2, 0, 'artillery_brigade')
  p = setzeZelle(p, mre, v, 'unterstuetzung', 0, 1, 'engineer')
  p = aendereVerband(p, mre, armee(p).verbaende[0].id, { anzahl: 2, staat: 1 })
  let vb, leer
  ;[p, vb] = fuegeVerbandHinzu(p, mre, v)
  p = aendereVerband(p, mre, vb, { anzahl: 3, staat: 4 })
  ;[p, leer] = fuegeVorlageHinzu(p, mre)
  p = setzeZelle(aendereVorlage(p, mre, leer, { name: 'Reserve' }), mre, leer, 'bataillon', 0, 0, 'infantry')
  const e = lies(erzeugeMod(p, sd).dateien, MRE_OOB)
  const vorlagen = findeAlle(e, 'division_template').map(x => x.wert.inhalt)
  expect(vorlagen.map(x => wert(x, 'name'))).toEqual(['Infanterie-Division', 'Reserve'])
  const art = finde(finde(vorlagen[0], 'regiments').wert.inhalt, 'artillery_brigade').wert.inhalt
  expect([wert(art, 'x'), wert(art, 'y')]).toEqual(['2', '0'])
  const pio = finde(finde(vorlagen[0], 'support').wert.inhalt, 'engineer').wert.inhalt
  expect([wert(pio, 'x'), wert(pio, 'y')]).toEqual(['0', '1'])
  expect(finde(vorlagen[1], 'support')).toBeUndefined()
  const d = divisionen(e)
  expect(d.map(x => wert(x, 'name'))).toEqual(['1. Infanterie-Division', '2. Infanterie-Division', '3. Infanterie-Division', '4. Infanterie-Division', '5. Infanterie-Division'])
  expect(d.map(x => wert(x, 'location'))).toEqual(['1', '1', '5', '5', '5'])
  expect(wert(d[0], 'division_template')).toBe('Infanterie-Division')
})

test('Review Focus 4: Umlaute werden transliteriert', () => {
  let p = testprojekt(sd)
  p = aendereVorlage(p, p.laender[0].id, armee(p).vorlagen[0].id, { name: 'Gebirgsjäger' })
  const t = text(erzeugeMod(p, sd).dateien, MRE_OOB)
  expect(/^[\x00-\x7F]*$/.test(t)).toBe(true)
  const e = parseParadox(t, { streng: true }).eintraege
  expect(wert(finde(e, 'division_template').wert.inhalt, 'name')).toBe('Gebirgsjaeger')
  expect(wert(divisionen(e)[0], 'division_template')).toBe('Gebirgsjaeger')
})

test('Review Focus 1: altes Projekt mit divisionen 4', () => {
  const p = testprojekt(sd)
  const alt = ergaenzeProjekt({ ...p, laender: p.laender.map(l => ({ ...l, armee: { divisionen: 4 } })) }, sd)
  expect(divisionen(lies(erzeugeMod(alt, sd).dateien, MRE_OOB)).map(x => wert(x, 'location'))).toEqual(['1', '1', '1', '1'])
})

test('Review Focus 3: bestehendes Land bekommt eine eigene Datei und load_oob', () => {
  let [p, swi] = fuegeLandHinzu(testprojekt(sd), sd, 'geaendert', 'SWI')
  const l = p.laender.find(x => x.id === swi)
  p = aendereLand(p, sd, swi, { aendern: { ...l.aendern, armee: true } })
  let v
  ;[p, v] = fuegeVorlageHinzu(p, swi)
  p = setzeZelle(aendereVorlage(p, swi, v, { name: 'Gebirgsdivision' }), swi, v, 'bataillon', 0, 0, 'infantry')
  ;[p] = fuegeVerbandHinzu(p, swi, v)
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const e = lies(dateien, m + 'history/units/mein_reich_SWI_1936.txt')
  expect(wert(divisionen(e)[0], 'location')).toBe('4')
  expect(text(dateien, m + 'history/countries/SWI - Switzerland.txt')).toContain('load_oob = "mein_reich_SWI_1936"')
  expect(dateien.filter(d => d.pfad.startsWith(m + 'history/units/')).map(d => d.pfad).sort()).toEqual([m + 'history/units/MRE_1936.txt', m + 'history/units/mein_reich_SWI_1936.txt'])
})

test('ohne Verbaende keine Datei; Review Focus 5: ohne Hauptstadt kein Absturz', () => {
  let p = testprojekt(sd)
  p = aendereLand(p, sd, p.laender[0].id, { armee: { ...armee(p), verbaende: [] } })
  const ohne = erzeugeMod(p, sd)
  expect(ohne.dateien.some(d => d.pfad === MRE_OOB)).toBe(false)
  expect(text(ohne.dateien, m + 'history/countries/MRE - Mein Reich.txt')).not.toContain('oob')
  const basis = testprojekt(sd)
  const ohneHauptstadt = aendereLand(basis, sd, basis.laender[0].id, { hauptstadt: null })
  expect(() => erzeugeMod(ohneHauptstadt, sd)).not.toThrow()
  expect(erzeugeMod(ohneHauptstadt, sd).dateien.some(d => d.pfad === MRE_OOB)).toBe(false)
})
