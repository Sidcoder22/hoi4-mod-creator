import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { aendereLand, fuegeLandHinzu } from '../../src/projekt/aenderungen.js'
import { parseParadox, finde, findeAlle, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const land = (p, tag) => p.laender.find(l => l.tag === tag)

function mitDiplomatie(p, tag, diplomatie, aendern = true) {
  const l = land(p, tag)
  return aendereLand(p, sd, l.id, { diplomatie: { ...l.diplomatie, ...diplomatie }, ...(l.art === 'geaendert' ? { aendern: { ...l.aendern, diplomatie: aendern } } : {}) })
}

test('neues Land: Marionette, Meinung, Vertraege, Fraktion, Kriegsziel', () => {
  let p = mitDiplomatie(testprojekt(sd), 'MRE', {
    marionetten: [{ tag: 'SWI', autonomie: 'autonomy_dominion' }],
    meinungen: [{ tag: 'FRA', wert: 50, gegenseitig: true }],
    vertraege: [{ art: 'garantie', tag: 'SWI' }, { art: 'nichtangriffspakt', tag: 'FRA' }],
    fraktion: { art: 'gruenden', name: 'Alpenbund', mitglieder: ['SWI'] },
    kriegsziele: [{ tag: 'GER', art: 'topple_government' }],
  })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const v = text(dateien, m + 'history/countries/MRE - Mein Reich.txt')
  parseParadox(v, { streng: true })
  expect(v.indexOf('puppet = SWI')).toBeGreaterThan(-1)
  expect(v.indexOf('set_autonomy = { target = SWI autonomous_state = autonomy_dominion }')).toBeGreaterThan(v.indexOf('puppet = SWI'))
  expect(v).toContain('add_opinion_modifier = { target = FRA modifier = mein_reich_meinung_p50 }')
  expect(v).toContain('FRA = { add_opinion_modifier = { target = MRE modifier = mein_reich_meinung_p50 } }')
  expect(v).toContain('give_guarantee = SWI')
  expect(v).toContain('diplomatic_relation = { country = FRA relation = non_aggression_pact active = yes }')
  expect(v.indexOf('add_to_faction = SWI')).toBeGreaterThan(v.indexOf('create_faction = mein_reich_fraktion_mre'))
  expect(v).toContain('create_wargoal = { type = topple_government target = GER }')
  const meinung = parseParadox(text(dateien, m + 'common/opinion_modifiers/mein_reich_meinungen.txt'), { streng: true }).eintraege
  expect(wertText(finde(finde(finde(meinung, 'opinion_modifiers').wert.inhalt, 'mein_reich_meinung_p50').wert.inhalt, 'value').wert)).toBe('50')
  const de = parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege
  expect(de.get('mein_reich_fraktion_mre')).toBe('Alpenbund')
  expect(de.get('mein_reich_meinung_p50')).toBe('Beziehung (Mod) +50')
})

test('Freilassen entfernt nur Eintraege auf oberster Ebene (Review Focus 3)', () => {
  let [p] = fuegeLandHinzu(testprojekt(sd), sd, 'geaendert', 'FRA')
  p = mitDiplomatie(p, 'FRA', { marionetten: [] })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  const e = parseParadox(text(dateien, m + 'history/countries/FRA - France.txt'), { streng: true }).eintraege
  expect(findeAlle(e, 'set_autonomy')).toEqual([])
  expect(wertText(finde(finde(e, '1939.1.1').wert.inhalt, 'puppet').wert)).toBe('GER')
  expect(wertText(finde(e, 'capital').wert)).toBe('5')
})

test('Autonomie aendern und ohne Schalter nichts tun', () => {
  let [p] = fuegeLandHinzu(testprojekt(sd), sd, 'geaendert', 'FRA')
  const aus = erzeugeMod(mitDiplomatie(p, 'FRA', { marionetten: [] }, false), sd)
  expect(aus.dateien.some(d => d.pfad.includes('France'))).toBe(false)
  p = mitDiplomatie(p, 'FRA', { marionetten: [{ tag: 'SWI', autonomie: 'autonomy_puppet' }] })
  const v = text(erzeugeMod(p, sd).dateien, m + 'history/countries/FRA - France.txt')
  expect(v).toContain('Mod Creator (mein_reich) ---\nset_autonomy = { target = SWI autonomous_state = autonomy_puppet }')
})

test('Fraktion beitreten schreibt in den Verlauf des Fuehrers', () => {
  let [p] = fuegeLandHinzu(testprojekt(sd), sd, 'geaendert', 'SWI')
  p = mitDiplomatie(p, 'SWI', { fraktion: { art: 'beitreten', anfuehrer: 'GER' } })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(text(dateien, m + 'history/countries/GER - Germany.txt')).toContain('add_to_faction = SWI')
})

test('negative Meinung', () => {
  const p = mitDiplomatie(testprojekt(sd), 'MRE', { meinungen: [{ tag: 'GER', wert: -30, gegenseitig: false }] })
  const { dateien } = erzeugeMod(p, sd)
  expect(text(dateien, m + 'common/opinion_modifiers/mein_reich_meinungen.txt')).toContain('mein_reich_meinung_m30 = {\n\t\tvalue = -30')
  expect(text(dateien, m + 'history/countries/MRE - Mein Reich.txt')).not.toContain('GER = { add_opinion_modifier')
})
