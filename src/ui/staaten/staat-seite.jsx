// Seitenleiste fuer einen Staat: Allgemein, Gebaeude, Ressourcen, Provinzen.

import { useEffect, useRef, useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { aendereStaat, setzeGebaeude, setzeRessource, setzeProvinz, setzeProvinzGebaeude, verwerfeStaat, effektiveStaatswerte } from '../../projekt/staaten.js'

const aendere = (id, fn, gruppe) => aktionen.aendere((p, sd) => fn(p, sd), { gruppe: `staat:${id}:${gruppe}` })

function Zurueck({ an, test, onKlick }) {
  // Platzhalter, damit die Felder auch ohne Knopf in einer Spalte bleiben
  if (!an) return <span class="zurueck-platz" />
  return <button class="knopf klein leise" title="Auf den Wert aus dem Spiel zurücksetzen" data-test={`${test}-zurueck`} onClick={onKlick}>↺ Spielwert</button>
}

function Zahl({ wert, test, min = 0, max, onAendere }) {
  return (
    <input type="number" class="staat-zahl" value={wert ?? 0} min={min} max={max} step={1} data-test={test}
      onInput={(e) => {
        const v = e.currentTarget.value
        if (v === '' || Number.isNaN(Number(v))) return
        onAendere(Math.max(min, Math.round(Number(v))))
      }} />
  )
}

/** Textfeld, das beim Leeren nicht sofort auf den Spielwert springt: leer zaehlt erst beim Verlassen. */
function NamensFeld({ wert, test, onAendere }) {
  const [text, setText] = useState(wert)
  const fokus = useRef(false)
  useEffect(() => { if (!fokus.current) setText(wert) }, [wert])
  return (
    <input type="text" value={text} data-test={test}
      onFocus={() => { fokus.current = true }}
      onInput={(e) => { const v = e.currentTarget.value; setText(v); if (v.trim()) onAendere(v) }}
      onBlur={() => { fokus.current = false; if (!text.trim()) { onAendere(''); setText(wert) } }} />
  )
}

/** Stufe mit Minus und Plus (0 … max). */
function Stufe({ wert, max, test, onAendere }) {
  const w = Number(wert) || 0
  return (
    <span class="stufe">
      <button class="knopf klein" data-test={`${test}-minus`} disabled={w <= 0} onClick={() => onAendere(w - 1)}>−</button>
      <Zahl wert={w} max={max} test={test} onAendere={onAendere} />
      <button class="knopf klein" data-test={`${test}-plus`} disabled={w >= max} onClick={() => onAendere(w + 1)}>＋</button>
    </span>
  )
}

export function StaatSeite({ staatId, z }) {
  const sd = z.spieldaten
  const staat = sd.staaten[staatId]
  const werte = effektiveStaatswerte(z.projekt, sd, staatId)
  if (!staat || !werte) {
    return (
      <aside class="staat-seite leer" data-test="staat-seite">
        <p>Diesen Staat gibt es im eingelesenen Spiel nicht.</p>
        {z.projekt.staaten?.[staatId] && <button class="knopf" data-test="staat-verwerfen" onClick={() => aktionen.aendere((p) => verwerfeStaat(p, staatId))}>Änderungen verwerfen</button>}
      </aside>
    )
  }
  const a = z.projekt.staaten?.[staatId] ?? {}
  const arten = sd.gebaeudeArten ?? []
  const staatMitKueste = staat.provinzen.some(prov => sd.provinzKueste?.[prov])
  // Kuestengebaeude wie Werften nur in Staaten am Meer (ausser sie sind schon gesetzt)
  const staatsGebaeude = arten.filter(g => !g.provinz && (!g.kueste || staatMitKueste || werte.gebaeude[g.id]))
  const provinzArten = arten.filter(g => g.provinz)
  const kategorien = sd.staatsKategorien ?? []
  return (
    <aside class="staat-seite" data-test="staat-seite">
      <div class="staat-kopf">
        <h2>{werte.name}</h2>
        <span class="leise">Staat {staatId} · Spielname «{staat.name}»</span>
      </div>

      <details class="abschnitt" open>
        <summary>Allgemein</summary>
        <div class="staat-zeile">
          <label>Name</label>
          <NamensFeld key={staatId} wert={werte.name} test="staat-name" onAendere={(v) => aendere(staatId, (p, s) => aendereStaat(p, s, staatId, { name: v }), 'name')} />
          <Zurueck an={a.name !== undefined} test="staat-name" onKlick={() => aendere(staatId, (p, s) => aendereStaat(p, s, staatId, { name: '' }), 'name-zurueck')} />
        </div>
        <div class="staat-zeile">
          <label>Einwohner</label>
          <Zahl wert={werte.einwohner} test="staat-einwohner" onAendere={(v) => aendere(staatId, (p, s) => aendereStaat(p, s, staatId, { einwohner: v }), 'einwohner')} />
          <Zurueck an={a.einwohner !== undefined} test="staat-einwohner" onKlick={() => aendere(staatId, (p, s) => aendereStaat(p, s, staatId, { einwohner: s.staaten[staatId].manpower }), 'einwohner-zurueck')} />
        </div>
        <div class="staat-zeile">
          <label>Kategorie</label>
          <select value={werte.kategorie ?? ''} data-test="staat-kategorie" onChange={(e) => { const v = e.currentTarget.value; aendere(staatId, (p, s) => aendereStaat(p, s, staatId, { kategorie: v }), 'kategorie') }}>
            {!kategorien.some(k => k.id === werte.kategorie) && <option value={werte.kategorie ?? ''}>{werte.kategorie ?? '–'}</option>}
            {kategorien.map(k => <option key={k.id} value={k.id}>{k.name} · {k.bauplaetze} Plätze</option>)}
          </select>
          <Zurueck an={a.kategorie !== undefined} test="staat-kategorie" onKlick={() => aendere(staatId, (p, s) => aendereStaat(p, s, staatId, { kategorie: s.staaten[staatId].kategorie }), 'kategorie-zurueck')} />
        </div>
        <div class="staat-zeile">
          <label>Zusätzliche Bauplätze</label>
          <Zahl wert={werte.extraBauplaetze} test="staat-extra" onAendere={(v) => aendere(staatId, (p, s) => aendereStaat(p, s, staatId, { extraBauplaetze: v }), 'extra')} />
          <Zurueck an={a.extraBauplaetze !== undefined} test="staat-extra" onKlick={() => aendere(staatId, (p, s) => aendereStaat(p, s, staatId, { extraBauplaetze: 0 }), 'extra-zurueck')} />
        </div>
        <p class={`staat-belegung${werte.belegt > werte.bauplaetze ? ' zu-voll' : ''}`} data-test="staat-belegung">
          {werte.belegt} von {werte.bauplaetze} Bauplätzen belegt
        </p>
      </details>

      <details class="abschnitt" open>
        <summary>Gebäude</summary>
        {staatsGebaeude.map(g => (
          <div class="staat-zeile" key={g.id}>
            <label>{g.name}{g.gemeinsamerPlatz && <span class="leise"> · Bauplatz</span>}</label>
            <Stufe wert={werte.gebaeude[g.id]} max={g.maxStufe} test={`gebaeude-${g.id}`} onAendere={(v) => aendere(staatId, (p, s) => setzeGebaeude(p, s, staatId, g.id, v), `gebaeude-${g.id}`)} />
            <Zurueck an={a.gebaeude?.[g.id] !== undefined} test={`gebaeude-${g.id}`} onKlick={() => aendere(staatId, (p, s) => setzeGebaeude(p, s, staatId, g.id, s.staaten[staatId].gebaeude?.[g.id] ?? 0), `gebaeude-${g.id}-zurueck`)} />
          </div>
        ))}
      </details>

      <details class="abschnitt" open>
        <summary>Ressourcen</summary>
        {(sd.ressourcenArten ?? []).map(r => (
          <div class="staat-zeile" key={r.id}>
            <label>{r.name}</label>
            <Zahl wert={werte.ressourcen[r.id] ?? 0} test={`ressource-${r.id}`} onAendere={(v) => aendere(staatId, (p, s) => setzeRessource(p, s, staatId, r.id, v), `ressource-${r.id}`)} />
            <Zurueck an={a.ressourcen?.[r.id] !== undefined} test={`ressource-${r.id}`} onKlick={() => aendere(staatId, (p, s) => setzeRessource(p, s, staatId, r.id, s.staaten[staatId].ressourcen?.[r.id] ?? 0), `ressource-${r.id}-zurueck`)} />
          </div>
        ))}
      </details>

      <details class="abschnitt" open>
        <summary>Provinzen</summary>
        {staat.provinzen.map(prov => {
          const ap = a.provinzen?.[prov] ?? {}
          const vp = werte.siegpunkte[prov] ?? 0
          const kueste = !!sd.provinzKueste?.[prov]
          return (
            <div class="karte provinz" key={prov} data-test={`provinz-${prov}`}>
              <strong>Provinz {prov}{kueste ? ' · Küste' : ''}</strong>
              <div class="staat-zeile">
                <label>Siegpunkte</label>
                <Zahl wert={vp} test={`provinz-${prov}-siegpunkte`} onAendere={(v) => aendere(staatId, (p, s) => setzeProvinz(p, s, staatId, prov, 'siegpunkte', v), `vp-${prov}`)} />
                <Zurueck an={ap.siegpunkte !== undefined} test={`provinz-${prov}-siegpunkte`} onKlick={() => aendere(staatId, (p, s) => setzeProvinz(p, s, staatId, prov, 'siegpunkte', s.staaten[staatId].siegpunkte?.[prov] ?? 0), `vp-${prov}-zurueck`)} />
              </div>
              {vp > 0 && (
                <div class="staat-zeile">
                  <label>Name des Siegpunkts</label>
                  <input type="text" value={werte.siegpunktNamen[prov] ?? ''} data-test={`provinz-${prov}-name`}
                    onInput={(e) => { const v = e.currentTarget.value; aendere(staatId, (p, s) => setzeProvinz(p, s, staatId, prov, 'siegpunktName', v), `vpname-${prov}`) }} />
                  <Zurueck an={ap.siegpunktName !== undefined} test={`provinz-${prov}-name`} onKlick={() => aendere(staatId, (p, s) => setzeProvinz(p, s, staatId, prov, 'siegpunktName', s.siegpunktNamen?.[prov] ?? ''), `vpname-${prov}-zurueck`)} />
                </div>
              )}
              {provinzArten.filter(g => !g.kueste || kueste).map(g => (
                <div class="staat-zeile" key={g.id}>
                  <label>{g.name}</label>
                  <Stufe wert={werte.provinzGebaeude[prov]?.[g.id]} max={g.maxStufe} test={`provinz-${prov}-${g.id}`}
                    onAendere={(v) => aendere(staatId, (p, s) => setzeProvinzGebaeude(p, s, staatId, prov, g.id, v), `pg-${prov}-${g.id}`)} />
                  <Zurueck an={ap.gebaeude?.[g.id] !== undefined} test={`provinz-${prov}-${g.id}`}
                    onKlick={() => aendere(staatId, (p, s) => setzeProvinzGebaeude(p, s, staatId, prov, g.id, s.staaten[staatId].provinzGebaeude?.[prov]?.[g.id] ?? 0), `pg-${prov}-${g.id}-zurueck`)} />
                </div>
              ))}
            </div>
          )
        })}
      </details>

      <div class="knopfreihe">
        <button class="knopf leise gefahr" data-test="staat-verwerfen" disabled={!z.projekt.staaten?.[staatId]}
          onClick={() => { if (confirm(`Alle Änderungen an «${werte.name}» verwerfen?`)) aktionen.aendere((p) => verwerfeStaat(p, staatId)) }}>
          Alle Änderungen an diesem Staat verwerfen
        </button>
      </div>
    </aside>
  )
}
