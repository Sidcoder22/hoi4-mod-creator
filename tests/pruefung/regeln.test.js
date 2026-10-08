import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { pruefeProjekt, hatFehler } from '../../src/pruefung/regeln.js'
import { fuegeLandHinzu, aendereLand, schalteStaat, aendereGeist, setzeModFeld } from '../../src/projekt/aenderungen.js'

const sd = await miniSpieldaten()
const regeln = (p) => pruefeProjekt(p, sd).map(m => m.regel)

function gueltig() {
  let p = testprojekt(sd)
  const id = p.laender[0].id
  p = schalteStaat(p, id, 1)
  p = schalteStaat(p, id, 2)
  return aendereLand(p, sd, id, { hauptstadt: 2 })
}
const g = gueltig()
const id = g.laender[0].id
const land = (patch) => aendereLand(g, sd, id, patch)
const l0 = g.laender[0]

test('gueltiges Projekt hat keine Meldungen', () => {
  expect(regeln(g)).toEqual([])
  expect(hatFehler(pruefeProjekt(g, sd))).toBe(false)
})

const FAELLE = [
  ['mod-name', () => setzeModFeld(g, 'name', '')],
  ['modid', () => setzeModFeld(g, 'modid', 'Böse Id')],
  ['land-name', () => land({ name: '' })],
  ['tag-format', () => land({ tag: 'ab' })],
  ['tag-format', () => land({ tag: 'AND' })],
  ['tag-format', () => land({ tag: 'D07' })],
  ['tag-belegt', () => land({ tag: 'GER' })],
  ['land-doppelt', () => ({ ...g, laender: [...g.laender, { ...l0, id: 'zweites' }] })],
  ['ohne-staaten', () => land({ staaten: [], hauptstadt: null })],
  ['ohne-hauptstadt', () => land({ hauptstadt: null })],
  ['hauptstadt-fremd', () => land({ hauptstadt: 3 })],
  ['beliebtheit', () => land({ regierung: { ...l0.regierung, parteien: { ...l0.regierung.parteien, democratic: { ...l0.regierung.parteien.democratic, beliebtheit: 90 } } } })],
  ['staat-doppelt', () => { const [p, zwei] = fuegeLandHinzu(g, sd, 'neu'); return aendereLand(p, sd, zwei, { name: 'Zwei', staaten: [4], hauptstadt: 4 }) }],
  ['anfuehrer-ideologie', () => land({ anfuehrer: { ...l0.anfuehrer, unterideologie: 'nazism' } })],
  ['geist-verweis', () => land({ ideen: ['gibtsnicht'] })],
  ['geist-name', () => aendereGeist(g, g.ideen[0].id, { name: '' })],
  ['geist-bild-unbekannt', () => aendereGeist(g, g.ideen[0].id, { bild: { art: 'spiel', sprite: 'GFX_idea_gibtsnicht' } })],
  ['bild-fehlt', () => land({ flagge: { art: 'bild', bildId: 'weg' } })],
  ['bild-fehlt', () => land({ anfuehrer: { ...l0.anfuehrer, bild: { art: 'eigen', bildId: 'weg' } } })],
  ['ohne-anfuehrer', () => land({ anfuehrer: { ...l0.anfuehrer, name: '' } })],
  ['geist-beschreibung', () => aendereGeist(g, g.ideen[0].id, { beschreibung: '' })],
  ['spielversion', () => setzeModFeld(g, 'spielversion', '1.14.0')],
  ['modid-geaendert', () => setzeModFeld(g, 'gespeichertAls', 'alt_name')],
  ['start-1939', () => fuegeLandHinzu(g, sd, 'geaendert', 'FRA')[0]],
]

for (const [regel, erzeuge] of FAELLE) {
  test(`Regel ${regel}`, () => {
    expect(regeln(erzeuge())).toContain(regel)
  })
}

