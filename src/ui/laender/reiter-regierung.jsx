import { aktionen } from '../zustand.js'
import { Auswahl, Haken, ZahlFeld } from '../felder.jsx'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { setzeBeliebtheit } from '../../projekt/aenderungen.js'

export function ReiterRegierung({ land, z }) {
  const sd = z.spieldaten
  const an = bearbeitbar(land, 'regierung')
  const r = land.regierung
  const summe = Object.values(r.parteien).reduce((s, p) => s + (Number(p.beliebtheit) || 0), 0)
  const setzeIdeologie = (ideologie) => aendereFeld(land, (l) => {
    const gruppe = sd.ideologien.find(g => g.id === ideologie)
    const passt = gruppe?.unter.some(u => u.id === l.anfuehrer.unterideologie)
    return {
      regierung: { ...l.regierung, ideologie },
      ...(passt ? {} : { anfuehrer: { ...l.anfuehrer, unterideologie: gruppe?.unter[0]?.id ?? null } }),
    }
  })
  const partei = (id, feld) => (wert) => aendereFeld(land, (l) => ({
    regierung: { ...l.regierung, parteien: { ...l.regierung.parteien, [id]: { ...l.regierung.parteien[id], [feld]: wert } } },
  }), `partei-${id}-${feld}`)
  return (
    <fieldset disabled={!an} style={{ border: 'none', padding: 0, margin: 0 }}>
      <div class="formular">
        <Auswahl label="Wer regiert?" hilfe="Die Ideologie der Regierungspartei. Der Anführer muss dazu passen." wert={r.ideologie} test="land-ideologie"
          optionen={sd.ideologien.map(g => ({ wert: g.id, text: g.name }))} onAendere={setzeIdeologie} />
        <Haken label="Wahlen finden statt" test="land-wahlen" wert={r.wahlen} onAendere={(v) => aendereFeld(land, (l) => ({ regierung: { ...l.regierung, wahlen: v } }))} />
        {r.wahlen && (
          <ZahlFeld label="Wahlen alle" einheit="Monate" min={12} max={120} wert={r.wahlintervall} test="land-wahlintervall"
            onAendere={(v) => aendereFeld(land, (l) => ({ regierung: { ...l.regierung, wahlintervall: v } }), 'wahlintervall')} />
        )}
      </div>
      <div class="karte" style={{ marginTop: '1rem' }}>
        <h3>Parteien und Beliebtheit</h3>
        <p class="leise">Die Beliebtheit aller Parteien ergibt immer 100 %. Ziehst du einen Regler, passen sich die anderen an.</p>
        <div class="parteien">
          <span class="kopfzeile">Partei (kurz)</span><span class="kopfzeile">Voller Name</span><span class="kopfzeile">Beliebtheit</span>
          {sd.ideologien.map(g => {
            const p = r.parteien[g.id] || { name: '', langname: '', beliebtheit: 0 }
            return [
              <input key={`${g.id}-n`} type="text" value={p.name} placeholder={g.name} data-test={`partei-name-${g.id}`} onInput={(e) => partei(g.id, 'name')(e.currentTarget.value)} />,
              <input key={`${g.id}-l`} type="text" value={p.langname} placeholder={`${g.name}e Partei`} data-test={`partei-langname-${g.id}`} onInput={(e) => partei(g.id, 'langname')(e.currentTarget.value)} />,
              <span key={`${g.id}-b`} class="regler-zeile">
                <input type="range" min={0} max={100} step={1} value={p.beliebtheit} data-test={`partei-beliebtheit-${g.id}`}
                  onInput={(e) => { const v = Number(e.currentTarget.value); aktionen.aendere((q) => setzeBeliebtheit(q, land.id, g.id, v), { gruppe: `land:${land.id}:beliebtheit-${g.id}` }) }} />
                <span class="regler-wert">{g.name}: {p.beliebtheit} %</span>
              </span>,
            ]
          })}
        </div>
        <p>Summe: <span class={`summe${summe === 100 ? '' : ' falsch'}`} data-test="beliebtheit-summe">{summe} %</span></p>
      </div>
    </fieldset>
  )
}
