// Bonus-Auswahl fuer Geister und Eigenschaften: feste Liste plus alle Boni aus dem Spiel.

import { useState } from 'preact/hooks'
import { BONI, bonusText } from '../projekt/boni.js'

const runde = (x) => Math.round(x * 100000) / 100000

export { bonusText }

function FreierBonus({ bonus, sd, test, onAendere }) {
  const [suche, setSuche] = useState('')
  const modifikator = sd?.modifikatoren?.find(x => x.id === bonus.modifier)
  const s = suche.trim().toLowerCase()
  const treffer = s ? (sd?.modifikatoren ?? []).filter(m => m.name.toLowerCase().includes(s) || m.id.includes(s)).slice(0, 20) : []
  return (
    <div class="freier-bonus">
      <span class="leise">{bonus.modifier ? `Gewählt: ${modifikator && modifikator.name !== bonus.modifier ? `${modifikator.name} (${bonus.modifier})` : bonus.modifier}` : 'Noch kein Bonus gewählt'}</span>
      <input type="text" placeholder="Bonus suchen, z. B. «Konsum», «speed», «training» …" value={suche} data-test={test} onInput={(e) => setSuche(e.currentTarget.value)} />
      {s && (
        <div class="liste kurz">
          {treffer.map(m => (
            <button key={m.id} data-test={`${test}-${m.id}`} onClick={() => { onAendere({ ...bonus, modifier: m.id }); setSuche('') }}>
              {m.name} <span class="leise">{m.id}{m.prozent ? ' · in %' : ''}</span>
            </button>
          ))}
          <button data-test={`${test}-eigen`} onClick={() => { onAendere({ ...bonus, modifier: suche.trim() }); setSuche('') }}>
            «{suche.trim()}» als eigenen Bonus verwenden <span class="leise">für Profis</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function BonusEditor({ boni, onAendere, spieldaten: sd, test = 'bonus' }) {
  const setze = (i, neu) => onAendere(boni.map((b, k) => (k === i ? neu : b)))
  return (
    <div class="boni">
      {boni.map((bonus, i) => {
        const frei = bonus.art === 'frei'
        const info = BONI.find(x => x.art === bonus.art)
        const prozent = frei ? !!sd?.modifikatoren?.find(x => x.id === bonus.modifier)?.prozent : info?.einheit === 'prozent'
        const anzeige = frei ? (prozent ? runde(bonus.wert * 100) : bonus.wert) : bonus.wert
        return (
          <div class="bonus" key={i}>
            <select value={bonus.art} data-test={`${test}-art-${i}`} onChange={(e) => {
              const art = e.currentTarget.value
              if (art === 'frei') return setze(i, { art: 'frei', modifier: '', wert: 0 })
              const neu = BONI.find(x => x.art === art)
              setze(i, { art, wert: frei ? neu.schritt * 5 : Math.min(neu.max, Math.max(neu.min, Number(bonus.wert) || 0)) })
            }}>
              {BONI.map(x => <option key={x.art} value={x.art}>{x.name}</option>)}
              <option value="frei">Weiterer Bonus aus dem Spiel …</option>
            </select>
            <span class="zahl-zeile">
              <input type="number" value={anzeige} min={info?.min} max={info?.max} step={info?.schritt ?? 'any'} data-test={`${test}-wert-${i}`}
                onInput={(e) => {
                  const v = Number(e.currentTarget.value)
                  if (e.currentTarget.value === '' || Number.isNaN(v)) return
                  if (frei) setze(i, { ...bonus, wert: prozent ? runde(v / 100) : v })
                  else setze(i, { ...bonus, wert: Math.min(info.max, Math.max(info.min, v)) })
                }} />
              <span class="einheit">{prozent ? '%' : (frei ? '' : 'pro Tag')}</span>
            </span>
            <button class="knopf klein leise" data-test={`${test}-entfernen-${i}`} onClick={() => onAendere(boni.filter((_, k) => k !== i))}>Entfernen</button>
            {frei && <FreierBonus bonus={bonus} sd={sd} test={`${test}-frei-${i}`} onAendere={(neu) => setze(i, neu)} />}
          </div>
        )
      })}
      <div class="knopfreihe">
        <button class="knopf" data-test={`${test}-neu`} onClick={() => onAendere([...boni, { art: 'stabilitaet', wert: 5 }])}>＋ Bonus hinzufügen</button>
      </div>
    </div>
  )
}
