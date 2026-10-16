import { Regler, ZahlFeld } from '../felder.jsx'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'

export function ReiterStartwerte({ land, z }) {
  const an = bearbeitbar(land, 'startwerte')
  const w = land.startwerte
  const setze = (feld) => (v) => aendereFeld(land, (l) => ({ startwerte: { ...l.startwerte, [feld]: v } }), `start-${feld}`)
  return (
    <fieldset disabled={!an} style={{ border: 'none', padding: 0, margin: 0 }}>
      <div class="formular">
        <Regler label="Stabilität" hilfe="Wie zufrieden das Volk ist. Hohe Stabilität bringt mehr Produktion und weniger Unruhen." wert={w.stabilitaet} test="start-stabilitaet" onAendere={setze('stabilitaet')} />
        <Regler label="Kriegsunterstützung" hilfe="Wie sehr das Volk einen Krieg mitträgt. Wichtig für Mobilmachung und Kriegserklärungen." wert={w.kriegsunterstuetzung} test="start-kriegsunterstuetzung" onAendere={setze('kriegsunterstuetzung')} />
        <ZahlFeld label="Forschungsplätze" hilfe="Wie viele Technologien gleichzeitig erforscht werden. Grossmächte haben meist 4 bis 5." min={1} max={6} wert={w.forschungsplaetze} test="start-forschungsplaetze" onAendere={setze('forschungsplaetze')} />
        <ZahlFeld label="Zusätzliche Rekruten zu Beginn" hilfe="So viele Soldaten hat das Land beim Start sofort zur Verfügung." min={0} max={5000000} schritt={10000}
          wert={w.rekruten ?? 0} test="start-rekruten" onAendere={(v) => setze('rekruten')(Math.round(v))} />
        <Regler label="Bevölkerung der eigenen Staaten" hilfe="Ändert die Einwohnerzahl aller Staaten, die dem Land zum Start gehören – dauerhaft mehr oder weniger Rekruten." min={-50} max={200} schritt={5}
          wert={w.bevoelkerung ?? 0} test="start-bevoelkerung" onAendere={setze('bevoelkerung')} />
        {land.art === 'neu' && (
          <ZahlFeld label="Infanteriedivisionen zu Beginn" hilfe="Einfache Infanteriedivisionen, die in der Hauptstadt stehen." min={0} max={24} wert={land.armee.divisionen} test="start-divisionen"
            onAendere={(v) => aendereFeld(land, { armee: { divisionen: Math.round(v) } }, 'divisionen')} />
        )}
      </div>
    </fieldset>
  )
}
