import { aktionen } from '../zustand.js'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { aendereLand } from '../../projekt/aenderungen.js'
import { BONI } from '../../projekt/boni.js'
import { GeistBild, boniText } from '../geister/geist-bild.jsx'
import { neuerGeist } from '../geister/geister-liste.jsx'
import { useState } from 'preact/hooks'
import { sucheSpielGeister, spielGeistBoniText } from '../geister/spielgeister.jsx'
import { SpielBild } from '../bild.jsx'

export function ReiterGeister({ land, z }) {
  const an = bearbeitbar(land, 'geister')
  const p = z.projekt
  const sd = z.spieldaten
  const [suche, setSuche] = useState('')
  const zugewiesen = land.spielIdeen ?? []
  const treffer = suche.trim() ? sucheSpielGeister(sd, p, suche, 30).filter(g => !zugewiesen.includes(g.id)) : []
  return (
    <fieldset disabled={!an} style={{ border: 'none', padding: 0, margin: 0 }}>
      <p class="leise">Hake die nationalen Geister an, die dieses Land zu Spielbeginn hat.</p>
      {p.ideen.length === 0 && <p>Es gibt noch keine nationalen Geister in dieser Mod.</p>}
      <div class="boni">
        {p.ideen.map(g => (
          <label class="haken karte" key={g.id} style={{ marginBottom: 0 }}>
            <input type="checkbox" data-test={`land-geist-${g.id}`} checked={land.ideen.includes(g.id)}
              onChange={(e) => {
                const an = e.currentTarget.checked
                aendereFeld(land, (l) => ({ ideen: an ? [...new Set([...l.ideen, g.id])] : l.ideen.filter(i => i !== g.id) }))
              }} />
            <GeistBild geist={g} projekt={p} groesse={40} />
            <span><strong>{g.name || 'Ohne Namen'}</strong><br /><span class="leise">{boniText(g, BONI) || 'Noch keine Boni'}</span></span>
          </label>
        ))}
      </div>
      <div class="knopfreihe">
        <button class="knopf" data-test="geist-neu-fuer-land" onClick={() => {
          const id = neuerGeist()
          aktionen.aendere((q, sd) => {
            const l = q.laender.find(x => x.id === land.id)
            return aendereLand(q, sd, land.id, { ideen: [...l.ideen, id] })
          })
          aktionen.gehe({ bereich: 'geist', id })
        }}>＋ Neuen Geist für dieses Land anlegen</button>
      </div>
      <div class="karte" style={{ marginTop: '1rem' }}>
        <h3>Geister aus dem Spiel</h3>
        <p class="leise">Gib dem Land einen Geist, den es im Spiel schon gibt – unverändert.</p>
        {zugewiesen.length === 0 && <p class="leise">Noch keiner zugewiesen.</p>}
        <div class="boni">
          {zugewiesen.map(id => {
            const g = sd.spielGeister?.find(x => x.id === id)
            return (
              <div class="zeile-geist" key={id} data-test={`land-spielgeist-${id}`}>
                <span style={{ width: '40px', height: '40px' }}><SpielBild schluessel={`idee:${g?.sprite}`} alt="" /></span>
                <span style={{ flex: 1 }}><strong>{g?.name ?? id}</strong><br /><span class="leise">{g ? spielGeistBoniText(g, sd) : 'nicht im eingelesenen Spiel'}</span></span>
                <button class="knopf klein leise" data-test={`land-spielgeist-weg-${id}`} onClick={() => aendereFeld(land, (l) => ({ spielIdeen: (l.spielIdeen ?? []).filter(x => x !== id) }))}>Entfernen</button>
              </div>
            )
          })}
        </div>
        <input type="text" style={{ marginTop: '0.6rem' }} placeholder="Geist aus dem Spiel suchen, z. B. «Industrie» …" value={suche} data-test="land-spielgeist-suche" onInput={(e) => setSuche(e.currentTarget.value)} />
        {treffer.length > 0 && (
          <div class="liste kurz">
            {treffer.map(g => (
              <button key={g.id} data-test={`land-spielgeist-hinzu-${g.id}`} onClick={() => { aendereFeld(land, (l) => ({ spielIdeen: [...(l.spielIdeen ?? []), g.id] })); setSuche('') }}>
                ＋ {g.name} <span class="leise">{spielGeistBoniText(g, sd)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  )
}
