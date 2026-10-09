import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { fuegeEventHinzu, aendereEvent, aendereAntwort, fuegeAntwortHinzu } from '../../src/projekt/events.js'
import { fuegeBaumHinzu, fuegeFokusHinzu, aendereFokus } from '../../src/projekt/fokus.js'
import { fuegeBildHinzu } from '../../src/projekt/aenderungen.js'
import { neueWirkung, neueBedingung } from '../../src/bausteine/erzeugen.js'
import { parseParadox, finde, findeAlle, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'
import { leseDds } from '../../src/leser/dds.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const PFAD = m + 'events/mein_reich_events.txt'
const mit = (b, werte) => ({ ...b, werte: { ...b.werte, ...werte } })

function aufbau() {
  let p = testprojekt(sd)
  let e1, e2, e3, bild
  ;[p, e1] = fuegeEventHinzu(p, sd)
  ;[p, e2] = fuegeEventHinzu(p, sd)
  ;[p, e3] = fuegeEventHinzu(p, sd)
  ;[p, bild] = fuegeBildHinzu(p, { breite: 10, hoehe: 10, rgba: new Uint8ClampedArray(400).fill(255) })
  p = aendereEvent(p, e1, { titel: 'Volksfest', text: 'Das Volk feiert.' })
  p = fuegeAntwortHinzu(p, e1)
  const [a, b] = p.events[0].antworten
  p = aendereAntwort(p, e1, a.id, { text: 'Feiern', kiProzent: 80, wirkungen: [mit(neueWirkung('politische_macht'), { menge: 25 })] })
  p = aendereAntwort(p, e1, b.id, { text: 'Absagen', kiProzent: 20 })
  p = aendereEvent(p, e2, { titel: 'Grenzstreit', text: 'Ärger.', ausloeser: 'datum', land: 'MRE', datum: '1937.1.1',
    bedingungen: { modus: 'alle', liste: [mit(neueBedingung('stabilitaet'), { vergleich: '>', prozent: 50 })] } })
  p = aendereEvent(p, e3, { titel: 'Unruhe', text: 'Hm.', ausloeser: 'zufall', land: 'GER', tage: 120, nurEinmal: false, bild: { art: 'eigen', bildId: bild } })
  return { p, e1, e2, e3 }
}

const lies = (dateien) => parseParadox(text(dateien, PFAD), { streng: true }).eintraege
const eventMit = (dateien, id) => findeAlle(lies(dateien), 'country_event').map(x => x.wert.inhalt).find(ev => wertText(finde(ev, 'id').wert) === id)
const wert = (inhalt, schluessel) => wertText(finde(inhalt, schluessel)?.wert)

test('Review Focus 1: Namespace und unzitierte Kennung mit Punkt', () => {
  const { dateien, fehler } = erzeugeMod(aufbau().p, sd)
  expect(fehler).toEqual([])
  const eintraege = lies(dateien)
  expect([eintraege[0].schluessel, eintraege[0].wert.text]).toEqual(['add_namespace', 'mein_reich'])
  expect(text(dateien, PFAD)).toContain('\tid = mein_reich.1\n')
  expect(finde(eventMit(dateien, 'mein_reich.1'), 'id').wert.typ).toBe('wort')
})

test('ausgeloestes Event mit zwei Antworten', () => {
  const { dateien } = erzeugeMod(aufbau().p, sd)
  const ev = eventMit(dateien, 'mein_reich.1')
  expect([wert(ev, 'title'), wert(ev, 'desc'), wert(ev, 'picture')]).toEqual(['mein_reich.1.t', 'mein_reich.1.d', 'GFX_report_event_generic_rally'])
  expect(wert(ev, 'is_triggered_only')).toBe('yes')
  expect(finde(ev, 'trigger')).toBeUndefined()
  expect(finde(ev, 'fire_only_once')).toBeUndefined()
  const [a, b] = findeAlle(ev, 'option').map(o => o.wert.inhalt)
  expect(wert(a, 'name')).toBe('mein_reich.1.a')
  expect(wert(finde(a, 'ai_chance').wert.inhalt, 'factor')).toBe('80')
  expect(wert(a, 'add_political_power')).toBe('25')
  expect(wert(b, 'name')).toBe('mein_reich.1.b')
  expect(wert(finde(b, 'ai_chance').wert.inhalt, 'factor')).toBe('20')
})

test('Event an einem Datum', () => {
  const { dateien } = erzeugeMod(aufbau().p, sd)
  const ev = eventMit(dateien, 'mein_reich.2')
  expect(wert(ev, 'fire_only_once')).toBe('yes')
  expect(finde(ev, 'is_triggered_only')).toBeUndefined()
  const ausloeser = finde(ev, 'trigger').wert.inhalt
  expect(wert(ausloeser, 'tag')).toBe('MRE')
  const datum = finde(ausloeser, 'date')
  expect([datum.op, datum.wert.text]).toEqual(['>', '1937.1.1'])
  const stab = finde(ausloeser, 'has_stability')
  expect([stab.op, stab.wert.text]).toEqual(['>', '0.5'])
  expect(wert(finde(ev, 'mean_time_to_happen').wert.inhalt, 'days')).toBe('1')
})

test('zufaelliges Event mit eigenem Bild', () => {
  const { dateien, fehler } = erzeugeMod(aufbau().p, sd)
  expect(fehler).toEqual([])
  const ev = eventMit(dateien, 'mein_reich.3')
  expect(finde(ev, 'fire_only_once')).toBeUndefined()
  expect(wert(finde(ev, 'trigger').wert.inhalt, 'tag')).toBe('GER')
  expect(wert(finde(ev, 'mean_time_to_happen').wert.inhalt, 'days')).toBe('120')
  expect(wert(ev, 'picture')).toBe('GFX_report_event_mein_reich_3')
  const dds = leseDds(dateien.find(d => d.pfad === m + 'gfx/event_pictures/mein_reich_event_3.dds').inhalt)
  expect([dds.breite, dds.hoehe]).toEqual([210, 176])
  const gfx = parseParadox(text(dateien, m + 'interface/mein_reich_events.gfx'), { streng: true }).eintraege
  const sprite = finde(finde(gfx, 'spriteTypes').wert.inhalt, 'spriteType').wert.inhalt
  expect([wert(sprite, 'name'), wert(sprite, 'texturefile')]).toEqual(['GFX_report_event_mein_reich_3', 'gfx/event_pictures/mein_reich_event_3.dds'])
  // nur einmal bei Zufall
  let { p, e3 } = aufbau()
  expect(wert(eventMit(erzeugeMod(aendereEvent(p, e3, { nurEinmal: true }), sd).dateien, 'mein_reich.3'), 'fire_only_once')).toBe('yes')
})

test('Sprachdatei', () => {
  const { dateien } = erzeugeMod(aufbau().p, sd)
  const de = parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege
  expect([de.get('mein_reich.1.t'), de.get('mein_reich.1.d'), de.get('mein_reich.1.a'), de.get('mein_reich.1.b')]).toEqual(['Volksfest', 'Das Volk feiert.', 'Feiern', 'Absagen'])
})

test('Fokus loest Event aus; ohne Events keine Datei; unbekanntes Bild wird gemeldet', () => {
  let { p, e1 } = aufbau()
  let baum, f
  ;[p, baum] = fuegeBaumHinzu(p, 'MRE', 'Baum')
  ;[p, f] = fuegeFokusHinzu(p, sd, baum, 0, 0)
  p = aendereFokus(p, baum, f, { name: 'A', belohnung: [mit(neueWirkung('event'), { event: e1 })] })
  const fokusText = text(erzeugeMod(p, sd).dateien, m + 'common/national_focus/mein_reich_mein_reich_baum_1.txt')
  expect(fokusText).toContain('country_event = {\n\t\t\t\tid = mein_reich.1\n')
  expect(erzeugeMod(testprojekt(sd), sd).dateien.some(d => d.pfad === PFAD)).toBe(false)
  const kaputt = aendereEvent(p, e1, { bild: { art: 'spiel', sprite: 'GFX_report_event_gibtsnicht' } })
  expect(erzeugeMod(kaputt, sd).fehler.some(x => x.includes('GFX_report_event_gibtsnicht'))).toBe(true)
})
