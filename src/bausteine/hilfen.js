// Kleine Bauhilfen fuer Paradox-Eintraege.
import { zahl } from '../erzeuger/kennungen.js'

export const wort = (t) => ({ typ: 'wort', text: String(t) })
export const block = (inhalt) => ({ typ: 'block', inhalt })
export const e = (schluessel, wert, op = '=') => ({ schluessel, op, wert })
export const zahlWort = (x) => wort(zahl(x))
export const prozent = (x) => wort(zahl(Number(x) / 100))
export const text = (t) => ({ typ: 'text', text: String(t) })
