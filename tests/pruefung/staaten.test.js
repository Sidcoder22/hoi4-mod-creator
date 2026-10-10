import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { pruefeProjekt } from '../../src/pruefung/regeln.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { aendereLand, schalteStaat } from '../../src/projekt/aenderungen.js'
import { setzeGebaeude } from '../../src/projekt/staaten.js'

const sd = await miniSpieldaten()

function gueltig() {
  let p = testprojekt(sd)
  const id = p.laender[0].id
  p = aendereLand(schalteStaat(schalteStaat(p, id, 1), id, 2), sd, id, { hauptstadt: 2 })
  return { ...p, staaten: { 3: { name: 'Bärn', gebaeude: { industrial_complex: 2 }, ressourcen: { oil: 5 }, provinzen: { 4: { siegpunkte: 5, gebaeude: { naval_base: 1 } } } } } }
}
const g = gueltig()
const mitStaat = (aenderung, id = 3) => ({ ...g, staaten: { ...g.staaten, [id]: aenderung } })
const meldungen = (p) => pruefeProjekt(p, sd)
const regeln = (p) => meldungen(p).map(m => m.regel)

test('gueltige Staatsaenderung meldet nichts', () => {
  expect(regeln(g)).toEqual([])
})

const FAELLE = [
  ['staat-stufe', () => mitStaat({ gebaeude: { infrastructure: 6 } })],
  ['staat-stufe', () => mitStaat({ provinzen: { 4: { gebaeude: { bunker: 11 } } } })],
  ['staat-kueste', () => mitStaat({ provinzen: { 1: { gebaeude: { naval_base: 1 } } } }, 1)],
  ['staat-provinz', () => mitStaat({ provinzen: { 5: { siegpunkte: 3 } } })],
  ['staat-unbekannt', () => mitStaat({ name: 'X' }, 999)],
  ['staat-kategorie', () => mitStaat({ kategorie: 'gibtsnicht' })],
]

for (const [regel, bau] of FAELLE) {
  test(`Regel ${regel}`, () => {
    const id = Object.keys(bau().staaten).find(k => !(k in g.staaten)) ?? '3'
    const m = meldungen(bau()).filter(x => x.regel === regel)
    expect(m.length).toBeGreaterThan(0)
    expect(m[0]).toMatchObject({ schwere: 'fehler', ziel: { bereich: 'staat', id: Number(id === '3' && regel === 'staat-kueste' ? 1 : id) } })
  })
}

test('zu wenig Bauplaetze mit Behebung', () => {
  const p = mitStaat({ gebaeude: { industrial_complex: 3, arms_factory: 2 } })
  const m = meldungen(p).find(x => x.regel === 'staat-bauplaetze')
  expect(m).toMatchObject({ schwere: 'fehler', ziel: { bereich: 'staat', id: 3 } })
  expect(m.text).toContain('5')
  const behoben = m.behebung.anwenden(p, sd)
  expect(behoben.staaten[3].extraBauplaetze).toBe(1)
  expect(regeln(behoben)).not.toContain('staat-bauplaetze')
})

test('unveraenderter Eintrag ist ein Hinweis mit Aufraeumen', () => {
  const p = mitStaat({ einwohner: 900000 })
  const m = meldungen(p).find(x => x.regel === 'staat-unveraendert')
  expect(m).toMatchObject({ schwere: 'hinweis', ziel: { bereich: 'staat', id: 3 } })
  expect(m.behebung.anwenden(p, sd).staaten[3]).toBeUndefined()
  expect(regeln(setzeGebaeude(g, sd, 3, 'industrial_complex', 1))).not.toContain('staat-unveraendert')
})

test('Review Focus 5: unbekannter Staat und unbekannte Kategorie werfen nicht', () => {
  const p = { ...g, staaten: { 999: { name: 'X' }, 3: { kategorie: 'gibtsnicht', gebaeude: { industrial_complex: 1 } } } }
  expect(() => pruefeProjekt(p, sd)).not.toThrow()
  expect(() => erzeugeMod(p, sd)).not.toThrow()
})

test('Review: Werft braucht einen Staat mit Kueste', () => {
  const m = meldungen(mitStaat({ gebaeude: { dockyard: 1 } }, 1)).find(x => x.regel === 'staat-kueste')
  expect(m).toMatchObject({ schwere: 'fehler', ziel: { bereich: 'staat', id: 1 } })
  expect(regeln(mitStaat({ gebaeude: { dockyard: 1 } }))).not.toContain('staat-kueste')
})
