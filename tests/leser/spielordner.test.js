import { test, expect } from 'vitest'
import { erstelleMiniSpielordner } from '../../src/selbsttest/mini-spielordner.js'
import { dateiquelleAusObjekt } from '../../src/leser/dateiquelle.js'
import { leseSpielordner, SpielordnerFehler, LESER_VERSION } from '../../src/leser/spielordner.js'

const fortschritte = []
const ergebnis = await leseSpielordner(dateiquelleAusObjekt(erstelleMiniSpielordner()), { fortschritt: (a) => fortschritte.push(a) })
const sd = ergebnis.spieldaten

test('Version und Laender', () => {
  expect(sd.leserVersion).toBe(LESER_VERSION)
  expect([sd.version, sd.supportedVersion]).toEqual(['1.15.4', '1.15.*'])
  expect(Object.keys(sd.laender).sort()).toEqual(['FRA', 'GER', 'SWI'])
  expect(sd.laender.GER).toMatchObject({ name: 'Deutschland', adjektiv: 'deutsch', farbe: [75, 75, 75], grafikstil: 'western_european_gfx',
    grafikstil2d: 'western_european_2d', hauptstadt: 1, regierung: 'fascism', anfuehrer: 'GER_adolf_hitler',
    verlaufDatei: 'history/countries/GER - Germany.txt', landDatei: 'common/countries/Germany.txt' })
  expect(sd.laender.SWI).toMatchObject({ name: 'Schweiz', nameDef: 'die Schweiz', anfuehrer: 'SWI_giuseppe_motta', regierung: 'democratic' })
  expect(sd.laender.FRA.anfuehrer).toBeNull()
  expect(sd.laender.GER.flaggen.sort()).toEqual(['GER', 'GER_fascism'])
  expect(sd.laender.GER.namensVarianten.sort()).toEqual(['GER_fascism', 'GER_fascism_ADJ', 'GER_fascism_DEF'])
})

test('Staaten inklusive Rueckfall auf Englisch und kaputter Datei', () => {
  expect(sd.staaten[6]).toMatchObject({ name: 'Alsace', besitzer: 'FRA', kerne: ['FRA', 'GER'], provinzen: [7] })
  expect(sd.staaten[4].name).toBe('Zürich')
  expect(sd.staaten[1]).toMatchObject({ kategorie: 'city', manpower: 2500000, datei: 'history/states/1-Brandenburg.txt' })
  expect(sd.staaten[99]).toBeUndefined()
  expect(ergebnis.warnungen.some(w => w.includes('99-Kaputt.txt'))).toBe(true)
})

test('Ideologien und Charaktere', () => {
  expect(sd.ideologien.map(i => i.id)).toEqual(['democratic', 'communism', 'fascism', 'neutrality'])
  expect(sd.ideologien[3]).toEqual({ id: 'neutrality', name: 'Blockfrei', unter: [{ id: 'despotism', name: 'Despotismus' }, { id: 'oligarchism', name: 'Oligarchie' }] })
  expect(sd.charaktere.SWI_giuseppe_motta).toMatchObject({ name: 'Giuseppe Motta', ideologie: 'conservatism' })
  expect(sd.charaktere.GER_adolf_hitler.portraet).toBe('gfx/leaders/GER/Portrait_Germany_Adolf_Hitler.dds')
})

test('Provinzen, Bilder und Groessen', () => {
  expect(sd.provinzArten[8]).toBe('sea')
  expect(sd.provinzArten[1]).toBe('land')
  expect(sd.sprites.GFX_idea_generic_army).toBe('gfx/interface/ideas/idea_generic_army.dds')
  expect(sd.ideenBilder).toEqual(['GFX_idea_generic_army', 'GFX_idea_generic_industry'])
  expect(sd.portraets).toEqual(['gfx/leaders/Europe/portrait_europe_generic_1.dds', 'gfx/leaders/Europe/portrait_europe_generic_2.dds'])
  expect(sd.bildgroessen).toEqual({ flagge: [82, 52], idee: [64, 64], portraet: [156, 210] })
  expect(ergebnis.bilder.get('flagge:SWI')).toMatchObject({ breite: 82, hoehe: 52 })
  expect(ergebnis.bilder.get('idee:GFX_idea_generic_army')).toMatchObject({ breite: 64, hoehe: 64 })
  expect(ergebnis.bilder.get('portraet:gfx/leaders/Europe/portrait_europe_generic_1.dds')).toMatchObject({ breite: 156 })
})

test('Originaltexte, Karte, Serialisierbarkeit, Fortschritt', () => {
  expect(sd.originaltexte['history/states/1-Brandenburg.txt']).toContain('owner = GER')
  expect(sd.originaltexte['history/countries/GER - Germany.txt']).toContain('recruit_character')
  expect(sd.originaltexte['common/countries/colors.txt']).toContain('SWI')
  expect(ergebnis.karte.staatIds.length).toBe(7)
  expect(JSON.parse(JSON.stringify(sd))).toEqual(sd)
  expect(fortschritte.length).toBeGreaterThanOrEqual(5)
  for (let i = 1; i < fortschritte.length; i++) expect(fortschritte[i]).toBeGreaterThanOrEqual(fortschritte[i - 1])
  expect(fortschritte.at(-1)).toBe(1)
})

test('falscher Ordner gibt verstaendliche Meldung', async () => {
  await expect(leseSpielordner(dateiquelleAusObjekt({ 'readme.txt': 'x' }))).rejects.toThrow(SpielordnerFehler)
  await expect(leseSpielordner(dateiquelleAusObjekt({ 'launcher-settings.json': '{}' }))).rejects.toThrow(/^Das ist nicht der Hearts-of-Iron-IV-Spielordner\./)
})
