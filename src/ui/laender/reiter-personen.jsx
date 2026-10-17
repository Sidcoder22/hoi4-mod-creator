// Reiter «Personen»: neue Generaele, Feldmarschaelle, Admirale und Berater eines Landes.

import { useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { bearbeitbar } from './gemeinsam.js'
import { fuegeBildHinzu } from '../../projekt/aenderungen.js'
import { fuegePersonHinzu, aenderePerson, entfernePerson } from '../../projekt/personen.js'
import { SpielBild } from '../bild.jsx'
import { BildZuschnitt } from '../bild-zuschnitt.jsx'
import { projektBildUrl } from '../bilder.js'

const ROLLEN = [
  { wert: 'general', text: 'General' }, { wert: 'feldmarschall', text: 'Feldmarschall' },
  { wert: 'admiral', text: 'Admiral' }, { wert: 'berater', text: 'Berater' },
]
const PLAETZE = [
  { wert: 'political_advisor', text: 'Politischer Berater' }, { wert: 'army_chief', text: 'Generalstab Heer' },
  { wert: 'navy_chief', text: 'Generalstab Marine' }, { wert: 'air_chief', text: 'Generalstab Luftwaffe' },
  { wert: 'high_command', text: 'Oberkommando' }, { wert: 'theorist', text: 'Theoretiker' },
]
const HEER = [['angriff', 'Angriff'], ['verteidigung', 'Verteidigung'], ['planung', 'Planung'], ['logistik', 'Logistik']]
const MARINE = [['angriff', 'Angriff'], ['verteidigung', 'Verteidigung'], ['manoever', 'Manöver'], ['koordination', 'Koordination']]

function Zahl19({ wert, test, onAendere }) {
  return (
    <input type="number" class="staat-zahl" min={1} max={9} step={1} value={wert} data-test={test}
      onInput={(e) => { const v = Number(e.currentTarget.value); if (Number.isInteger(v)) onAendere(Math.min(9, Math.max(1, v))) }} />
  )
}

function PersonKarte({ land, person, z }) {
  const sd = z.spieldaten
  const [suche, setSuche] = useState('')
  const [zeigeBilder, setZeigeBilder] = useState(false)
  const t = `person-${person.id}`
  const setze = (patch, gruppe) => aktionen.aendere((p, s) => aenderePerson(p, s, land.id, person.id, patch), { gruppe: gruppe ? `${t}:${gruppe}` : undefined })
  const [b, h] = sd.bildgroessen?.portraet || [156, 210]
  const bildUrl = person.bild?.art === 'eigen' ? projektBildUrl(z.projekt, person.bild.bildId) : null
  const berater = person.rolle === 'berater'
  const werteListe = person.rolle === 'admiral' ? MARINE : HEER
  const s = suche.trim().toLowerCase()
  const eigenschaften = (sd.fuehrerEigenschaften ?? []).filter(e => e.rollen.includes(person.rolle))
    .filter(e => !s || e.name.toLowerCase().includes(s) || e.id.includes(s) || person.eigenschaften?.includes(e.id))
  const beraterWahl = [
    ...(z.projekt.eigenschaften ?? []).map(e => ({ wert: `eigen:${e.id}`, text: `${e.name || 'Eigene Eigenschaft'} (eigene)` })),
    ...(sd.anfuehrerEigenschaften ?? []).map(e => ({ wert: `spiel:${e.id}`, text: e.name })),
  ]
  const beraterWert = person.beraterEigenschaft ? `${person.beraterEigenschaft.art}:${person.beraterEigenschaft.id}` : ''
  return (
    <div class="karte person" data-test={t}>
      <div class="person-kopf">
        {bildUrl ? <img src={bildUrl} alt="" class="person-bild" /> : <SpielBild schluessel={`portraet:${person.bild?.pfad}`} klasse="person-bild" alt="" />}
        <div class="person-felder">
          <div class="staat-zeile">
            <label>Rolle</label>
            <select value={person.rolle} data-test={`${t}-rolle`} onChange={(e) => setze({ rolle: e.currentTarget.value })}>
              {ROLLEN.map(r => <option key={r.wert} value={r.wert}>{r.text}</option>)}
            </select>
            <span />
          </div>
          <div class="staat-zeile">
            <label>Name</label>
            <input type="text" value={person.name} data-test={`${t}-name`} onInput={(e) => { const v = e.currentTarget.value; setze({ name: v }, 'name') }} />
            <span />
          </div>
        </div>
        <button class="knopf klein leise gefahr" data-test={`${t}-entfernen`} title="Person entfernen"
          onClick={() => { if (confirm(`«${person.name || 'Person'}» entfernen?`)) aktionen.aendere((p) => entfernePerson(p, land.id, person.id)) }}>✕</button>
      </div>

      {berater ? (
        <div class="person-werte">
          <div class="staat-zeile">
            <label>Platz</label>
            <select value={person.platz} data-test={`${t}-platz`} onChange={(e) => setze({ platz: e.currentTarget.value })}>
              {PLAETZE.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
            </select>
            <span />
          </div>
          <div class="staat-zeile">
            <label>Kosten (politische Macht)</label>
            <input type="number" class="staat-zahl" min={0} max={500} step={5} value={person.kosten} data-test={`${t}-kosten`}
              onInput={(e) => { const v = Number(e.currentTarget.value); if (Number.isFinite(v)) setze({ kosten: Math.min(500, Math.max(0, Math.round(v))) }, 'kosten') }} />
            <span />
          </div>
          <div class="staat-zeile">
            <label>Eigenschaft</label>
            <select value={beraterWert} data-test={`${t}-beratereig`}
              onChange={(e) => { const [art, ...rest] = e.currentTarget.value.split(':'); setze({ beraterEigenschaft: art ? { art, id: rest.join(':') } : null }) }}>
              <option value="">– keine –</option>
              {beraterWahl.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
            </select>
            <span />
          </div>
        </div>
      ) : (
        <>
          <div class="person-werte raster4">
            <label class="baustein-feld"><span class="feld-titel">Stufe</span><Zahl19 wert={person.stufe} test={`${t}-stufe`} onAendere={(v) => setze({ stufe: v }, 'stufe')} /></label>
            {werteListe.map(([feld, text]) => (
              <label class="baustein-feld" key={feld}><span class="feld-titel">{text}</span>
                <Zahl19 wert={person.werte?.[feld] ?? 1} test={`${t}-${feld}`} onAendere={(v) => setze({ werte: { ...person.werte, [feld]: v } }, feld)} />
              </label>
            ))}
          </div>
          <details class="abschnitt">
            <summary>Eigenschaften ({person.eigenschaften?.length ?? 0})</summary>
            <input type="text" placeholder="Eigenschaft suchen …" value={suche} data-test={`${t}-eig-suche`} onInput={(e) => setSuche(e.currentTarget.value)} />
            <div class="tech-liste">
              {eigenschaften.map(e => (
                <label class="haken" key={e.id}>
                  <input type="checkbox" data-test={`${t}-eig-${e.id}`} checked={person.eigenschaften?.includes(e.id)}
                    onChange={(ev) => { const an = ev.currentTarget.checked; setze({ eigenschaften: an ? [...person.eigenschaften, e.id] : person.eigenschaften.filter(x => x !== e.id) }) }} />
                  <span>{e.name}</span>
                </label>
              ))}
            </div>
          </details>
        </>
      )}

      <details class="abschnitt" open={zeigeBilder} onToggle={(e) => setZeigeBilder(e.currentTarget.open)}>
        <summary>Porträt</summary>
        {zeigeBilder && (
          <div class="galerie portraets">
            {sd.portraets.map((pfad, i) => (
              <button key={pfad} data-test={`${t}-portraet-${i}`} class={person.bild?.art === 'spiel' && person.bild.pfad === pfad ? 'aktiv' : ''}
                onClick={() => setze({ bild: { art: 'spiel', pfad } })}>
                <SpielBild schluessel={`portraet:${pfad}`} alt="Porträt" />
              </button>
            ))}
          </div>
        )}
        <BildZuschnitt test={`${t}-bild`} zielBreite={b} zielHoehe={h} anzeigeBreite={160}
          onFertig={(bild) => aktionen.aendere((p, s2) => { const [q, bildId] = fuegeBildHinzu(p, bild); return aenderePerson(q, s2, land.id, person.id, { bild: { art: 'eigen', bildId } }) })} />
      </details>
    </div>
  )
}

export function ReiterPersonen({ land, z }) {
  const an = bearbeitbar(land, 'personen')
  const neu = (rolle) => aktionen.aendere((p, sd) => fuegePersonHinzu(p, sd, land.id, rolle)[0])
  return (
    <fieldset disabled={!an} class="personen" style={{ border: 'none', padding: 0, margin: 0 }}>
      <p class="leise">Neue Heerführer, Admirale und Berater. Sie stehen dem Land ab Spielbeginn zur Verfügung{land.art === 'geaendert' ? '; die Personen aus dem Spiel bleiben erhalten' : ''}.</p>
      {(land.personen ?? []).map(person => <PersonKarte key={person.id} land={land} person={person} z={z} />)}
      <div class="knopfreihe">
        <button class="knopf" data-test="person-neu-general" onClick={() => neu('general')}>＋ General</button>
        <button class="knopf" data-test="person-neu-feldmarschall" onClick={() => neu('feldmarschall')}>＋ Feldmarschall</button>
        <button class="knopf" data-test="person-neu-admiral" onClick={() => neu('admiral')}>＋ Admiral</button>
        <button class="knopf" data-test="person-neu-berater" onClick={() => neu('berater')}>＋ Berater</button>
      </div>
    </fieldset>
  )
}
