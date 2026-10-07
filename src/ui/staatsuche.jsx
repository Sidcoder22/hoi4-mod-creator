import { useState } from 'preact/hooks'
import { effektiveBesitzer, landName } from '../projekt/abgeleitet.js'

export function Staatsuche({ spieldaten, projekt, onWaehle, platzhalter = 'Staat suchen (Name oder Nummer) …' }) {
  const [suche, setSuche] = useState('')
  const s = suche.trim().toLowerCase()
  let treffer = []
  if (s) {
    const besitzer = effektiveBesitzer(projekt, spieldaten)
    treffer = Object.values(spieldaten.staaten)
      .map(st => ({ ...st, besitzerName: landName(besitzer.get(st.id), projekt, spieldaten) }))
      .filter(st => st.name.toLowerCase().includes(s) || String(st.id) === s || st.besitzerName.toLowerCase().includes(s))
      .slice(0, 30)
  }
  return (
    <div class="staatsuche">
      <input type="text" value={suche} placeholder={platzhalter} data-test="staatsuche" onInput={e => setSuche(e.currentTarget.value)} />
      {treffer.length > 0 && (
        <div class="staatsuche-treffer">
          {treffer.map(st => (
            <button key={st.id} data-test={`staatsuche-treffer-${st.id}`} onClick={() => { onWaehle(st.id); setSuche('') }}>
              {st.name} <span class="leise">· {st.besitzerName} · Nr. {st.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
