import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { fuegeEventHinzu, aendereEvent } from '../../src/projekt/events.js'
import { fuegeKategorieHinzu, aendereKategorie, entferneKategorie, fuegeEntscheidungHinzu, aendereEntscheidung } from '../../src/projekt/entscheidungen.js'
import { fuegeBildHinzu } from '../../src/projekt/aenderungen.js'
import { neueWirkung, neueBedingung } from '../../src/bausteine/erzeugen.js'
import { parseParadox, finde, findeAlle, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'
import { leseDds } from '../../src/leser/dds.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const KATEGORIEN = m + 'common/decisions/categories/mein_reich_categories.txt'
const ENTSCHEIDUNGEN = m + 'common/decisions/mein_reich_decisions.txt'
const mit = (b, werte) => ({ ...b, werte: { ...b.werte, ...werte } })
const wert = (inhalt, schluessel) => wertText(finde(inhalt, schluessel)?.wert)

function aufbau() {
  let p = testprojekt(sd)
  let ev, kat, d1, d2, bild
  ;[p, ev] = fuegeEventHinzu(p, sd)
  p = aendereEvent(p, ev, { titel: 'Volksfest' })
  ;[p, kat] = fuegeKategorieHinzu(p, sd)
  p = aendereKategorie(p, kat, { name: 'Reformen', beschreibung: 'Grosse Pläne.', laender: ['MRE', 'GER'] })
  ;[p, d1] = fuegeEntscheidungHinzu(p, sd)
  p = aendereEntscheidung(p, d1, { name: 'Armee reformieren', beschreibung: 'Neue Ordnung.', kosten: 75, dauer: 30,
    sichtbar: { modus: 'alle', liste: [mit(neueBedingung('merker'), { merker: 'Armee Reform' })] },
    wirkungen: [mit(neueWirkung('event'), { event: ev })], wirkungenEnde: [mit(neueWirkung('stabilitaet'), { prozent: 5 })] })
  ;[p, bild] = fuegeBildHinzu(p, { breite: 10, hoehe: 10, rgba: new Uint8ClampedArray(400).fill(255) })
  ;[p, d2] = fuegeEntscheidungHinzu(p, sd, { art: 'spiel', id: 'political_actions' })
  p = aendereEntscheidung(p, d2, { name: 'Steuern', nurEinmal: false, wartezeit: 60, laender: ['MRE'], symbol: { art: 'eigen', bildId: bild },
    wirkungen: [mit(neueWirkung('politische_macht'), { menge: 20 })] })
  return { p, kat, d1, d2 }
}

const lies = (dateien, pfad) => parseParadox(text(dateien, pfad), { streng: true }).eintraege

test('eigene Kategorie mit Laendern', () => {
  const { dateien, fehler } = erzeugeMod(aufbau().p, sd)
  expect(fehler).toEqual([])
  const kat = finde(lies(dateien, KATEGORIEN), 'mein_reich_kategorie_1').wert.inhalt
  expect(wert(kat, 'icon')).toBe('generic_political_actions')
  expect(findeAlle(finde(finde(kat, 'allowed').wert.inhalt, 'OR').wert.inhalt, 'tag').map(x => x.wert.text)).toEqual(['MRE', 'GER'])
  const de = parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege
  expect([de.get('mein_reich_kategorie_1'), de.get('mein_reich_kategorie_1_desc')]).toEqual(['Reformen', 'Grosse Pläne.'])
  expect([de.get('mein_reich_entscheidung_1'), de.get('mein_reich_entscheidung_1_desc')]).toEqual(['Armee reformieren', 'Neue Ordnung.'])
})

test('Kategorie ohne Laender hat kein allowed; ein Land ohne OR', () => {
  let { p, kat } = aufbau()
  expect(finde(finde(lies(erzeugeMod(aendereKategorie(p, kat, { laender: [] }), sd).dateien, KATEGORIEN), 'mein_reich_kategorie_1').wert.inhalt, 'allowed')).toBeUndefined()
  const allowed = finde(finde(lies(erzeugeMod(aendereKategorie(p, kat, { laender: ['MRE'] }), sd).dateien, KATEGORIEN), 'mein_reich_kategorie_1').wert.inhalt, 'allowed').wert.inhalt
  expect(wert(allowed, 'tag')).toBe('MRE')
})

test('Entscheidung mit Dauer in eigener Kategorie', () => {
  const { dateien } = erzeugeMod(aufbau().p, sd)
  const eintraege = lies(dateien, ENTSCHEIDUNGEN)
  expect(eintraege.map(x => x.schluessel)).toEqual(['mein_reich_kategorie_1', 'political_actions'])
  const d = finde(finde(eintraege, 'mein_reich_kategorie_1').wert.inhalt, 'mein_reich_entscheidung_1').wert.inhalt
  expect([wert(d, 'icon'), wert(d, 'cost'), wert(d, 'days_remove'), wert(d, 'fire_only_once')]).toEqual(['generic_industry', '75', '30', 'yes'])
  expect(wert(finde(finde(d, 'complete_effect').wert.inhalt, 'country_event').wert.inhalt, 'id')).toBe('mein_reich.1')
  expect(wert(finde(d, 'remove_effect').wert.inhalt, 'add_stability')).toBe('0.05')
  expect(wert(finde(d, 'visible').wert.inhalt, 'has_country_flag')).toBe('mein_reich_armee_reform')
  expect(finde(d, 'available')).toBeUndefined()
  expect(finde(d, 'allowed')).toBeUndefined()
  expect(finde(d, 'days_re_enable')).toBeUndefined()
  expect(wert(finde(d, 'ai_will_do').wert.inhalt, 'factor')).toBe('1')
})

test('wiederholbare Entscheidung in Spielkategorie mit eigenem Symbol', () => {
  const { dateien, fehler } = erzeugeMod(aufbau().p, sd)
  expect(fehler).toEqual([])
  const d = finde(finde(lies(dateien, ENTSCHEIDUNGEN), 'political_actions').wert.inhalt, 'mein_reich_entscheidung_2').wert.inhalt
  expect(wert(d, 'days_re_enable')).toBe('60')
  expect(finde(d, 'fire_only_once')).toBeUndefined()
  expect(finde(d, 'days_remove')).toBeUndefined()
  expect(finde(d, 'remove_effect')).toBeUndefined()
  expect(wert(finde(d, 'complete_effect').wert.inhalt, 'add_political_power')).toBe('20')
  expect(wert(finde(d, 'allowed').wert.inhalt, 'tag')).toBe('MRE')
  expect(wert(d, 'icon')).toBe('mein_reich_entscheidung_2')
  const gfx = text(dateien, m + 'interface/mein_reich_decisions.gfx')
  parseParadox(gfx, { streng: true })
  expect(gfx).toContain('"GFX_decision_mein_reich_entscheidung_2"')
  const dds = leseDds(dateien.find(x => x.pfad === m + 'gfx/interface/decisions/mein_reich_entscheidung_2.dds').inhalt)
  expect([dds.breite, dds.hoehe]).toEqual([32, 32])
})

test('eigenes Kategorie-Symbol', () => {
  let { p, kat } = aufbau()
  let bild
  ;[p, bild] = fuegeBildHinzu(p, { breite: 4, hoehe: 4, rgba: new Uint8ClampedArray(64).fill(9) })
  const { dateien, fehler } = erzeugeMod(aendereKategorie(p, kat, { symbol: { art: 'eigen', bildId: bild } }), sd)
  expect(fehler).toEqual([])
  expect(wert(finde(lies(dateien, KATEGORIEN), 'mein_reich_kategorie_1').wert.inhalt, 'icon')).toBe('mein_reich_kategorie_1')
  expect(text(dateien, m + 'interface/mein_reich_decisions.gfx')).toContain('"GFX_decision_category_mein_reich_kategorie_1"')
  expect(dateien.some(x => x.pfad === m + 'gfx/interface/decisions/mein_reich_kategorie_1.dds')).toBe(true)
})

test('Review Focus 4: geloeschte Kategorie ueberspringt ihre Entscheidungen', () => {
  let { p, kat } = aufbau()
  const { dateien, fehler } = erzeugeMod(entferneKategorie(p, kat), sd)
  expect(fehler).toEqual([])
  expect(dateien.some(x => x.pfad === KATEGORIEN)).toBe(false)
  expect(lies(dateien, ENTSCHEIDUNGEN).map(x => x.schluessel)).toEqual(['political_actions'])
  expect(text(dateien, ENTSCHEIDUNGEN)).not.toContain('mein_reich_entscheidung_1')
})

test('ohne Entscheidungen keine Dateien; unbekanntes Symbol wird gemeldet', () => {
  expect(erzeugeMod(testprojekt(sd), sd).dateien.some(x => x.pfad.includes('/decisions/'))).toBe(false)
  let { p, d1 } = aufbau()
  expect(erzeugeMod(aendereEntscheidung(p, d1, { symbol: { art: 'spiel', sprite: 'GFX_decision_gibtsnicht' } }), sd).fehler.some(f => f.includes('GFX_decision_gibtsnicht'))).toBe(true)
})