test('Schwere: Fehler und Hinweise', () => {
  const hinweise = ['land-verschwindet', 'ohne-anfuehrer', 'geist-beschreibung', 'spielversion', 'modid-geaendert', 'start-1939']
  for (const [regel, erzeuge] of FAELLE) {
    const m = pruefeProjekt(erzeuge(), sd).find(x => x.regel === regel)
    expect(m.schwere, regel).toBe(hinweise.includes(regel) ? 'hinweis' : 'fehler')
    expect(typeof m.text).toBe('string')
    expect(m.ziel.bereich).toMatch(/^(einstellungen|land|geist)$/)
  }
})

test('Hauptstadt verloren mit Behebung', () => {
  const p = testprojekt(sd)
  const meldung = pruefeProjekt(p, sd).find(m => m.regel === 'hauptstadt-verloren')
  expect(meldung.text).toContain('Deutschland')
  expect(meldung.text).toContain('Brandenburg')
  expect(meldung.behebung.text).toContain('Bayern')
  const behoben = meldung.behebung.anwenden(p, sd)
  const ger = behoben.laender.find(l => l.tag === 'GER')
  expect(ger).toMatchObject({ art: 'geaendert', hauptstadt: 2 })
  expect(ger.aendern.gebiet).toBe(true)
  expect(regeln(behoben)).not.toContain('hauptstadt-verloren')
  expect(hatFehler(pruefeProjekt(behoben, sd))).toBe(false)
})

test('Land verliert alle Staaten', () => {
  let p = testprojekt(sd)
  p = schalteStaat(p, p.laender[0].id, 2)
  const r = regeln(p)
  expect(r).not.toContain('hauptstadt-verloren')
  expect(r).toContain('land-verschwindet')
})

test('geaendertes Land ohne Gebietsaenderung zaehlt nicht doppelt', () => {
  const [p, swi] = fuegeLandHinzu(g, sd, 'geaendert', 'SWI')
  const q = aendereLand(p, sd, swi, { staaten: [2] })
  expect(regeln(q)).not.toContain('staat-doppelt')
})

// ---- Etappe 2: Fokusbaeume und Bausteine ----
import { fuegeBaumHinzu, fuegeFokusHinzu, aendereFokus, setzeVoraussetzung, entferneFokus } from '../../src/projekt/fokus.js'
import { neueWirkung, neueBedingung } from '../../src/bausteine/erzeugen.js'
import { entferneLand } from '../../src/projekt/aenderungen.js'

const mitWerten = (b, werte) => ({ ...b, werte: { ...b.werte, ...werte } })

function mitBaum() {
  let p = gueltig()
  let baum, a, b
  ;[p, baum] = fuegeBaumHinzu(p, 'MRE', 'Baum')
  ;[p, a] = fuegeFokusHinzu(p, sd, baum, 0, 0)
  ;[p, b] = fuegeFokusHinzu(p, sd, baum, 0, 1)
  p = aendereFokus(p, baum, a, { name: 'A', beschreibung: 'a', belohnung: [mitWerten(neueWirkung('politische_macht'), { menge: 50 })] })
  p = aendereFokus(p, baum, b, { name: 'B', beschreibung: 'b', belohnung: [mitWerten(neueWirkung('politische_macht'), { menge: 50 })],
    verfuegbar: { modus: 'alle', liste: [mitWerten(neueBedingung('fokus_erledigt'), { fokus: a })] } })
  p = setzeVoraussetzung(p, baum, a, b, true)
  return { p, baum, a, b }
}

test('gueltiges Projekt mit Fokusbaum hat keine Meldungen', () => {
  expect(regeln(mitBaum().p)).toEqual([])
})

