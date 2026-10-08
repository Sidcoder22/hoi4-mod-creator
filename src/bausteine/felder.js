// Feldtypen der Bausteine: Pruefung und Anzeige.

import { parseParadox } from '../leser/paradox.js'
import { landName } from '../projekt/abgeleitet.js'
import { alleFokusse } from '../projekt/fokus.js'

export const VERGLEICH = [{ wert: '>', text: 'über' }, { wert: '<', text: 'unter' }]
export const VERGLEICH_DATUM = [{ wert: '>', text: 'nach dem' }, { wert: '<', text: 'vor dem' }]

export function bekannteTags(kontext) {
  const tags = new Set(Object.keys(kontext.spieldaten?.laender ?? {}))
  for (const l of kontext.projekt?.laender ?? []) if (l.art === 'neu') tags.add(l.tag)
  return tags
}

/** Ist das Feld in diesem Baustein gerade sichtbar (z. B. Staat nur bei «in einem bestimmten Staat»)? */
export function feldAktiv(feld, werte) {
  return !feld.nurWenn || werte?.[feld.nurWenn.feld] === feld.nurWenn.wert
}

export function pruefeCode(code) {
  try {
    parseParadox(String(code ?? ''), { streng: true })
  } catch (e) {
    return `Eigener Code hat einen Klammer- oder Schreibfehler (Zeile ${e.zeile ?? '?'})`
  }
  const sonder = /[^\x00-\x7F]/.exec(String(code ?? ''))
  if (sonder) return `Eigener Code enthält das Sonderzeichen «${sonder[0]}» – im Spielcode sind nur Buchstaben ohne Umlaute erlaubt`
  if (!String(code ?? '').trim()) return 'Eigener Code ist leer'
  return null
}

/** Fehlertext fuer ein Feld oder null. */
export function pruefeFeld(feld, wert, kontext) {
  const leer = wert === undefined || wert === null || wert === ''
  const sd = kontext.spieldaten
  switch (feld.typ) {
    case 'zahl':
    case 'prozent': {
      const z = Number(wert)
      if (leer || !Number.isFinite(z)) return `${feld.label} fehlt`
      if ((feld.min !== undefined && z < feld.min) || (feld.max !== undefined && z > feld.max)) return `${feld.label} muss zwischen ${feld.min} und ${feld.max} liegen`
      return null
    }
    case 'land':
      if (leer) return 'Land fehlt'
      return bekannteTags(kontext).has(wert) ? null : `Unbekanntes Land «${wert}»`
    case 'staat':
      if (leer) return 'Staat fehlt'
      return sd?.staaten?.[wert] ? null : `Unbekannter Staat ${wert}`
    case 'geist':
      if (leer) return 'Nationaler Geist fehlt'
      return kontext.projekt?.ideen?.some(g => g.id === wert) ? null : 'Der nationale Geist wurde gelöscht'
    case 'fokus':
      if (leer) return 'Fokus fehlt'
      return alleFokusse(kontext.projekt ?? {}).some(x => x.fokus.id === wert) ? null : 'Der Fokus wurde gelöscht'
    case 'ideologie':
      if (leer) return 'Ideologie fehlt'
      return !sd?.ideologien?.length || sd.ideologien.some(g => g.id === wert) ? null : `Unbekannte Ideologie «${wert}»`
    case 'kategorie':
      if (leer) return 'Forschungskategorie fehlt'
      return !sd?.technologieKategorien?.length || sd.technologieKategorien.some(k => k.id === wert) ? null : `Unbekannte Forschungskategorie «${wert}»`
    case 'auswahl':
      return feld.optionen.some(o => o.wert === wert) ? null : `${feld.label} fehlt`
    case 'merker':
      return /[a-z0-9]/i.test(String(wert ?? '')) ? null : 'Name des Merkers fehlt'
    case 'datum': {
      const m = /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/.exec(String(wert ?? ''))
      if (!m || +m[1] < 1900 || +m[1] > 2100 || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) return 'Datum ist ungültig'
      return null
    }
    case 'text':
      return String(wert ?? '').trim() ? null : `${feld.label} fehlt`
    case 'code':
      return pruefeCode(wert)
    default:
      return null
  }
}

/** Anzeige eines Feldwerts im Klartextsatz. */
export function feldAnzeige(feld, wert, kontext) {
  if (wert === undefined || wert === null || wert === '') return '…'
  const sd = kontext.spieldaten
  switch (feld.typ) {
    case 'land': return landName(wert, kontext.projekt ?? { laender: [] }, sd ?? { laender: {} })
    case 'staat': return sd?.staaten?.[wert]?.name ?? `Staat ${wert}`
    case 'geist': return kontext.projekt?.ideen?.find(g => g.id === wert)?.name || '(ohne Namen)'
    case 'fokus': return alleFokusse(kontext.projekt ?? {}).find(x => x.fokus.id === wert)?.fokus.name || '(ohne Namen)'
    case 'ideologie': return sd?.ideologien?.find(g => g.id === wert)?.name ?? wert
    case 'kategorie': return sd?.technologieKategorien?.find(k => k.id === wert)?.name ?? wert
    case 'auswahl': return feld.optionen.find(o => o.wert === wert)?.text ?? wert
    case 'datum': return String(wert).split('.').reverse().join('.')
    default: return String(wert)
  }
}
