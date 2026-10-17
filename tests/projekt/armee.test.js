import { test, expect } from 'vitest'
import { miniSpieldaten } from '../hilfe.js'
import { neuesProjekt, ergaenzeProjekt } from '../../src/projekt/modell.js'
import { fuegeLandHinzu } from '../../src/projekt/aenderungen.js'
import { fuegeVorlageHinzu, aendereVorlage, setzeZelle, entferneVorlage, fuegeVerbandHinzu, aendereVerband, entferneVerband, kampfbreite } from '../../src/projekt/armee.js'

const sd = await miniSpieldaten()
const armee = (p, id) => p.laender.find(l => l.id === id).armee
const [p, mre] = fuegeLandHinzu(neuesProjekt('M'), sd, 'neu')
const LEER = [null, null, null, null, null]

test('neues Land: Vorgabe-Vorlage und 6 Divisionen in der Hauptstadt', () => {
  const a = armee(p, mre)
  expect(a.vorlagen).toEqual([{ id: expect.any(String), nummer: 1, name: 'Infanterie-Division',
    bataillone: [['infantry', 'infantry', 'infantry', null, null], ['infantry', 'infantry', 'infantry', null, null], LEER, LEER, LEER],
    unterstuetzung: LEER }])
  expect(a.verbaende).toEqual([{ id: expect.any(String), vorlage: a.vorlagen[0].id, anzahl: 6, staat: null }])
  expect(p.zaehler.vorlage).toBe(1)
  const [q, swi] = fuegeLandHinzu(p, sd, 'geaendert', 'SWI')
  expect(armee(q, swi)).toEqual({ vorlagen: [], verbaende: [] })
  expect(q.laender.find(l => l.id === swi).aendern.armee).toBe(false)
})

test('Review Focus 1: altes Feld divisionen wird umgewandelt', () => {
  const alt = (n) => ergaenzeProjekt({ ...p, laender: p.laender.map(l => ({ ...l, armee: { divisionen: n } })) }, sd)
  expect(armee(alt(4), mre).verbaende.map(v => [v.anzahl, v.staat])).toEqual([[4, null]])
  expect(armee(alt(4), mre).vorlagen[0].name).toBe('Infanterie-Division')
  expect(armee(alt(4), mre).divisionen).toBeUndefined()
  expect(armee(alt(0), mre).verbaende).toEqual([])
  // schon im neuen Format: unveraendert
  expect(armee(ergaenzeProjekt(p, sd), mre)).toEqual(armee(p, mre))
})

test('Zellen, Kampfbreite, Vorlagen und Verbaende', () => {
  const v = armee(p, mre).vorlagen[0].id
  let q = setzeZelle(p, mre, v, 'unterstuetzung', 0, 2, 'engineer')
  expect(armee(q, mre).vorlagen[0].unterstuetzung).toEqual([null, null, 'engineer', null, null])
  q = setzeZelle(q, mre, v, 'bataillon', 2, 0, 'artillery_brigade')
  expect(armee(q, mre).vorlagen[0].bataillone[2][0]).toBe('artillery_brigade')
  expect(kampfbreite(sd, armee(q, mre).vorlagen[0])).toBe(15)
  let neu
  ;[q, neu] = fuegeVorlageHinzu(q, mre)
  expect(armee(q, mre).vorlagen[1]).toMatchObject({ id: neu, nummer: 2, name: 'Neue Vorlage 2', unterstuetzung: LEER })
  q = aendereVorlage(q, mre, neu, { name: 'Panzer-Division' })
  let vb
  ;[q, vb] = fuegeVerbandHinzu(q, mre, neu)
  expect(armee(q, mre).verbaende[1]).toEqual({ id: vb, vorlage: neu, anzahl: 1, staat: null })
  q = aendereVerband(q, mre, vb, { anzahl: 2, staat: 4 })
  expect(armee(q, mre).verbaende[1]).toMatchObject({ anzahl: 2, staat: 4 })
  expect(armee(entferneVerband(q, mre, vb), mre).verbaende).toHaveLength(1)
  // Review Focus 2: Vorlage loeschen entfernt ihre Verbaende
  expect(armee(entferneVorlage(q, mre, neu), mre).verbaende.map(x => x.vorlage)).toEqual([v])
})
