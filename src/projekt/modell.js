// Projektdaten: Grundform eines Projekts und Hilfen fuer Namen und Kuerzel.

export class ProjektFehler extends Error {
  constructor(meldung) {
    super(meldung)
    this.name = 'ProjektFehler'
  }
}

import { wandleAlteArmee } from './armee.js'

export const FORMAT_VERSION = 1

const STANDARD_ZAEHLER = { geist: 0, baum: 0, fokus: 0, fraktion: 0, eigenschaft: 0, event: 0, entscheidung: 0, kategorie: 0, person: 0, vorlage: 0 }

export const GRAFIKSTILE = [
  { id: 'western_european', name: 'Westeuropa', beschreibung: 'Soldaten und Fahrzeuge im westeuropäischen Stil' },
  { id: 'eastern_european', name: 'Osteuropa', beschreibung: 'Soldaten und Fahrzeuge im osteuropäischen Stil' },
  { id: 'middle_eastern', name: 'Naher Osten', beschreibung: 'Aussehen wie Länder im Nahen Osten' },
  { id: 'asian', name: 'Asien', beschreibung: 'Aussehen wie asiatische Länder' },
  { id: 'african', name: 'Afrika', beschreibung: 'Aussehen wie afrikanische Länder' },
  { id: 'southamerican', name: 'Südamerika', beschreibung: 'Aussehen wie südamerikanische Länder' },
  { id: 'commonwealth', name: 'Commonwealth', beschreibung: 'Aussehen wie Länder des britischen Commonwealth' },
]

const GESPERRTE_TAGS = new Set(['AND', 'NOT', 'ALL', 'ANY'])

/** Umlaute ausschreiben, Akzente entfernen. */
export function transliteriere(text) {
  return String(text)
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function modidAusName(name) {
  const kuerze = (s) => s.slice(0, 20).replace(/_+$/, '')
  let s = transliteriere(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  s = kuerze(s)
  if (/^[0-9]/.test(s)) s = kuerze('mod_' + s)
  return s || 'meine_mod'
}

export function tagGesperrt(tag) {
  return GESPERRTE_TAGS.has(tag) || /^D\d\d$/.test(tag)
}

export function tagVorschlag(name, belegt) {
  const frei = (t) => /^[A-Z][A-Z0-9]{2}$/.test(t) && !tagGesperrt(t) && !belegt.has(t)
  const woerter = transliteriere(name).toUpperCase().split(/[^A-Z]+/).filter(Boolean)
  const kandidaten = []
  if (woerter.length >= 2 && woerter[1].length >= 2) kandidaten.push(woerter[0][0] + woerter[1][0] + woerter[1][1])
  const buchstaben = woerter.join('')
  if (buchstaben) {
    const erster = buchstaben[0]
    const rest = buchstaben.slice(1)
    for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) kandidaten.push(erster + rest[i] + rest[j])
    for (const r of rest.length ? rest : 'X') for (let d = 0; d < 10; d++) kandidaten.push(erster + r + d)
  }
  for (const t of kandidaten) if (frei(t)) return t
  for (let n = 0; n < 100; n++) {
    const t = 'X' + String(n).padStart(2, '0')
    if (frei(t)) return t
  }
  for (let n = 0; n < 1000; n++) {
    const t = 'Z' + n.toString(36).toUpperCase().padStart(2, '0')
    if (frei(t)) return t
  }
  throw new Error('Kein freies Kürzel gefunden')
}

export function neueId() {
  const zahlen = new Uint8Array(10)
  crypto.getRandomValues(zahlen)
  return 'e' + [...zahlen].map(z => (z % 36).toString(36)).join('')
}

export function neuesProjekt(name, grundlage = []) {
  return {
    id: neueId(),
    formatVersion: FORMAT_VERSION,
    mod: {
      name, modid: modidAusName(name), modidManuell: false, version: '1.0', beschreibung: '', spielversion: null,
      benutzerOrdner: '', gespeichertAls: null, vorschaubild: null,
      grundlage: grundlage.map(({ name: n, id }) => ({ name: n, id })),
    },
    laender: [],
    ideen: [],
    fokusbaeume: [],
    eigenschaften: [],
    events: [],
    entscheidungen: [],
    kategorien: [],
    staaten: {},
    bilder: {},
    zaehler: { ...STANDARD_ZAEHLER },
  }
}

/** Anzeige der Grundlage (Etappe 4g): «Nur das Spiel» oder die Mods in Ladereihenfolge. */
export function grundlageText(liste) {
  return liste?.length ? liste.map(g => g.name).join(' + ') : 'Nur das Spiel'
}

/** Kopie eines Projekts mit eigener modid, damit sie die Mod des Originals nicht ueberschreibt. */
export function kopiereProjekt(p) {
  const name = `${p.mod.name} (Kopie)`
  return {
    ...structuredClone(p),
    id: neueId(),
    mod: { ...structuredClone(p.mod), name, modid: modidAusName(`${p.mod.name} Kopie`), modidManuell: false, gespeichertAls: null },
  }
}

export function ladeProjektAusJson(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch {
    throw new ProjektFehler('Das ist keine Projektdatei des HOI4 Mod Creators.')
  }
  if (!obj || typeof obj !== 'object' || typeof obj.formatVersion !== 'number' || !obj.mod || !Array.isArray(obj.laender)) {
    throw new ProjektFehler('Das ist keine Projektdatei des HOI4 Mod Creators.')
  }
  if (obj.formatVersion > FORMAT_VERSION) {
    throw new ProjektFehler('Diese Projektdatei stammt aus einer neueren Version des HOI4 Mod Creators.')
  }
  return ergaenzeProjekt({ ...obj, id: neueId() })
}

export function leereDiplomatie(marionetten = []) {
  return { marionetten, meinungen: [], vertraege: [], fraktion: null, kriegsziele: [] }
}

/**
 * Ergaenzt Felder, die aeltere Projekte noch nicht kennen.
 * Ohne Spieldaten bleiben die Marionetten geaenderter Laender «wie im Spiel» (null).
 */
export function ergaenzeProjekt(p, sd) {
  return wandleAlteArmee({
    ...p,
    mod: { ...p.mod, grundlage: p.mod?.grundlage ?? [] },
    ideen: p.ideen ?? [],
    fokusbaeume: p.fokusbaeume ?? [],
    eigenschaften: p.eigenschaften ?? [],
    events: p.events ?? [],
    entscheidungen: (p.entscheidungen ?? []).map(d => ({ ...d, boniLaufzeit: d.boniLaufzeit ?? [] })),
    kategorien: p.kategorien ?? [],
    staaten: p.staaten ?? {},
    bilder: p.bilder ?? {},
    zaehler: { ...STANDARD_ZAEHLER, ...(p.zaehler ?? {}) },
    laender: (p.laender ?? []).map(l => ({
      ...l,
      spielIdeen: l.spielIdeen ?? [],
      forschung: l.forschung ?? null,
      personen: l.personen ?? [],
      startwerte: { rekruten: 0, bevoelkerung: 0, ...l.startwerte },
      anfuehrer: { eigenschaften: [], modus: 'neu', ...l.anfuehrer },
      diplomatie: l.diplomatie ?? leereDiplomatie(l.art === 'neu' ? [] : (sd?.laender?.[l.tag]?.marionetten ? structuredClone(sd.laender[l.tag].marionetten) : null)),
      ...(l.art === 'geaendert' ? { aendern: { diplomatie: false, forschung: false, personen: false, armee: false, ...l.aendern } } : {}),
    })),
  })
}
