// Symbole und Vorschau einer Entscheidung im Look des Spiels.

import { SpielBild } from '../bild.jsx'
import { projektBildUrl } from '../bilder.js'

/** Symbol einer Entscheidung oder Kategorie (Spielsymbol oder eigenes Bild). */
export function EntscheidungsSymbol({ symbol, projekt, bildArt = 'entscheidung', klasse = 'entscheidung-symbol' }) {
  if (symbol?.art === 'eigen') {
    const url = projektBildUrl(projekt, symbol.bildId)
    return url ? <img src={url} alt="" class={klasse} /> : <span class={`bild-platzhalter ${klasse}`} />
  }
  return <SpielBild schluessel={`${bildArt}:${symbol?.sprite}`} klasse={klasse} alt="" />
}

export function EntscheidungVorschau({ entscheidung: d, kategorieName, projekt }) {
  return (
    <div class="entscheidung-vorschau" data-test="entscheidung-vorschau">
      <div class="entscheidung-vorschau-kategorie">{kategorieName}</div>
      <div class="entscheidung-vorschau-zeile">
        <EntscheidungsSymbol symbol={d.symbol} projekt={projekt} />
        <span class="entscheidung-vorschau-name">{d.name || 'Name der Entscheidung'}</span>
        {Number(d.dauer) > 0 && <span class="entscheidung-vorschau-dauer">{d.dauer} Tage</span>}
        <span class="entscheidung-vorschau-kosten" title="Politische Macht">{d.kosten} ⚑</span>
      </div>
      {d.beschreibung && <p class="entscheidung-vorschau-text">{d.beschreibung}</p>}
    </div>
  )
}
