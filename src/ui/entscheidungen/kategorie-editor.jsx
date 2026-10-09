// Editor fuer eine eigene Kategorie von Entscheidungen.

import { aktionen } from '../zustand.js'
import { TextFeld, Feld } from '../felder.jsx'
import { aendereKategorie, entferneKategorie, entscheidungenIn } from '../../projekt/entscheidungen.js'
import { fuegeBildHinzu } from '../../projekt/aenderungen.js'
import { BildZuschnitt } from '../bild-zuschnitt.jsx'
import { SymbolGalerie } from '../fokus/symbole.jsx'
import { LaenderWahl } from '../laender-wahl.jsx'
import { EntscheidungsSymbol } from './entscheidung-vorschau.jsx'

export function KategorieEditor({ z }) {
  const kat = (z.projekt.kategorien ?? []).find(x => x.id === z.ansicht.id)
  if (!kat) {
    return (
      <div class="ansicht">
        <p>Diese Kategorie gibt es nicht mehr.</p>
        <button class="knopf" onClick={() => aktionen.gehe({ bereich: 'entscheidungen' })}>Zur Übersicht</button>
      </div>
    )
  }
  const sd = z.spieldaten
  const kontext = { projekt: z.projekt, spieldaten: sd }
  const [b, h] = sd.bildgroessen?.kategorie || [32, 32]
  const setze = (patch, gruppe) => aktionen.aendere((p) => aendereKategorie(p, kat.id, patch), { gruppe: gruppe ? `kategorie:${kat.id}:${gruppe}` : undefined })
  const anzahl = entscheidungenIn(z.projekt, { art: 'eigen', id: kat.id }).length
  return (
    <div class="ansicht" data-test="kategorie-editor">
      <div class="land-kopf">
        <EntscheidungsSymbol symbol={kat.symbol} projekt={z.projekt} bildArt="kategorie" klasse="entscheidung-symbol gross" />
        <h1>{kat.name || 'Neue Kategorie'}</h1>
        <div class="rechts">
          <button class="knopf leise" onClick={() => aktionen.gehe({ bereich: 'entscheidungen' })}>Alle Entscheidungen</button>
        </div>
      </div>
      <div class="karte formular">
        <TextFeld label="Name" wert={kat.name} test="kategorie-name" onAendere={(v) => setze({ name: v }, 'name')} />
        <TextFeld label="Beschreibung" wert={kat.beschreibung} test="kategorie-beschreibung" mehrzeilig onAendere={(v) => setze({ beschreibung: v }, 'beschreibung')} />
        <Feld label="Für welche Länder?" hilfe="Nur diese Länder sehen die Kategorie. Ohne Auswahl sehen sie alle Länder." breit>
          <LaenderWahl tags={kat.laender} kontext={kontext} test="kategorie-land" leerText="alle Länder" onAendere={(v) => setze({ laender: v })} />
        </Feld>
      </div>
      <details class="abschnitt" open>
        <summary>Symbol</summary>
        <SymbolGalerie symbole={sd.kategorieSymbole ?? []} gewaehlt={kat.symbol?.art === 'spiel' ? kat.symbol.sprite : null} bildArt="kategorie" test="kategoriesymbol"
          praefix="GFX_decision_category_" klasse="entscheidung-galerie" platzhalter="Symbole durchsuchen …"
          onWaehle={(sprite) => setze({ symbol: { art: 'spiel', sprite } })} />
        <p class="leise">Oder ein eigenes Bild ({b} × {h} Pixel):</p>
        <BildZuschnitt test="kategoriebild" zielBreite={b} zielHoehe={h} anzeigeBreite={120}
          onFertig={(bild) => aktionen.aendere((p) => { const [q, bildId] = fuegeBildHinzu(p, bild); return aendereKategorie(q, kat.id, { symbol: { art: 'eigen', bildId } }) })} />
      </details>
      <div class="knopfreihe">
        <button class="knopf leise gefahr" data-test="kategorie-loeschen"
          onClick={() => {
            const frage = anzahl ? `Kategorie «${kat.name || 'ohne Namen'}» löschen? Ihre ${anzahl} Entscheidungen brauchen danach eine andere Kategorie.` : `Kategorie «${kat.name || 'ohne Namen'}» löschen?`
            if (confirm(frage)) { aktionen.aendere((p) => entferneKategorie(p, kat.id)); aktionen.gehe({ bereich: 'entscheidungen' }) }
          }}>
          Kategorie löschen
        </button>
      </div>
    </div>
  )
}
