import 'fake-indexeddb/auto'
import { test, expect } from 'vitest'
import { oeffneDb, alleProjekte, ladeProjekt, speichereProjekt, loescheProjekt, speichereSpieldaten, ladeSpieldaten, ladeSpielfokus, ladeBild, merke, hole, loescheDb } from '../../src/speicher/indexeddb.js'
import { neuesProjekt } from '../../src/projekt/modell.js'

test('Projekte speichern, auflisten, laden, loeschen', async () => {
  const db = await oeffneDb('test-projekte')
  const p = neuesProjekt('Mein Reich')
  await speichereProjekt(db, p)
  const liste = await alleProjekte(db)
  expect(liste.length).toBe(1)
  expect(liste[0]).toMatchObject({ id: p.id, name: 'Mein Reich' })
  expect(typeof liste[0].geaendert).toBe('number')
  expect(await ladeProjekt(db, p.id)).toEqual(p)
  await loescheProjekt(db, p.id)
  expect(await alleProjekte(db)).toEqual([])
  expect(await ladeProjekt(db, p.id)).toBeNull()
  db.close()
})

test('Spieldaten und Bilder', async () => {
  const db = await oeffneDb('test-spieldaten')
  expect(await ladeSpieldaten(db)).toBeNull()
  const karte = { breite: 2, hoehe: 1, staatIndex: Uint16Array.from([1, 0]), staatIds: [0, 5] }
  await speichereSpieldaten(db, { spieldaten: { version: '1.15.4' }, karte, bilder: new Map([['flagge:SWI', { breite: 1 }]]) })
  const geladen = await ladeSpieldaten(db)
  expect(geladen.spieldaten.version).toBe('1.15.4')
  expect(geladen.karte.staatIndex).toBeInstanceOf(Uint16Array)
  expect([...geladen.karte.staatIndex]).toEqual([1, 0])
  expect(await ladeBild(db, 'flagge:SWI')).toEqual({ breite: 1 })
  await speichereSpieldaten(db, { spieldaten: { version: '1.16.0' }, karte, bilder: new Map([['flagge:GER', { breite: 2 }]]) })
  expect(await ladeBild(db, 'flagge:SWI')).toBeNull()
  expect(await ladeBild(db, 'flagge:GER')).toEqual({ breite: 2 })
  db.close()
})

test('Einstellungen merken', async () => {
  const db = await oeffneDb('test-einstellungen')
  expect(await hole(db, 'zielordner')).toBeNull()
  await merke(db, 'zielordner', { name: 'x' })
  expect(await hole(db, 'zielordner')).toEqual({ name: 'x' })
  db.close()
  await loescheDb('test-einstellungen')
  const neu = await oeffneDb('test-einstellungen')
  expect(await hole(neu, 'zielordner')).toBeNull()
  neu.close()
})

test('Etappe 4f: Fokusbaeume des Spiels getrennt speichern', async () => {
  const db = await oeffneDb('test-spielfokus')
  expect(await ladeSpielfokus(db)).toBeNull()
  const karte = { breite: 1, hoehe: 1, staatIndex: Uint16Array.from([0]), staatIds: [0] }
  const spielfokus = { baeume: { a: { id: 'a', fokusse: [] } }, geteilt: {} }
  await speichereSpieldaten(db, { spieldaten: { version: '1' }, karte, bilder: new Map(), spielfokus })
  expect(await ladeSpielfokus(db)).toEqual(spielfokus)
  expect((await ladeSpieldaten(db)).spielfokus).toBeUndefined()
  db.close()
})
