// Eingabefelder fuer die Bausteine.

import { Staatsuche } from '../staatsuche.jsx'
import { alleFokusse } from '../../projekt/fokus.js'
import { landOptionen } from '../fokus/gemeinsam.js'
import { landName } from '../../projekt/abgeleitet.js'

export function BausteinFeld({ feld, wert, onAendere, kontext, test }) {
  const { projekt, spieldaten: sd } = kontext
  const auswahl = (optionen, leerText) => (
    <select value={wert ?? ''} data-test={test} onChange={(e) => onAendere(e.currentTarget.value)}>
      {leerText && <option value="">{leerText}</option>}
      {optionen.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
    </select>
  )
  let eingabe
  switch (feld.typ) {
    case 'zahl':
    case 'prozent':
      eingabe = (
        <span class="zahl-zeile">
          <input type="number" value={wert ?? ''} min={feld.min} max={feld.max} step={feld.schritt ?? 1} data-test={test}
            onInput={(e) => { const v = e.currentTarget.value; onAendere(v === '' ? '' : Number(v)) }} />
          {feld.typ === 'prozent' && <span class="einheit">%</span>}
        </span>
      )
      break
    case 'land':
      eingabe = auswahl(landOptionen(projekt, sd), '– Land wählen –')
      break
    case 'staat':
      eingabe = (
        <div>
          <span data-test={`${test}-name`}>{wert != null && wert !== '' ? (sd.staaten[wert]?.name ?? `Staat ${wert}`) : 'Noch kein Staat gewählt'}</span>
          <Staatsuche spieldaten={sd} projekt={projekt} onWaehle={(id) => onAendere(id)} platzhalter="Anderen Staat suchen …" />
        </div>
      )
      break
    case 'geist':
      eingabe = auswahl(projekt.ideen.map(g => ({ wert: g.id, text: g.name || '(ohne Namen)' })), projekt.ideen.length ? '– Geist wählen –' : '– zuerst einen Geist anlegen –')
      break
    case 'spielgeist':
      eingabe = auswahl((sd.spielGeister ?? []).map(g => ({ wert: g.id, text: g.land ? `${g.name} (${g.land})` : g.name })), '– Geist aus dem Spiel wählen –')
      break
    case 'fokus':
      eingabe = auswahl(alleFokusse(projekt).map(({ baum, fokus }) => ({ wert: fokus.id, text: `${fokus.name || '(ohne Namen)'} · ${baum.name}` })), '– Fokus wählen –')
      break
    case 'event': {
      const fuer = (ev) => (ev.land ? landName(ev.land, projekt, sd) : 'wer es auslöst')
      eingabe = auswahl((projekt.events ?? []).map(ev => ({ wert: ev.id, text: `«${ev.titel || '(ohne Titel)'}» · ${fuer(ev)}` })),
        projekt.events?.length ? '– Event wählen –' : '– zuerst ein Event anlegen –')
      break
    }
    case 'ideologie':
      eingabe = auswahl((sd.ideologien ?? []).map(g => ({ wert: g.id, text: g.name })))
      break
    case 'kategorie':
      eingabe = auswahl((sd.technologieKategorien ?? []).map(k => ({ wert: k.id, text: k.name })))
      break
    case 'auswahl':
      eingabe = auswahl(feld.optionen)
      break
    case 'datum': {
      const [j = '', m = '', t = ''] = String(wert ?? '').split('.')
      const setze = (neuJ, neuM, neuT) => onAendere(`${neuJ}.${neuM}.${neuT}`)
      eingabe = (
        <span class="zahl-zeile datum">
          <input type="number" min={1} max={31} value={t} placeholder="Tag" data-test={`${test}-tag`} onInput={(e) => setze(j, m, e.currentTarget.value)} />
          <input type="number" min={1} max={12} value={m} placeholder="Monat" data-test={`${test}-monat`} onInput={(e) => setze(j, e.currentTarget.value, t)} />
          <input type="number" min={1936} max={1950} value={j} placeholder="Jahr" data-test={`${test}-jahr`} onInput={(e) => setze(e.currentTarget.value, m, t)} />
        </span>
      )
      break
    }
    case 'code':
      eingabe = <textarea class="code" rows={4} value={wert ?? ''} spellcheck={false} data-test={test} onInput={(e) => onAendere(e.currentTarget.value)} />
      break
    default:
      eingabe = <input type="text" value={wert ?? ''} data-test={test} onInput={(e) => onAendere(e.currentTarget.value)} />
  }
  return (
    <label class="baustein-feld">
      <span class="feld-titel">{feld.label}</span>
      {eingabe}
    </label>
  )
}
