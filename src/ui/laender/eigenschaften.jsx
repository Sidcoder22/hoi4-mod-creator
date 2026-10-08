// Eigenschaften eines Anfuehrers: aus dem Spiel oder selbst erstellt.

import { useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { aendereFeld } from './gemeinsam.js'
import { aendereLand } from '../../projekt/aenderungen.js'
import { fuegeEigenschaftHinzu, aendereEigenschaft } from '../../projekt/eigenschaften.js'
import { TextFeld } from '../felder.jsx'
import { BonusEditor, bonusText } from '../bonus-editor.jsx'

function boniKurz(boni, sd) {
  return (boni ?? []).map(b => (b.art ? bonusText(b, sd) : bonusText({ art: 'frei', modifier: b.modifier, wert: b.wert }, sd))).join(', ')
}

function EigeneBearbeiten({ eig, sd, onFertig }) {
  const setze = (patch, gruppe) => aktionen.aendere((p) => aendereEigenschaft(p, eig.id, patch), { gruppe: gruppe ? `eigenschaft:${eig.id}:${gruppe}` : undefined })
  return (
    <div class="karte eigenschaft-editor">
      <h3>Eigene Eigenschaft</h3>
      <div class="formular">
        <TextFeld label="Name" wert={eig.name} test="eigenschaft-name" onAendere={(v) => setze({ name: v }, 'name')} />
        <TextFeld label="Beschreibung" wert={eig.beschreibung} test="eigenschaft-beschreibung" mehrzeilig onAendere={(v) => setze({ beschreibung: v }, 'beschreibung')} />
      </div>
      <h3>Boni</h3>
      <BonusEditor boni={eig.boni} spieldaten={sd} test="eigenschaft-bonus" onAendere={(boni) => setze({ boni }, 'boni')} />
      <div class="knopfreihe">
        <button class="knopf haupt" data-test="eigenschaft-fertig" onClick={onFertig}>Fertig</button>
      </div>
    </div>
  )
}

export function AnfuehrerEigenschaften({ land, z }) {
  const sd = z.spieldaten
  const p = z.projekt
  const [suche, setSuche] = useState('')
  const [bearbeite, setBearbeite] = useState(null)
  const liste = land.anfuehrer?.eigenschaften ?? []
  const hat = (art, id) => liste.some(x => x.art === art && x.id === id)
  const s = suche.trim().toLowerCase()
  const treffer = s ? [
    ...(sd.anfuehrerEigenschaften ?? []).filter(e => !hat('spiel', e.id) && (e.name.toLowerCase().includes(s) || e.id.includes(s))).map(e => ({ art: 'spiel', ...e })),
    ...(p.eigenschaften ?? []).filter(e => !hat('eigen', e.id) && (e.name || '').toLowerCase().includes(s)).map(e => ({ art: 'eigen', ...e })),
  ].slice(0, 30) : []
  const hinzu = (art, id) => aendereFeld(land, (l) => ({ anfuehrer: { ...l.anfuehrer, eigenschaften: [...(l.anfuehrer.eigenschaften ?? []), { art, id }] } }))
  const bearbeitete = (p.eigenschaften ?? []).find(e => e.id === bearbeite)
  return (
    <div class="karte" style={{ marginTop: '1rem' }}>
      <h3>Eigenschaften</h3>
      <p class="leise">Eigenschaften geben dem Land Boni, solange diese Person an der Macht ist – zum Beispiel «+15 % Stabilität».</p>
      {liste.length === 0 && <p class="leise">Noch keine Eigenschaft.</p>}
      <div class="boni">
        {liste.map((x, i) => {
          const e = x.art === 'spiel' ? sd.anfuehrerEigenschaften?.find(y => y.id === x.id) : p.eigenschaften?.find(y => y.id === x.id)
          return (
            <div class="zeile-geist" key={`${x.art}-${x.id}`} data-test={`eigenschaft-${x.art}-${x.id}`}>
              <span style={{ flex: 1 }}>
                <strong>{e?.name || (x.art === 'eigen' ? 'Eigene Eigenschaft ohne Namen' : x.id)}</strong> <span class="leise">{x.art === 'spiel' ? 'aus dem Spiel' : 'eigene'}</span>
                <br /><span class="leise">{e ? boniKurz(e.boni, sd) || 'keine Boni' : 'gibt es nicht mehr'}</span>
              </span>
              {x.art === 'eigen' && <button class="knopf klein leise" data-test={`eigenschaft-bearbeiten-${i}`} onClick={() => setBearbeite(x.id)}>Bearbeiten</button>}
              <button class="knopf klein leise" data-test={`eigenschaft-weg-${i}`}
                onClick={() => aendereFeld(land, (l) => ({ anfuehrer: { ...l.anfuehrer, eigenschaften: l.anfuehrer.eigenschaften.filter((_, k) => k !== i) } }))}>Entfernen</button>
            </div>
          )
        })}
      </div>
      <input type="text" style={{ marginTop: '0.6rem' }} placeholder="Eigenschaft suchen, z. B. «Volksheld» …" value={suche} data-test="eigenschaft-suche" onInput={(e) => setSuche(e.currentTarget.value)} />
      {treffer.length > 0 && (
        <div class="liste kurz">
          {treffer.map(e => (
            <button key={`${e.art}-${e.id}`} data-test={`eigenschaft-hinzu-${e.id}`} onClick={() => { hinzu(e.art, e.id); setSuche('') }}>
              ＋ {e.name || '(ohne Namen)'} <span class="leise">{e.art === 'eigen' ? 'eigene · ' : ''}{boniKurz(e.boni, sd)}</span>
            </button>
          ))}
        </div>
      )}
      <div class="knopfreihe">
        <button class="knopf" data-test="neue-eigenschaft" onClick={() => {
          let id
          aktionen.aendere((q, spieldaten) => {
            const [r, neueId] = fuegeEigenschaftHinzu(q)
            id = neueId
            const l = r.laender.find(x => x.id === land.id)
            return aendereLand(r, spieldaten, land.id, { anfuehrer: { ...l.anfuehrer, eigenschaften: [...(l.anfuehrer.eigenschaften ?? []), { art: 'eigen', id }] } })
          })
          setBearbeite(id)
        }}>＋ Neue Eigenschaft erstellen</button>
      </div>
      {bearbeitete && <EigeneBearbeiten eig={bearbeitete} sd={sd} onFertig={() => setBearbeite(null)} />}
    </div>
  )
}
