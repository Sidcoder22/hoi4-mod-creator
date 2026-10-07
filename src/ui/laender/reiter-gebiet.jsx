import { useMemo, useRef } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { Karte } from '../karte.jsx'
import { Staatsuche } from '../staatsuche.jsx'
import { Auswahl, Haken } from '../felder.jsx'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { schalteStaat } from '../../projekt/aenderungen.js'
import { effektiveBesitzer, landFarbe, landName } from '../../projekt/abgeleitet.js'

export function ReiterGebiet({ land, z }) {
  const { projekt, spieldaten: sd, karte } = z
  const an = bearbeitbar(land, 'gebiet')
  const steuerung = useRef(null)
  const besitzer = useMemo(() => effektiveBesitzer(projekt, sd), [projekt, sd])
  const eigene = [...besitzer].filter(([, t]) => t === land.tag).map(([s]) => s).sort((a, b) => a - b)
  const spielStaaten = land.art === 'geaendert' ? eigene.filter(s => !land.staaten.includes(s)) : []
  const umschalten = (s) => {
    if (!an) return
    if (land.art === 'geaendert' && sd.staaten[s]?.besitzer === land.tag && !land.staaten.includes(s)) {
      aktionen.zeigeMeldung(`${sd.staaten[s].name} gehört schon zu ${landName(land.tag, projekt, sd)}. Um es abzugeben, weise es einem anderen Land zu.`)
      return
    }
    aktionen.aendere((p) => schalteStaat(p, land.id, s))
  }
  return (
    <div>
      <p class="leise">
        {land.art === 'neu'
          ? 'Klicke auf der Karte die Staaten an, die zu deinem Land gehören sollen. Ein zweiter Klick nimmt einen Staat wieder weg.'
          : 'Klicke Staaten an, die dieses Land zusätzlich bekommen soll. Seine bisherigen Staaten behält es.'}
      </p>
      <div class="zwei-spalten">
        <div>
          <Staatsuche spieldaten={sd} projekt={projekt} onWaehle={(s) => { umschalten(s); steuerung.current?.zeigeStaat(s) }} />
          <Karte karte={karte} test="karte-gebiet" steuerung={steuerung} hervorheben={new Set(eigene)} hoehe={460}
            farbeFuer={(s) => landFarbe(besitzer.get(s), projekt, sd)}
            beschreibe={(s) => `${sd.staaten[s]?.name} · ${landName(besitzer.get(s), projekt, sd)}${sd.staaten[s]?.kategorie ? ' · ' + sd.staaten[s].kategorie : ''}`}
            onKlick={umschalten} />
        </div>
        <div>
          <h3>Staaten ({eigene.length})</h3>
          <div class="liste">
            {land.staaten.length === 0 && spielStaaten.length === 0 && <div class="zeile leise">Noch keine Staaten gewählt.</div>}
            {land.staaten.map(s => (
              <div class="zeile" key={s} data-test={`gebiet-staat-${s}`}>
                <span>{sd.staaten[s]?.name ?? `Staat ${s}`}<br /><span class="leise">vorher: {landName(sd.staaten[s]?.besitzer, projekt, sd)}</span></span>
                <button class="knopf klein leise" data-test={`gebiet-entfernen-${s}`} disabled={!an} onClick={() => umschalten(s)}>Entfernen</button>
              </div>
            ))}
            {spielStaaten.map(s => (
              <div class="zeile leise" key={s} data-test={`gebiet-staat-${s}`}>
                <span>{sd.staaten[s]?.name}</span><span>schon im Spiel</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '0.8rem' }}>
            <Auswahl label="Hauptstadt" hilfe="Die Hauptstadt muss einer der eigenen Staaten sein." wert={land.hauptstadt ?? ''} test="land-hauptstadt" gesperrt={!an || !eigene.length}
              optionen={[...(land.hauptstadt == null ? [{ wert: '', text: '– wählen –' }] : []), ...eigene.map(s => ({ wert: s, text: sd.staaten[s]?.name ?? `Staat ${s}` }))]}
              onAendere={(v) => aendereFeld(land, { hauptstadt: v === '' ? null : Number(v) })} />
          </div>
          <div style={{ marginTop: '0.8rem' }}>
            <Haken label="Bisherige Besitzer behalten ihren Anspruch" test="land-kerne-behalten" gesperrt={!an} wert={land.kerneAltBesitzerBehalten}
              hilfe="Im Spiel heisst das «Kerngebiet». Mit Anspruch können die alten Besitzer die Staaten leichter zurückfordern."
              onAendere={(v) => aendereFeld(land, { kerneAltBesitzerBehalten: v })} />
          </div>
        </div>
      </div>
    </div>
  )
}
