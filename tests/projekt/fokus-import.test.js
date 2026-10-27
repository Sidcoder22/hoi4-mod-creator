import { test, expect } from 'vitest'
import { erstelleMiniSpielordner } from '../../src/selbsttest/mini-spielordner.js'
import { dateiquelleAusObjekt } from '../../src/leser/dateiquelle.js'
import { leseSpielordner } from '../../src/leser/spielordner.js'
import { neuesProjekt } from '../../src/projekt/modell.js'
import { importiereSpielbaum } from '../../src/projekt/fokus-import.js'
import { setzeVoraussetzung, verschiebeFokus, entferneFokus, aendereFokus } from '../../src/projekt/fokus.js'

const { spieldaten: sd, spielfokus } = await leseSpielordner(dateiquelleAusObjekt(erstelleMiniSpielordner()))
const [p, baumId] = importiereSpielbaum(neuesProjekt('M'), sd, spielfokus, 'german_focus', 'aendern')
const baum = (q = p, id = baumId) => q.fokusbaeume.find(b => b.id === id)
const f = (spielId, q = p, id = baumId) => baum(q, id).fokusse.find(x => (x.spielId ?? x.spielName) === spielId || x.spielName === spielId)
const idVon = (spielId) => f(spielId).id
const ohneId = (w) => ({ art: w.art, werte: w.werte, ...(w.ausSpiel ? { ausSpiel: true } : {}) })

test('aendern: Baum mit Herkunft und gesperrtem geteiltem Fokus', () => {
  expect(baum()).toMatchObject({ land: 'GER', name: 'Deutschland (aus dem Spiel)',
    herkunft: { art: 'aendern', spielId: 'german_focus', datei: 'common/national_focus/germany.txt', geteilt: ['SHARED_army'], vonLand: 'GER' } })
  expect(baum().herkunft.spielFokusIds.sort()).toEqual(['GER_anschluss', 'GER_army', 'GER_kreis_a', 'GER_kreis_b', 'GER_navy', 'GER_rhineland'])
  expect(baum().fokusse).toHaveLength(7)
  const geteilt = baum().fokusse.find(x => x.gesperrt)
  expect(geteilt).toMatchObject({ spielId: 'SHARED_army', name: 'Heeresreform', x: 2, y: 0, symbol: { art: 'spiel', sprite: 'GFX_goal_generic_army_doctrines' } })
  expect(new Set(baum().fokusse.map(x => x.nummer)).size).toBe(7)
})

test('Belohnungen und Bedingungen werden uebersetzt', () => {
  const r = f('GER_rhineland')
  expect(r).toMatchObject({ spielId: 'GER_rhineland', spielName: 'Rheinland', name: 'Rheinland', beschreibung: 'Zurück an den Rhein.', kiGewicht: null, x: 5, y: 0, dauer: 10 })
  expect(r.weitere).toContain('search_filters')
  expect(r.belohnung.map(ohneId)).toEqual([
    { art: 'politische_macht', werte: { menge: 120 } },
    { art: 'stabilitaet', werte: { prozent: 5 } },
    { art: 'code', werte: { code: 'GER = {\n\tadd_state_core = 1\n}\n' }, ausSpiel: true },
  ])
  expect(f('GER_anschluss').verfuegbar.modus).toBe('alle')
  expect(f('GER_anschluss').verfuegbar.liste.map(b => [b.art, b.werte, !!b.ausSpiel, b.nicht])).toEqual([
    ['fokus_erledigt', { fokus: idVon('GER_rhineland') }, false, false],
    ['code', { code: 'is_puppet = no\n' }, true, false],
  ])
  expect(f('GER_army').belohnung.map(ohneId)).toEqual([{ art: 'erfahrung', werte: { teilstreitkraft: 'army_experience', menge: 10 } }])
  expect(f('GER_navy').belohnung.map(ohneId)).toEqual([{ art: 'spielgeist_hinzu', werte: { spielgeist: 'deutsche_industrie' } }])
})

test('Review Focus 2/4: Voraussetzungs-Gruppen, geteilter Fokus, Ausschluss', () => {
  const army = f('GER_army')
  const geteilt = baum().fokusse.find(x => x.gesperrt).id
  expect(army.voraussetzungsGruppen).toEqual([[idVon('GER_rhineland')], [idVon('GER_anschluss'), geteilt]])
  expect(army.voraussetzungen.sort()).toEqual([idVon('GER_rhineland'), idVon('GER_anschluss'), geteilt].sort())
  expect(f('GER_anschluss')).toMatchObject({ voraussetzungen: [idVon('GER_rhineland')], voraussetzungsArt: 'alle', voraussetzungsGruppen: null })
  expect(f('GER_navy').ausschluss).toEqual([idVon('GER_rhineland')])
  expect(f('GER_rhineland').ausschluss).toEqual([idVon('GER_navy')])
  const q = setzeVoraussetzung(p, baumId, idVon('GER_navy'), army.id, true)
  expect(f('GER_army', q).voraussetzungsGruppen).toBeNull()
  expect(f('GER_army', aendereFokus(p, baumId, army.id, { voraussetzungsArt: 'eine' })).voraussetzungsGruppen).toBeNull()
})

test('gesperrte Fokusse lassen sich nicht verschieben oder loeschen', () => {
  const geteilt = baum().fokusse.find(x => x.gesperrt).id
  expect(verschiebeFokus(p, baumId, geteilt, 7, 7)).toBe(p)
  expect(entferneFokus(p, baumId, geteilt)).toBe(p)
})

test('vorlage fuer FRA', () => {
  const [q, id] = importiereSpielbaum(p, sd, spielfokus, 'german_focus', 'vorlage', 'FRA')
  const b = baum(q, id)
  expect(b).toMatchObject({ land: 'FRA', herkunft: { art: 'vorlage', spielId: 'german_focus', vonLand: 'GER', geteilt: ['SHARED_army'] } })
  expect(b.fokusse.filter(x => !x.gesperrt).every(x => x.spielId === undefined)).toBe(true)
  expect(b.fokusse.find(x => x.gesperrt).spielId).toBe('SHARED_army')
  expect(b.fokusse.find(x => x.spielName === 'Rheinland').belohnung[0].art).toBe('politische_macht')
  expect(new Set([...baum(q).fokusse, ...b.fokusse].map(x => x.nummer)).size).toBe(14)
})
