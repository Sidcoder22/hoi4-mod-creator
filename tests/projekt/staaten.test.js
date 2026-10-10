import { test, expect } from 'vitest'
import { miniSpieldaten } from '../hilfe.js'
import { neuesProjekt, ergaenzeProjekt } from '../../src/projekt/modell.js'
import { aendereStaat, setzeGebaeude, setzeRessource, setzeProvinz, setzeProvinzGebaeude, verwerfeStaat, effektiveStaatswerte } from '../../src/projekt/staaten.js'

const sd = await miniSpieldaten()

test('Gebaeude setzen und effektive Werte', () => {
  const p = setzeGebaeude(neuesProjekt('M'), sd, 3, 'industrial_complex', 2)
  expect(p.staaten).toEqual({ 3: { gebaeude: { industrial_complex: 2 } } })
  expect(effektiveStaatswerte(p, sd, 3)).toMatchObject({ name: 'Bern', kategorie: 'town', extraBauplaetze: 0, bauplaetze: 4, belegt: 2,
    gebaeude: { industrial_complex: 2 }, ressourcen: {}, siegpunkte: {} })
})

test('Review Focus 3: Spielwert entfernt den Eintrag', () => {
  const p = setzeGebaeude(neuesProjekt('M'), sd, 3, 'industrial_complex', 2)
  expect(setzeGebaeude(p, sd, 3, 'industrial_complex', 0).staaten).toEqual({})
  expect(aendereStaat(aendereStaat(p, sd, 3, { einwohner: 5 }), sd, 3, { einwohner: 900000 }).staaten[3]).toEqual({ gebaeude: { industrial_complex: 2 } })
})

test('Allgemeine Felder, Ressourcen, Provinzen', () => {
  let p = aendereStaat(neuesProjekt('M'), sd, 1, { name: 'Mark', einwohner: 2500000, kategorie: 'city', extraBauplaetze: 0 })
  expect(p.staaten[1]).toEqual({ name: 'Mark' })
  expect(aendereStaat(p, sd, 1, { name: '' }).staaten[1]).toBeUndefined()
  expect(aendereStaat(p, sd, 1, { name: 'Brandenburg' }).staaten[1]).toBeUndefined()
  p = setzeRessource(p, sd, 1, 'steel', 12)
  expect(p.staaten[1].ressourcen).toBeUndefined()
  p = setzeRessource(p, sd, 1, 'oil', 4)
  expect(p.staaten[1].ressourcen).toEqual({ oil: 4 })
  p = setzeProvinz(setzeProvinz(p, sd, 1, 1, 'siegpunkte', 25), sd, 1, 1, 'siegpunktName', 'Neu-Berlin')
  expect(p.staaten[1].provinzen).toEqual({ 1: { siegpunkte: 25, siegpunktName: 'Neu-Berlin' } })
  expect(setzeProvinz(p, sd, 1, 1, 'siegpunktName', 'Berlin').staaten[1].provinzen[1]).toEqual({ siegpunkte: 25 })
  p = setzeProvinzGebaeude(p, sd, 1, 1, 'bunker', 2)
  expect(p.staaten[1].provinzen[1].gebaeude).toBeUndefined()
  p = setzeProvinzGebaeude(p, sd, 1, 2, 'bunker', 1)
  expect(p.staaten[1].provinzen[2]).toEqual({ gebaeude: { bunker: 1 } })
  const werte = effektiveStaatswerte(p, sd, 1)
  expect(werte).toMatchObject({ name: 'Mark', ressourcen: { steel: 12, oil: 4 }, siegpunkte: { 1: 25 }, siegpunktNamen: { 1: 'Neu-Berlin' },
    provinzGebaeude: { 1: { bunker: 2 }, 2: { bunker: 1 } }, bauplaetze: 6, belegt: 3 })
  expect(verwerfeStaat(p, 1).staaten[1]).toBeUndefined()
})

test('unbekannter Staat und alte Projekte', () => {
  expect(effektiveStaatswerte(neuesProjekt('M'), sd, 999)).toBeNull()
  expect(neuesProjekt('M').staaten).toEqual({})
  expect(ergaenzeProjekt({ ...neuesProjekt('A'), staaten: undefined }, sd).staaten).toEqual({})
})

test('Review: zusaetzliche Bauplaetze aus dem Spiel sind der Spielwert', () => {
  const p = neuesProjekt('M')
  expect(effektiveStaatswerte(p, sd, 6)).toMatchObject({ extraBauplaetze: 1, bauplaetze: 5 })
  expect(aendereStaat(p, sd, 6, { extraBauplaetze: 1 }).staaten).toEqual({})
  expect(aendereStaat(p, sd, 6, { extraBauplaetze: 0 }).staaten).toEqual({ 6: { extraBauplaetze: 0 } })
})
