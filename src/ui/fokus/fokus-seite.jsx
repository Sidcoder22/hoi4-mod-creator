// Seitenleiste fuer den gewaehlten Fokus.

import { aktionen } from '../zustand.js'
import { TextFeld, ZahlFeld, Regler, Auswahl } from '../felder.jsx'
import { setzeVoraussetzung, setzeAusschluss, entferneFokus } from '../../projekt/fokus.js'
import { fuegeBildHinzu } from '../../projekt/aenderungen.js'
import { BildZuschnitt } from '../bild-zuschnitt.jsx'
import { SymbolGalerie, FokusSymbol } from './symbole.jsx'
import { aendereFokusFeld } from './gemeinsam.js'
import { aendereFokus } from '../../projekt/fokus.js'

export function FokusSeite({ baum, fokus, z, kinder }) {
  const sd = z.spieldaten
  const [b, h] = sd.bildgroessen?.fokus || [94, 86]
  const andere = baum.fokusse.filter(f => f.id !== fokus.id)
  const setze = (patch, gruppe) => aendereFokusFeld(baum.id, fokus.id, patch, gruppe)
  return (
    <aside class="fokus-seite" data-test="fokus-seite">
      <div class="fokus-seite-kopf">
        <FokusSymbol fokus={fokus} projekt={z.projekt} />
        <h2>{fokus.name || 'Neuer Fokus'}</h2>
      </div>
      <TextFeld label="Name" wert={fokus.name} test="fokus-name" onAendere={(v) => setze({ name: v }, 'name')} />
      <TextFeld label="Beschreibung" wert={fokus.beschreibung} test="fokus-beschreibung" mehrzeilig onAendere={(v) => setze({ beschreibung: v }, 'beschreibung')} />
      <ZahlFeld label="Dauer" einheit="Wochen" hilfe="Im Spiel dauert ein Fokus meist 10 Wochen (70 Tage)." min={1} max={100} wert={fokus.dauer} test="fokus-dauer"
        onAendere={(v) => setze({ dauer: Math.round(v) }, 'dauer')} />

      <details class="abschnitt" open>
        <summary>Voraussetzungen</summary>
        {andere.length === 0 && <p class="leise">Lege weitere Fokusse an, um sie zu verbinden.</p>}
        {andere.map(f => (
          <label class="haken" key={f.id}>
            <input type="checkbox" data-test={`voraussetzung-${f.id}`} checked={fokus.voraussetzungen.includes(f.id)}
              onChange={(e) => { const an = e.currentTarget.checked; aktionen.aendere((p) => setzeVoraussetzung(p, baum.id, f.id, fokus.id, an)) }} />
            <span>{f.name || 'ohne Namen'}</span>
          </label>
        ))}
        {fokus.voraussetzungen.length > 1 && (
          <Auswahl label="Es braucht …" test="voraussetzungsart" wert={fokus.voraussetzungsArt}
            optionen={[{ wert: 'alle', text: 'alle diese Fokusse' }, { wert: 'eine', text: 'einen davon' }]}
            onAendere={(v) => setze({ voraussetzungsArt: v })} />
        )}
        <p class="leise">Tipp: Ziehe den kleinen Punkt unter einer Karte auf eine andere Karte.</p>
      </details>

      <details class="abschnitt">
        <summary>Schliesst sich aus mit</summary>
        {andere.map(f => (
          <label class="haken" key={f.id}>
            <input type="checkbox" data-test={`ausschluss-${f.id}`} checked={fokus.ausschluss.includes(f.id)}
              onChange={(e) => { const an = e.currentTarget.checked; aktionen.aendere((p) => setzeAusschluss(p, baum.id, fokus.id, f.id, an)) }} />
            <span>{f.name || 'ohne Namen'}</span>
          </label>
        ))}
        <p class="leise">Wer einen dieser Fokusse wählt, kann den anderen nicht mehr wählen. Tipp: Punkt mit gedrückter Umschalttaste ziehen.</p>
      </details>

      {kinder}

      <details class="abschnitt">
        <summary>Symbol</summary>
        <SymbolGalerie symbole={sd.fokusSymbole ?? []} gewaehlt={fokus.symbol?.art === 'spiel' ? fokus.symbol.sprite : null}
          onWaehle={(sprite) => setze({ symbol: { art: 'spiel', sprite } })} />
        <p class="leise">Oder ein eigenes Bild:</p>
        <BildZuschnitt test="fokusbild" zielBreite={b} zielHoehe={h} anzeigeBreite={200}
          onFertig={(bild) => aktionen.aendere((p) => {
            const [q, bildId] = fuegeBildHinzu(p, bild)
            return aendereFokus(q, baum.id, fokus.id, { symbol: { art: 'eigen', bildId } })
          })} />
      </details>

      <Regler label="Wie gern wählt die KI diesen Fokus?" hilfe="0 = nie, 1 = normal, 10 = sehr gern" min={0} max={10} einheit="" wert={fokus.kiGewicht ?? 1} test="fokus-ki"
        onAendere={(v) => setze({ kiGewicht: v }, 'ki')} />
      <div class="knopfreihe">
        <button class="knopf leise gefahr" data-test="fokus-loeschen"
          onClick={() => { if (confirm(`Fokus «${fokus.name || 'ohne Namen'}» löschen?`)) { aktionen.aendere((p) => entferneFokus(p, baum.id, fokus.id)); aktionen.gehe({ bereich: 'fokus', id: baum.id }) } }}>
          Fokus löschen
        </button>
      </div>
    </aside>
  )
}
