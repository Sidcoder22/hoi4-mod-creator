import { test, expect } from 'vitest'
import { miniSpieldaten } from '../hilfe.js'
import { neuesProjekt } from '../../src/projekt/modell.js'
import { fuegeKategorieHinzu, aendereKategorie, entferneKategorie, fuegeEntscheidungHinzu, aendereEntscheidung, entferneEntscheidung,
  entscheidungenIn } from '../../src/projekt/entscheidungen.js'

const sd = await miniSpieldaten()

test('neue Kategorie mit Vorgaben', () => {
  const [p, kat] = fuegeKategorieHinzu(neuesProjekt('M'), sd)
  expect(p.kategorien[0]).toEqual({ id: kat, nummer: 1, name: '', beschreibung: '',
    symbol: { art: 'spiel', sprite: 'GFX_decision_category_generic_political_actions' }, laender: [] })
  expect(fuegeKategorieHinzu(neuesProjekt('M'), {})[0].kategorien[0].symbol.sprite).toBe('GFX_decision_category_generic_political_actions')
  expect(aendereKategorie(p, kat, { name: 'Reformen', laender: ['MRE'] }).kategorien[0]).toMatchObject({ name: 'Reformen', laender: ['MRE'] })
})

test('neue Entscheidung: Kategorie-Vorgaben', () => {
  let [p, kat] = fuegeKategorieHinzu(neuesProjekt('M'), sd)
  let ent
  ;[p, ent] = fuegeEntscheidungHinzu(p, sd)
  expect(p.entscheidungen[0]).toMatchObject({ id: ent, nummer: 1, name: '', beschreibung: '', kategorie: { art: 'eigen', id: kat },
    symbol: { art: 'spiel', sprite: 'GFX_decision_generic_industry' }, kosten: 50, nurEinmal: true, wartezeit: 30, dauer: 0, laender: [],
    sichtbar: { modus: 'alle', liste: [] }, verfuegbar: { modus: 'alle', liste: [] }, wirkungen: [], wirkungenEnde: [], kiGewicht: 1 })
  expect(fuegeEntscheidungHinzu(p, sd, { art: 'spiel', id: 'economy_decisions' })[0].entscheidungen[1].kategorie).toEqual({ art: 'spiel', id: 'economy_decisions' })
  expect(fuegeEntscheidungHinzu(neuesProjekt('N'), sd)[0].entscheidungen[0].kategorie).toEqual({ art: 'spiel', id: 'political_actions' })
  const ohnePolitik = { ...sd, entscheidungsKategorien: [{ id: 'economy_decisions', name: 'Wirtschaft', sprite: null }] }
  expect(fuegeEntscheidungHinzu(neuesProjekt('N'), ohnePolitik)[0].entscheidungen[0].kategorie).toEqual({ art: 'spiel', id: 'economy_decisions' })
})

test('Kategorie loeschen laesst Entscheidungen stehen', () => {
  let [p, kat] = fuegeKategorieHinzu(neuesProjekt('M'), sd)
  let ent
  ;[p, ent] = fuegeEntscheidungHinzu(p, sd)
  const ohne = entferneKategorie(p, kat)
  expect(ohne.kategorien).toEqual([])
  expect(entscheidungenIn(ohne, { art: 'eigen', id: kat }).map(e => e.id)).toEqual([ent])
  expect(entscheidungenIn(ohne, { art: 'spiel', id: kat })).toEqual([])
  expect(aendereEntscheidung(p, ent, { name: 'Armee reformieren', kosten: 75 }).entscheidungen[0]).toMatchObject({ name: 'Armee reformieren', kosten: 75 })
  expect(entferneEntscheidung(p, ent).entscheidungen).toEqual([])
})
