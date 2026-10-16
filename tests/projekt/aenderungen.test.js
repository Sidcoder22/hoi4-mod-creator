import { test, expect } from 'vitest'
import { miniSpieldaten } from '../hilfe.js'
import { neuesProjekt } from '../../src/projekt/modell.js'
import { fuegeLandHinzu, aendereLand, entferneLand, schalteStaat, setzeBeliebtheit, fuegeGeistHinzu, aendereGeist,
  entferneGeist, fuegeBildHinzu, setzeModFeld, alsGespeichert } from '../../src/projekt/aenderungen.js'
import { belegteTags, effektiveBesitzer, landFarbe, landName, verlaufsWerte, hauptstadtVon } from '../../src/projekt/abgeleitet.js'

const sd = await miniSpieldaten()
const land = (p, id) => p.laender.find(l => l.id === id)
const werte = (p, id) => Object.fromEntries(Object.entries(land(p, id).regierung.parteien).map(([k, v]) => [k, v.beliebtheit]))
const summe = (p, id) => Object.values(werte(p, id)).reduce((a, b) => a + b, 0)

test('neues Land mit Vorgaben', () => {
  const [p, id] = fuegeLandHinzu(neuesProjekt('X'), sd, 'neu')
  const l = land(p, id)
  expect(l).toMatchObject({ art: 'neu', tagManuell: false, name: '', farbe: [120, 120, 160], grafikstil: 'western_european',
    staaten: [], hauptstadt: null, kerneAltBesitzerBehalten: true, technikWie: null, armee: { divisionen: 6 }, ideen: [],
    startwerte: { stabilitaet: 50, kriegsunterstuetzung: 20, forschungsplaetze: 3 } })
  expect(l.flagge).toEqual({ art: 'designer', vorlage: 'drei_waagrecht', farben: ['#ffffff', '#3060a0', '#c03030'], symbol: null, symbolFarbe: '#ffd700' })
  expect(l.regierung).toMatchObject({ ideologie: 'neutrality', wahlen: false, wahlintervall: 48 })
  expect(summe(p, id)).toBe(100)
  expect(l.anfuehrer).toEqual({ name: '', unterideologie: 'despotism', bild: { art: 'spiel', pfad: 'gfx/leaders/Europe/portrait_europe_generic_1.dds' }, eigenschaften: [], modus: 'neu' })
  expect(l.tag).toMatch(/^[A-Z][A-Z0-9]{2}$/)
  expect(['GER', 'SWI', 'FRA']).not.toContain(l.tag)
})

test('geaendertes Land vorbefuellt, nicht doppelt', () => {
  const [p, id] = fuegeLandHinzu(neuesProjekt('X'), sd, 'geaendert', 'GER')
  const l = land(p, id)
  expect(l).toMatchObject({ art: 'geaendert', tag: 'GER', name: 'Deutschland', farbe: [75, 75, 75],
    startwerte: { stabilitaet: 60, kriegsunterstuetzung: 30, forschungsplaetze: 4 } })
  expect(l.aendern).toEqual({ name: false, farbe: false, flagge: false, gebiet: false, regierung: false, anfuehrer: false, startwerte: false, geister: false, diplomatie: false, forschung: false })
  expect(l.regierung.ideologie).toBe('fascism')
  expect(werte(p, id)).toEqual({ democratic: 10, communism: 5, fascism: 70, neutrality: 15 })
  expect(l.anfuehrer.unterideologie).toBe('nazism')
  expect(l.anfuehrer.name).toBe('Adolf Hitler')
  expect(fuegeLandHinzu(p, sd, 'geaendert', 'GER')[1]).toBe(id)
  expect(fuegeLandHinzu(p, sd, 'geaendert', 'GER')[0].laender.length).toBe(1)
})

test('setzeBeliebtheit', () => {
  const [p25, id] = fuegeLandHinzu(neuesProjekt('X'), sd, 'neu')
  expect(werte(setzeBeliebtheit(p25, id, 'democratic', 40), id)).toEqual({ democratic: 40, communism: 20, fascism: 20, neutrality: 20 })
  const p100 = setzeBeliebtheit(p25, id, 'democratic', 100)
  expect(werte(p100, id)).toEqual({ democratic: 100, communism: 0, fascism: 0, neutrality: 0 })
  expect(werte(setzeBeliebtheit(p100, id, 'democratic', 70), id)).toEqual({ democratic: 70, communism: 10, fascism: 10, neutrality: 10 })
  expect(summe(setzeBeliebtheit(p25, id, 'fascism', 33), id)).toBe(100)
  expect(summe(setzeBeliebtheit(setzeBeliebtheit(p25, id, 'fascism', 33), id, 'communism', 7), id)).toBe(100)
  expect(werte(setzeBeliebtheit(p25, id, 'fascism', 150), id).fascism).toBe(100)
})

test('schalteStaat und Besitzer', () => {
  let [q, mre] = fuegeLandHinzu(neuesProjekt('X'), sd, 'neu')
  q = schalteStaat(q, mre, 1)
  q = schalteStaat(q, mre, 4)
  expect(land(q, mre)).toMatchObject({ staaten: [1, 4], hauptstadt: 1 })
  const [q2, swi] = fuegeLandHinzu(q, sd, 'geaendert', 'SWI')
  const q3 = schalteStaat(q2, swi, 4)
  expect(land(q3, mre).staaten).toEqual([1])
  expect(effektiveBesitzer(q3, sd).get(4)).toBe('SWI')
  expect(effektiveBesitzer(q, sd).get(2)).toBe('GER')
  expect(effektiveBesitzer(q, sd).get(4)).toBe(land(q, mre).tag)
  const q4 = schalteStaat(q, mre, 1)
  expect(land(q4, mre)).toMatchObject({ staaten: [4], hauptstadt: 4 })
  expect(land(schalteStaat(q4, mre, 4), mre)).toMatchObject({ staaten: [], hauptstadt: null })
})

