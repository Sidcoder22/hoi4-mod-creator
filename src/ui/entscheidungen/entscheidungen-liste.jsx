import { aktionen } from '../zustand.js'
import { fuegeKategorieHinzu, fuegeEntscheidungHinzu, entscheidungenIn } from '../../projekt/entscheidungen.js'
import { EntscheidungsSymbol } from './entscheidung-vorschau.jsx'

/** Name einer Kategorie (eigene oder aus dem Spiel); null, wenn es sie nicht mehr gibt. */
export function kategorieName(kategorie, projekt, sd) {
  if (kategorie?.art === 'eigen') {
    const k = projekt.kategorien?.find(x => x.id === kategorie.id)
    return k ? (k.name || 'Kategorie ohne Namen') : null
  }
  return sd.entscheidungsKategorien?.find(x => x.id === kategorie?.id)?.name ?? null
}

const anzahlText = (n) => (n === 1 ? '1 Entscheidung' : `${n} Entscheidungen`)

export function EntscheidungenListe({ z }) {
  const p = z.projekt
  const sd = z.spieldaten
  const kategorien = p.kategorien ?? []
  const neueKategorie = () => {
    let id
    aktionen.aendere((q, s) => { const [r, neueId] = fuegeKategorieHinzu(q, s); id = neueId; return r })
    aktionen.gehe({ bereich: 'kategorie', id })
  }
  const neueEntscheidung = () => {
    let id
    aktionen.aendere((q, s) => { const [r, neueId] = fuegeEntscheidungHinzu(q, s); id = neueId; return r })
    aktionen.gehe({ bereich: 'entscheidung', id })
  }
  // Gruppen: eigene Kategorien in Projektreihenfolge, dann benutzte Spielkategorien, dann Entscheidungen ohne Kategorie
  const gruppen = kategorien.map(k => ({ kategorie: { art: 'eigen', id: k.id }, name: k.name || 'Kategorie ohne Namen' }))
  for (const d of p.entscheidungen ?? []) {
    if (gruppen.some(g => g.kategorie.art === d.kategorie?.art && g.kategorie.id === d.kategorie?.id)) continue
    const name = kategorieName(d.kategorie, p, sd)
    gruppen.push({ kategorie: d.kategorie, name: name ? `${name} (aus dem Spiel)` : 'Ohne gültige Kategorie' })
  }
  return (
    <div class="ansicht">
      <h1>Entscheidungen</h1>
      <p class="leise">Entscheidungen sind Knöpfe im Spiel, die politische Macht kosten und dafür etwas bewirken. Sie liegen in Kategorien: in eigenen oder in solchen aus dem Spiel.</p>

      <h2>Eigene Kategorien</h2>
      {kategorien.length > 0 && (
        <div class="kacheln">
          {kategorien.map(k => (
            <button key={k.id} class="kachel" data-test={`kategorie-${k.id}`} onClick={() => aktionen.gehe({ bereich: 'kategorie', id: k.id })}>
              <EntscheidungsSymbol symbol={k.symbol} projekt={p} bildArt="kategorie" />
              <span>
                <strong>{k.name || 'Ohne Namen'}</strong>
                <span class="art"><br />{anzahlText(entscheidungenIn(p, { art: 'eigen', id: k.id }).length)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div class="knopfreihe">
        <button class="knopf" data-test="neue-kategorie" onClick={neueKategorie}>＋ Neue Kategorie</button>
      </div>

      <h2 class="mit-abstand">Entscheidungen</h2>
      {gruppen.filter(g => entscheidungenIn(p, g.kategorie).length).map(g => (
        <div key={`${g.kategorie.art}-${g.kategorie.id}`} class="entscheidung-gruppe" data-test={`kategorie-gruppe-${g.kategorie.art}-${g.kategorie.id}`}>
          <h3>{g.name}</h3>
          <div class="kacheln">
            {entscheidungenIn(p, g.kategorie).map(d => (
              <button key={d.id} class="kachel" data-test={`entscheidung-${d.id}`} onClick={() => aktionen.gehe({ bereich: 'entscheidung', id: d.id })}>
                <EntscheidungsSymbol symbol={d.symbol} projekt={p} />
                <span>
                  <strong>{d.name || 'Ohne Namen'}</strong>
                  <span class="art"><br />{d.kosten} politische Macht{Number(d.dauer) > 0 ? ` · ${d.dauer} Tage` : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      <div class="knopfreihe">
        <button class="knopf haupt" data-test="neue-entscheidung" onClick={neueEntscheidung}>＋ Neue Entscheidung</button>
      </div>
    </div>
  )
}
