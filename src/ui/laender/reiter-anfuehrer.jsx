import { aktionen } from '../zustand.js'
import { Auswahl, TextFeld } from '../felder.jsx'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { aendereLand, fuegeBildHinzu } from '../../projekt/aenderungen.js'
import { SpielBild } from '../bild.jsx'
import { BildZuschnitt } from '../bild-zuschnitt.jsx'
import { projektBildUrl } from '../bilder.js'
import { AnfuehrerEigenschaften } from './eigenschaften.jsx'

export function ReiterAnfuehrer({ land, z }) {
  const sd = z.spieldaten
  const an = bearbeitbar(land, 'anfuehrer')
  const a = land.anfuehrer
  const gruppe = sd.ideologien.find(g => g.id === land.regierung.ideologie)
  const unter = gruppe?.unter ?? []
  const [b, h] = sd.bildgroessen?.portraet || [156, 210]
  const spielLeiter = land.art === 'geaendert' && sd.laender[land.tag]?.anfuehrer ? sd.charaktere[sd.laender[land.tag].anfuehrer] : null
  const setzeBild = (bild) => aendereFeld(land, (l) => ({ anfuehrer: { ...l.anfuehrer, bild } }))
  const behalten = land.art === 'geaendert' && a.modus === 'behalten'
  return (
    <fieldset disabled={!an} style={{ border: 'none', padding: 0, margin: 0 }}>
      {spielLeiter && <p class="leise">Im Spiel führt zurzeit {spielLeiter.name} das Land.</p>}
      {land.art === 'geaendert' && (
        <div class="formular" style={{ marginBottom: '1rem' }}>
          <Auswahl label="Was soll mit dem Anführer passieren?" test="anfuehrer-modus" wert={a.modus ?? 'neu'}
            optionen={[{ wert: 'neu', text: 'Neuen Anführer einsetzen' }, { wert: 'behalten', text: 'Bisherigen Anführer behalten und ihm Eigenschaften geben' }]}
            onAendere={(v) => aendereFeld(land, (l) => ({ anfuehrer: { ...l.anfuehrer, modus: v } }))} />
        </div>
      )}
      {!behalten && <>
      <div class="formular">
        <TextFeld label="Name des Anführers" wert={a.name} test="anfuehrer-name" hilfe="Das Staatsoberhaupt zu Spielbeginn."
          onAendere={(v) => aendereFeld(land, (l) => ({ anfuehrer: { ...l.anfuehrer, name: v } }), 'anfuehrer-name')} />
        <Auswahl label="Politische Richtung" test="anfuehrer-unterideologie" wert={a.unterideologie ?? ''}
          hilfe={`Passend zur Regierung (${gruppe?.name ?? '–'}). Ändere zuerst die Regierung, wenn du eine andere Richtung willst.`}
          optionen={unter.map(u => ({ wert: u.id, text: u.name }))}
          onAendere={(v) => aendereFeld(land, (l) => ({ anfuehrer: { ...l.anfuehrer, unterideologie: v } }))} />
      </div>
      <div class="karte" style={{ marginTop: '1rem' }}>
        <h3>Bild</h3>
        {a.bild?.art === 'eigen' && projektBildUrl(z.projekt, a.bild.bildId) && (
          <p><img src={projektBildUrl(z.projekt, a.bild.bildId)} alt="Eigenes Porträt" style={{ width: '78px', height: '105px', border: '2px solid var(--messing)' }} /> <span class="leise">Eigenes Bild gewählt.</span></p>
        )}
        <p class="leise">Wähle ein Porträt aus dem Spiel …</p>
        <div class="galerie portraets">
          {sd.portraets.map((pfad, i) => (
            <button key={pfad} data-test={`portraet-${i}`} title={pfad.split('/').pop()} class={a.bild?.art === 'spiel' && a.bild.pfad === pfad ? 'aktiv' : ''}
              onClick={() => setzeBild({ art: 'spiel', pfad })}>
              <SpielBild schluessel={`portraet:${pfad}`} alt="Porträt" />
            </button>
          ))}
        </div>
        <p class="leise">… oder lade ein eigenes Bild hoch:</p>
        <BildZuschnitt test="portraetbild" zielBreite={b} zielHoehe={h} anzeigeBreite={200}
          onFertig={(bild) => aktionen.aendere((p, spieldaten) => {
            const [q, bildId] = fuegeBildHinzu(p, bild)
            const l = q.laender.find(x => x.id === land.id)
            return aendereLand(q, spieldaten, land.id, { anfuehrer: { ...l.anfuehrer, bild: { art: 'eigen', bildId } } })
          })} />
      </div>
      </>}
      <AnfuehrerEigenschaften land={land} z={z} />
    </fieldset>
  )
}
