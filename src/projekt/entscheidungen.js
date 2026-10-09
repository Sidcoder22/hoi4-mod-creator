// Reine Aenderungsfunktionen fuer Entscheidungen und eigene Kategorien.

import { neueId } from './modell.js'
import { zaehle } from './zaehler.js'

const STANDARD_KATEGORIE_SYMBOL = 'GFX_decision_category_generic_political_actions'
const STANDARD_SYMBOL = 'GFX_decision_generic_industry'

const ersetze = (liste, id, patch) => liste.map(x => (x.id === id ? { ...x, ...structuredClone(patch) } : x))

export function fuegeKategorieHinzu(p, sd) {
  const id = neueId()
  const [q, nummer] = zaehle(p, 'kategorie')
  const symbole = sd?.kategorieSymbole ?? []
  const kategorie = {
    id, nummer, name: '', beschreibung: '',
    symbol: { art: 'spiel', sprite: symbole.includes(STANDARD_KATEGORIE_SYMBOL) ? STANDARD_KATEGORIE_SYMBOL : (symbole[0] ?? STANDARD_KATEGORIE_SYMBOL) },
    laender: [],
  }
  return [{ ...q, kategorien: [...(q.kategorien ?? []), kategorie] }, id]
}

export function aendereKategorie(p, id, patch) {
  return { ...p, kategorien: ersetze(p.kategorien, id, patch) }
}

/** Entfernt nur die Kategorie; ihre Entscheidungen bleiben und die Pruefung meldet sie. */
export function entferneKategorie(p, id) {
  return { ...p, kategorien: p.kategorien.filter(k => k.id !== id) }
}

function standardKategorie(p, sd) {
  if (p.kategorien?.length) return { art: 'eigen', id: p.kategorien[0].id }
  const spiel = sd?.entscheidungsKategorien ?? []
  if (spiel.some(k => k.id === 'political_actions') || !spiel.length) return { art: 'spiel', id: 'political_actions' }
  return { art: 'spiel', id: spiel[0].id }
}

export function fuegeEntscheidungHinzu(p, sd, kategorie) {
  const id = neueId()
  const [q, nummer] = zaehle(p, 'entscheidung')
  const symbole = sd?.entscheidungsSymbole ?? []
  const entscheidung = {
    id, nummer, name: '', beschreibung: '',
    kategorie: kategorie ? { ...kategorie } : standardKategorie(p, sd),
    symbol: { art: 'spiel', sprite: symbole.includes(STANDARD_SYMBOL) ? STANDARD_SYMBOL : (symbole[0] ?? STANDARD_SYMBOL) },
    kosten: 50, nurEinmal: true, wartezeit: 30, dauer: 0, laender: [],
    sichtbar: { modus: 'alle', liste: [] }, verfuegbar: { modus: 'alle', liste: [] },
    wirkungen: [], wirkungenEnde: [], kiGewicht: 1,
  }
  return [{ ...q, entscheidungen: [...(q.entscheidungen ?? []), entscheidung] }, id]
}

export function aendereEntscheidung(p, id, patch) {
  return { ...p, entscheidungen: ersetze(p.entscheidungen, id, patch) }
}

export function entferneEntscheidung(p, id) {
  return { ...p, entscheidungen: p.entscheidungen.filter(x => x.id !== id) }
}

export function entscheidungenIn(p, kategorie) {
  return (p.entscheidungen ?? []).filter(x => x.kategorie?.art === kategorie.art && x.kategorie?.id === kategorie.id)
}
