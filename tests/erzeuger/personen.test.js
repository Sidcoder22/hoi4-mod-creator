import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { fuegeLandHinzu, aendereLand, fuegeBildHinzu } from '../../src/projekt/aenderungen.js'
import { fuegePersonHinzu, aenderePerson } from '../../src/projekt/personen.js'
import { parseParadox, finde, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const MRE_CHAR = m + 'common/characters/mein_reich_MRE.txt'
const wert = (inhalt, k) => wertText(finde(inhalt, k)?.wert)
const charaktere = (dateien, pfad) => finde(parseParadox(text(dateien, pfad), { streng: true }).eintraege, 'characters').wert.inhalt

function aufbau() {
  let p = testprojekt(sd)
  const mre = p.laender[0].id
  let g, b
  ;[p, g] = fuegePersonHinzu(p, sd, mre, 'general')
  p = aenderePerson(p, sd, mre, g, { name: 'Hans', stufe: 3, werte: { angriff: 4, verteidigung: 2, planung: 3, logistik: 1 }, eigenschaften: ['panzer_leader'] })
  ;[p, b] = fuegePersonHinzu(p, sd, mre, 'berater')
  p = aenderePerson(p, sd, mre, b, { name: 'Erika', platz: 'theorist', kosten: 100, beraterEigenschaft: { art: 'spiel', id: 'popular_figurehead' } })
  return { p, mre, g, b }
}

test('General und Berater; Review Focus 1: eine Datei mit Anfuehrer', () => {
  const { dateien, fehler } = erzeugeMod(aufbau().p, sd)
  expect(fehler).toEqual([])
  expect(dateien.filter(d => d.pfad === MRE_CHAR)).toHaveLength(1)
  const c = charaktere(dateien, MRE_CHAR)
  expect(c.map(x => x.schluessel)).toEqual(['mein_reich_mre_anfuehrer', 'mein_reich_person_1', 'mein_reich_person_2'])
  const general = finde(c, 'mein_reich_person_1').wert.inhalt
  const cc = finde(general, 'corps_commander').wert.inhalt
  expect(['skill', 'attack_skill', 'defense_skill', 'planning_skill', 'logistics_skill', 'legacy_id'].map(k => wert(cc, k))).toEqual(['3', '4', '2', '3', '1', '-1'])
  expect(finde(cc, 'traits').wert.inhalt.map(x => x.text)).toEqual(['panzer_leader'])
  expect(wert(finde(finde(general, 'portraits').wert.inhalt, 'army').wert.inhalt, 'large')).toBe(sd.portraets[0])
  const berater = finde(c, 'mein_reich_person_2').wert.inhalt
  const adv = finde(berater, 'advisor').wert.inhalt
  expect([wert(adv, 'slot'), wert(adv, 'idea_token'), wert(adv, 'cost')]).toEqual(['theorist', 'mein_reich_person_2_berater', '100'])
  expect(wert(finde(adv, 'allowed').wert.inhalt, 'original_tag')).toBe('MRE')
  expect(finde(adv, 'traits').wert.inhalt.map(x => x.text)).toEqual(['popular_figurehead'])
  const civ = finde(finde(berater, 'portraits').wert.inhalt, 'civilian').wert.inhalt
  expect([wert(civ, 'large'), wert(civ, 'small')]).toEqual([sd.portraets[0], sd.portraets[0]])
  const verlauf = text(dateien, m + 'history/countries/MRE - Mein Reich.txt')
  expect(verlauf).toContain('recruit_character = mein_reich_person_1')
  expect(verlauf).toContain('recruit_character = mein_reich_person_2')
  const de = parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege
  expect([de.get('mein_reich_person_1'), de.get('mein_reich_person_2')]).toEqual(['Hans', 'Erika'])
})

test('Feldmarschall und Admiral', () => {
  let { p, mre, g } = aufbau()
  let a
  p = aenderePerson(p, sd, mre, g, { rolle: 'feldmarschall' })
  ;[p, a] = fuegePersonHinzu(p, sd, mre, 'admiral')
  p = aenderePerson(p, sd, mre, a, { name: 'Kurt', werte: { angriff: 2, verteidigung: 3, manoever: 4, koordination: 5 }, eigenschaften: ['seawolf'] })
  const c = charaktere(erzeugeMod(p, sd).dateien, MRE_CHAR)
  expect(finde(finde(c, 'mein_reich_person_1').wert.inhalt, 'field_marshal')).toBeTruthy()
  const admiral = finde(c, 'mein_reich_person_3').wert.inhalt
  const nl = finde(admiral, 'navy_leader').wert.inhalt
  expect(['attack_skill', 'defense_skill', 'maneuvering_skill', 'coordination_skill'].map(k => wert(nl, k))).toEqual(['2', '3', '4', '5'])
  expect(finde(finde(admiral, 'portraits').wert.inhalt, 'navy')).toBeTruthy()
})

test('Review Focus 2: bestehendes Land nur mit Personen', () => {
  let [p, swi] = fuegeLandHinzu(testprojekt(sd), sd, 'geaendert', 'SWI')
  const l = p.laender.find(x => x.id === swi)
  p = aendereLand(p, sd, swi, { aendern: { ...l.aendern, personen: true } })
  let a
  ;[p, a] = fuegePersonHinzu(p, sd, swi, 'admiral')
  p = aenderePerson(p, sd, swi, a, { name: 'Hans Seemann' })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const nummer = p.laender.find(x => x.id === swi).personen[0].nummer
  expect(charaktere(dateien, m + 'common/characters/mein_reich_SWI.txt').map(x => x.schluessel)).toEqual([`mein_reich_person_${nummer}`])
  const verlauf = text(dateien, m + 'history/countries/SWI - Switzerland.txt')
  expect(verlauf).toContain(`recruit_character = mein_reich_person_${nummer}`)
  expect(verlauf).not.toContain('promote_character')
  // ohne Schalter: nichts
  const aus = aendereLand(p, sd, swi, { aendern: { ...l.aendern, personen: false } })
  expect(erzeugeMod(aus, sd).dateien.some(d => d.pfad === m + 'common/characters/mein_reich_SWI.txt')).toBe(false)
})

test('eigenes Portraet', () => {
  let { p, mre, g } = aufbau()
  let bild
  ;[p, bild] = fuegeBildHinzu(p, { breite: 10, hoehe: 10, rgba: new Uint8ClampedArray(400).fill(200) })
  p = aenderePerson(p, sd, mre, g, { bild: { art: 'eigen', bildId: bild } })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(dateien.some(d => d.pfad === m + 'gfx/leaders/MRE/mein_reich_person_1.dds')).toBe(true)
  const general = finde(charaktere(dateien, MRE_CHAR), 'mein_reich_person_1').wert.inhalt
  expect(wert(finde(finde(general, 'portraits').wert.inhalt, 'army').wert.inhalt, 'large')).toBe('gfx/leaders/MRE/mein_reich_person_1.dds')
})
