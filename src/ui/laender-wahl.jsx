// Auswahl mehrerer Laender als Chips (z. B. «Nur für diese Länder»).

import { landName } from '../projekt/abgeleitet.js'
import { landOptionen } from './fokus/gemeinsam.js'

export function LaenderWahl({ tags, onAendere, kontext, test, leerText }) {
  const { projekt, spieldaten: sd } = kontext
  const optionen = landOptionen(projekt, sd).filter(o => !tags.includes(o.wert))
  return (
    <div class="laender-wahl">
      <div class="chips">
        {tags.length === 0 && <span class="leise">{leerText}</span>}
        {tags.map(t => (
          <span class="chip" key={t}>
            {landName(t, projekt, sd)}
            <button class="knopf klein leise" title="Entfernen" data-test={`${test}-weg-${t}`} onClick={() => onAendere(tags.filter(x => x !== t))}>✕</button>
          </span>
        ))}
      </div>
      <select value="" data-test={`${test}-neu`} onChange={(e) => { const v = e.currentTarget.value; if (v) onAendere([...tags, v]) }}>
        <option value="">＋ Land hinzufügen …</option>
        {optionen.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
      </select>
    </div>
  )
}
