import { useMemo, useRef, useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { Karte } from '../karte.jsx'
import { FlaggeAnzeige } from './flagge-anzeige.jsx'
import { fuegeLandHinzu } from '../../projekt/aenderungen.js'
import { effektiveBesitzer, landFarbe, landName } from '../../projekt/abgeleitet.js'

function AuswahlDialog({ z, onSchliessen }) {
  const { projekt, spieldaten: sd, karte } = z
  const [tag, setTag] = useState(null)
  const [filter, setFilter] = useState('')
  const steuerung = useRef(null)
  const besitzer = useMemo(() => effektiveBesitzer(projekt, sd), [projekt, sd])
  const laender = useMemo(() => Object.values(sd.laender)
    .map(l => ({ tag: l.tag, name: landName(l.tag, projekt, sd) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de')), [projekt, sd])
  const gefiltert = laender.filter(l => !filter || l.name.toLowerCase().includes(filter.toLowerCase()) || l.tag.includes(filter.toUpperCase()))
  const markiert = new Set([...besitzer].filter(([, t]) => t === tag).map(([s]) => s))
  const bestaetigen = () => {
    let id
    aktionen.aendere((p, spieldaten) => { const [q, neueId] = fuegeLandHinzu(p, spieldaten, 'geaendert', tag); id = neueId; return q })
    if (!id) id = projekt.laender.find(l => l.tag === tag && l.art === 'geaendert')?.id
    onSchliessen()
    aktionen.gehe({ bereich: 'land', id, reiter: 'name' })
  }
  return (
    <div class="dialog-hintergrund">
      <div class="dialog">
        <h2>Welches Land willst du ändern?</h2>
        <p class="leise">Klicke auf der Karte in ein Land oder wähle es aus der Liste.</p>
        <div class="zwei-spalten">
          <Karte karte={karte} test="karte-auswahl" steuerung={steuerung} hervorheben={markiert}
            farbeFuer={(s) => landFarbe(besitzer.get(s), projekt, sd)}
            beschreibe={(s) => `${sd.staaten[s]?.name} · ${landName(besitzer.get(s), projekt, sd)}`}
            onKlick={(s) => setTag(besitzer.get(s))} />
          <div>
            <input type="text" placeholder="Land suchen …" value={filter} onInput={e => setFilter(e.currentTarget.value)} />
            <div class="liste" data-test="land-liste" style={{ marginTop: '0.5rem' }}>
              {gefiltert.map(l => (
                <button key={l.tag} data-test={`land-waehlen-${l.tag}`} class={l.tag === tag ? 'aktiv' : ''} onClick={() => setTag(l.tag)}>
                  <FlaggeAnzeige tag={l.tag} projekt={projekt} />
                  <span>{l.name}</span>
                  <span class="leise">{l.tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div class="knopfreihe">
          <button class="knopf haupt" data-test="auswahl-bestaetigen" disabled={!tag} onClick={bestaetigen}>
            {tag ? `«${landName(tag, projekt, sd)}» ändern` : 'Zuerst ein Land wählen'}
          </button>
          <button class="knopf leise" onClick={onSchliessen}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

export function Uebersicht({ z }) {
  const [dialog, setDialog] = useState(false)
  const { projekt, spieldaten: sd } = z
  const neuesLand = () => {
    let id
    aktionen.aendere((p, spieldaten) => { const [q, neueId] = fuegeLandHinzu(p, spieldaten, 'neu'); id = neueId; return q })
    aktionen.gehe({ bereich: 'land', id, reiter: 'name' })
  }
  return (
    <div class="ansicht">
      <h1>Länder</h1>
      <p class="leise">Erfinde ein ganz neues Land oder ändere ein Land, das es im Spiel schon gibt.</p>
      {projekt.laender.length > 0 && (
        <div class="kacheln">
          {projekt.laender.map(l => (
            <button key={l.id} class="kachel" data-test={`land-${l.id}`} onClick={() => aktionen.gehe({ bereich: 'land', id: l.id, reiter: 'name' })}>
              <FlaggeAnzeige land={l} projekt={projekt} />
              <span>
                <strong>{landName(l.tag, projekt, sd)}</strong>
                <span class="art"><br />{l.art === 'neu' ? 'Neues Land' : 'Geändertes Land'} · {l.tag}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div class="knopfreihe">
        <button class="knopf haupt" data-test="neues-land" onClick={neuesLand}>＋ Neues Land</button>
        <button class="knopf" data-test="bestehendes-land" onClick={() => setDialog(true)}>Bestehendes Land ändern</button>
      </div>
      {dialog && <AuswahlDialog z={z} onSchliessen={() => setDialog(false)} />}
    </div>
  )
}