const FOKUS_FAELLE = [
  ['baum-land', ({ p, baum }) => ({ ...p, fokusbaeume: p.fokusbaeume.map(x => (x.id === baum ? { ...x, land: 'XYZ' } : x)) })],
  ['baum-doppelt', ({ p }) => fuegeBaumHinzu(p, 'MRE', 'Zweiter')[0]],
  ['baum-leer', ({ p }) => fuegeBaumHinzu(p, 'GER', 'Leer')[0]],
  ['fokus-name', ({ p, baum, a }) => aendereFokus(p, baum, a, { name: '' })],
  ['fokus-ueberlappung', ({ p, baum, b }) => aendereFokus(p, baum, b, { x: 0, y: 0 })],
  ['fokus-kreis', ({ p, baum, a, b }) => setzeVoraussetzung(p, baum, b, a, true)],
  ['fokus-verweis', ({ p, baum, b }) => aendereFokus(p, baum, b, { voraussetzungen: ['weg'] })],
  ['fokus-symbol', ({ p, baum, a }) => aendereFokus(p, baum, a, { symbol: { art: 'spiel', sprite: 'GFX_goal_gibtsnicht' } })],
  ['fokus-symbol', ({ p, baum, a }) => aendereFokus(p, baum, a, { symbol: { art: 'eigen', bildId: 'weg' } })],
  ['baustein', ({ p, baum, a }) => aendereFokus(p, baum, a, { belohnung: [mitWerten(neueWirkung('staat_bekommen'), { staat: 999 })] })],
  ['baustein', ({ p, baum, a }) => aendereFokus(p, baum, a, { belohnung: [mitWerten(neueWirkung('code'), { code: 'x = {' })] })],
  ['baustein', ({ p, baum, a }) => aendereFokus(p, baum, a, { belohnung: [mitWerten(neueWirkung('code'), { code: 'x = "ä"' })] })],
  ['fokus-ohne-belohnung', ({ p, baum, a }) => aendereFokus(p, baum, a, { belohnung: [] })],
  ['fokus-beschreibung', ({ p, baum, a }) => aendereFokus(p, baum, a, { beschreibung: '' })],
]

for (const [regel, erzeuge] of FOKUS_FAELLE) {
  test(`Fokus-Regel ${regel}`, () => {
    const m = pruefeProjekt(erzeuge(mitBaum()), sd).filter(x => x.regel === regel)
    expect(m.length).toBeGreaterThan(0)
    expect(m[0].schwere).toBe(['baum-leer', 'fokus-ohne-belohnung', 'fokus-beschreibung'].includes(regel) ? 'hinweis' : 'fehler')
    expect(m[0].ziel.bereich).toBe('fokus')
  })
}

test('Bedingung auf geloeschten Fokus ist ein Fehler (Review Focus 2)', () => {
  const { p, baum, a } = mitBaum()
  const m = pruefeProjekt(entferneFokus(p, baum, a), sd).filter(x => x.regel === 'baustein')
  expect(m.length).toBe(1)
  expect(m[0].text).toContain('Fokus «B»')
  expect(m[0].ziel.fokus).toBeTruthy()
})

test('Baum ohne Land nach Loeschen des Landes (Review Focus 5)', () => {
  const { p } = mitBaum()
  const ohne = entferneLand(p, p.laender.find(l => l.tag === 'MRE').id)
  expect(regeln(ohne)).toContain('baum-land')
})

// ---- Etappe 2b ----
import { fuegeEigenschaftHinzu, aendereEigenschaft } from '../../src/projekt/eigenschaften.js'

const mre = (p) => p.laender.find(l => l.tag === 'MRE')
const mitMre = (p, patch) => aendereLand(p, sd, mre(p).id, typeof patch === 'function' ? patch(mre(p)) : patch)
const dipl = (p, d) => mitMre(p, (l) => ({ diplomatie: { ...l.diplomatie, ...d } }))

test('Etappe 2b: gueltiges Projekt mit Diplomatie hat keine neuen Meldungen', () => {
  let p = dipl(gueltig(), { marionetten: [{ tag: 'FRA', autonomie: 'autonomy_dominion' }], meinungen: [{ tag: 'FRA', wert: 50, gegenseitig: true }],
    vertraege: [{ art: 'garantie', tag: 'FRA' }], fraktion: { art: 'gruenden', name: 'Bund', mitglieder: ['SWI'] }, kriegsziele: [{ tag: 'GER', art: 'annex_everything' }] })
  p = mitMre(p, (l) => ({ spielIdeen: ['deutsche_industrie'], anfuehrer: { ...l.anfuehrer, eigenschaften: [{ art: 'spiel', id: 'war_monger' }] } }))
  expect(regeln(p)).toEqual([])
})

