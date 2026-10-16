import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { ergaenzeProjekt } from '../../src/projekt/modell.js'
import { fuegeLandHinzu, aendereLand } from '../../src/projekt/aenderungen.js'
import { forschungVon, setzeForschung, schalteTechnologie, schnellwahl, forschungZuruecksetzen } from '../../src/projekt/forschung.js'

const sd = await miniSpieldaten()
const p = testprojekt(sd)
const mre = p.laender[0].id
const land = (q, id = mre) => q.laender.find(l => l.id === id)

test('neue Laender haben forschung null, alte Projekte werden ergaenzt (Review Focus 4)', () => {
  expect(land(p).forschung).toBeNull()
  const ohne = { ...p, laender: p.laender.map(l => { const { forschung, ...rest } = l; return rest }) }
  expect(ergaenzeProjekt(ohne, sd).laender[0].forschung).toBeNull()
})

test('forschungVon bei null', () => {
  expect(forschungVon(sd, land(p))).toEqual(['infantry_weapons', 'infantry_weapons1', 'tech_support'])
  expect(forschungVon(sd, { ...land(p), technikWie: 'SWI' })).toEqual(['infantry_weapons', 'tech_support'])
  const [q, swi] = fuegeLandHinzu(p, sd, 'geaendert', 'SWI')
  expect(forschungVon(sd, land(q, swi))).toEqual(['infantry_weapons', 'tech_support'])
  expect(forschungVon(sd, { ...land(p), hauptstadt: null, technikWie: null })).toEqual([])
})

test('Technologie an: Voraussetzungen kommen mit', () => {
  let [q, mit] = schalteTechnologie(p, sd, mre, 'infantry_weapons2', true)
  expect(land(q).forschung).toEqual(['infantry_weapons', 'infantry_weapons1', 'tech_support', 'infantry_weapons2'])
  expect(mit).toEqual([])
  ;[q, mit] = schalteTechnologie(setzeForschung(p, sd, mre, []), sd, mre, 'infantry_weapons2', true)
  expect(mit).toEqual(['infantry_weapons1', 'infantry_weapons'])
  expect(land(q).forschung.sort()).toEqual(['infantry_weapons', 'infantry_weapons1', 'infantry_weapons2'])
})

test('Review Focus 1: Technologie aus, abhaengige fallen weg', () => {
  let [q] = schalteTechnologie(p, sd, mre, 'infantry_weapons2', true)
  let mit
  ;[q, mit] = schalteTechnologie(q, sd, mre, 'infantry_weapons1', false)
  expect(land(q).forschung).toEqual(['infantry_weapons', 'tech_support'])
  expect(mit).toEqual(['infantry_weapons2'])
})

test('Schnellwahl', () => {
  expect(schnellwahl(sd, 'jahr', 1936).sort()).toEqual(['basic_machine_tools', 'infantry_weapons', 'infantry_weapons1', 'tech_support'])
  expect(schnellwahl(sd, 'jahr', 1940)).not.toContain('grand_battle_plan')
  expect(schnellwahl(sd, 'land', 'SWI')).toEqual(['infantry_weapons', 'tech_support'])
  expect(schnellwahl(sd, 'nichts')).toEqual([])
})

test('setzen und zuruecksetzen', () => {
  const q = setzeForschung(p, sd, mre, ['tech_support'])
  expect(land(q).forschung).toEqual(['tech_support'])
  expect(land(forschungZuruecksetzen(q, mre)).forschung).toBeNull()
  const [r, swi] = fuegeLandHinzu(p, sd, 'geaendert', 'SWI')
  expect(land(r, swi)).toMatchObject({ forschung: null, aendern: { forschung: false } })
  expect(land(aendereLand(r, sd, swi, { forschung: ['x'] }), swi).forschung).toEqual(['x'])
})
