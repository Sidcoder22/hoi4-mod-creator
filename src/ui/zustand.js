// Zentraler Zustand der Oberflaeche und alle Aktionen, die ihn veraendern.

import { useEffect, useRef, useState } from 'preact/hooks'
import { neuesProjekt as leeresProjekt, kopiereProjekt, ladeProjektAusJson, ergaenzeProjekt } from '../projekt/modell.js'
import { erstelleVerlauf } from '../projekt/verlauf.js'
import { leseSpielordner, LESER_VERSION } from '../leser/spielordner.js'
import * as db from '../speicher/indexeddb.js'
import { kodiereBild, leereBildCache } from './bilder.js'

export function erstelleSpeicher(anfang) {
  let zustand = anfang
  const hoerer = new Set()
  return {
    lies: () => zustand,
    setze(teil) {
      const neu = typeof teil === 'function' ? teil(zustand) : teil
      zustand = { ...zustand, ...neu }
      for (const h of hoerer) h(zustand)
    },
    abonniere(h) {
      hoerer.add(h)
      return () => hoerer.delete(h)
    },
  }
}

export const speicher = erstelleSpeicher({
  db: null,
  keinSpeicher: false,
  projekte: [],
  projekt: null,
  spieldaten: null,
  karte: null,
  ansicht: { bereich: 'start' },
  einlesen: null,
  meldung: null,
  kannZurueck: false,
  kannVor: false,
  zielordner: null,
})

/** Preact-Hook: liefert (einen Teil vom) Zustand und rendert bei Aenderungen neu. */
export function useSpeicher(waehler = (z) => z) {
  const waehlerRef = useRef(waehler)
  waehlerRef.current = waehler
  const [wert, setWert] = useState(() => waehler(speicher.lies()))
  useEffect(() => speicher.abonniere((z) => setWert(() => waehlerRef.current(z))), [])
  return wert
}

const verlauf = erstelleVerlauf(100)
let letzteGruppe = null
let letzteZeit = 0
let speicherTimer = null

function verlaufStand() {
  return { kannZurueck: verlauf.kannZurueck(), kannVor: verlauf.kannVor() }
}

async function speichereProjektJetzt() {
  clearTimeout(speicherTimer)
  speicherTimer = null
  const { db: d, projekt } = speicher.lies()
  if (!d || !projekt) return
  try {
    await db.speichereProjekt(d, projekt)
  } catch {
    speicher.setze({ keinSpeicher: true })
  }
}

function planeSpeichern() {
  clearTimeout(speicherTimer)
  speicherTimer = setTimeout(speichereProjektJetzt, 500)
}

async function aktualisiereListe() {
  const d = speicher.lies().db
  if (!d) return
  try {
    speicher.setze({ projekte: await db.alleProjekte(d) })
  } catch {
    speicher.setze({ keinSpeicher: true })
  }
}

function setzeProjekt(projekt, ansicht = { bereich: 'laender' }) {
  verlauf.leeren()
  letzteGruppe = null
  speicher.setze({ projekt, ansicht, ...verlaufStand() })
}

