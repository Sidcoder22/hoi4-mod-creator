import { test, expect } from 'vitest'
import { miniSpieldaten, text } from '../hilfe.js'
import { neuesProjekt } from '../../src/projekt/modell.js'
import { fuegeGeistHinzu, aendereGeist, fuegeBildHinzu } from '../../src/projekt/aenderungen.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { parseParadox, finde, findeAlle, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'
import { leseDds } from '../../src/leser/dds.js'

const sd = await miniSpieldaten()

function projektMitGeistern() {
  let p = neuesProjekt('Mein Reich')
  let g1, g2, bild
  ;[p, g1] = fuegeGeistHinzu(p, sd)
  p = aendereGeist(p, g1, { name: 'Alpenfestung', beschreibung: 'Die Berge schützen uns.',
    boni: [{ art: 'stabilitaet', wert: 5 }, { art: 'politische_macht', wert: 0.1 }] })
  ;[p, bild] = fuegeBildHinzu(p, { breite: 10, hoehe: 10, rgba: new Uint8ClampedArray(400).fill(255) })
  ;[p, g2] = fuegeGeistHinzu(p, sd)
  p = aendereGeist(p, g2, { name: 'Eigenes Bild', bild: { art: 'eigen', bildId: bild } })
  return p
}

test('ohne Geister keine Ideen-Datei', () => {
  const { dateien } = erzeugeMod(neuesProjekt('Mein Reich'), sd)
  expect(dateien.some(d => d.pfad.includes('common/ideas'))).toBe(false)
})

test('Geist mit Spielbild und Boni', () => {
  const { dateien, fehler } = erzeugeMod(projektMitGeistern(), sd)
  expect(fehler).toEqual([])
  const e = parseParadox(text(dateien, 'mod/mein_reich/common/ideas/mein_reich_ideas.txt'), { streng: true }).eintraege
  const land = finde(finde(e, 'ideas').wert.inhalt, 'country').wert.inhalt
  const g1 = finde(land, 'mein_reich_geist_1').wert.inhalt
  expect(wertText(finde(g1, 'picture').wert)).toBe('generic_army')
  const mod = finde(g1, 'modifier').wert.inhalt
  expect(wertText(finde(mod, 'stability_factor').wert)).toBe('0.05')
  expect(wertText(finde(mod, 'political_power_gain').wert)).toBe('0.1')
  expect(wertText(finde(g1, 'removal_cost').wert)).toBe('-1')
  const de = parseYml(text(dateien, 'mod/mein_reich/localisation/german/mein_reich_l_german.yml')).eintraege
  expect(de.get('mein_reich_geist_1')).toBe('Alpenfestung')
  expect(de.get('mein_reich_geist_1_desc')).toBe('Die Berge schützen uns.')
  expect(text(dateien, 'mod/mein_reich/localisation/german/mein_reich_l_german.yml')).toContain(' mein_reich_geist_1:0 "Alpenfestung"')
})

test('Geist mit eigenem Bild', () => {
  const { dateien, fehler } = erzeugeMod(projektMitGeistern(), sd)
  expect(fehler).toEqual([])
  const dds = leseDds(dateien.find(d => d.pfad === 'mod/mein_reich/gfx/interface/ideas/mein_reich_geist_2.dds').inhalt)
  expect([dds.breite, dds.hoehe]).toEqual([64, 64])
  const gfx = text(dateien, 'mod/mein_reich/interface/mein_reich_ideas.gfx')
  const sprite = findeAlle(finde(parseParadox(gfx, { streng: true }).eintraege, 'spriteTypes').wert.inhalt, 'spriteType')[0].wert.inhalt
  expect(wertText(finde(sprite, 'name').wert)).toBe('GFX_idea_mein_reich_geist_2')
  expect(wertText(finde(sprite, 'texturefile').wert)).toBe('gfx/interface/ideas/mein_reich_geist_2.dds')
  const e = parseParadox(text(dateien, 'mod/mein_reich/common/ideas/mein_reich_ideas.txt')).eintraege
  const g2 = finde(finde(finde(e, 'ideas').wert.inhalt, 'country').wert.inhalt, 'mein_reich_geist_2').wert.inhalt
  expect(wertText(finde(g2, 'picture').wert)).toBe('mein_reich_geist_2')
  expect(finde(g2, 'modifier').wert.inhalt).toEqual([])
})

test('fehlendes Spielbild wird gemeldet', () => {
  let [p, g] = fuegeGeistHinzu(neuesProjekt('Mein Reich'), sd)
  p = aendereGeist(p, g, { name: 'X', bild: { art: 'spiel', sprite: 'GFX_idea_gibtsnicht' } })
  expect(erzeugeMod(p, sd).fehler.some(f => f.includes('GFX_idea_gibtsnicht'))).toBe(true)
})
