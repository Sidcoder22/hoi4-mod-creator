// Wertet logs/error.log des Spiels aus und erklaert die Fehler der eigenen Mod.

const ERKLAERUNGEN = [
  [/Unexpected token|Malformed token|Missing \}|unexpected end/i, 'Ein Tippfehler in einer Datei der Mod. Bitte melde diese Zeile – der Creator sollte so etwas nie erzeugen.'],
  [/texture|\.dds|\.tga/i, 'Ein Bild wurde nicht gefunden oder ist beschädigt.'],
  [/Unknown (effect|trigger)|Invalid (effect|trigger)/i, 'Ein Befehl ist dem Spiel unbekannt – vielleicht passt die Spielversion nicht.'],
  [/state/i, 'Mit einem Staat stimmt etwas nicht.'],
  [/\btag\b|country/i, 'Mit einem Länderkürzel stimmt etwas nicht.'],
]
const UNBEKANNT = 'Unbekannter Fehler – die Originalzeile hilft beim Nachfragen.'

function erklaere(zeile) {
  for (const [muster, text] of ERKLAERUNGEN) if (muster.test(zeile)) return text
  return UNBEKANNT
}

/**
 * @returns {Array<{ roh, anzahl, datei: string|null, zeile: number|null, erklaerung }>}
 */
export function werteFehlerlogAus(text, { modid, pfade = [], tags = [] }) {
  const relativ = pfade.map(p => p.replace(new RegExp(`^mod/${modid}/`), '')).filter(p => p && !p.endsWith('.mod'))
  const tagMuster = tags.length ? new RegExp(`\\b(${tags.join('|')})\\b`) : null
  const gruppen = new Map()
  for (const roh of String(text || '').split(/\r?\n/)) {
    const zeile = roh.trim()
    if (!zeile) continue
    const betrifft = zeile.includes(modid) || relativ.some(p => zeile.includes(p)) || (tagMuster && tagMuster.test(zeile))
    if (!betrifft) continue
    const ohneZeit = zeile.replace(/^\[[^\]]*\]/, '')
    const g = gruppen.get(ohneZeit)
    if (g) {
      g.anzahl++
      continue
    }
    const datei = /file:? "([^"]+)"/.exec(zeile)?.[1] ?? null
    const nr = /near line:? (\d+)/i.exec(zeile)
    gruppen.set(ohneZeit, { roh: zeile, anzahl: 1, datei, zeile: nr ? Number(nr[1]) : null, erklaerung: erklaere(ohneZeit) })
  }
  return [...gruppen.values()]
}
