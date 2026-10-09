import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { pruefeProjekt } from '../../src/pruefung/regeln.js'
import { aendereLand, schalteStaat } from '../../src/projekt/aenderungen.js'
import { fuegeEventHinzu, aendereEvent, entferneEvent, aendereAntwort, fuegeAntwortHinzu, entferneAntwort } from '../../src/projekt/events.js'
import { fuegeKategorieHinzu, aendereKategorie, entferneKategorie, fuegeEntscheidungHinzu, aendereEntscheidung } from '../../src/projekt/entscheidungen.js'
import { fuegeBaumHinzu, fuegeFokusHinzu, aendereFokus } from '../../src/projekt/fokus.js'
import { neueWirkung, neueBedingung } from '../../src/bausteine/erzeugen.js'

const sd = await miniSpieldaten()
const mit = (b, werte) => ({ ...b, werte: { ...b.werte, ...werte } })
const ausloesen = (eventId) => mit(neueWirkung('event'), { event: eventId })

/** Gueltiges Projekt: Event «Volksfest», das die Entscheidung «Armee reformieren» in der Kategorie «Reformen» ausloest. */
function gueltig() {
  let p = testprojekt(sd)
  const landId = p.laender[0].id
  p = aendereLand(schalteStaat(schalteStaat(p, landId, 1), landId, 2), sd, landId, { hauptstadt: 2 })
  let ev, kat, ent
  ;[p, ev] = fuegeEventHinzu(p, sd)
  p = aendereEvent(p, ev, { titel: 'Volksfest', text: 'Das Volk feiert.' })
  ;[p, kat] = fuegeKategorieHinzu(p, sd)
  p = aendereKategorie(p, kat, { name: 'Reformen', laender: ['MRE'] })
  ;[p, ent] = fuegeEntscheidungHinzu(p, sd)
  p = aendereEntscheidung(p, ent, { name: 'Armee reformieren', beschreibung: 'Neu.', wirkungen: [ausloesen(ev)] })
  return { p, ev, kat, ent }
}
const { p: g, ev, kat, ent } = gueltig()
const meldungen = (p) => pruefeProjekt(p, sd)
const regeln = (p) => meldungen(p).map(m => m.regel)
const event = (patch) => aendereEvent(g, ev, patch)
const antwortId = g.events[0].antworten[0].id

test('gueltiges Projekt mit Event, Kategorie und Entscheidung hat keine Meldungen', () => {
  expect(regeln(g)).toEqual([])
})

