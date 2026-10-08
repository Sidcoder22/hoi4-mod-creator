// Editor fuer Bedingungsbloecke («verfuegbar wenn», «sichtbar wenn», Ausloeser).

import { BEDINGUNGEN, neueBedingung, satzText, pruefeBausteine, bedingungsDef } from '../../bausteine/erzeugen.js'
import { ArtAuswahl, BausteinFelder } from './wirkungen.jsx'

export function BedingungenEditor({ block, onAendere, kontext, test }) {
  const liste = block?.liste ?? []
  const modus = block?.modus ?? 'alle'
  const setzeListe = (neu) => onAendere({ modus, liste: neu })
  const setze = (i, neu) => setzeListe(liste.map((b, k) => (k === i ? neu : b)))
  return (
    <div class="bausteine" data-test={test}>
      {liste.length === 0 && <p class="leise">Keine Bedingung – immer möglich.</p>}
      {liste.length > 1 && (
        <label class="baustein-feld">
          <span class="feld-titel">Wann gilt das?</span>
          <select value={modus} data-test={`${test}-modus`} onChange={(e) => onAendere({ modus: e.currentTarget.value, liste })}>
            <option value="alle">Alle Bedingungen müssen zutreffen</option>
            <option value="eine">Eine Bedingung genügt</option>
          </select>
        </label>
      )}
      {liste.map((b, i) => {
        const def = bedingungsDef(b.art)
        const fehler = def ? pruefeBausteine({ modus: 'alle', liste: [b] }, kontext, '').map(f => f.text.replace(/^: «[^»]*» – /, '')) : ['Unbekannter Baustein']
        return (
          <div class="baustein" key={b.id} data-test={`${test}-${i}`}>
            <div class="baustein-kopf">
              <ArtAuswahl katalog={BEDINGUNGEN} wert={b.art} test={`${test}-art-${i}`}
                onAendere={(art) => setze(i, { ...neueBedingung(art), id: b.id, nicht: b.nicht })} />
              <label class="haken klein" title="Gilt, wenn die Bedingung NICHT zutrifft">
                <input type="checkbox" checked={!!b.nicht} data-test={`${test}-nicht-${i}`} onChange={(e) => setze(i, { ...b, nicht: e.currentTarget.checked })} />
                <span>nicht</span>
              </label>
              <button class="knopf klein leise" title="Entfernen" data-test={`${test}-entfernen-${i}`} onClick={() => setzeListe(liste.filter((_, k) => k !== i))}>✕</button>
            </div>
            {def && <BausteinFelder def={def} baustein={b} kontext={kontext} test={`${test}-${i}`} onWerte={(werte) => setze(i, { ...b, werte })} />}
            {def && <p class="baustein-satz" data-test={`${test}-satz-${i}`}>{b.nicht ? 'Nicht: ' : ''}{satzText(def, b.werte, kontext)}</p>}
            {fehler.map((f, k) => <p class="baustein-fehler" key={k}>{f}</p>)}
          </div>
        )
      })}
      <button class="knopf klein" data-test={`${test}-neu`} onClick={() => setzeListe([...liste, neueBedingung('stabilitaet')])}>＋ Bedingung</button>
    </div>
  )
}
