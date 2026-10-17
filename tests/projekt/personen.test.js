import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { ergaenzeProjekt } from '../../src/projekt/modell.js'
import { fuegeLandHinzu } from '../../src/projekt/aenderungen.js'
import { fuegePersonHinzu, aenderePerson, entfernePerson, vorgabenFuer } from '../../src/projekt/personen.js'

const sd = await miniSpieldaten()
const p = testprojekt(sd)
const mre = p.laender[0].id
const person = (q, id) => q.laender.flatMap(l => l.personen).find(x => x.id === id)

test('neuer General mit Vorgaben', () => {
  const [q, g] = fuegePersonHinzu(p, sd, mre, 'general')
  expect(person(q, g)).toMatchObject({ nummer: 1, rolle: 'general', name: '', stufe: 1, werte: { angriff: 1, verteidigung: 1, planung: 1, logistik: 1 },
    eigenschaften: [], bild: { art: 'spiel', pfad: sd.portraets[0] } })
  expect(q.zaehler.person).toBe(1)
  expect(fuegePersonHinzu(q, sd, mre, 'berater')[0].laender[0].personen[1]).toMatchObject({ nummer: 2, platz: 'political_advisor', kosten: 150, beraterEigenschaft: null })
})

test('Review Focus 3: Rollenwechsel setzt die Rollenfelder zurueck', () => {
  let [q, g] = fuegePersonHinzu(p, sd, mre, 'general')
  q = aenderePerson(q, sd, mre, g, { name: 'Hans', eigenschaften: ['panzer_leader'], werte: { angriff: 5, verteidigung: 1, planung: 1, logistik: 1 } })
  q = aenderePerson(q, sd, mre, g, { rolle: 'admiral' })
  expect(person(q, g)).toMatchObject({ name: 'Hans', rolle: 'admiral', eigenschaften: [], werte: { angriff: 1, verteidigung: 1, manoever: 1, koordination: 1 } })
  const b = person(aenderePerson(q, sd, mre, g, { rolle: 'berater' }), g)
  expect(b).toMatchObject({ name: 'Hans', platz: 'political_advisor', kosten: 150, beraterEigenschaft: null })
  expect(b.werte).toBeUndefined()
  // gleiche Rolle: nur das Feld aendert sich
  expect(person(aenderePerson(q, sd, mre, g, { rolle: 'admiral', stufe: 3 }), g).stufe).toBe(3)
})

test('entfernen, Vorgaben, Felder neuer und alter Laender (Review Focus 5)', () => {
  const [q, g] = fuegePersonHinzu(p, sd, mre, 'feldmarschall')
  expect(entfernePerson(q, mre, g).laender[0].personen).toEqual([])
  expect(vorgabenFuer('admiral')).toEqual({ stufe: 1, werte: { angriff: 1, verteidigung: 1, manoever: 1, koordination: 1 }, eigenschaften: [] })
  expect(p.laender[0].personen).toEqual([])
  const [r, swi] = fuegeLandHinzu(p, sd, 'geaendert', 'SWI')
  expect(r.laender.find(l => l.id === swi)).toMatchObject({ personen: [], aendern: { personen: false } })
  const alt = { ...p, laender: p.laender.map(({ personen, ...l }) => l) }
  expect(ergaenzeProjekt(alt, sd).laender[0].personen).toEqual([])
})
