import { useEffect, useMemo } from 'preact/hooks'
import { aktionen, useSpeicher } from './zustand.js'
import { Start } from './start.jsx'
import { Spielordner } from './spielordner.jsx'
import { Einstellungen } from './einstellungen.jsx'
import { Uebersicht } from './laender/uebersicht.jsx'
import { LandEditor } from './laender/land-editor.jsx'
import { GeisterListe } from './geister/geister-liste.jsx'
import { GeistEditor } from './geister/geist-editor.jsx'
import { Baeume } from './fokus/baeume.jsx'
import { BaumEditor } from './fokus/baum-editor.jsx'
import { Pruefung, ampelZustand } from './pruefung.jsx'
import { Speichern } from './speichern.jsx'
import { Spielfehler } from './spielfehler.jsx'
import { pruefeProjekt } from '../pruefung/regeln.js'

/** Bereiche der Seitenleiste: id, Beschriftung, Ansicht. */
export const BEREICHE = [
  { id: 'einstellungen', text: 'Mod-Einstellungen', ansicht: Einstellungen },
  { id: 'laender', text: 'Länder', ansicht: Uebersicht },
  { id: 'geister', text: 'Nationale Geister', ansicht: GeisterListe },
  { id: 'fokusbaeume', text: 'Fokusbäume', ansicht: Baeume },
  { id: 'pruefung', text: 'Prüfung', ansicht: Pruefung },
  { id: 'speichern', text: 'Mod speichern', ansicht: Speichern },
  { id: 'spielfehler', text: 'Spielfehler', ansicht: Spielfehler },
]

function Kopf({ z }) {
  return (
    <header class="kopf">
      <div class="marke">
        <span class="wappen" aria-hidden="true">✠</span>
        <span>HOI4 Mod Creator</span>
      </div>
      {z.projekt && <span class="projekt-titel">{z.projekt.mod.name}</span>}
      <div class="kopf-rechts">
        {z.projekt && (
          <>
            <button class="knopf leise" data-test="rueckgaengig" title="Rückgängig (Strg+Z)" disabled={!z.kannZurueck} onClick={aktionen.rueckgaengig}>↶ Rückgängig</button>
            <button class="knopf leise" data-test="wiederholen" title="Wiederholen (Strg+Y)" disabled={!z.kannVor} onClick={aktionen.wiederholen}>↷ Wiederholen</button>
            <button class="knopf leise" data-test="zur-startseite" onClick={aktionen.schliesseProjekt}>Alle Mods</button>
          </>
        )}
        <span class="spieldaten" data-test="spielversion">
          {z.spieldaten ? `Spiel ${z.spieldaten.version ?? 'unbekannt'}` : 'Spielordner fehlt'}
        </span>
        <button class="knopf leise" data-test="spielordner-neu" onClick={() => aktionen.gehe({ bereich: 'spielordner' })}>
          {z.spieldaten ? 'Neu einlesen' : 'Einlesen'}
        </button>
      </div>
    </header>
  )
}

function Seitenleiste({ z }) {
  const ampel = useMemo(() => (z.spieldaten ? ampelZustand(pruefeProjekt(z.projekt, z.spieldaten)) : null), [z.projekt, z.spieldaten])
  return (
    <nav class="seitenleiste" data-test="seitenleiste">
      {BEREICHE.map(b => (
        <button key={b.id} data-test={`nav-${b.id}`} class={z.ansicht.bereich === b.id || (b.id === 'laender' && z.ansicht.bereich === 'land') || (b.id === 'geister' && z.ansicht.bereich === 'geist') || (b.id === 'fokusbaeume' && z.ansicht.bereich === 'fokus') ? 'aktiv' : ''}
          onClick={() => aktionen.gehe({ bereich: b.id })}>
          {b.text}
          {b.id === 'pruefung' && ampel && <span class="ampel" data-test="ampel" data-zustand={ampel} title={{ rot: 'Es gibt Fehler', gelb: 'Nur Hinweise', gruen: 'Alles bereit' }[ampel]} />}
        </button>
      ))}
    </nav>
  )
}

/** Ansichten ohne eigenen Eintrag in der Seitenleiste. */
const UNTERANSICHTEN = { land: LandEditor, geist: GeistEditor, fokus: BaumEditor }

function Arbeitsbereich({ z }) {
  const bereich = UNTERANSICHTEN[z.ansicht.bereich]
    ? { id: z.ansicht.bereich, ansicht: UNTERANSICHTEN[z.ansicht.bereich] }
    : BEREICHE.find(b => b.id === z.ansicht.bereich) || BEREICHE.find(b => b.id === 'laender')
  const Ansicht = bereich.ansicht
  return (
    <div class="arbeitsbereich">
      <Seitenleiste z={z} />
      <main class="inhalt">
        {!z.spieldaten && bereich.id !== 'einstellungen'
          ? (
            <div class="karte hervorgehoben">
              <h2>Zuerst den Spielordner einlesen</h2>
              <p>Für diesen Bereich braucht der Creator Karte und Länder aus deinem Spiel.</p>
              <button class="knopf haupt" onClick={() => aktionen.gehe({ bereich: 'spielordner' })}>Spielordner einlesen</button>
            </div>
          )
          : <Ansicht z={z} />}
      </main>
    </div>
  )
}

export function App() {
  const z = useSpeicher()
  useEffect(() => {
    const taste = (e) => {
      const ziel = e.target
      if (ziel && ziel.closest && ziel.closest('input, textarea, select, [contenteditable]')) return
      const strg = e.ctrlKey || e.metaKey
      if (!strg) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); aktionen.rueckgaengig() }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); aktionen.wiederholen() }
    }
    document.addEventListener('keydown', taste)
    return () => document.removeEventListener('keydown', taste)
  }, [])
  return (
    <div class="app">
      <Kopf z={z} />
      {z.keinSpeicher && <div class="banner">Automatisches Speichern ist in diesem Browser nicht möglich – bitte speichere die Mod regelmässig, damit nichts verloren geht.</div>}
      {z.meldung && (
        <div class="banner fehler" data-test="meldung">
          <span>{z.meldung}</span>
          <button class="knopf leise" onClick={() => aktionen.zeigeMeldung(null)}>Schliessen</button>
        </div>
      )}
      {z.ansicht.bereich === 'spielordner' ? <Spielordner z={z} /> : z.projekt ? <Arbeitsbereich z={z} /> : <Start z={z} />}
    </div>
  )
}
