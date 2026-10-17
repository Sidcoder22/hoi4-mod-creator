// Reiter «Armee»: Divisionsvorlagen (Raster wie im Spiel) und Startverbaende.

import { useMemo } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { bearbeitbar } from './gemeinsam.js'
import { effektiveBesitzer } from '../../projekt/abgeleitet.js'
import { fuegeVorlageHinzu, aendereVorlage, setzeZelle, entferneVorlage, fuegeVerbandHinzu, aendereVerband, entferneVerband, kampfbreite } from '../../projekt/armee.js'

function Vorlage({ land, vorlage, z }) {
  const sd = z.spieldaten
  const t = `vorlage-${vorlage.id}`
  const arten = sd.einheitenArten ?? []
  const kampf = arten.filter(e => !e.unterstuetzung)
  const kompanien = arten.filter(e => e.unterstuetzung)
  const zelle = (bereich, x, y, wert, optionen, test) => (
    <select class={`armee-zelle${wert ? ' belegt' : ''}`} value={wert ?? ''} data-test={test}
      onChange={(e) => { const v = e.currentTarget.value; aktionen.aendere((p) => setzeZelle(p, land.id, vorlage.id, bereich, x, y, v || null)) }}>
      <option value="">–</option>
      {optionen.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      {wert && !optionen.some(o => o.id === wert) && <option value={wert}>{wert}</option>}
    </select>
  )
  return (
    <div class="karte vorlage" data-test={t}>
      <div class="vorlage-kopf">
        <input type="text" class="vorlage-name" value={vorlage.name} data-test={`${t}-name`}
          onInput={(e) => { const v = e.currentTarget.value; aktionen.aendere((p) => aendereVorlage(p, land.id, vorlage.id, { name: v }), { gruppe: `${t}:name` }) }} />
        <span class="leise" data-test={`${t}-breite`}>Kampfbreite {kampfbreite(sd, vorlage)}</span>
        <button class="knopf klein leise gefahr" data-test={`${t}-entfernen`} title="Vorlage entfernen"
          onClick={() => { if (confirm(`Vorlage «${vorlage.name}» und ihre Verbände entfernen?`)) aktionen.aendere((p) => entferneVorlage(p, land.id, vorlage.id)) }}>✕</button>
      </div>
      <div class="vorlage-raster">
        <div class="vorlage-kompanien">
          <span class="feld-titel">Unterstützung</span>
          {vorlage.unterstuetzung.map((art, y) => <div key={y}>{zelle('unterstuetzung', 0, y, art, kompanien, `${t}-u-${y}`)}</div>)}
        </div>
        {vorlage.bataillone.map((spalte, x) => (
          <div class="vorlage-spalte" key={x}>
            <span class="feld-titel">Spalte {x + 1}</span>
            {spalte.map((art, y) => <div key={y}>{zelle('bataillon', x, y, art, kampf, `${t}-b-${x}-${y}`)}</div>)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReiterArmee({ land, z }) {
  const { projekt, spieldaten: sd } = z
  const an = bearbeitbar(land, 'armee')
  const { vorlagen = [], verbaende = [] } = land.armee ?? {}
  const besitzer = useMemo(() => effektiveBesitzer(projekt, sd), [projekt, sd])
  const eigene = [...besitzer].filter(([, t]) => t === land.tag).map(([s]) => s).sort((a, b) => a - b)
  const andere = Object.keys(sd.staaten).map(Number).filter(s => !eigene.includes(s)).sort((a, b) => (sd.staaten[a].name ?? '').localeCompare(sd.staaten[b].name ?? '', 'de'))
  const summe = verbaende.reduce((s, v) => s + (Number(v.anzahl) || 0), 0)
  return (
    <fieldset disabled={!an} class="armee" style={{ border: 'none', padding: 0, margin: 0 }}>
      <p class="leise">Divisionsvorlagen wie im Spiel und die Divisionen, die zum Start bereitstehen{land.art === 'geaendert' ? '. Die Armee aus dem Spiel bleibt erhalten; gib neuen Vorlagen einen eigenen Namen' : ''}.</p>
      <h3>Vorlagen</h3>
      {vorlagen.map(v => <Vorlage key={v.id} land={land} vorlage={v} z={z} />)}
      <div class="knopfreihe">
        <button class="knopf" data-test="vorlage-neu" onClick={() => aktionen.aendere((p) => fuegeVorlageHinzu(p, land.id)[0])}>＋ Neue Vorlage</button>
      </div>

      <h3>Startverbände <span class="leise" data-test="armee-summe">({summe} Divisionen)</span></h3>
      <div class="liste verbaende">
        {verbaende.length === 0 && <div class="zeile leise">Noch keine Divisionen zum Start.</div>}
        {verbaende.map(vb => (
          <div class="zeile verband" key={vb.id} data-test={`verband-${vb.id}`}>
            <select value={vb.vorlage ?? ''} data-test={`verband-${vb.id}-vorlage`}
              onChange={(e) => { const v = e.currentTarget.value; aktionen.aendere((p) => aendereVerband(p, land.id, vb.id, { vorlage: v })) }}>
              {!vorlagen.some(v => v.id === vb.vorlage) && <option value="">– Vorlage wählen –</option>}
              {vorlagen.map(v => <option key={v.id} value={v.id}>{v.name || 'ohne Namen'}</option>)}
            </select>
            <span>×</span>
            <input type="number" class="staat-zahl" min={1} max={99} step={1} value={vb.anzahl} data-test={`verband-${vb.id}-anzahl`}
              onInput={(e) => { const n = Number(e.currentTarget.value); if (Number.isInteger(n)) aktionen.aendere((p) => aendereVerband(p, land.id, vb.id, { anzahl: Math.min(99, Math.max(1, n)) }), { gruppe: `verband-${vb.id}:anzahl` }) }} />
            <span>in</span>
            <select value={vb.staat ?? ''} data-test={`verband-${vb.id}-staat`}
              onChange={(e) => { const v = e.currentTarget.value; aktionen.aendere((p) => aendereVerband(p, land.id, vb.id, { staat: v === '' ? null : Number(v) })) }}>
              <option value="">Hauptstadt</option>
              <optgroup label="Eigene Staaten">{eigene.map(s => <option key={s} value={s}>{sd.staaten[s]?.name ?? `Staat ${s}`}</option>)}</optgroup>
              <optgroup label="Andere Staaten">{andere.map(s => <option key={s} value={s}>{sd.staaten[s]?.name ?? `Staat ${s}`}</option>)}</optgroup>
            </select>
            <button class="knopf klein leise" data-test={`verband-${vb.id}-entfernen`} onClick={() => aktionen.aendere((p) => entferneVerband(p, land.id, vb.id))}>✕</button>
          </div>
        ))}
      </div>
      <div class="knopfreihe">
        <button class="knopf" data-test="verband-neu" disabled={!vorlagen.length} onClick={() => aktionen.aendere((p) => fuegeVerbandHinzu(p, land.id)[0])}>＋ Verband</button>
      </div>
    </fieldset>
  )
}
