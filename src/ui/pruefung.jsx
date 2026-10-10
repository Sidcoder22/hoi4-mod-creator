import { aktionen } from './zustand.js'
import { pruefeProjekt } from '../pruefung/regeln.js'

/** Ampelfarbe zu einer Liste von Meldungen. */
export function ampelZustand(meldungen) {
  if (meldungen.some(m => m.schwere === 'fehler')) return 'rot'
  if (meldungen.length) return 'gelb'
  return 'gruen'
}

export function zielAnsicht(ziel) {
  if (ziel.bereich === 'land') return ziel.id ? { bereich: 'land', id: ziel.id, reiter: ziel.reiter || 'name' } : { bereich: 'laender' }
  if (ziel.bereich === 'geist') return ziel.id ? { bereich: 'geist', id: ziel.id } : { bereich: 'geister' }
  if (ziel.bereich === 'fokus') return ziel.id ? { bereich: 'fokus', id: ziel.id, ...(ziel.fokus ? { fokus: ziel.fokus } : {}) } : { bereich: 'fokusbaeume' }
  if (ziel.bereich === 'staat') return ziel.id ? { bereich: 'staat', id: ziel.id } : { bereich: 'staaten' }
  if (ziel.bereich === 'event') return ziel.id ? { bereich: 'event', id: ziel.id } : { bereich: 'events' }
  if (ziel.bereich === 'entscheidung' || ziel.bereich === 'kategorie') return ziel.id ? { bereich: ziel.bereich, id: ziel.id } : { bereich: 'entscheidungen' }
  return { bereich: 'einstellungen' }
}

/** Meldungen mit fortlaufender Nummer je Regel (fuer data-test). */
export function nummeriert(meldungen) {
  const zaehler = new Map()
  return meldungen.map(m => {
    const n = zaehler.get(m.regel) || 0
    zaehler.set(m.regel, n + 1)
    return { ...m, nr: n }
  })
}

export function Pruefung({ z }) {
  const meldungen = nummeriert(pruefeProjekt(z.projekt, z.spieldaten))
  const fehler = meldungen.filter(m => m.schwere === 'fehler')
  const hinweise = meldungen.filter(m => m.schwere === 'hinweis')
  const zeile = (m) => (
    <li key={`${m.regel}-${m.nr}`} class={`meldung ${m.schwere}`} data-test={`meldung-${m.regel}-${m.nr}`}>
      <span>{m.schwere === 'fehler' ? '✗' : '!'}</span>
      <span class="text" onClick={() => aktionen.gehe(zielAnsicht(m.ziel))} title="Hinspringen">{m.text}</span>
      {m.behebung && (
        <button class="knopf klein" data-test={`behebung-${m.regel}-${m.nr}`}
          onClick={() => aktionen.aendere((p, sd) => m.behebung.anwenden(p, sd))}>{m.behebung.text}</button>
      )}
    </li>
  )
  return (
    <div class="ansicht" data-test="pruefung-liste">
      <h1>Prüfung</h1>
      <p class="leise">Hier siehst du, was vor dem Speichern noch fehlt. Rote Fehler müssen weg, gelbe Hinweise sind erlaubt. Klicke auf eine Meldung, um direkt hinzuspringen.</p>
      {meldungen.length === 0 && <div class="alles-gut">Alles bereit – du kannst die Mod speichern.</div>}
      {fehler.length > 0 && <><h2>Fehler ({fehler.length})</h2><ul class="meldungen">{fehler.map(zeile)}</ul></>}
      {hinweise.length > 0 && <><h2 style={{ marginTop: '1.2rem' }}>Hinweise ({hinweise.length})</h2><ul class="meldungen">{hinweise.map(zeile)}</ul></>}
    </div>
  )
}
