import { Auswahl, Regler, ZahlFeld } from '../felder.jsx'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { landName } from '../../projekt/abgeleitet.js'

export function ReiterStartwerte({ land, z }) {
  const sd = z.spieldaten
  const an = bearbeitbar(land, 'startwerte')
  const w = land.startwerte
  const setze = (feld) => (v) => aendereFeld(land, (l) => ({ startwerte: { ...l.startwerte, [feld]: v } }), `start-${feld}`)
  const laender = Object.keys(sd.laender).map(t => ({ wert: t, text: landName(t, z.projekt, sd) })).sort((a, b) => a.text.localeCompare(b.text, 'de'))
  return (
    <fieldset disabled={!an} style={{ border: 'none', padding: 0, margin: 0 }}>
      <div class="formular">
        <Regler label="Stabilität" hilfe="Wie zufrieden das Volk ist. Hohe Stabilität bringt mehr Produktion und weniger Unruhen." wert={w.stabilitaet} test="start-stabilitaet" onAendere={setze('stabilitaet')} />
        <Regler label="Kriegsunterstützung" hilfe="Wie sehr das Volk einen Krieg mitträgt. Wichtig für Mobilmachung und Kriegserklärungen." wert={w.kriegsunterstuetzung} test="start-kriegsunterstuetzung" onAendere={setze('kriegsunterstuetzung')} />
        <ZahlFeld label="Forschungsplätze" hilfe="Wie viele Technologien gleichzeitig erforscht werden. Grossmächte haben meist 4 bis 5." min={1} max={6} wert={w.forschungsplaetze} test="start-forschungsplaetze" onAendere={setze('forschungsplaetze')} />
        <Auswahl label="Forschungsstand wie …" test="start-technikwie" wert={land.technikWie ?? ''}
          hilfe="Dein Land kennt zu Beginn dieselben Technologien wie das gewählte Land."
          optionen={[{ wert: '', text: land.art === 'neu' ? 'Automatisch (bisheriger Besitzer der Hauptstadt)' : 'Unverändert' }, ...laender]}
          onAendere={(v) => aendereFeld(land, { technikWie: v || null })} />
        {land.art === 'neu' && (
          <ZahlFeld label="Infanteriedivisionen zu Beginn" hilfe="Einfache Infanteriedivisionen, die in der Hauptstadt stehen." min={0} max={24} wert={land.armee.divisionen} test="start-divisionen"
            onAendere={(v) => aendereFeld(land, { armee: { divisionen: Math.round(v) } }, 'divisionen')} />
        )}
      </div>
    </fieldset>
  )
}
