import { aktionen } from '../zustand.js'
import { Raster } from './raster.jsx'
import { FokusSeite } from './fokus-seite.jsx'
import { aendereBaum, entferneBaum } from '../../projekt/fokus.js'
import { landName } from '../../projekt/abgeleitet.js'
import { landOptionen } from './gemeinsam.js'

export function BaumEditor({ z, seitenInhalt }) {
  const baum = z.projekt.fokusbaeume?.find(b => b.id === z.ansicht.id)
  if (!baum) {
    return (
      <div class="ansicht">
        <p>Diesen Fokusbaum gibt es nicht mehr.</p>
        <button class="knopf" onClick={() => aktionen.gehe({ bereich: 'fokusbaeume' })}>Zur Übersicht</button>
      </div>
    )
  }
  const fokus = baum.fokusse.find(f => f.id === z.ansicht.fokus)
  const waehle = (id) => aktionen.gehe({ bereich: 'fokus', id: baum.id, fokus: id })
  return (
    <div class="baum-editor" data-test="baum-editor">
      <div class="land-kopf">
        <div>
          <input class="baum-titel" type="text" value={baum.name} data-test="baum-titel"
            onInput={(e) => { const v = e.currentTarget.value; aktionen.aendere((p) => aendereBaum(p, baum.id, { name: v }), { gruppe: `baum:${baum.id}:name` }) }} />
          <span class="kuerzel">Fokusbaum für {landName(baum.land, z.projekt, z.spieldaten)} · ersetzt den Fokusbaum des Spiels</span>
        </div>
        <div class="rechts">
          <select value={baum.land} data-test="baum-land-aendern" title="Land ändern"
            onChange={(e) => { const v = e.currentTarget.value; aktionen.aendere((p) => aendereBaum(p, baum.id, { land: v })) }}>
            {landOptionen(z.projekt, z.spieldaten).map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
          </select>
          <button class="knopf leise" onClick={() => aktionen.gehe({ bereich: 'fokusbaeume' })}>← Alle Fokusbäume</button>
          <button class="knopf leise gefahr" data-test="baum-loeschen"
            onClick={() => { if (confirm(`Fokusbaum «${baum.name}» mit allen Fokussen löschen?`)) { aktionen.aendere((p) => entferneBaum(p, baum.id)); aktionen.gehe({ bereich: 'fokusbaeume' }) } }}>
            Baum löschen
          </button>
        </div>
      </div>
      <p class="leise">Doppelklick auf ein freies Feld legt einen Fokus an. Karten lassen sich verschieben; den Punkt unter einer Karte ziehst du auf eine andere, um sie zu verbinden.</p>
      <div class="baum-arbeitsflaeche">
        <Raster baum={baum} projekt={z.projekt} gewaehlt={fokus?.id} onWaehle={waehle} />
        {fokus
          ? <FokusSeite baum={baum} fokus={fokus} z={z} kinder={seitenInhalt ? seitenInhalt(baum, fokus, z) : null} />
          : <aside class="fokus-seite leer"><p class="leise">Wähle einen Fokus aus oder lege mit einem Doppelklick einen neuen an.</p></aside>}
      </div>
    </div>
  )
}