const FAELLE = [
  ['event-titel', () => event({ titel: ' ' }), { bereich: 'event', id: ev }],
  ['event-ohne-antwort', () => entferneAntwort(g, ev, antwortId), { bereich: 'event', id: ev }],
  ['antwort-text', () => aendereAntwort(g, ev, antwortId, { text: '' }), { bereich: 'event', id: ev }],
  ['event-land', () => event({ ausloeser: 'datum', land: '' }), { bereich: 'event', id: ev }],
  ['event-land', () => event({ ausloeser: 'zufall', land: 'XYZ' }), { bereich: 'event', id: ev }],
  ['event-datum', () => event({ ausloeser: 'datum', land: 'MRE', datum: '1937..1' }), { bereich: 'event', id: ev }],
  ['event-datum', () => event({ ausloeser: 'datum', land: 'MRE', datum: '..' }), { bereich: 'event', id: ev }],
  ['event-bild', () => event({ bild: { art: 'spiel', sprite: 'GFX_report_event_gibtsnicht' } }), { bereich: 'event', id: ev }],
  ['event-bild', () => event({ bild: { art: 'eigen', bildId: 'weg' } }), { bereich: 'event', id: ev }],
  ['baustein', () => aendereAntwort(g, ev, antwortId, { wirkungen: [mit(neueWirkung('staat_bekommen'), { staat: 999 })] }), { bereich: 'event', id: ev }],
  ['baustein', () => event({ ausloeser: 'zufall', land: 'MRE', bedingungen: { modus: 'alle', liste: [mit(neueBedingung('geist'), { geist: 'weg' })] } }), { bereich: 'event', id: ev }],
  ['event-text', () => event({ text: '' }), { bereich: 'event', id: ev }],
  ['kategorie-name', () => aendereKategorie(g, kat, { name: '' }), { bereich: 'kategorie', id: kat }],
  ['kategorie-symbol', () => aendereKategorie(g, kat, { symbol: { art: 'spiel', sprite: 'GFX_decision_category_weg' } }), { bereich: 'kategorie', id: kat }],
  ['kategorie-land', () => aendereKategorie(g, kat, { laender: ['XYZ'] }), { bereich: 'kategorie', id: kat }],
  ['kategorie-leer', () => fuegeKategorieHinzu(g, sd)[0], null],
  ['entscheidung-name', () => aendereEntscheidung(g, ent, { name: '' }), { bereich: 'entscheidung', id: ent }],
  ['entscheidung-kategorie', () => aendereEntscheidung(g, ent, { kategorie: { art: 'spiel', id: 'gibt_es_nicht' } }), { bereich: 'entscheidung', id: ent }],
  ['entscheidung-symbol', () => aendereEntscheidung(g, ent, { symbol: { art: 'eigen', bildId: 'weg' } }), { bereich: 'entscheidung', id: ent }],
  ['entscheidung-land', () => aendereEntscheidung(g, ent, { laender: ['XYZ'] }), { bereich: 'entscheidung', id: ent }],
  ['baustein', () => aendereEntscheidung(g, ent, { verfuegbar: { modus: 'alle', liste: [mit(neueBedingung('ist_land'), { land: 'XYZ' })] } }), { bereich: 'entscheidung', id: ent }],
  ['baustein', () => aendereEntscheidung(g, ent, { dauer: 10, wirkungenEnde: [mit(neueWirkung('geist_hinzu'), { geist: 'weg' })] }), { bereich: 'entscheidung', id: ent }],
  ['entscheidung-beschreibung', () => aendereEntscheidung(g, ent, { beschreibung: '' }), { bereich: 'entscheidung', id: ent }],
]

for (const [regel, bau, ziel] of FAELLE) {
  test(`Regel ${regel}`, () => {
    const m = meldungen(bau()).filter(x => x.regel === regel)
    expect(m.length).toBeGreaterThan(0)
    if (ziel) expect(m[0].ziel).toEqual(ziel)
  })
}

test('Entscheidung ohne Wirkung ist ein Hinweis; Dauer ohne Wirkung am Ende zaehlt nicht', () => {
  const ohne = aendereEntscheidung(g, ent, { wirkungen: [] })
  const m = meldungen(ohne)
  expect(m.find(x => x.regel === 'entscheidung-ohne-wirkung')).toMatchObject({ schwere: 'hinweis', ziel: { bereich: 'entscheidung', id: ent } })
  expect(regeln(aendereEntscheidung(ohne, ent, { dauer: 10, wirkungenEnde: [mit(neueWirkung('stabilitaet'), { prozent: 5 })] }))).not.toContain('entscheidung-ohne-wirkung')
  // Wirkung am Ende ohne Dauer kommt nicht ins Spiel
  expect(regeln(aendereEntscheidung(ohne, ent, { dauer: 0, wirkungenEnde: [mit(neueWirkung('stabilitaet'), { prozent: 5 })] }))).toContain('entscheidung-ohne-wirkung')
})

test('Event wird nie ausgeloest (Hinweis), aber nicht bei Datum oder Zufall', () => {
  const ohne = aendereEntscheidung(g, ent, { wirkungen: [mit(neueWirkung('politische_macht'), { menge: 5 })] })
  expect(meldungen(ohne).find(x => x.regel === 'event-nie')).toMatchObject({ schwere: 'hinweis', ziel: { bereich: 'event', id: ev } })
  expect(regeln(aendereEvent(ohne, ev, { ausloeser: 'datum', land: 'MRE' }))).not.toContain('event-nie')
  // Ein Event, das nur sich selbst ausloest, wird trotzdem nie ausgeloest
  expect(regeln(aendereAntwort(ohne, ev, antwortId, { wirkungen: [ausloesen(ev)] }))).toContain('event-nie')
})

