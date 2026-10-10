// Bereich «Staaten»: Karte mit Suche, Liste der geaenderten Staaten und Seitenleiste.

import { useMemo, useRef } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { Karte } from '../karte.jsx'
import { Staatsuche } from '../staatsuche.jsx'
import { effektiveBesitzer, landFarbe, landName } from '../../projekt/abgeleitet.js'
import { StaatSeite } from './staat-seite.jsx'

export function StaatenAnsicht({ z }) {
  const { projekt, spieldaten: sd, karte } = z
  const steuerung = useRef(null)
  const besitzer = useMemo(() => effektiveBesitzer(projekt, sd), [projekt, sd])
  const gewaehlt = z.ansicht.bereich === 'staat' ? Number(z.ansicht.id) : null
  const geaendert = Object.keys(projekt.staaten ?? {}).map(Number).sort((a, b) => a - b)
  const waehle = (id) => aktionen.gehe({ bereich: 'staat', id })
  const name = (id) => projekt.staaten?.[id]?.name || sd.staaten[id]?.name || `Staat ${id}`
  return (
    <div class="ansicht staaten-ansicht">
      <h1>Staaten</h1>
      <p class="leise">Klicke einen Staat auf der Karte an, um Name, Einwohner, Fabriken, Bauplätze, Ressourcen und Siegpunkte zu ändern. Das geht bei jedem Staat, auch bei Staaten anderer Länder.</p>
      <div class="staaten-arbeitsflaeche">
        <div class="staaten-karte">
          <Staatsuche spieldaten={sd} projekt={projekt} onWaehle={(s) => { waehle(s); steuerung.current?.zeigeStaat(s) }} />
          <Karte karte={karte} test="karte-staaten" steuerung={steuerung} hoehe={460}
            hervorheben={new Set([...geaendert, ...(gewaehlt ? [gewaehlt] : [])])}
            farbeFuer={(s) => landFarbe(besitzer.get(s), projekt, sd)}
            beschreibe={(s) => `${name(s)} · ${landName(besitzer.get(s), projekt, sd)}${projekt.staaten?.[s] ? ' · geändert' : ''}`}
            onKlick={waehle} />
          <h3>Geänderte Staaten ({geaendert.length})</h3>
          <div class="liste">
            {geaendert.length === 0 && <div class="zeile leise">Noch kein Staat geändert.</div>}
            {geaendert.map(id => (
              <button class={`zeile${id === gewaehlt ? ' aktiv' : ''}`} key={id} data-test={`geaendert-${id}`} onClick={() => { waehle(id); steuerung.current?.zeigeStaat(id) }}>
                <span>{name(id)}</span><span class="leise">{landName(besitzer.get(id), projekt, sd)}</span>
              </button>
            ))}
          </div>
        </div>
        {gewaehlt
          ? <StaatSeite staatId={gewaehlt} z={z} />
          : <aside class="staat-seite leer"><p class="leise">Wähle links einen Staat.</p></aside>}
      </div>
    </div>
  )
}
