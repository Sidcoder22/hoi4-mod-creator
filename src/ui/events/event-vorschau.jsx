// Vorschau eines Events im Look des Spiels.

import { SpielBild } from '../bild.jsx'
import { projektBildUrl } from '../bilder.js'
import { satzText, wirkungsDef } from '../../bausteine/erzeugen.js'

export function EventBild({ bild, projekt, klasse = 'event-bild' }) {
  if (bild?.art === 'eigen') {
    const url = projektBildUrl(projekt, bild.bildId)
    return url ? <img src={url} alt="" class={klasse} /> : <span class={`bild-platzhalter ${klasse}`} />
  }
  return <SpielBild schluessel={`event:${bild?.sprite}`} klasse={klasse} alt="" />
}

export function EventVorschau({ event, kontext }) {
  return (
    <div class="event-vorschau" data-test="event-vorschau">
      <div class="event-vorschau-titel">{event.titel || 'Titel des Events'}</div>
      <div class="event-vorschau-koerper">
        <EventBild bild={event.bild} projekt={kontext.projekt} />
        <p class="event-vorschau-text">{event.text || 'Hier steht der Text des Events.'}</p>
      </div>
      <div class="event-vorschau-antworten">
        {event.antworten.map((a, i) => (
          <div key={a.id} class="event-vorschau-antwort" data-test={`vorschau-antwort-${i}`}>
            <span class="event-vorschau-knopf">{a.text || '…'}</span>
            {a.wirkungen.map(w => { const def = wirkungsDef(w.art); return def ? <span key={w.id} class="event-vorschau-wirkung">{satzText(def, w.werte, kontext)}</span> : null })}
          </div>
        ))}
      </div>
    </div>
  )
}
