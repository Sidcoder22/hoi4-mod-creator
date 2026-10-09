import { test, expect } from 'vitest'
import { miniSpieldaten, text, testprojekt } from '../hilfe.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { fuegeBaumHinzu, fuegeFokusHinzu, aendereFokus } from '../../src/projekt/fokus.js'
import { fuegeEventHinzu, aendereEvent, aendereAntwort } from '../../src/projekt/events.js'
import { fuegeEntscheidungHinzu, aendereEntscheidung } from '../../src/projekt/entscheidungen.js'
import { neueWirkung } from '../../src/bausteine/erzeugen.js'
import { parseParadox, finde, wertText } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'

const sd = await miniSpieldaten()
const m = 'mod/mein_reich/'
const IDEEN = m + 'common/ideas/mein_reich_ideas.txt'
const bonus = (werte) => { const x = neueWirkung('bonus'); return { ...x, werte: { ...x.werte, name: 'Festlaune', ...werte } } }
const ideen = (dateien) => finde(finde(parseParadox(text(dateien, IDEEN), { streng: true }).eintraege, 'ideas').wert.inhalt, 'country').wert.inhalt

function mitFokus(wirkung) {
  let p = testprojekt(sd)
  let baum, f
  ;[p, baum] = fuegeBaumHinzu(p, 'MRE', 'Baum')
  ;[p, f] = fuegeFokusHinzu(p, sd, baum, 0, 0)
  return aendereFokus(p, baum, f, { name: 'A', belohnung: [wirkung] })
}

test('Fokus mit Bonus fuer 180 Tage', () => {
  const w = bonus({ tage: 180 })
  const { dateien, fehler } = erzeugeMod(mitFokus(w), sd)
  expect(fehler).toEqual([])
  expect(text(dateien, m + 'common/national_focus/mein_reich_mein_reich_baum_1.txt')).toContain(`add_timed_idea = {\n\t\t\t\tidea = mein_reich_bonus_${w.id}\n\t\t\t\tdays = 180\n`)
  const liste = ideen(dateien)
  expect(liste.map(x => x.schluessel)).toEqual(['mein_reich_geist_1', `mein_reich_bonus_${w.id}`])
  const geist = liste[1].wert.inhalt
  expect(wertText(finde(geist, 'picture').wert)).toBe('generic_army')
  expect(wertText(finde(geist, 'removal_cost').wert)).toBe('-1')
  expect(wertText(finde(finde(geist, 'modifier').wert.inhalt, 'consumer_goods_factor').wert)).toBe('-0.1')
  const de = parseYml(text(dateien, m + 'localisation/german/mein_reich_l_german.yml')).eintraege
  expect(de.get(`mein_reich_bonus_${w.id}`)).toBe('Festlaune')
})

test('Review Focus 2: nur Bonus-Bausteine, keine eigenen Geister', () => {
  let p = testprojekt(sd)
  p = { ...p, ideen: [], laender: p.laender.map(l => ({ ...l, ideen: [] })) }
  let ev
  ;[p, ev] = fuegeEventHinzu(p, sd)
  p = aendereEvent(p, ev, { titel: 'T', text: 't' })
  const w = bonus({})
  p = aendereAntwort(p, ev, p.events[0].antworten[0].id, { wirkungen: [w] })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(ideen(dateien).map(x => x.schluessel)).toEqual([`mein_reich_bonus_${w.id}`])
})

test('Review Focus 1: dieselbe Wirkung zweimal ergibt einen Geist', () => {
  const w = bonus({})
  let p = mitFokus(w)
  let ent
  ;[p, ent] = fuegeEntscheidungHinzu(p, sd)
  p = aendereEntscheidung(p, ent, { name: 'D', wirkungen: [w] })
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(ideen(dateien).filter(x => x.schluessel === `mein_reich_bonus_${w.id}`)).toHaveLength(1)
})

test('Bonus bei einem anderen Land', () => {
  const w = bonus({})
  const beiLand = { ...neueWirkung('bei_land'), werte: { land: 'GER' }, wirkungen: [w] }
  const { dateien } = erzeugeMod(mitFokus(beiLand), sd)
  expect(text(dateien, m + 'common/national_focus/mein_reich_mein_reich_baum_1.txt')).toContain(`GER = {\n\t\t\t\tadd_ideas = mein_reich_bonus_${w.id}\n`)
})
