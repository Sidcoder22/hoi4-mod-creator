import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { pruefeProjekt } from '../../src/pruefung/regeln.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { aendereLand, schalteStaat, fuegeLandHinzu } from '../../src/projekt/aenderungen.js'

const sd = await miniSpieldaten()

function gueltig() {
  let p = testprojekt(sd)
  const id = p.laender[0].id
  p = aendereLand(schalteStaat(schalteStaat(p, id, 1), id, 2), sd, id, { hauptstadt: 2 })
  return { p, id }
}
const { p: g, id } = gueltig()
const mit = (forschung) => aendereLand(g, sd, id, { forschung })
const meldungen = (p) => pruefeProjekt(p, sd)
const regeln = (p) => meldungen(p).map(m => m.regel)
const ziel = { bereich: 'land', id, reiter: 'forschung' }

test('gueltige Liste meldet nichts', () => {
  expect(regeln(mit(['infantry_weapons', 'infantry_weapons1']))).toEqual([])
})

test('Review Focus 5: unbekannte Technologie mit Behebung', () => {
  const p = mit(['gibtsnicht', 'infantry_weapons'])
  const m = meldungen(p).find(x => x.regel === 'forschung-unbekannt')
  expect(m).toMatchObject({ schwere: 'fehler', ziel })
  expect(m.text).toContain('gibtsnicht')
  expect(m.behebung.anwenden(p, sd).laender[0].forschung).toEqual(['infantry_weapons'])
  expect(() => erzeugeMod(p, sd)).not.toThrow()
})

test('fehlende Voraussetzung mit Behebung', () => {
  const p = mit(['infantry_weapons2'])
  const m = meldungen(p).find(x => x.regel === 'forschung-voraussetzung')
  expect(m).toMatchObject({ schwere: 'hinweis', ziel })
  expect(m.behebung.anwenden(p, sd).laender[0].forschung.sort()).toEqual(['infantry_weapons', 'infantry_weapons1', 'infantry_weapons2'])
})

test('neues Land ohne Forschung; bestehendes Land ohne Schalter wird nicht geprueft', () => {
  expect(meldungen(mit([])).find(x => x.regel === 'forschung-leer')).toMatchObject({ schwere: 'hinweis', ziel })
  let [p, swi] = fuegeLandHinzu(g, sd, 'geaendert', 'SWI')
  p = aendereLand(p, sd, swi, { forschung: ['gibtsnicht'] })
  expect(regeln(p)).not.toContain('forschung-unbekannt')
})
