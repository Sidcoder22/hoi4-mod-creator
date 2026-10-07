import { aktionen } from '../zustand.js'
import { landName } from '../../projekt/abgeleitet.js'
import { entferneLand } from '../../projekt/aenderungen.js'
import { FlaggeAnzeige } from './flagge-anzeige.jsx'
import { aendereFeld } from './gemeinsam.js'
import { Haken } from '../felder.jsx'
import { ReiterName } from './reiter-name.jsx'
import { ReiterFlagge } from './reiter-flagge.jsx'
import { ReiterGebiet } from './reiter-gebiet.jsx'
import { ReiterRegierung } from './reiter-regierung.jsx'
import { ReiterAnfuehrer } from './reiter-anfuehrer.jsx'
import { ReiterStartwerte } from './reiter-startwerte.jsx'
import { ReiterGeister } from './reiter-geister.jsx'

export const REITER = [
  { id: 'name', text: 'Name & Farbe', ansicht: ReiterName, schalter: 'Name ändern' },
  { id: 'flagge', text: 'Flagge', ansicht: ReiterFlagge, schalter: 'Flagge ändern' },
  { id: 'gebiet', text: 'Gebiet', ansicht: ReiterGebiet, schalter: 'Gebiet und Hauptstadt ändern' },
  { id: 'regierung', text: 'Regierung', ansicht: ReiterRegierung, schalter: 'Regierung und Parteien ändern' },
  { id: 'anfuehrer', text: 'Anführer', ansicht: ReiterAnfuehrer, schalter: 'Anführer ändern' },
  { id: 'startwerte', text: 'Startwerte', ansicht: ReiterStartwerte, schalter: 'Startwerte ändern' },
  { id: 'geister', text: 'Nationale Geister', ansicht: ReiterGeister, schalter: 'Nationale Geister hinzufügen' },
]

function AendernSchalter({ land, reiter, feld = reiter.id, text = reiter.schalter }) {
  return (
    <div class="aendern-schalter">
      <Haken label={text} wert={land.aendern?.[feld]} test={`aendern-${feld}`}
        onAendere={(v) => aendereFeld(land, { aendern: { ...land.aendern, [feld]: v } })} />
      <span class="leise">{land.aendern?.[feld] ? 'Deine Änderungen werden in die Mod übernommen.' : 'Ausgeschaltet bleibt alles wie im Spiel.'}</span>
    </div>
  )
}

export function LandEditor({ z }) {
  const land = z.projekt.laender.find(l => l.id === z.ansicht.id)
  if (!land) {
    return (
      <div class="ansicht">
        <p>Dieses Land gibt es nicht mehr.</p>
        <button class="knopf" onClick={() => aktionen.gehe({ bereich: 'laender' })}>Zur Übersicht</button>
      </div>
    )
  }
  const reiter = REITER.find(r => r.id === z.ansicht.reiter) || REITER[0]
  const Ansicht = reiter.ansicht
  const name = landName(land.tag, z.projekt, z.spieldaten)
  return (
    <div class="ansicht" data-test="land-editor">
      <div class="land-kopf">
        <FlaggeAnzeige land={land} projekt={z.projekt} breite={82} hoehe={52} />
        <div>
          <h1>{name || 'Neues Land'}</h1>
          <span class="kuerzel">{land.art === 'neu' ? 'Neues Land' : 'Bestehendes Land'} · {land.tag}</span>
        </div>
        <div class="rechts">
          <button class="knopf leise" onClick={() => aktionen.gehe({ bereich: 'laender' })}>← Alle Länder</button>
          <button class="knopf leise gefahr" data-test="land-loeschen"
            onClick={() => {
              if (confirm(land.art === 'neu' ? `«${name || 'Neues Land'}» wirklich löschen?` : `Alle Änderungen an «${name}» verwerfen?`)) {
                aktionen.aendere((p) => entferneLand(p, land.id))
                aktionen.gehe({ bereich: 'laender' })
              }
            }}>{land.art === 'neu' ? 'Land löschen' : 'Änderungen verwerfen'}</button>
        </div>
      </div>
      <div class="reiter">
        {REITER.map(r => (
          <button key={r.id} data-test={`reiter-${r.id}`} class={r.id === reiter.id ? 'aktiv' : ''}
            onClick={() => aktionen.gehe({ ...z.ansicht, reiter: r.id })}>{r.text}</button>
        ))}
      </div>
      {land.art === 'geaendert' && <AendernSchalter land={land} reiter={reiter} />}
      <Ansicht land={land} z={z} />
      {land.art === 'geaendert' && reiter.id === 'name' && <AendernSchalter land={land} reiter={reiter} feld="farbe" text="Farbe ändern" />}
    </div>
  )
}
