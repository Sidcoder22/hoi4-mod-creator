import { aktionen } from '../zustand.js'
import { fuegeGeistHinzu } from '../../projekt/aenderungen.js'
import { BONI } from '../../projekt/boni.js'
import { GeistBild, boniText } from './geist-bild.jsx'

export function neuerGeist() {
  let id
  aktionen.aendere((p, sd) => { const [q, neueId] = fuegeGeistHinzu(p, sd); id = neueId; return q })
  return id
}

export function GeisterListe({ z }) {
  const p = z.projekt
  return (
    <div class="ansicht">
      <h1>Nationale Geister</h1>
      <p class="leise">Nationale Geister sind dauerhafte Boni oder Nachteile eines Landes, zum Beispiel «+5 % Stabilität». Du legst sie hier an und weist sie im Land-Editor einem Land zu.</p>
      {p.ideen.length > 0 && (
        <div class="kacheln">
          {p.ideen.map(g => (
            <button key={g.id} class="kachel" data-test={`geist-${g.id}`} onClick={() => aktionen.gehe({ bereich: 'geist', id: g.id })}>
              <GeistBild geist={g} projekt={p} />
              <span>
                <strong>{g.name || 'Ohne Namen'}</strong>
                <span class="art"><br />{boniText(g, BONI) || 'Noch keine Boni'}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div class="knopfreihe">
        <button class="knopf haupt" data-test="neuer-geist" onClick={() => { const id = neuerGeist(); aktionen.gehe({ bereich: 'geist', id }) }}>＋ Neuer nationaler Geist</button>
      </div>
    </div>
  )
}
