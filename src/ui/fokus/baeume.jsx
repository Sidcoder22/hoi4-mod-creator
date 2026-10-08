import { useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { fuegeBaumHinzu } from '../../projekt/fokus.js'
import { landName } from '../../projekt/abgeleitet.js'
import { FlaggeAnzeige } from '../laender/flagge-anzeige.jsx'
import { landOptionen } from './gemeinsam.js'

function NeuerBaumDialog({ z, onSchliessen }) {
  const optionen = landOptionen(z.projekt, z.spieldaten)
  const [land, setLand] = useState(optionen[0]?.wert ?? '')
  const [name, setName] = useState('')
  const anlegen = () => {
    let id
    aktionen.aendere((p) => { const [q, neueId] = fuegeBaumHinzu(p, land, name.trim() || `Fokusbaum ${landName(land, p, z.spieldaten)}`); id = neueId; return q })
    onSchliessen()
    aktionen.gehe({ bereich: 'fokus', id })
  }
  return (
    <div class="dialog-hintergrund">
      <div class="dialog" style={{ width: 'min(560px, 100%)' }}>
        <h2>Neuer Fokusbaum</h2>
        <div class="formular">
          <label class="feld">
            <span class="feld-titel">Für welches Land?</span>
            <select value={land} data-test="baum-land" onChange={(e) => setLand(e.currentTarget.value)}>
              {optionen.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
            </select>
            <span class="feld-hilfe">Der neue Baum ersetzt im Spiel den Fokusbaum dieses Landes.</span>
          </label>
          <label class="feld">
            <span class="feld-titel">Name (nur für dich)</span>
            <input type="text" value={name} placeholder="z. B. «Weg zur Grösse»" data-test="baum-name" onInput={(e) => setName(e.currentTarget.value)} />
          </label>
        </div>
        <div class="knopfreihe">
          <button class="knopf haupt" data-test="baum-anlegen" disabled={!land} onClick={anlegen}>Fokusbaum anlegen</button>
          <button class="knopf leise" onClick={onSchliessen}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

export function Baeume({ z }) {
  const [dialog, setDialog] = useState(false)
  const baeume = z.projekt.fokusbaeume ?? []
  return (
    <div class="ansicht">
      <h1>Fokusbäume</h1>
      <p class="leise">Ein Fokusbaum ist die Liste der nationalen Ziele, die ein Land nacheinander verfolgt. Hier baust du einem Land einen eigenen.</p>
      {baeume.length > 0 && (
        <div class="kacheln">
          {baeume.map(b => (
            <button key={b.id} class="kachel" data-test={`baum-${b.id}`} onClick={() => aktionen.gehe({ bereich: 'fokus', id: b.id })}>
              <FlaggeAnzeige tag={b.land} land={z.projekt.laender.find(l => l.tag === b.land)} projekt={z.projekt} />
              <span>
                <strong>{b.name}</strong>
                <span class="art"><br />{landName(b.land, z.projekt, z.spieldaten)} · {b.fokusse.length} Fokusse</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div class="knopfreihe">
        <button class="knopf haupt" data-test="neuer-baum" onClick={() => setDialog(true)}>＋ Neuer Fokusbaum</button>
      </div>
      {dialog && <NeuerBaumDialog z={z} onSchliessen={() => setDialog(false)} />}
    </div>
  )
}
