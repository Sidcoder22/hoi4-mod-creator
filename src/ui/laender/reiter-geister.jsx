import { aktionen } from '../zustand.js'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { aendereLand } from '../../projekt/aenderungen.js'
import { BONI } from '../../projekt/boni.js'
import { GeistBild, boniText } from '../geister/geist-bild.jsx'
import { neuerGeist } from '../geister/geister-liste.jsx'

export function ReiterGeister({ land, z }) {
  const an = bearbeitbar(land, 'geister')
  const p = z.projekt
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
    </fieldset>
  )
}
