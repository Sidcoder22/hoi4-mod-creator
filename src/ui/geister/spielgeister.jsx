// Galerie der nationalen Geister aus dem Spiel: suchen und als Vorlage kopieren.

import { useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { kopiereSpielGeist } from '../../projekt/aenderungen.js'
import { bonusAusSpiel } from '../../projekt/boni.js'
import { landName } from '../../projekt/abgeleitet.js'
import { SpielBild } from '../bild.jsx'
import { bonusText } from '../bonus-editor.jsx'

/** Sucht Spielgeister nach Name, Kennung, Land oder Bonus. */
export function sucheSpielGeister(sd, projekt, suche, max = 100) {
  const s = suche.trim().toLowerCase()
  const alle = sd.spielGeister ?? []
  if (!s) return alle.slice(0, max)
  return alle.filter(g => g.name.toLowerCase().includes(s) || g.id.includes(s)
    || (g.land && (g.land.toLowerCase() === s || landName(g.land, projekt, sd).toLowerCase().includes(s)))
    || g.boni.some(b => b.modifier.includes(s) || (sd.modifikatoren?.find(m => m.id === b.modifier)?.name ?? '').toLowerCase().includes(s))).slice(0, max)
}

export function spielGeistBoniText(g, sd) {
  return g.boni.map(b => bonusText({ art: 'frei', modifier: b.modifier, wert: b.wert }, sd)).join(', ')
}

export function SpielGeister({ z }) {
  const sd = z.spieldaten
  const [suche, setSuche] = useState('')
  const treffer = sucheSpielGeister(sd, z.projekt, suche)
  return (
    <div>
      <p class="leise">Alle nationalen Geister aus dem Spiel. Kopiere einen als Vorlage und verändere ihn – das Original im Spiel bleibt unverändert.</p>
      <input type="text" placeholder="Suchen nach Name, Land oder Bonus, z. B. «Schweiz» oder «Konsum» …" value={suche} data-test="spielgeist-suche" onInput={(e) => setSuche(e.currentTarget.value)} />
      <div class="kacheln" style={{ marginTop: '0.8rem' }}>
        {treffer.map(g => (
          <div class="kachel spielgeist" key={g.id} data-test={`spielgeist-${g.id}`}>
            <span style={{ width: '48px', height: '48px', flexShrink: 0 }}><SpielBild schluessel={`idee:${g.sprite}`} alt="" /></span>
            <span style={{ flex: 1 }}>
              <strong>{g.name}</strong>
              <span class="art"><br />{g.land ? landName(g.land, z.projekt, sd) : 'alle Länder'} · {spielGeistBoniText(g, sd) || 'keine einfachen Boni'}</span>
              {g.nichtUebernommen.length > 0 && <span class="art"><br />Wird beim Kopieren nicht übernommen: {g.nichtUebernommen.join(', ')}</span>}
            </span>
            <button class="knopf klein" data-test={`kopieren-${g.id}`}
              onClick={() => {
                let id
                aktionen.aendere((p, spieldaten) => { const [q, neueId] = kopiereSpielGeist(p, spieldaten, g.id); id = neueId; return q })
                if (id) aktionen.gehe({ bereich: 'geist', id })
              }}>Als Vorlage kopieren</button>
          </div>
        ))}
      </div>
      {(sd.spielGeister?.length ?? 0) > treffer.length && <p class="leise">Es werden höchstens 100 Geister gezeigt – grenze die Suche ein.</p>}
    </div>
  )
}

export { bonusAusSpiel }
