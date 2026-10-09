// Editor fuer eine Entscheidung; rechts die Vorschau.

import { aktionen } from '../zustand.js'
import { TextFeld, ZahlFeld, Regler, Haken, Feld } from '../felder.jsx'
import { aendereEntscheidung, entferneEntscheidung } from '../../projekt/entscheidungen.js'
import { fuegeBildHinzu } from '../../projekt/aenderungen.js'
import { BildZuschnitt } from '../bild-zuschnitt.jsx'
import { SymbolGalerie } from '../fokus/symbole.jsx'
import { LaenderWahl } from '../laender-wahl.jsx'
import { WirkungenEditor } from '../bausteine/wirkungen.jsx'
import { BedingungenEditor } from '../bausteine/bedingungen.jsx'
import { EntscheidungVorschau, EntscheidungsSymbol } from './entscheidung-vorschau.jsx'
import { kategorieName } from './entscheidungen-liste.jsx'
import { BonusEditor } from '../bonus-editor.jsx'

export function EntscheidungEditor({ z }) {
  const d = (z.projekt.entscheidungen ?? []).find(x => x.id === z.ansicht.id)
  if (!d) {
    return (
      <div class="ansicht">
        <p>Diese Entscheidung gibt es nicht mehr.</p>
        <button class="knopf" onClick={() => aktionen.gehe({ bereich: 'entscheidungen' })}>Zur Übersicht</button>
      </div>
    )
  }
  const p = z.projekt
  const sd = z.spieldaten
  const kontext = { projekt: p, spieldaten: sd }
  const [b, h] = sd.bildgroessen?.entscheidung || [32, 32]
  const setze = (patch, gruppe) => aktionen.aendere((q) => aendereEntscheidung(q, d.id, patch), { gruppe: gruppe ? `entscheidung:${d.id}:${gruppe}` : undefined })
  const mitDauer = Number(d.dauer) > 0
  const katWert = `${d.kategorie?.art}:${d.kategorie?.id}`
  const katOptionen = [
    ...(p.kategorien ?? []).map(k => ({ wert: `eigen:${k.id}`, text: k.name || 'Kategorie ohne Namen' })),
    ...(sd.entscheidungsKategorien ?? []).map(k => ({ wert: `spiel:${k.id}`, text: `${k.name} (aus dem Spiel)` })),
  ]
  const katGueltig = katOptionen.some(o => o.wert === katWert)
  return (
    <div class="ansicht event-editor" data-test="entscheidung-editor">
      <div class="land-kopf">
        <EntscheidungsSymbol symbol={d.symbol} projekt={p} klasse="entscheidung-symbol gross" />
        <h1>{d.name || 'Neue Entscheidung'}</h1>
        <div class="rechts">
          <button class="knopf leise" onClick={() => aktionen.gehe({ bereich: 'entscheidungen' })}>Alle Entscheidungen</button>
        </div>
      </div>
      <div class="event-arbeitsflaeche">
        <div class="event-felder">
          <div class="karte formular">
            <TextFeld label="Name" wert={d.name} test="entscheidung-name" onAendere={(v) => setze({ name: v }, 'name')} />
            <TextFeld label="Beschreibung" wert={d.beschreibung} test="entscheidung-beschreibung" mehrzeilig onAendere={(v) => setze({ beschreibung: v }, 'beschreibung')} />
            <Feld label="Kategorie" hilfe="In welcher Liste die Entscheidung im Spiel steht.">
              <select value={katGueltig ? katWert : ''} data-test="entscheidung-kategorie"
                onChange={(e) => { const [art, ...rest] = e.currentTarget.value.split(':'); setze({ kategorie: { art, id: rest.join(':') } }) }}>
                {!katGueltig && <option value="">– Kategorie wählen –</option>}
                {katOptionen.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
              </select>
            </Feld>
            <ZahlFeld label="Kosten" einheit="politische Macht" min={0} max={500} wert={d.kosten} test="entscheidung-kosten" onAendere={(v) => setze({ kosten: Math.round(v) }, 'kosten')} />
            <ZahlFeld label="Dauer" einheit="Tage (0 = sofort)" min={0} max={3650} wert={d.dauer} test="entscheidung-dauer"
              hilfe="Mit Dauer läuft die Entscheidung so viele Tage und hat danach eine eigene Wirkung am Ende." onAendere={(v) => setze({ dauer: Math.round(v) }, 'dauer')} />
            <Haken label="Nur einmal" wert={d.nurEinmal} test="entscheidung-einmal" hilfe="Ohne Häkchen kann man die Entscheidung nach einer Wartezeit wieder wählen."
              onAendere={(v) => setze({ nurEinmal: v })} />
            {!d.nurEinmal && (
              <ZahlFeld label="Wieder verfügbar nach" einheit="Tagen" min={0} max={3650} wert={d.wartezeit} test="entscheidung-wartezeit" onAendere={(v) => setze({ wartezeit: Math.round(v) }, 'wartezeit')} />
            )}
            <Feld label="Nur für diese Länder" breit>
              <LaenderWahl tags={d.laender} kontext={kontext} test="entscheidung-land" leerText="alle, die die Kategorie sehen" onAendere={(v) => setze({ laender: v })} />
            </Feld>
          </div>

          <details class="abschnitt" open>
            <summary>Sichtbar wenn</summary>
            <BedingungenEditor block={d.sichtbar} kontext={kontext} test="entscheidung-sichtbar" onAendere={(v) => setze({ sichtbar: v }, 'sichtbar')} />
          </details>
          <details class="abschnitt" open>
            <summary>Verfügbar wenn</summary>
            <BedingungenEditor block={d.verfuegbar} kontext={kontext} test="entscheidung-verfuegbar" onAendere={(v) => setze({ verfuegbar: v }, 'verfuegbar')} />
          </details>
          <details class="abschnitt" open>
            <summary>{mitDauer ? 'Wirkung beim Start' : 'Wirkung'}</summary>
            <WirkungenEditor liste={d.wirkungen} kontext={kontext} test="entscheidung-wirkung" onAendere={(v) => setze({ wirkungen: v }, 'wirkungen')} />
          </details>
          {mitDauer && (
            <details class="abschnitt" open>
              <summary>Bonus während der Laufzeit</summary>
              <p class="leise">Gilt nur, solange die Entscheidung läuft.</p>
              <BonusEditor boni={d.boniLaufzeit ?? []} spieldaten={sd} test="entscheidung-laufzeit" onAendere={(v) => setze({ boniLaufzeit: v }, 'laufzeit')} />
            </details>
          )}
          {mitDauer && (
            <details class="abschnitt" open>
              <summary>Wirkung am Ende</summary>
              <WirkungenEditor liste={d.wirkungenEnde} kontext={kontext} test="entscheidung-ende" onAendere={(v) => setze({ wirkungenEnde: v }, 'ende')} />
            </details>
          )}

          <details class="abschnitt">
            <summary>Symbol</summary>
            <SymbolGalerie symbole={sd.entscheidungsSymbole ?? []} gewaehlt={d.symbol?.art === 'spiel' ? d.symbol.sprite : null} bildArt="entscheidung" test="entscheidungssymbol"
              praefix="GFX_decision_" klasse="entscheidung-galerie" platzhalter="Symbole durchsuchen, z. B. «industry», «army» …"
              onWaehle={(sprite) => setze({ symbol: { art: 'spiel', sprite } })} />
            <p class="leise">Oder ein eigenes Bild ({b} × {h} Pixel):</p>
            <BildZuschnitt test="entscheidungsbild" zielBreite={b} zielHoehe={h} anzeigeBreite={120}
              onFertig={(bild) => aktionen.aendere((q) => { const [r, bildId] = fuegeBildHinzu(q, bild); return aendereEntscheidung(r, d.id, { symbol: { art: 'eigen', bildId } }) })} />
          </details>

          <Regler label="Wie gern wählt die KI diese Entscheidung?" hilfe="0 = nie, 1 = normal, 10 = sehr gern" min={0} max={10} einheit="" wert={d.kiGewicht ?? 1} test="entscheidung-ki"
            onAendere={(v) => setze({ kiGewicht: v }, 'ki')} />
          <div class="knopfreihe">
            <button class="knopf leise gefahr" data-test="entscheidung-loeschen"
              onClick={() => { if (confirm(`Entscheidung «${d.name || 'ohne Namen'}» löschen?`)) { aktionen.aendere((q) => entferneEntscheidung(q, d.id)); aktionen.gehe({ bereich: 'entscheidungen' }) } }}>
              Entscheidung löschen
            </button>
          </div>
        </div>
        <div class="event-vorschau-spalte">
          <EntscheidungVorschau entscheidung={d} projekt={p} kategorieName={kategorieName(d.kategorie, p, sd) ?? 'Keine Kategorie'} />
        </div>
      </div>
    </div>
  )
}