const ETAPPE2B_FAELLE = [
  ['bonus-name', () => aendereGeist(g, g.ideen[0].id, { boni: [{ art: 'frei', modifier: 'Consumer Goods', wert: 0.1 }] })],
  ['bonus-unbekannt', () => aendereGeist(g, g.ideen[0].id, { boni: [{ art: 'frei', modifier: 'gibts_nicht_factor', wert: 0.1 }] })],
  ['bonus-wert', () => aendereGeist(g, g.ideen[0].id, { boni: [{ art: 'stabilitaet', wert: 500 }] })],
  ['spielgeist-fehlt', () => mitMre(g, { spielIdeen: ['gibtsnicht'] })],
  ['eigenschaft-name', () => fuegeEigenschaftHinzu(g)[0]],
  ['eigenschaft-fehlt', () => mitMre(g, (l) => ({ anfuehrer: { ...l.anfuehrer, eigenschaften: [{ art: 'spiel', id: 'gibtsnicht' }] } }))],
  ['eigenschaft-fehlt', () => mitMre(g, (l) => ({ anfuehrer: { ...l.anfuehrer, eigenschaften: [{ art: 'eigen', id: 'weg' }] } }))],
  ['diplomatie-ziel', () => dipl(g, { kriegsziele: [{ tag: 'XYZ', art: 'annex_everything' }] })],
  ['diplomatie-ziel', () => dipl(g, { vertraege: [{ art: 'garantie', tag: 'MRE' }] })],
  ['diplomatie-doppelt', () => dipl(g, { meinungen: [{ tag: 'FRA', wert: 50 }, { tag: 'FRA', wert: -20 }] })],
  ['diplomatie-doppelt', () => dipl(g, { kriegsziele: [{ tag: 'GER', art: 'annex_everything' }, { tag: 'GER', art: 'topple_government' }] })],
  // SWI ist im Spiel schon Dominion von FRA
  ['marionette-doppelt', () => dipl(g, { marionetten: [{ tag: 'SWI', autonomie: 'autonomy_puppet' }] })],
  ['fraktion-ohne', () => dipl(g, { fraktion: { art: 'beitreten', anfuehrer: 'FRA' } })],
  ['fraktion-doppelt', () => {
    let [p, fraId] = fuegeLandHinzu(dipl(g, { fraktion: { art: 'gruenden', name: 'A', mitglieder: ['SWI'] } }), sd, 'geaendert', 'FRA')
    const fra = p.laender.find(l => l.id === fraId)
    return aendereLand(p, sd, fraId, { diplomatie: { ...fra.diplomatie, fraktion: { art: 'gruenden', name: 'B', mitglieder: ['SWI'] } }, aendern: { ...fra.aendern, diplomatie: true } })
  }],
  ['diplomatie-ohne-staaten', () => {
    let p = mitMre(g, (l) => ({ staaten: [...l.staaten, 1] }))
    return dipl(p, { meinungen: [{ tag: 'GER', wert: 10 }] })
  }],
]

for (const [regel, erzeuge] of ETAPPE2B_FAELLE) {
  test(`Etappe 2b Regel ${regel}`, () => {
    const m = pruefeProjekt(erzeuge(), sd).filter(x => x.regel === regel)
    expect(m.length).toBeGreaterThan(0)
    expect(m[0].schwere).toBe(['bonus-unbekannt', 'diplomatie-ohne-staaten'].includes(regel) ? 'hinweis' : 'fehler')
  })
}

test('Beitreten zu einer Fraktion aus dem Spiel ist erlaubt', () => {
  expect(regeln(dipl(gueltig(), { fraktion: { art: 'beitreten', anfuehrer: 'GER' } }))).not.toContain('fraktion-ohne')
})
