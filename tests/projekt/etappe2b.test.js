import { test, expect } from 'vitest'
import { miniSpieldaten } from '../hilfe.js'
import { neuesProjekt, ergaenzeProjekt, ladeProjektAusJson } from '../../src/projekt/modell.js'
import { fuegeLandHinzu, aendereLand, kopiereSpielGeist } from '../../src/projekt/aenderungen.js'
import { BONI, bonusAusSpiel, bonusModifier, bonusWertImSpiel } from '../../src/projekt/boni.js'
import { fuegeEigenschaftHinzu, aendereEigenschaft, entferneEigenschaft } from '../../src/projekt/eigenschaften.js'
import { eigenschaftKennung } from '../../src/erzeuger/kennungen.js'

const sd = await miniSpieldaten()
const land = (p, id) => p.laender.find(l => l.id === id)

test('sieben neue feste Boni', () => {
  const neu = { konsumgueter: 'consumer_goods_factor', ausbildungszeit: 'training_time_factor', bau_zivilfabrik: 'production_speed_industrial_complex_factor',
    bau_militaerfabrik: 'production_speed_arms_factory_factor', rohstoffe: 'local_resources_factor', politische_macht_prozent: 'political_power_factor',
    rekruten_prozent: 'conscription_factor' }
  for (const [art, modifier] of Object.entries(neu)) expect(BONI.find(b => b.art === art)).toMatchObject({ modifier, einheit: 'prozent' })
  expect(BONI.find(b => b.art === 'bau_zivilfabrik')).toMatchObject({ min: -50, max: 100 })
})

test('freie Boni und Umrechnung aus dem Spiel', () => {
  expect(bonusAusSpiel('army_speed_factor', 0.1)).toEqual({ art: 'frei', modifier: 'army_speed_factor', wert: 0.1 })
  expect(bonusAusSpiel('consumer_goods_factor', -0.05)).toEqual({ art: 'konsumgueter', wert: -5 })
  expect(bonusAusSpiel('political_power_gain', 0.25)).toEqual({ art: 'politische_macht', wert: 0.25 })
  expect(bonusWertImSpiel({ art: 'frei', modifier: 'x', wert: 0.1 })).toBe(0.1)
  expect(bonusModifier({ art: 'frei', modifier: 'x', wert: 1 })).toBe('x')
  expect(bonusModifier({ art: 'konsumgueter', wert: 1 })).toBe('consumer_goods_factor')
})

test('Spielgeist als Vorlage kopieren', () => {
  const [p, id] = kopiereSpielGeist(neuesProjekt('M'), sd, 'schweizer_neutralitaet')
  expect(p.ideen.find(g => g.id === id)).toMatchObject({ name: 'Kopie von Schweizer Neutralität', beschreibung: 'Wir bleiben draussen.',
    bild: { art: 'spiel', sprite: 'GFX_idea_generic_army' }, boni: [{ art: 'konsumgueter', wert: -5 }, { art: 'stabilitaet', wert: 10 }] })
})

test('neue und geaenderte Laender haben die neuen Felder', () => {
  let [p, mre] = fuegeLandHinzu(neuesProjekt('M'), sd, 'neu')
  expect(land(p, mre)).toMatchObject({ spielIdeen: [], startwerte: { rekruten: 0, bevoelkerung: 0 },
    anfuehrer: { eigenschaften: [], modus: 'neu' }, diplomatie: { marionetten: [], meinungen: [], vertraege: [], fraktion: null, kriegsziele: [] } })
  let fra, swi
  ;[p, fra] = fuegeLandHinzu(p, sd, 'geaendert', 'FRA')
  ;[p, swi] = fuegeLandHinzu(p, sd, 'geaendert', 'SWI')
  expect(land(p, fra).diplomatie.marionetten).toEqual([{ tag: 'SWI', autonomie: 'autonomy_dominion' }])
  expect(land(p, swi).diplomatie.marionetten).toEqual([])
  expect(land(p, fra).aendern.diplomatie).toBe(false)
})

test('altes Projekt wird ergaenzt (Review Focus 1)', () => {
  const alt = {
    id: 'x', formatVersion: 1, mod: neuesProjekt('A').mod, ideen: [], bilder: {}, zaehler: { geist: 1 },
    laender: [{ id: 'l1', art: 'geaendert', tag: 'FRA', startwerte: { stabilitaet: 50, kriegsunterstuetzung: 20, forschungsplaetze: 3 },
      anfuehrer: { name: 'X', unterideologie: 'conservatism', bild: { art: 'spiel', pfad: null } }, ideen: [], staaten: [],
      aendern: { name: false, farbe: false, flagge: false, gebiet: false, regierung: false, anfuehrer: false, startwerte: false, geister: false } }],
  }
  const p = ergaenzeProjekt(alt)
  expect(p).toMatchObject({ eigenschaften: [], fokusbaeume: [], zaehler: { geist: 1, baum: 0, fokus: 0, fraktion: 0, eigenschaft: 0 } })
  expect(p.laender[0]).toMatchObject({ spielIdeen: [], startwerte: { stabilitaet: 50, rekruten: 0, bevoelkerung: 0 },
    anfuehrer: { name: 'X', eigenschaften: [], modus: 'neu' }, aendern: { diplomatie: false },
    diplomatie: { marionetten: null, meinungen: [], vertraege: [], fraktion: null, kriegsziele: [] } })
  const mitSd = ergaenzeProjekt(alt, sd)
  expect(mitSd.laender[0].diplomatie.marionetten).toEqual([{ tag: 'SWI', autonomie: 'autonomy_dominion' }])
  expect(ladeProjektAusJson(JSON.stringify(alt)).eigenschaften).toEqual([])
})

test('eigene Eigenschaften', () => {
  let [p, mre] = fuegeLandHinzu(neuesProjekt('Mein Reich'), sd, 'neu')
  let e
  ;[p, e] = fuegeEigenschaftHinzu(p)
  p = aendereEigenschaft(p, e, { name: 'Eiserner Wille' })
  expect(p.eigenschaften[0]).toEqual({ id: e, nummer: 1, name: 'Eiserner Wille', beschreibung: '', boni: [] })
  expect(eigenschaftKennung(p, p.eigenschaften[0])).toBe('mein_reich_eigenschaft_1')
  p = aendereLand(p, sd, mre, { anfuehrer: { ...land(p, mre).anfuehrer, eigenschaften: [{ art: 'eigen', id: e }, { art: 'spiel', id: 'war_monger' }] } })
  const ohne = entferneEigenschaft(p, e)
  expect(ohne.eigenschaften).toEqual([])
  expect(land(ohne, mre).anfuehrer.eigenschaften).toEqual([{ art: 'spiel', id: 'war_monger' }])
})
