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

/** Galerie aller Fokus-Symbole des Spiels mit Suche. */
export function SymbolGalerie({ symbole, gewaehlt, onWaehle }) {
  const [suche, setSuche] = useState('')
  const s = suche.trim().toLowerCase()
  const treffer = symbole.filter(n => !s || n.toLowerCase().includes(s)).slice(0, 300)
  return (
    <div>
      <input type="text" placeholder="Symbole durchsuchen, z. B. «factory», «army», «navy» …" value={suche} data-test="fokussymbol-suche" onInput={(e) => setSuche(e.currentTarget.value)} />
      <div class="galerie fokus-galerie" style={{ marginTop: '0.5rem' }}>
        {treffer.map(n => (
          <button key={n} data-test={`fokussymbol-${n}`} title={n.replace(/^GFX_goal_/, '')} class={n === gewaehlt ? 'aktiv' : ''} onClick={() => onWaehle(n)}>
            <SpielBild schluessel={`fokus:${n}`} alt={n} />
          </button>
        ))}
      </div>
      {symbole.length > treffer.length && <p class="leise">{symbole.length - treffer.length} weitere – grenze die Suche ein.</p>}
    </div>
  )
}