test('Name ergibt Kuerzel, manuelles Kuerzel bleibt', () => {
  const [q, mre] = fuegeLandHinzu(neuesProjekt('X'), sd, 'neu')
  expect(land(aendereLand(q, sd, mre, { name: 'Mein Reich' }), mre).tag).toBe('MRE')
  const manuell = aendereLand(q, sd, mre, { tag: 'ABC' })
  expect(land(manuell, mre)).toMatchObject({ tag: 'ABC', tagManuell: true })
  expect(land(aendereLand(manuell, sd, mre, { name: 'Mein Reich' }), mre).tag).toBe('ABC')
  expect(entferneLand(q, mre).laender).toEqual([])
})

test('abgeleitete Werte', () => {
  let [q, mre] = fuegeLandHinzu(neuesProjekt('X'), sd, 'neu')
  q = aendereLand(q, sd, mre, { name: 'Mein Reich', farbe: [1, 2, 3] })
  expect(landFarbe('MRE', q, sd)).toEqual([1, 2, 3])
  expect(landName('MRE', q, sd)).toBe('Mein Reich')
  expect(landFarbe('SWI', q, sd)).toEqual([200, 30, 30])
  let [q2, swi] = fuegeLandHinzu(q, sd, 'geaendert', 'SWI')
  q2 = aendereLand(q2, sd, swi, { farbe: [9, 9, 9], name: 'Helvetien' })
  expect(landFarbe('SWI', q2, sd)).toEqual([200, 30, 30])
  expect(landName('SWI', q2, sd)).toBe('Schweiz')
  q2 = aendereLand(q2, sd, swi, { aendern: { ...land(q2, swi).aendern, farbe: true, name: true } })
  expect(landFarbe('SWI', q2, sd)).toEqual([9, 9, 9])
  expect(landName('SWI', q2, sd)).toBe('Helvetien')
  expect([...belegteTags(q2, sd)].sort()).toEqual(['FRA', 'GER', 'MRE', 'SWI'])
  expect(belegteTags(q2, sd, mre).has('MRE')).toBe(false)
  expect(verlaufsWerte(sd, 'GER')).toEqual({ stabilitaet: 60, kriegsunterstuetzung: 30, forschungsplaetze: 4,
    beliebtheiten: { democratic: 10, fascism: 70, communism: 5, neutrality: 15 }, ideologie: 'fascism', wahlen: false,
    letzteWahl: '1933.3.5', wahlintervall: 48 })
  expect(hauptstadtVon('GER', q2, sd)).toBe(1)
  expect(hauptstadtVon('MRE', q2, sd)).toBeNull()
})

test('Geister und Bilder', () => {
  let [p, mre] = fuegeLandHinzu(neuesProjekt('X'), sd, 'neu')
  let g
  ;[p, g] = fuegeGeistHinzu(p, sd)
  expect(p.ideen[0]).toEqual({ id: g, nummer: 1, name: '', beschreibung: '', bild: { art: 'spiel', sprite: 'GFX_idea_generic_army' }, boni: [] })
  p = aendereGeist(p, g, { name: 'Alpenfestung' })
  expect(p.ideen[0].name).toBe('Alpenfestung')
  p = aendereLand(p, sd, mre, { ideen: [g] })
  const ohne = entferneGeist(p, g)
  expect(ohne.ideen).toEqual([])
  expect(land(ohne, mre).ideen).toEqual([])
  const [p2, g2] = fuegeGeistHinzu(ohne, sd)
  expect(p2.ideen[0].nummer).toBe(2)
  expect(g2).not.toBe(g)
  const [p3, bildId] = fuegeBildHinzu(p, { breite: 1, hoehe: 1, rgba: Uint8ClampedArray.from([1, 2, 3, 4]) })
  expect(p3.bilder[bildId]).toEqual({ breite: 1, hoehe: 1, rgba: 'AQIDBA==' })
})

test('setzeModFeld', () => {
  let p = setzeModFeld(neuesProjekt('Alt'), 'name', 'Neuer Name')
  expect(p.mod.modid).toBe('neuer_name')
  p = setzeModFeld(p, 'modid', 'eigen')
  expect(p.mod).toMatchObject({ modid: 'eigen', modidManuell: true })
  expect(setzeModFeld(p, 'name', 'Noch anders').mod.modid).toBe('eigen')
  const gespeichert = { ...neuesProjekt('A'), mod: { ...neuesProjekt('A').mod, gespeichertAls: 'a' } }
  expect(setzeModFeld(gespeichert, 'name', 'B').mod.modid).toBe('a')
})

test('Wahldaten bestehender Laender bleiben erhalten (Review I5)', () => {
  const [p, id] = fuegeLandHinzu(neuesProjekt('X'), sd, 'geaendert', 'SWI')
  expect(land(p, id).regierung).toMatchObject({ wahlen: true, wahlintervall: 36, letzteWahl: '1935.10.27' })
})

test('alsGespeichert setzt gespeichertAls und Spielversion (Review I2b)', () => {
  const p = alsGespeichert(neuesProjekt('Mein Reich'), sd)
  expect(p.mod).toMatchObject({ gespeichertAls: 'mein_reich', spielversion: '1.15.4' })
})
