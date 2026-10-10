import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { aendereStaatsdatei } from '../../src/erzeuger/kern.js'
import { aendereLand } from '../../src/projekt/aenderungen.js'
import { setzeGebaeude } from '../../src/projekt/staaten.js'
import { parseParadox, finde, findeAlle, wertText, zahlen } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const BRANDENBURG = m + 'history/states/1-Brandenburg.txt'
const staatInhalt = (t) => finde(parseParadox(t, { streng: true }).eintraege, 'state').wert.inhalt
const wert = (inhalt, k) => wertText(finde(inhalt, k)?.wert)

const AENDERUNG = {
  name: 'Mark', einwohner: 3000000, kategorie: 'megalopolis', extraBauplaetze: 2,
  gebaeude: { industrial_complex: 5, infrastructure: 0 },
  ressourcen: { oil: 8, steel: 0 },
  provinzen: { 1: { siegpunkte: 30, siegpunktName: 'Neu-Berlin', gebaeude: { bunker: 0 } }, 2: { siegpunkte: 5 } },
}

test('alle Aenderungen in der Staatsdatei; Datumsblock bleibt', () => {
  const s = staatInhalt(aendereStaatsdatei(sd.originaltexte['history/states/1-Brandenburg.txt'], { staat: AENDERUNG }))
  expect([wert(s, 'manpower'), wert(s, 'state_category')]).toEqual(['3000000', 'megalopolis'])
  expect(finde(s, 'resources').wert.inhalt.map(x => [x.schluessel, x.wert.text])).toEqual([['oil', '8']])
  const hist = finde(s, 'history').wert.inhalt
  const gebaeude = finde(hist, 'buildings').wert.inhalt
  expect(gebaeude.map(x => x.schluessel)).toEqual(['industrial_complex'])
  expect(wert(gebaeude, 'industrial_complex')).toBe('5')
  expect(findeAlle(hist, 'victory_points').map(x => zahlen(x.wert))).toEqual([[1, 30], [2, 5]])
  expect(wert(hist, 'add_extra_state_shared_building_slots')).toBe('2')
  // Review Focus 1
  const datum = finde(hist, '1939.1.1').wert.inhalt
  expect(wert(finde(datum, 'buildings').wert.inhalt, 'arms_factory')).toBe('2')
})

test('Provinz-Gebaeude, leerer resources-Block, Gebaeude-Block mit Provinz', () => {
  const s = staatInhalt(aendereStaatsdatei(sd.originaltexte['history/states/1-Brandenburg.txt'], { staat: { ressourcen: { steel: 0 }, provinzen: { 2: { gebaeude: { bunker: 3 } } } } }))
  expect(finde(s, 'resources')).toBeUndefined()
  const gebaeude = finde(finde(s, 'history').wert.inhalt, 'buildings').wert.inhalt
  expect(wert(finde(gebaeude, '1').wert.inhalt, 'bunker')).toBe('2')
  expect(wert(finde(gebaeude, '2').wert.inhalt, 'bunker')).toBe('3')
})

test('Review Focus 4: Staat ohne history, buildings, resources', () => {
  const t = aendereStaatsdatei('state = {\n\tid = 3\n\tprovinces = { 4 }\n}\n', { staat: { gebaeude: { industrial_complex: 1 }, ressourcen: { oil: 2 }, provinzen: { 4: { siegpunkte: 3, gebaeude: { naval_base: 1 } } } } })
  const s = staatInhalt(t)
  expect(wert(finde(s, 'resources').wert.inhalt, 'oil')).toBe('2')
  const hist = finde(s, 'history').wert.inhalt
  expect(wert(finde(hist, 'buildings').wert.inhalt, 'industrial_complex')).toBe('1')
  expect(wert(finde(finde(hist, 'buildings').wert.inhalt, '4').wert.inhalt, 'naval_base')).toBe('1')
  expect(zahlen(finde(hist, 'victory_points').wert)).toEqual([4, 3])
})

test('Namen im Ersatz-Ordner, Mod ohne Fehler', () => {
  const p = { ...testprojekt(sd), staaten: { 1: AENDERUNG } }
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const ersatz = parseYml(text(dateien, m + 'localisation/german/replace/mein_reich_replace_l_german.yml')).eintraege
  expect([ersatz.get('STATE_1'), ersatz.get('VICTORY_POINTS_1')]).toEqual(['Mark', 'Neu-Berlin'])
  expect(dateien.filter(d => d.pfad === BRANDENBURG)).toHaveLength(1)
})

test('Review Focus 2: Besitzerwechsel, Bevoelkerungs-Faktor und feste Einwohner in einer Datei', () => {
  let p = testprojekt(sd)
  const mre = p.laender[0]
  p = aendereLand(p, sd, mre.id, { startwerte: { ...mre.startwerte, bevoelkerung: 50 } })
  p = { ...p, staaten: { 1: { einwohner: 1000000 } } }
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(dateien.filter(d => d.pfad === BRANDENBURG)).toHaveLength(1)
  const brandenburg = staatInhalt(text(dateien, BRANDENBURG))
  expect(wert(brandenburg, 'manpower')).toBe('1000000')
  expect(wert(finde(brandenburg, 'history').wert.inhalt, 'owner')).toBe('MRE')
  expect(wert(staatInhalt(text(dateien, m + 'history/states/4-Zuerich.txt')), 'manpower')).toBe('1800000')
})

test('Review Focus 3: zurueckgesetzter Staat schreibt keine Datei', () => {
  let p = setzeGebaeude(testprojekt(sd), sd, 3, 'industrial_complex', 2)
  p = setzeGebaeude(p, sd, 3, 'industrial_complex', 0)
  expect(erzeugeMod(p, sd).dateien.some(d => d.pfad === m + 'history/states/3-Bern.txt')).toBe(false)
})
