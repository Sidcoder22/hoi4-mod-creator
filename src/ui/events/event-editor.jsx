// Editor fuer ein Event: Text, Bild, Ausloeser, Antworten; rechts die Vorschau.

import { aktionen } from '../zustand.js'
import { TextFeld, ZahlFeld, Regler, Auswahl, Haken, Feld } from '../felder.jsx'
import { aendereEvent, entferneEvent, fuegeAntwortHinzu, aendereAntwort, entferneAntwort, MAX_ANTWORTEN } from '../../projekt/events.js'
import { fuegeBildHinzu } from '../../projekt/aenderungen.js'
import { BildZuschnitt } from '../bild-zuschnitt.jsx'
import { SymbolGalerie } from '../fokus/symbole.jsx'
import { landOptionen } from '../fokus/gemeinsam.js'
import { WirkungenEditor } from '../bausteine/wirkungen.jsx'
import { BedingungenEditor } from '../bausteine/bedingungen.jsx'
import { BausteinFeld } from '../bausteine/felder.jsx'
import { EventVorschau } from './event-vorschau.jsx'
import { pruefeFeld } from '../../bausteine/felder.js'

const DATUM = { name: 'datum', typ: 'datum', label: 'Datum' }

const AUSLOESER = [
  { wert: 'ausgeloest', text: 'Wird ausgelöst (durch Fokus, Entscheidung oder anderes Event)' },
  { wert: 'datum', text: 'An einem Datum' },
  { wert: 'zufall', text: 'Zufällig, wenn Bedingungen erfüllt' },
]

function aendere(eventId, patch, gruppe) {
  aktionen.aendere((p) => {
    const ev = p.events.find(x => x.id === eventId)
    if (!ev) return p
    return aendereEvent(p, eventId, typeof patch === 'function' ? patch(ev) : patch)
  }, { gruppe: gruppe ? `event:${eventId}:${gruppe}` : undefined })
}

function aendereAntwortFeld(eventId, antwortId, patch, gruppe) {
  aktionen.aendere((p) => aendereAntwort(p, eventId, antwortId, patch), { gruppe: gruppe ? `antwort:${antwortId}:${gruppe}` : undefined })
}