test('Review Focus 3: verschachtelt ausgeloest zaehlt', () => {
  let p = aendereEntscheidung(g, ent, { wirkungen: [] })
  let baum, f
  ;[p, baum] = fuegeBaumHinzu(p, 'MRE', 'Baum')
  ;[p, f] = fuegeFokusHinzu(p, sd, baum, 0, 0)
  const beiLand = { ...mit(neueWirkung('bei_land'), { land: 'GER' }), wirkungen: [ausloesen(ev)] }
  p = aendereFokus(p, baum, f, { name: 'A', beschreibung: 'b', belohnung: [beiLand] })
  expect(regeln(p)).not.toContain('event-nie')
  const nurEnde = aendereEntscheidung(g, ent, { dauer: 10, wirkungen: [mit(neueWirkung('stabilitaet'), { prozent: 1 })], wirkungenEnde: [ausloesen(ev)] })
  expect(regeln(nurEnde)).not.toContain('event-nie')
  // Ein anderes Event loest es aus
  let q = aendereEntscheidung(g, ent, { wirkungen: [mit(neueWirkung('stabilitaet'), { prozent: 1 })] })
  let ev2
  ;[q, ev2] = fuegeEventHinzu(q, sd)
  q = aendereEvent(q, ev2, { titel: 'Start', text: 't', ausloeser: 'datum', land: 'MRE' })
  q = aendereAntwort(q, ev2, q.events[1].antworten[0].id, { wirkungen: [ausloesen(ev)] })
  expect(regeln(q)).not.toContain('event-nie')
})

test('Review Focus 2: geloeschtes Event, auf das ein Fokus zeigt', () => {
  let p = g
  let baum, f
  ;[p, baum] = fuegeBaumHinzu(p, 'MRE', 'Baum')
  ;[p, f] = fuegeFokusHinzu(p, sd, baum, 0, 0)
  p = aendereFokus(p, baum, f, { name: 'A', beschreibung: 'b', belohnung: [ausloesen(ev)] })
  const m = meldungen(entferneEvent(p, ev)).filter(x => x.regel === 'baustein')
  expect(m.map(x => x.ziel.bereich)).toEqual(expect.arrayContaining(['fokus', 'entscheidung']))
  expect(m.some(x => x.text.includes('Event wurde gelöscht'))).toBe(true)
})

test('Review Focus 4: geloeschte Kategorie', () => {
  const m = meldungen(entferneKategorie(g, kat)).find(x => x.regel === 'entscheidung-kategorie')
  expect(m).toMatchObject({ schwere: 'fehler', ziel: { bereich: 'entscheidung', id: ent } })
})

test('Event mit vier Antworten ist gueltig', () => {
  let p = fuegeAntwortHinzu(fuegeAntwortHinzu(fuegeAntwortHinzu(g, ev), ev), ev)
  for (const a of p.events[0].antworten) p = aendereAntwort(p, ev, a.id, { text: a.text || 'Ja' })
  expect(regeln(p)).toEqual([])
})

test('Event-Datum zaehlt nur beim Ausloeser «An einem Datum»', () => {
  expect(regeln(event({ ausloeser: 'datum', land: 'MRE', datum: '1937.1.1' }))).not.toContain('event-datum')
  expect(regeln(event({ ausloeser: 'zufall', land: 'MRE', datum: '..' }))).not.toContain('event-datum')
  expect(meldungen(event({ ausloeser: 'datum', land: 'MRE', datum: '1937.13.1' })).find(x => x.regel === 'event-datum')).toMatchObject({ schwere: 'fehler' })
})

test('Etappe 3b: Laufzeit-Boni werden nur mit Dauer geprueft und zaehlen als Wirkung', () => {
  const falsch = aendereEntscheidung(g, ent, { dauer: 10, boniLaufzeit: [{ art: 'stabilitaet', wert: 99 }] })
  expect(meldungen(falsch).find(x => x.regel === 'bonus-wert')).toMatchObject({ schwere: 'fehler', ziel: { bereich: 'entscheidung', id: ent } })
  expect(regeln(aendereEntscheidung(falsch, ent, { dauer: 0 }))).not.toContain('bonus-wert')
  const nurBonus = aendereEntscheidung(g, ent, { wirkungen: [], dauer: 10, boniLaufzeit: [{ art: 'stabilitaet', wert: 5 }] })
  expect(regeln(nurBonus)).not.toContain('entscheidung-ohne-wirkung')
  expect(regeln(aendereEntscheidung(nurBonus, ent, { dauer: 0 }))).toContain('entscheidung-ohne-wirkung')
})
