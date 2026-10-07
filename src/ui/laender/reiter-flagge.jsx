import { useEffect, useRef } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { VORLAGEN, SYMBOLE, zeichneFlagge } from '../../erzeuger/flagge.js'
import { aendereLand, fuegeBildHinzu } from '../../projekt/aenderungen.js'
import { projektBildRgba } from '../bilder.js'
import { BildZuschnitt } from '../bild-zuschnitt.jsx'

function FlaggenCanvas({ flagge, projekt, breite, hoehe, anzeige = 1, test }) {
  const c = useRef(null)
  useEffect(() => {
    if (!c.current) return
    const rgba = zeichneFlagge(flagge, breite, hoehe, (id) => projektBildRgba(projekt, id))
    const ctx = c.current.getContext('2d')
    if (anzeige === 1) {
      ctx.putImageData(new ImageData(rgba, breite, hoehe), 0, 0)
      return
    }
    const zwischen = document.createElement('canvas')
    zwischen.width = breite
    zwischen.height = hoehe
    zwischen.getContext('2d').putImageData(new ImageData(rgba, breite, hoehe), 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, breite * anzeige, hoehe * anzeige)
    ctx.drawImage(zwischen, 0, 0, breite * anzeige, hoehe * anzeige)
  })
  return <canvas ref={c} width={breite * anzeige} height={hoehe * anzeige} data-test={test} />
}

export function ReiterFlagge({ land, z }) {
  const an = bearbeitbar(land, 'flagge')
  const f = land.flagge
  const setze = (patch) => aendereFeld(land, { flagge: { ...f, ...patch } })
  const vorlage = VORLAGEN.find(v => v.id === f.vorlage) || VORLAGEN[0]
  const farben = [...(f.farben || [])]
  while (farben.length < 3) farben.push('#808080')
  return (
    <fieldset disabled={!an} style={{ border: 'none', padding: 0, margin: 0 }}>
      <div class="flaggen-vorschau">
        <FlaggenCanvas flagge={f} projekt={z.projekt} breite={82} hoehe={52} anzeige={2} test="flagge-vorschau" />
        <FlaggenCanvas flagge={f} projekt={z.projekt} breite={41} hoehe={26} />
        <FlaggenCanvas flagge={f} projekt={z.projekt} breite={10} hoehe={7} />
        <span class="leise">So erscheint die Flagge im Spiel – gross, mittel und klein.</span>
      </div>
      <div class="knopfreihe" style={{ marginTop: 0, marginBottom: '1rem' }}>
        <button class={`knopf${f.art !== 'bild' ? ' haupt' : ''}`} data-test="flagge-art-designer" onClick={() => setze({ art: 'designer' })}>Flagge gestalten</button>
        <button class={`knopf${f.art === 'bild' ? ' haupt' : ''}`} data-test="flagge-art-bild" onClick={() => setze({ art: 'bild' })}>Eigenes Bild verwenden</button>
      </div>
      {f.art === 'bild' ? (
        <div class="karte">
          <h3>Eigenes Flaggenbild</h3>
          {!f.bildId && <p class="leise">Noch kein Bild gewählt.</p>}
          <BildZuschnitt test="flaggenbild" zielBreite={82} zielHoehe={52}
            onFertig={(bild) => aktionen.aendere((p, sd) => {
              const [q, bildId] = fuegeBildHinzu(p, bild)
              return aendereLand(q, sd, land.id, { flagge: { ...f, art: 'bild', bildId } })
            })} />
        </div>
      ) : (
        <div class="karte">
          <h3>Muster</h3>
          <div class="vorlagen">
            {VORLAGEN.map(v => (
              <button key={v.id} class={`vorlage${v.id === f.vorlage ? ' aktiv' : ''}`} data-test={`flagge-vorlage-${v.id}`} onClick={() => setze({ vorlage: v.id })}>
                <FlaggenCanvas flagge={{ ...f, art: 'designer', vorlage: v.id, symbol: null }} projekt={z.projekt} breite={82} hoehe={52} />
                {v.name}
              </button>
            ))}
          </div>
          <h3>Farben</h3>
          <div class="farbreihe">
            {Array.from({ length: vorlage.farben }, (_, i) => (
              <label class="feld" key={i}>
                <span class="feld-titel">Farbe {i + 1}</span>
                <input type="color" value={farben[i]} data-test={`flagge-farbe-${i}`}
                  onInput={(e) => { const neu = [...farben]; neu[i] = e.currentTarget.value; setze({ farben: neu }) }} />
              </label>
            ))}
          </div>
          <h3>Symbol in der Mitte</h3>
          <div class="vorlagen">
            <button class={`vorlage${!f.symbol ? ' aktiv' : ''}`} data-test="flagge-symbol-keins" onClick={() => setze({ symbol: null })}>
              <FlaggenCanvas flagge={{ ...f, art: 'designer', symbol: null }} projekt={z.projekt} breite={82} hoehe={52} />
              Kein Symbol
            </button>
            {SYMBOLE.map(s => (
              <button key={s.id} class={`vorlage${s.id === f.symbol ? ' aktiv' : ''}`} data-test={`flagge-symbol-${s.id}`} onClick={() => setze({ symbol: s.id })}>
                <FlaggenCanvas flagge={{ ...f, art: 'designer', symbol: s.id }} projekt={z.projekt} breite={82} hoehe={52} />
                {s.name}
              </button>
            ))}
          </div>
          {f.symbol && (
            <label class="feld" style={{ marginTop: '0.8rem' }}>
              <span class="feld-titel">Farbe des Symbols</span>
              <input type="color" value={f.symbolFarbe || '#ffd700'} data-test="flagge-symbolfarbe" onInput={(e) => setze({ symbolFarbe: e.currentTarget.value })} />
            </label>
          )}
        </div>
      )}
    </fieldset>
  )
}
