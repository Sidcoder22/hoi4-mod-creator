import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { erzeugeWirkungen, pruefeBausteine, satzText, neueWirkung, wirkungsDef } from '../../src/bausteine/erzeugen.js'
import { bausteinKontext } from '../../src/erzeuger/baustein-kontext.js'
import { bonusKennung } from '../../src/erzeuger/kennungen.js'
import { schreibeParadox } from '../../src/leser/paradox.js'

const sd = await miniSpieldaten()
const projekt = testprojekt(sd)
const kontext = { projekt, spieldaten: sd }
const gemeldet = []
const k = bausteinKontext({ projekt, sprache: { setze() {} }, bonusGeist: (kennung, daten) => gemeldet.push([kennung, daten]) }, 'quelle')
const text = (eintraege) => schreibeParadox(eintraege)
const b = (() => { const x = neueWirkung('bonus'); return { ...x, werte: { ...x.werte, name: 'Festlaune' } } })()
const mitWerten = (werte) => ({ ...b, werte: { ...b.werte, ...werte } })

test('Vorgaben und Kennung', () => {
  expect(neueWirkung('bonus').werte).toEqual({ name: '', bild: 'GFX_idea_generic_army', boni: [{ art: 'konsumgueter', wert: -10 }], tage: 0 })
  expect(bonusKennung(projekt, 'eabc')).toBe('mein_reich_bonus_eabc')
  expect(k.kennung.bonus(b.id)).toBe(`mein_reich_bonus_${b.id}`)
})

test('dauerhaft und mit Dauer; meldet den Geist', () => {
  gemeldet.length = 0
  expect(text(erzeugeWirkungen([b], k))).toBe(`add_ideas = mein_reich_bonus_${b.id}\n`)
  expect(text(erzeugeWirkungen([mitWerten({ tage: 180 })], k))).toBe(`add_timed_idea = {\n\tidea = mein_reich_bonus_${b.id}\n\tdays = 180\n}\n`)
  expect(gemeldet[0]).toEqual([`mein_reich_bonus_${b.id}`, { name: 'Festlaune', bild: 'GFX_idea_generic_army', boni: [{ art: 'konsumgueter', wert: -10 }] }])
})

test('Satz', () => {
  expect(satzText(wirkungsDef('bonus'), { ...b.werte, tage: 180 }, kontext)).toBe('Bonus «Festlaune»: Konsumgüter -10 % – für 180 Tage')
  expect(satzText(wirkungsDef('bonus'), b.werte, kontext)).toBe('Bonus «Festlaune»: Konsumgüter -10 % – dauerhaft')
})

test('Pruefung', () => {
  expect(pruefeBausteine([b], kontext, 'A')).toEqual([])
  expect(pruefeBausteine([mitWerten({ boni: [] })], kontext, 'A')[0].text).toMatch(/Mindestens ein Bonus fehlt/)
  expect(pruefeBausteine([mitWerten({ boni: [{ art: 'konsumgueter', wert: 99 }] })], kontext, 'A')[0].text).toMatch(/zwischen -50 und 50/)
  expect(pruefeBausteine([mitWerten({ bild: 'GFX_idea_gibtsnicht' })], kontext, 'A')[0].text).toMatch(/Bild fehlt/)
  expect(pruefeBausteine([mitWerten({ name: '' })], kontext, 'A')[0].text).toMatch(/Name/)
  expect(pruefeBausteine([mitWerten({ tage: -1 })], kontext, 'A')[0].text).toMatch(/Dauer/)
  // Review Focus 3
  expect(pruefeBausteine([mitWerten({ boni: [{ art: 'frei', modifier: 'Consumer Goods', wert: 0.1 }] })], kontext, 'A')[0].text).toMatch(/ungültigen Namen/)
})

test('Review: Standardbild faellt auf das erste Geister-Bild des Spiels zurueck', () => {
  expect(neueWirkung('bonus', sd).werte.bild).toBe('GFX_idea_generic_army')
  const ohneArmee = { ...sd, sprites: { GFX_idea_x: 'a.dds' }, ideenBilder: ['GFX_idea_x'] }
  expect(neueWirkung('bonus', ohneArmee).werte.bild).toBe('GFX_idea_x')
  expect(neueWirkung('politische_macht', ohneArmee).werte).toEqual({ menge: 50 })
})
