// Reiter «Forschung»: Schnellwahl und Liste der Technologien nach Bereichen.

import { useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { bearbeitbar } from './gemeinsam.js'
import { landName } from '../../projekt/abgeleitet.js'
import { forschungVon, setzeForschung, schalteTechnologie, schnellwahl, forschungZuruecksetzen } from '../../projekt/forschung.js'

export function ReiterForschung({ land, z }) {
  const sd = z.spieldaten
  const an = bearbeitbar(land, 'forschung')
  const [art, setArt] = useState('jahr')
  const [jahr, setJahr] = useState(1936)
  const [vorbild, setVorbild] = useState(Object.keys(sd.laender).sort()[0] ?? '')
  const [suche, setSuche] = useState('')
  const [mitgeaendert, setMitgeaendert] = useState([])
  const technologien = sd.technologien ?? []
  const liste = forschungVon(sd, land)
  const gewaehlt = new Set(liste)
  const name = (id) => technologien.find(t => t.id === id)?.name ?? id

  const schalte = (ids, wert) => aktionen.aendere((p, s) => {
    let q = p
    const mit = []
    for (const id of ids) {
      const [r, m] = schalteTechnologie(q, s, land.id, id, wert)
      q = r
      mit.push(...m.filter(x => !ids.includes(x)))
    }
    setMitgeaendert([...new Set(mit)])
    return q
  })
  const wendeSchnellwahlAn = () => {
    setMitgeaendert([])
    aktionen.aendere((p, s) => setzeForschung(p, s, land.id, schnellwahl(s, art, art === 'jahr' ? jahr : vorbild)))
  }

  const s = suche.trim().toLowerCase()
  const treffer = technologien.filter(t => !s || t.name.toLowerCase().includes(s) || t.id.includes(s))
  const bereiche = [...(sd.technologieBereiche ?? []), { id: '', name: 'Weitere' }]
  const laender = Object.keys(sd.laender).map(t => ({ wert: t, text: landName(t, z.projekt, sd) })).sort((a, b) => a.text.localeCompare(b.text, 'de'))

  return (
    <fieldset disabled={!an} class="forschung" style={{ border: 'none', padding: 0, margin: 0 }}>
      <div class="karte formular forschung-schnell">
        <label class="feld">
          <span class="feld-titel">Schnellwahl</span>
          <select value={art} data-test="forschung-schnell-art" onChange={(e) => setArt(e.currentTarget.value)}>
            <option value="jahr">Alles bis zum Jahr …</option>
            <option value="land">Wie das Land …</option>
            <option value="nichts">Nichts</option>
          </select>
        </label>
        {art === 'jahr' && (
          <label class="feld">
            <span class="feld-titel">Jahr</span>
            <input type="number" min={1918} max={1950} value={jahr} data-test="forschung-schnell-jahr"
              onInput={(e) => { const v = Number(e.currentTarget.value); if (Number.isInteger(v)) setJahr(v) }} />
            <span class="feld-hilfe">Alle Technologien bis zu diesem Jahr, ohne Doktrinen.</span>
          </label>
        )}
        {art === 'land' && (
          <label class="feld">
            <span class="feld-titel">Land</span>
            <select value={vorbild} data-test="forschung-schnell-land" onChange={(e) => setVorbild(e.currentTarget.value)}>
              {laender.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
            </select>
          </label>
        )}
        <div class="knopfreihe">
          <button class="knopf" data-test="forschung-schnell-anwenden" onClick={wendeSchnellwahlAn}>Liste ersetzen</button>
          {land.art === 'neu' && Array.isArray(land.forschung) && (
            <button class="knopf leise" data-test="forschung-automatisch" onClick={() => { setMitgeaendert([]); aktionen.aendere((p) => forschungZuruecksetzen(p, land.id)) }}>
              Wieder automatisch (bisheriger Besitzer der Hauptstadt)
            </button>
          )}
        </div>
      </div>

      <p data-test="forschung-anzahl"><strong>{liste.length} von {technologien.length} Technologien</strong>
        {land.forschung === null && <span class="leise"> · {land.art === 'neu' ? 'automatisch' : 'wie im Spiel'}</span>}</p>
      {mitgeaendert.length > 0 && (
        <p class="hinweis-zeile" data-test="forschung-mitgeaendert">Automatisch mitgeändert: {mitgeaendert.map(name).join(', ')}</p>
      )}
      <input type="text" placeholder="Technologie suchen …" value={suche} data-test="forschung-suche" onInput={(e) => setSuche(e.currentTarget.value)} />

      {bereiche.map(b => {
        const imBereich = treffer.filter(t => t.bereich === b.id)
        if (!imBereich.length) return null
        const anzahl = imBereich.filter(t => gewaehlt.has(t.id)).length
        return (
          <details class="abschnitt" key={b.id || 'weitere'} data-test={`bereich-${b.id || 'weitere'}`} open={!!s}>
            <summary>{b.name} <span class="leise">({anzahl} von {imBereich.length})</span></summary>
            <div class="knopfreihe">
              <button class="knopf klein" data-test={`bereich-${b.id}-alle`} onClick={() => schalte(imBereich.map(t => t.id), true)}>alle</button>
              <button class="knopf klein leise" data-test={`bereich-${b.id}-keine`} onClick={() => schalte(imBereich.map(t => t.id), false)}>keine</button>
            </div>
            <div class="tech-liste">
              {imBereich.map(t => (
                <label class="haken" key={t.id}>
                  <input type="checkbox" data-test={`tech-${t.id}`} checked={gewaehlt.has(t.id)}
                    onChange={(e) => { const wert = e.currentTarget.checked; schalte([t.id], wert) }} />
                  <span>{t.name}</span>
                  <span class="leise">{t.jahr ?? ''}{t.doktrin ? ' · Doktrin' : ''}</span>
                </label>
              ))}
            </div>
          </details>
        )
      })}
    </fieldset>
  )
}
