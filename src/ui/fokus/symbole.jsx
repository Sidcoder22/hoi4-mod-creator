import { useState } from 'preact/hooks'
import { SpielBild } from '../bild.jsx'
import { projektBildUrl } from '../bilder.js'

/** Symbol eines Fokus (Spielsymbol oder eigenes Bild). */
export function FokusSymbol({ fokus, projekt, klasse = 'fokus-symbol' }) {
  if (fokus.symbol?.art === 'eigen') {
    const url = projektBildUrl(projekt, fokus.symbol.bildId)
    return url ? <img src={url} alt="" class={klasse} /> : <span class={`bild-platzhalter ${klasse}`} />
  }
  return <SpielBild schluessel={`fokus:${fokus.symbol?.sprite}`} klasse={klasse} alt="" />
}

/** Galerie der Spielsymbole einer Art (Fokus, Event, Entscheidung, Kategorie) mit Suche. */
export function SymbolGalerie({ symbole, gewaehlt, onWaehle, bildArt = 'fokus', test = 'fokussymbol', praefix = 'GFX_goal_', klasse = 'fokus-galerie',
  platzhalter = 'Symbole durchsuchen, z. B. «factory», «army», «navy» …' }) {
  const [suche, setSuche] = useState('')
  const s = suche.trim().toLowerCase()
  const treffer = symbole.filter(n => !s || n.toLowerCase().includes(s)).slice(0, 300)
  return (
    <div>
      <input type="text" placeholder={platzhalter} value={suche} data-test={`${test}-suche`} onInput={(e) => setSuche(e.currentTarget.value)} />
      <div class={`galerie ${klasse}`} style={{ marginTop: '0.5rem' }}>
        {treffer.map(n => (
          <button key={n} data-test={`${test}-${n}`} title={n.slice(n.startsWith(praefix) ? praefix.length : 0)} class={n === gewaehlt ? 'aktiv' : ''} onClick={() => onWaehle(n)}>
            <SpielBild schluessel={`${bildArt}:${n}`} alt={n} />
          </button>
        ))}
      </div>
      {symbole.length > treffer.length && <p class="leise">{symbole.length - treffer.length} weitere – grenze die Suche ein.</p>}
    </div>
  )
}
