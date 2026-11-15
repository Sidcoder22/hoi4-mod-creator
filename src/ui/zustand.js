// Zentraler Zustand der Oberflaeche und alle Aktionen, die ihn veraendern.

import { useEffect, useRef, useState } from 'preact/hooks'
import { neuesProjekt as leeresProjekt, kopiereProjekt, ladeProjektAusJson, ergaenzeProjekt } from '../projekt/modell.js'
import { fuegeGrundlageHinzu, entferneGrundlage, ueberlagerung, grundlageDaten } from '../projekt/grundlage.js'
import { leseModOrdner, leseModListe } from '../leser/mod-ordner.js'
import { pruefeZielordner } from '../speicher/ordner.js'
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
  grundlageMods: [],
  modListe: null,
})

// Dateiliste des Spielordners dieser Sitzung (Etappe 4g); der Browser gibt sie nicht dauerhaft heraus
let spielQuelle = null

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
    const p = leeresProjekt(String(name || '').trim() || 'Meine Mod', speicher.lies().spieldaten?.grundlage ?? [])
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
    spielQuelle = quelle
    const mods = speicher.lies().grundlageMods
    speicher.setze({ einlesen: { anteil: 0, text: 'Dateien werden gezählt …' }, meldung: null })
    try {
      const ergebnis = await leseSpielordner(ueberlagerung(quelle, mods), {
        grundlage: grundlageDaten(mods),
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

  /** true, wenn in dieser Sitzung schon ein Spielordner gewaehlt wurde (Voraussetzung fuer Mods als Grundlage). */
  hatSpielQuelle: () => !!spielQuelle,

  async grundlageHinzufuegen(modQuelle, { erwartet } = {}) {
    if (!spielQuelle) {
      speicher.setze({ meldung: 'Wähle zuerst oben den Spielordner (neu einlesen).' })
      return
    }
    let mod
    try {
      mod = await leseModOrdner(modQuelle)
    } catch (e) {
      speicher.setze({ meldung: e.message })
      return
    }
    speicher.setze({ grundlageMods: fuegeGrundlageHinzu(speicher.lies().grundlageMods, mod) })
    await aktionen.spielordnerEinlesen(spielQuelle)
    if (erwartet && mod.name !== erwartet) speicher.setze({ meldung: `Gewählt wurde «${mod.name}», nicht «${erwartet}».` })
  },

  async grundlageEntfernen(i) {
    speicher.setze({ grundlageMods: entferneGrundlage(speicher.lies().grundlageMods, i) })
    if (spielQuelle) await aktionen.spielordnerEinlesen(spielQuelle)
  },

  /** Liste der installierten Mods aus dem Benutzerordner; fragt beim ersten Mal nach dem Ordner. */
  async modListeLesen() {
    try {
      let handle = speicher.lies().zielordner
      if (!handle) {
        if (typeof window.showDirectoryPicker !== 'function') {
          speicher.setze({ meldung: 'Dieser Browser kann die Mod-Liste nicht lesen. Öffne den Creator in Chrome oder Edge.' })
          return
        }
        handle = await window.showDirectoryPicker({ id: 'hoi4-benutzerordner', mode: 'readwrite', startIn: 'documents' })
        if (!(await pruefeZielordner(handle))) {
          let istMod = false
          try {
            await handle.getFileHandle('descriptor.mod')
            istMod = true
          } catch { /* kein Mod-Ordner */ }
          speicher.setze({
            meldung: istMod
              ? 'Das ist ein Mod-Ordner. Für die Liste deiner Mods braucht der Creator den Ordner Dokumente/Paradox Interactive/Hearts of Iron IV. Einen Mod-Ordner wählst du mit «Anderen Mod-Ordner wählen».'
              : 'Das ist nicht der Ordner «Hearts of Iron IV» in deinen Dokumenten. Wähle Dokumente/Paradox Interactive/Hearts of Iron IV.',
          })
          return
        }
        await aktionen.merkeZielordner(handle)
      } else if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
          speicher.setze({ meldung: 'Ohne Erlaubnis kann der Creator die Mod-Liste nicht lesen.' })
          return
        }
      }
      const projekt = speicher.lies().projekt
      speicher.setze({ modListe: await leseModListe(handle, { ausser: projekt ? `${projekt.mod.modid}.mod` : undefined }) })
    } catch (e) {
      if (e?.name !== 'AbortError') speicher.setze({ meldung: `Die Mod-Liste liess sich nicht lesen: ${e.message}` })
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

  /** Vollstaendige Fokusbaeume des Spiels (Etappe 4f); null, wenn der Spielordner neu eingelesen werden muss. */
  async ladeSpielfokus() {
    const d = speicher.lies().db
    if (!d) return null
    try {
      return await db.ladeSpielfokus(d)
    } catch {
      return null
    }
  },

  speichereJetzt: speichereProjektJetzt,
}
