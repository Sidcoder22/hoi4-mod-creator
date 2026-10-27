import { test, expect } from 'vitest'
import { erstelleMiniSpielordner } from '../../src/selbsttest/mini-spielordner.js'
import { dateiquelleAusObjekt } from '../../src/leser/dateiquelle.js'
import { leseSpielordner } from '../../src/leser/spielordner.js'
import { text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { importiereSpielbaum } from '../../src/projekt/fokus-import.js'
import { aendereFokus, fuegeFokusHinzu } from '../../src/projekt/fokus.js'
import { parseParadox, finde, findeAlle, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'

const { spieldaten: sd, spielfokus } = await leseSpielordner(dateiquelleAusObjekt(erstelleMiniSpielordner()))
const m = 'mod/mein_reich/'
const wert = (inhalt, k) => wertText(finde(inhalt, k)?.wert)
const baumInhalt = (dateien, pfad) => finde(parseParadox(text(dateien, pfad), { streng: true }).eintraege, 'focus_tree').wert.inhalt
const fokusMit = (baum, id) => findeAlle(baum, 'focus').map(f => f.wert.inhalt).find(f => wert(f, 'id') === id)

function geaenderterBaum() {
  let [p, baumId] = importiereSpielbaum(testprojekt(sd), sd, spielfokus, 'german_focus', 'aendern')
  const anschluss = p.fokusbaeume.find(b => b.id === baumId).fokusse.find(f => f.spielId === 'GER_anschluss')
  p = aendereFokus(p, baumId, anschluss.id, { name: 'Anschluss' })
  let neu
  ;[p, neu] = fuegeFokusHinzu(p, sd, baumId, 0, 5)
  p = aendereFokus(p, baumId, neu, { name: 'Neu', beschreibung: 'Ganz neu.' })
  return { p, baumId, neu }
}

test('aendern: gleicher Pfad, Spielkennungen, Einstellungen des Spiels', () => {
  const { p, baumId, neu } = geaenderterBaum()
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const b = baumInhalt(dateien, m + 'common/national_focus/germany.txt')
  expect(wert(b, 'id')).toBe('german_focus')
  expect(findeAlle(b, 'country')).toHaveLength(1)
  expect(findeAlle(b, 'continuous_focus_position')).toHaveLength(1)
  expect(wert(b, 'default')).toBe('no')
  expect(findeAlle(b, 'shared_focus').map(x => x.wert.text)).toEqual(['SHARED_army'])
  const ids = findeAlle(b, 'focus').map(f => wert(f.wert.inhalt, 'id'))
  const nummer = p.fokusbaeume.find(x => x.id === baumId).fokusse.find(f => f.id === neu).nummer
  expect(ids.sort()).toEqual(['GER_anschluss', 'GER_army', 'GER_kreis_a', 'GER_kreis_b', 'GER_navy', 'GER_rhineland', `mein_reich_fokus_${nummer}`].sort())
  const r = fokusMit(b, 'GER_rhineland')
  expect(finde(r, 'search_filters')).toBeTruthy()
  expect(wert(finde(r, 'ai_will_do').wert.inhalt, 'factor')).toBe('5')
  expect(findeAlle(r, 'ai_will_do')).toHaveLength(1)
  const belohnung = finde(r, 'completion_reward').wert.inhalt
  expect(wert(belohnung, 'add_political_power')).toBe('120')
  expect(wert(finde(belohnung, 'GER').wert.inhalt, 'add_state_core')).toBe('1')
  expect(wert(fokusMit(b, 'GER_anschluss'), 'x')).toBe('6')
})

test('Review Focus 2/4: Voraussetzungs-Gruppen mit geteiltem Fokus', () => {
  const { p } = geaenderterBaum()
  const b = baumInhalt(erzeugeMod(p, sd).dateien, m + 'common/national_focus/germany.txt')
  const vor = findeAlle(fokusMit(b, 'GER_army'), 'prerequisite').map(v => findeAlle(v.wert.inhalt, 'focus').map(x => x.wert.text))
  expect(vor).toEqual([['GER_rhineland'], ['GER_anschluss', 'SHARED_army']])
  expect(findeAlle(fokusMit(b, 'GER_navy'), 'mutually_exclusive').flatMap(v => findeAlle(v.wert.inhalt, 'focus').map(x => x.wert.text))).toEqual(['GER_rhineland'])
})

test('Review Focus 3: nur geaenderte Namen im Ersatz-Ordner', () => {
  const { p, baumId, neu } = geaenderterBaum()
  const { dateien } = erzeugeMod(p, sd)
  const ersatz = parseYml(text(dateien, m + 'localisation/german/replace/mein_reich_replace_l_german.yml')).eintraege
  expect(ersatz.get('GER_anschluss')).toBe('Anschluss')
  expect(ersatz.has('GER_rhineland')).toBe(false)
  const normal = parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege
  expect(normal.has('GER_rhineland')).toBe(false)
  expect(normal.has('GER_anschluss')).toBe(false)
  const nummer = p.fokusbaeume.find(x => x.id === baumId).fokusse.find(f => f.id === neu).nummer
  expect(normal.get(`mein_reich_fokus_${nummer}`)).toBe('Neu')
})

test('vorlage fuer FRA: eigener Baum mit neuen Kennungen', () => {
  const [p, baumId] = importiereSpielbaum(testprojekt(sd), sd, spielfokus, 'german_focus', 'vorlage', 'FRA')
  const baum = p.fokusbaeume.find(b => b.id === baumId)
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const b = baumInhalt(dateien, m + `common/national_focus/mein_reich_mein_reich_baum_${baum.nummer}.txt`)
  expect(wert(finde(finde(b, 'country').wert.inhalt, 'modifier').wert.inhalt, 'tag')).toBe('FRA')
  expect(findeAlle(b, 'shared_focus').map(x => x.wert.text)).toEqual(['SHARED_army'])
  const ids = findeAlle(b, 'focus').map(f => wert(f.wert.inhalt, 'id'))
  expect(ids.every(id => id.startsWith('mein_reich_fokus_'))).toBe(true)
  expect(ids).toHaveLength(6)
  const rhein = baum.fokusse.find(f => f.spielName === 'Rheinland')
  const army = fokusMit(b, `mein_reich_fokus_${baum.fokusse.find(f => f.spielName === 'GER_army').nummer}`)
  expect(findeAlle(army, 'prerequisite').map(v => findeAlle(v.wert.inhalt, 'focus').map(x => x.wert.text))[1]).toContain('SHARED_army')
  const normal = parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege
  expect(normal.get(`mein_reich_fokus_${rhein.nummer}`)).toBe('Rheinland')
  expect(normal.has('SHARED_army')).toBe(false)
})

test('Review: Sonderzeichen im Spielcode sperren weder Pruefung noch Speichern', async () => {
  const { pruefeProjekt } = await import('../../src/pruefung/regeln.js')
  const o = erstelleMiniSpielordner()
  o['common/national_focus/germany.txt'] = o['common/national_focus/germany.txt']
    .replace('search_filters = { FOCUS_FILTER_POLITICAL }', 'search_filters = { FOCUS_FILTER_POLITICAL }\n\t\tcompletion_tooltip = "Rückkehr"')
    .replace('add_political_power = 120', 'add_political_power = 120\n\t\t\tlog = "Rückkehr"')
  const daten = await leseSpielordner(dateiquelleAusObjekt(o))
  const [p] = importiereSpielbaum(testprojekt(daten.spieldaten), daten.spieldaten, daten.spielfokus, 'german_focus', 'aendern')
  const { dateien, fehler } = erzeugeMod(p, daten.spieldaten)
  expect(fehler).toEqual([])
  expect(text(dateien, m + 'common/national_focus/germany.txt')).toContain('log = "Rückkehr"')
  expect(pruefeProjekt(p, daten.spieldaten).filter(x => x.schwere === 'fehler' && (x.regel === 'baustein' || x.regel.startsWith('fokus')))).toEqual([])
})