export const aktionen = {
  async start({ dbName } = {}) {
    try {
      const d = await db.oeffneDb(dbName)
      speicher.setze({ db: d })
      await aktualisiereListe()
      const gespeichert = await db.ladeSpieldaten(d)
      if (gespeichert && gespeichert.spieldaten?.leserVersion === LESER_VERSION) {
        speicher.setze({ spieldaten: gespeichert.spieldaten, karte: gespeichert.karte })
      } else if (gespeichert) {
        speicher.setze({ meldung: 'Diese Version des Creators braucht neue Spieldaten. Bitte lies den Spielordner neu ein.' })
      }
      const zielordner = await db.hole(d, 'zielordner')
      if (zielordner) speicher.setze({ zielordner })
    } catch {
      speicher.setze({ keinSpeicher: true })
    }
  },

  async neuesProjekt(name) {
    const p = leeresProjekt(String(name || '').trim() || 'Meine Mod')
    setzeProjekt(p)
    await speichereProjektJetzt()
    await aktualisiereListe()
  },

  async oeffneProjekt(id) {
    const d = speicher.lies().db
    const p = d ? await db.ladeProjekt(d, id) : null
    if (p) setzeProjekt(ergaenzeProjekt(p, speicher.lies().spieldaten))
  },

  async dupliziereProjekt(id) {
    const d = speicher.lies().db
    if (!d) return
    const p = await db.ladeProjekt(d, id)
    if (!p) return
    await db.speichereProjekt(d, kopiereProjekt(p))
    await aktualisiereListe()
  },

  async loescheProjekt(id) {
    const d = speicher.lies().db
    if (d) await db.loescheProjekt(d, id)
    if (speicher.lies().projekt?.id === id) speicher.setze({ projekt: null, ansicht: { bereich: 'start' } })
    await aktualisiereListe()
  },

  async importiereProjekt(text) {
    try {
      const p = ladeProjektAusJson(text)
      setzeProjekt(p)
      await speichereProjektJetzt()
      await aktualisiereListe()
    } catch (e) {
      speicher.setze({ meldung: e.message })
    }
  },

  async schliesseProjekt() {
    await speichereProjektJetzt()
    speicher.setze({ projekt: null, ansicht: { bereich: 'start' } })
    await aktualisiereListe()
  },

  /** Wendet eine reine Aenderung (p, spieldaten) → p an. Gleiche gruppe innerhalb 1 s = ein Verlaufsschritt. */
  aendere(fn, { gruppe } = {}) {
    const z = speicher.lies()
    if (!z.projekt) return
    const neu = fn(z.projekt, z.spieldaten)
    if (!neu || neu === z.projekt) return
    const jetzt = Date.now()
    if (!(gruppe && gruppe === letzteGruppe && jetzt - letzteZeit < 1000)) verlauf.merke(z.projekt)
    letzteGruppe = gruppe || null
    letzteZeit = jetzt
    speicher.setze({ projekt: neu, ...verlaufStand() })
    planeSpeichern()
  },

  rueckgaengig() {
    const z = speicher.lies()
    if (!z.projekt) return
    const vorher = verlauf.rueckgaengig(z.projekt)
    if (!vorher) return
    letzteGruppe = null
    speicher.setze({ projekt: vorher, ...verlaufStand() })
    planeSpeichern()
  },

  wiederholen() {
    const z = speicher.lies()
    if (!z.projekt) return
    const nachher = verlauf.wiederholen(z.projekt)
    if (!nachher) return
    letzteGruppe = null
    speicher.setze({ projekt: nachher, ...verlaufStand() })
    planeSpeichern()
  },

  gehe(ansicht) {
    speicher.setze({ ansicht })
  },

  zeigeMeldung(meldung) {
    speicher.setze({ meldung })
  },

  async spielordnerEinlesen(quelle) {
    speicher.setze({ einlesen: { anteil: 0, text: 'Dateien werden gezählt …' }, meldung: null })
    try {
      const ergebnis = await leseSpielordner(quelle, {
        kodiereBild,
        fortschritt: (anteil, text) => speicher.setze({ einlesen: { anteil, text } }),
      })
      const d = speicher.lies().db
      if (d) {
        try {
          await db.speichereSpieldaten(d, ergebnis)
        } catch {
          speicher.setze({ keinSpeicher: true })
        }
      }
      leereBildCache(ergebnis.bilder)
      speicher.setze({ spieldaten: ergebnis.spieldaten, karte: ergebnis.karte, einlesen: null })
      return ergebnis
    } catch (e) {
      speicher.setze({ einlesen: null, meldung: e.message })
      return null
    }
  },

  async merkeZielordner(handle) {
    speicher.setze({ zielordner: handle })
    const d = speicher.lies().db
    if (d) {
      try {
        await db.merke(d, 'zielordner', handle)
      } catch { /* Handle laesst sich nicht immer speichern; dann nur fuer diese Sitzung */ }
    }
  },

  speichereJetzt: speichereProjektJetzt,
}