export function EventEditor({ z }) {
  const ev = (z.projekt.events ?? []).find(x => x.id === z.ansicht.id)
  if (!ev) {
    return (
      <div class="ansicht">
        <p>Dieses Event gibt es nicht mehr.</p>
        <button class="knopf" onClick={() => aktionen.gehe({ bereich: 'events' })}>Zur Übersicht</button>
      </div>
    )
  }
  const sd = z.spieldaten
  const kontext = { projekt: z.projekt, spieldaten: sd }
  const [b, h] = sd.bildgroessen?.event || [210, 176]
  const pflichtLand = ev.ausloeser !== 'ausgeloest'
  const laender = [...(pflichtLand ? [{ wert: '', text: '– Land wählen –' }] : [{ wert: '', text: 'wer es auslöst' }]), ...landOptionen(z.projekt, sd)]
  const setze = (patch, gruppe) => aendere(ev.id, patch, gruppe)
  return (
    <div class="ansicht event-editor" data-test="event-editor">
      <div class="land-kopf">
        <h1>{ev.titel || 'Neues Event'}</h1>
        <div class="rechts">
          <button class="knopf leise" onClick={() => aktionen.gehe({ bereich: 'events' })}>Alle Events</button>
        </div>
      </div>
      <div class="event-arbeitsflaeche">
        <div class="event-felder">
          <div class="karte formular">
            <TextFeld label="Titel" wert={ev.titel} test="event-titel" onAendere={(v) => setze({ titel: v }, 'titel')} />
            <TextFeld label="Text" wert={ev.text} test="event-text" mehrzeilig onAendere={(v) => setze({ text: v }, 'text')} />
            <Auswahl label="Wann kommt das Event?" test="event-ausloeser" wert={ev.ausloeser} optionen={AUSLOESER}
              hilfe="«Wird ausgelöst» braucht irgendwo die Wirkung «Event auslösen», zum Beispiel in einem Fokus oder einer Entscheidung."
              onAendere={(v) => setze({ ausloeser: v })} />
            <Auswahl label="Für welches Land?" test="event-land" wert={ev.land} optionen={laender}
              hilfe={pflichtLand ? 'Bei Datum und Zufall prüft das Spiel das Event für genau ein Land.' : '«wer es auslöst»: Das Event geht an das Land, das die Wirkung ausführt.'}
              onAendere={(v) => setze({ land: v })} />
            {ev.ausloeser === 'datum' && (
              <>
                <BausteinFeld feld={DATUM} wert={ev.datum} kontext={kontext} test="event-datum" onAendere={(v) => setze({ datum: v }, 'datum')} />
                {pruefeFeld(DATUM, ev.datum, kontext) && <p class="baustein-fehler" data-test="event-datum-fehler">{pruefeFeld(DATUM, ev.datum, kontext)}</p>}
                <p class="feld-hilfe" data-test="event-datum-hinweis">Das Event kommt kurz nach diesem Datum. Das Spiel prüft solche Events nur etwa alle 20 Tage, es kann also bis zu drei Wochen später erscheinen.</p>
              </>
            )}
            {ev.ausloeser === 'zufall' && (
              <>
                <ZahlFeld label="Kommt im Schnitt nach" einheit="Tagen" min={1} max={3650} wert={ev.tage} test="event-tage"
                  hilfe="Solange die Bedingungen erfüllt sind, kommt das Event im Durchschnitt nach so vielen Tagen." onAendere={(v) => setze({ tage: Math.round(v) }, 'tage')} />
                <Haken label="Nur einmal" wert={ev.nurEinmal} test="event-einmal" onAendere={(v) => setze({ nurEinmal: v })} />
              </>
            )}
          </div>

          {pflichtLand && (
            <details class="abschnitt" open>
              <summary>Zusätzliche Bedingungen</summary>
              <BedingungenEditor block={ev.bedingungen} kontext={kontext} test="event-bedingungen" onAendere={(v) => setze({ bedingungen: v }, 'bedingungen')} />
            </details>
          )}

          <details class="abschnitt" open>
            <summary>Antworten</summary>
            {ev.antworten.map((a, i) => (
              <div class="karte antwort" key={a.id} data-test={`antwort-${i}`}>
                <div class="antwort-kopf">
                  <strong>Antwort {i + 1}</strong>
                  <button class="knopf klein leise" data-test={`antwort-${i}-entfernen`} title="Antwort entfernen"
                    onClick={() => aktionen.aendere((p) => entferneAntwort(p, ev.id, a.id))}>✕</button>
                </div>
                <TextFeld label="Text der Antwort" wert={a.text} test={`antwort-${i}-text`} onAendere={(v) => aendereAntwortFeld(ev.id, a.id, { text: v }, 'text')} />
                <Regler label="KI wählt das" hilfe="Wie oft die KI diese Antwort nimmt, im Verhältnis zu den anderen." min={0} max={100} wert={a.kiProzent} test={`antwort-${i}-ki`}
                  onAendere={(v) => aendereAntwortFeld(ev.id, a.id, { kiProzent: v }, 'ki')} />
                <Feld label="Wirkungen" breit>
                  <WirkungenEditor liste={a.wirkungen} kontext={kontext} test={`antwort-${i}-wirkung`} onAendere={(v) => aendereAntwortFeld(ev.id, a.id, { wirkungen: v }, 'wirkungen')} />
                </Feld>
              </div>
            ))}
            <button class="knopf klein" data-test="antwort-neu" disabled={ev.antworten.length >= MAX_ANTWORTEN}
              onClick={() => aktionen.aendere((p) => fuegeAntwortHinzu(p, ev.id))}>＋ Antwort ({ev.antworten.length} von {MAX_ANTWORTEN})</button>
          </details>

          <details class="abschnitt">
            <summary>Bild</summary>
            <SymbolGalerie symbole={sd.eventBilder ?? []} gewaehlt={ev.bild?.art === 'spiel' ? ev.bild.sprite : null} bildArt="event" test="eventbild"
              praefix="GFX_report_event_" klasse="event-galerie" platzhalter="Bilder durchsuchen, z. B. «soldiers», «rally», «factory» …"
              onWaehle={(sprite) => setze({ bild: { art: 'spiel', sprite } })} />
            <p class="leise">Oder ein eigenes Bild ({b} × {h} Pixel):</p>
            <BildZuschnitt test="eventbild-eigen" zielBreite={b} zielHoehe={h} anzeigeBreite={260}
              onFertig={(bild) => aktionen.aendere((p) => {
                const [q, bildId] = fuegeBildHinzu(p, bild)
                return aendereEvent(q, ev.id, { bild: { art: 'eigen', bildId } })
              })} />
          </details>

          <div class="knopfreihe">
            <button class="knopf leise gefahr" data-test="event-loeschen"
              onClick={() => { if (confirm(`Event «${ev.titel || 'ohne Titel'}» löschen?`)) { aktionen.aendere((p) => entferneEvent(p, ev.id)); aktionen.gehe({ bereich: 'events' }) } }}>
              Event löschen
            </button>
          </div>
        </div>
        <div class="event-vorschau-spalte">
          <EventVorschau event={ev} kontext={kontext} />
        </div>
      </div>
    </div>
  )
}
