import { TextFeld, Auswahl, Feld } from '../felder.jsx'
import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { GRAFIKSTILE, tagGesperrt } from '../../projekt/modell.js'
import { belegteTags } from '../../projekt/abgeleitet.js'
import { hexZuRgb, rgbZuHex } from '../farbe.js'

function tagStatus(land, projekt, sd) {
  if (!/^[A-Z][A-Z0-9]{2}$/.test(land.tag) || tagGesperrt(land.tag)) return { ok: false, text: 'nicht erlaubt – drei Grossbuchstaben oder Ziffern, beginnend mit einem Buchstaben' }
  if (sd.laender[land.tag]) return { ok: false, text: `schon vergeben an ${sd.laender[land.tag].name}` }
  const anderes = projekt.laender.find(l => l.id !== land.id && l.art === 'neu' && l.tag === land.tag)
  if (anderes) return { ok: false, text: `schon vergeben an ${anderes.name || 'ein anderes neues Land'}` }
  if (!belegteTags(projekt, sd, land.id).has(land.tag)) return { ok: true, text: 'frei' }
  return { ok: false, text: 'schon vergeben' }
}

export function ReiterName({ land, z }) {
  const an = bearbeitbar(land, 'name')
  const farbeAn = bearbeitbar(land, 'farbe')
  const status = land.art === 'neu' ? tagStatus(land, z.projekt, z.spieldaten) : null
  return (
    <div class="formular">
      <TextFeld label="Name" hilfe="So heisst das Land im Spiel, z. B. «Helvetien»." wert={land.name} test="land-name" gesperrt={!an} onAendere={(v) => aendereFeld(land, { name: v }, 'name')} />
      <TextFeld label="Name mit Artikel" hilfe="Für Sätze wie «Krieg gegen die Schweiz». Leer lassen = wie der Name." wert={land.nameDef} test="land-namedef" gesperrt={!an} platzhalter={land.name} onAendere={(v) => aendereFeld(land, { nameDef: v }, 'namedef')} />
      <TextFeld label="Adjektiv" hilfe="Zum Beispiel «schweizerisch» oder «helvetisch»." wert={land.adjektiv} test="land-adjektiv" gesperrt={!an} onAendere={(v) => aendereFeld(land, { adjektiv: v }, 'adjektiv')} />
      {land.art === 'neu' ? (
        <Feld label="Kürzel (Tag)" hilfe="Drei Zeichen, mit denen das Spiel das Land intern erkennt. Wird aus dem Namen vorgeschlagen.">
          <input type="text" value={land.tag} maxLength={3} data-test="land-tag" style={{ maxWidth: '7rem', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}
            onInput={(e) => aendereFeld(land, { tag: e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) }, 'tag')} />
          <span data-test="tag-status" class={status.ok ? 'leise' : 'fehlerliste'}>{status.ok ? '✓ ' : '✗ '}{status.text}</span>
        </Feld>
      ) : (
        <Feld label="Kürzel (Tag)" hilfe="Bestehende Länder behalten ihr Kürzel.">
          <code data-test="land-tag-fest">{land.tag}</code>
        </Feld>
      )}
      <Feld label="Landesfarbe" hilfe="In dieser Farbe erscheint das Land auf der Weltkarte.">
        <input type="color" value={rgbZuHex(land.farbe)} data-test="land-farbe" disabled={!farbeAn}
          onInput={(e) => aendereFeld(land, { farbe: hexZuRgb(e.currentTarget.value) }, 'farbe')} />
      </Feld>
      {land.art === 'neu' && (
        <Auswahl label="Aussehen der Einheiten" hilfe="Bestimmt, wie Soldaten und Fahrzeuge im Spiel aussehen." wert={land.grafikstil} test="land-grafikstil"
          optionen={GRAFIKSTILE.map(g => ({ wert: g.id, text: `${g.name} – ${g.beschreibung}` }))}
          onAendere={(v) => aendereFeld(land, { grafikstil: v })} />
      )}
    </div>
  )
}
