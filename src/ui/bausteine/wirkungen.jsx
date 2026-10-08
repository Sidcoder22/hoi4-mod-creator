// Editor fuer Wirkungslisten (Belohnungen, Event-Antworten, Entscheidungen).

import { WIRKUNGEN, neueWirkung, satzText, pruefeBausteine, wirkungsDef } from '../../bausteine/erzeugen.js'
import { feldAktiv } from '../../bausteine/felder.js'
import { BausteinFeld } from './felder.jsx'

export function ArtAuswahl({ katalog, wert, test, onAendere }) {
  const gruppen = [...new Set(katalog.map(d => d.gruppe))]
  return (
    <select value={wert} data-test={test} onChange={(e) => onAendere(e.currentTarget.value)}>
      {gruppen.map(g => (
        <optgroup key={g} label={g}>
          {katalog.filter(d => d.gruppe === g).map(d => <option key={d.art} value={d.art}>{d.name}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

export function BausteinFelder({ def, baustein, kontext, test, onWerte }) {
  return (
    <div class="baustein-felder">
      {def.felder.filter(f => feldAktiv(f, baustein.werte)).map(f => (
        <BausteinFeld key={f.name} feld={f} wert={baustein.werte?.[f.name]} kontext={kontext} test={`${test}-${f.name}`}
          onAendere={(v) => onWerte({ ...baustein.werte, [f.name]: v })} />
      ))}
    </div>
  )
}

export function WirkungenEditor({ liste, onAendere, kontext, test, tiefe = 0 }) {
  const setze = (i, neu) => onAendere(liste.map((b, k) => (k === i ? neu : b)))
  return (
    <div class="bausteine" data-test={test}>
      {liste.length === 0 && <p class="leise">Noch nichts – füge unten etwas hinzu.</p>}
      {liste.map((b, i) => {
        const def = wirkungsDef(b.art)
        const fehler = def ? pruefeBausteine([{ ...b, wirkungen: [] }], kontext, '').map(f => f.text.replace(/^: /, '')) : ['Unbekannter Baustein']
        return (
          <div class="baustein" key={b.id} data-test={`${test}-${i}`}>
            <div class="baustein-kopf">
              <ArtAuswahl katalog={WIRKUNGEN} wert={b.art} test={`${test}-art-${i}`}
                onAendere={(art) => setze(i, { ...neueWirkung(art), id: b.id })} />
              <button class="knopf klein leise" title="Entfernen" data-test={`${test}-entfernen-${i}`} onClick={() => onAendere(liste.filter((_, k) => k !== i))}>✕</button>
            </div>
            {def && <BausteinFelder def={def} baustein={b} kontext={kontext} test={`${test}-${i}`} onWerte={(werte) => setze(i, { ...b, werte })} />}
            {def && <p class="baustein-satz" data-test={`${test}-satz-${i}`}>{satzText(def, b.werte, kontext)}</p>}
            {fehler.map((f, k) => <p class="baustein-fehler" key={k}>{f.replace(/^«[^»]*» – /, '')}</p>)}
            {b.art === 'bei_land' && tiefe < 2 && (
              <div class="baustein-innen">
                <WirkungenEditor liste={b.wirkungen ?? []} kontext={kontext} test={`${test}-${i}-innen`} tiefe={tiefe + 1}
                  onAendere={(innen) => setze(i, { ...b, wirkungen: innen })} />
              </div>
            )}
          </div>
        )
      })}
      <button class="knopf klein" data-test={`${test}-neu`} onClick={() => onAendere([...liste, neueWirkung('politische_macht')])}>＋ Hinzufügen</button>
    </div>
  )
}
