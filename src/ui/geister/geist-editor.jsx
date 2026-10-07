import { useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { TextFeld } from '../felder.jsx'
import { aendereGeist, entferneGeist, fuegeBildHinzu } from '../../projekt/aenderungen.js'
import { BONI } from '../../projekt/boni.js'
import { SpielBild } from '../bild.jsx'
import { BildZuschnitt } from '../bild-zuschnitt.jsx'
import { GeistBild } from './geist-bild.jsx'
import { landName } from '../../projekt/abgeleitet.js'

function aendere(geist, patch, gruppe) {
  aktionen.aendere((p) => {
    const aktuell = p.ideen.find(g => g.id === geist.id)
    if (!aktuell) return p
    return aendereGeist(p, geist.id, typeof patch === 'function' ? patch(aktuell) : patch)
  }, { gruppe: gruppe ? `geist:${geist.id}:${gruppe}` : undefined })
}

export function GeistEditor({ z }) {
  const geist = z.projekt.ideen.find(g => g.id === z.ansicht.id)
  const [suche, setSuche] = useState('')
  if (!geist) {
    return (
      <div class="ansicht">
        <p>Diesen nationalen Geist gibt es nicht mehr.</p>
        <button class="knopf" onClick={() => aktionen.gehe({ bereich: 'geister' })}>Zur Übersicht</button>
      </div>
    )
  }
  const sd = z.spieldaten
  const [b, h] = sd.bildgroessen?.idee || [64, 64]
  const s = suche.trim().toLowerCase()
  const bilder = sd.ideenBilder.filter(n => !s || n.toLowerCase().includes(s)).slice(0, 300)
  const nutzer = z.projekt.laender.filter(l => l.ideen.includes(geist.id))
  const setzeBonus = (i, patch) => aendere(geist, (g) => ({ boni: g.boni.map((x, k) => (k === i ? { ...x, ...patch } : x)) }), `bonus-${i}`)
  return (
    <div class="ansicht" data-test="geist-editor">
      <div class="land-kopf">
        <GeistBild geist={geist} projekt={z.projekt} groesse={64} />
        <h1>{geist.name || 'Neuer nationaler Geist'}</h1>
        <div class="rechts">
          <button class="knopf leise" onClick={() => aktionen.gehe({ bereich: 'geister' })}>← Alle Geister</button>
          <button class="knopf leise gefahr" data-test="geist-loeschen"
            onClick={() => {
              const hinweis = nutzer.length ? `\nEr wird auch bei ${nutzer.map(l => landName(l.tag, z.projekt, sd)).join(', ')} entfernt.` : ''
              if (confirm(`«${geist.name || 'Diesen Geist'}» wirklich löschen?${hinweis}`)) {
                aktionen.aendere((p) => entferneGeist(p, geist.id))
                aktionen.gehe({ bereich: 'geister' })
              }
            }}>Löschen</button>
        </div>
      </div>
      <div class="karte formular">
        <TextFeld label="Name" wert={geist.name} test="geist-name" hilfe="So heisst der Geist im Spiel, z. B. «Alpenfestung»." onAendere={(v) => aendere(geist, { name: v }, 'name')} />
        <TextFeld label="Beschreibung" wert={geist.beschreibung} test="geist-beschreibung" mehrzeilig hilfe="Erscheint, wenn man im Spiel mit der Maus über den Geist fährt." onAendere={(v) => aendere(geist, { beschreibung: v }, 'beschreibung')} />
      </div>
      <div class="karte">
        <h3>Boni</h3>
        <p class="leise">Positive Werte helfen dem Land, negative schaden ihm.</p>
        <div class="boni">
          {geist.boni.map((bonus, i) => {
            const info = BONI.find(x => x.art === bonus.art) || BONI[0]
            return (
              <div class="bonus" key={i}>
                <select value={bonus.art} data-test={`bonus-art-${i}`} onChange={(e) => {
                  const neu = BONI.find(x => x.art === e.currentTarget.value)
                  setzeBonus(i, { art: neu.art, wert: Math.min(neu.max, Math.max(neu.min, bonus.wert)) })
                }}>
                  {BONI.map(x => <option key={x.art} value={x.art}>{x.name}</option>)}
                </select>
                <span class="zahl-zeile">
                  <input type="number" value={bonus.wert} min={info.min} max={info.max} step={info.schritt} data-test={`bonus-wert-${i}`}
                    onInput={(e) => { const v = Number(e.currentTarget.value); if (e.currentTarget.value !== '' && !Number.isNaN(v)) setzeBonus(i, { wert: Math.min(info.max, Math.max(info.min, v)) }) }} />
                  <span class="einheit">{info.einheit === 'prozent' ? '%' : 'pro Tag'}</span>
                </span>
                <button class="knopf klein leise" data-test={`bonus-entfernen-${i}`} onClick={() => aendere(geist, (g) => ({ boni: g.boni.filter((_, k) => k !== i) }))}>Entfernen</button>
              </div>
            )
          })}
        </div>
        <div class="knopfreihe">
          <button class="knopf" data-test="bonus-neu" onClick={() => aendere(geist, (g) => ({ boni: [...g.boni, { art: 'stabilitaet', wert: 5 }] }))}>＋ Bonus hinzufügen</button>
        </div>
      </div>
      <div class="karte">
        <h3>Bild</h3>
        <input type="text" placeholder="Bilder durchsuchen, z. B. «army» oder «industry» …" value={suche} data-test="geistbild-suche" onInput={(e) => setSuche(e.currentTarget.value)} />
        <div class="galerie" style={{ marginTop: '0.5rem' }}>
          {bilder.map(n => (
            <button key={n} data-test={`geistbild-${n}`} title={n.replace(/^GFX_idea_/, '')} class={geist.bild?.art === 'spiel' && geist.bild.sprite === n ? 'aktiv' : ''}
              onClick={() => aendere(geist, { bild: { art: 'spiel', sprite: n } })}>
              <SpielBild schluessel={`idee:${n}`} alt={n} />
            </button>
          ))}
        </div>
        <p class="leise">Oder ein eigenes Bild hochladen:</p>
        <BildZuschnitt test="geistbild" zielBreite={b} zielHoehe={h} anzeigeBreite={200}
          onFertig={(bild) => aktionen.aendere((p) => {
            const [q, bildId] = fuegeBildHinzu(p, bild)
            return aendereGeist(q, geist.id, { bild: { art: 'eigen', bildId } })
          })} />
      </div>
    </div>
  )
}
