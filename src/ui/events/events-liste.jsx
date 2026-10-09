import { aktionen } from '../zustand.js'
import { fuegeEventHinzu } from '../../projekt/events.js'
import { landName } from '../../projekt/abgeleitet.js'
import { EventBild } from './event-vorschau.jsx'

export function ausloeserText(ev, projekt, sd) {
  const land = ev.land ? landName(ev.land, projekt, sd) : null
  if (ev.ausloeser === 'datum') return `Am ${String(ev.datum).split('.').reverse().join('.')} für ${land ?? '…'}`
  if (ev.ausloeser === 'zufall') return `Zufällig für ${land ?? '…'} (etwa alle ${ev.tage} Tage)`
  return land ? `Wird ausgelöst · für ${land}` : 'Wird ausgelöst · für wer es auslöst'
}

export function EventsListe({ z }) {
  const events = z.projekt.events ?? []
  const neu = () => {
    let id
    aktionen.aendere((p, sd) => { const [q, neueId] = fuegeEventHinzu(p, sd); id = neueId; return q })
    aktionen.gehe({ bereich: 'event', id })
  }
  return (
    <div class="ansicht">
      <h1>Events</h1>
      <p class="leise">Ein Event ist ein Fenster mit Bild, Text und Antworten, das im Spiel aufgeht. Es kommt an einem Datum, zufällig oder wenn ein Fokus, eine Entscheidung oder ein anderes Event es auslöst.</p>
      {events.length > 0 && (
        <div class="kacheln">
          {events.map(ev => (
            <button key={ev.id} class="kachel" data-test={`event-${ev.id}`} onClick={() => aktionen.gehe({ bereich: 'event', id: ev.id })}>
              <EventBild bild={ev.bild} projekt={z.projekt} klasse="event-kachel-bild" />
              <span>
                <strong>{ev.titel || 'Ohne Titel'}</strong>
                <span class="art"><br />{ausloeserText(ev, z.projekt, z.spieldaten)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div class="knopfreihe">
        <button class="knopf haupt" data-test="neues-event" onClick={neu}>＋ Neues Event</button>
      </div>
    </div>
  )
}
