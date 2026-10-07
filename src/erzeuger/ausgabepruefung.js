// Prueft die erzeugten Dateien, bevor sie geschrieben werden.

import { parseParadox } from '../leser/paradox.js'

const alsText = (inhalt) => (typeof inhalt === 'string' ? inhalt : new TextDecoder().decode(inhalt))
const alsBytes = (inhalt) => (typeof inhalt === 'string' ? new TextEncoder().encode(inhalt) : inhalt)

export function pruefeAusgabe(dateien, { benutzteSprache, definierteSprache, benutzteGfx, bekannteGfx }) {
  const fehler = []
  for (const d of dateien) {
    if (/\.(txt|gfx)$/i.test(d.pfad)) {
      const text = alsText(d.inhalt)
      if (d.kopie) continue
      try {
        parseParadox(text, { streng: true })
      } catch (e) {
        fehler.push(`${d.pfad}: Klammer- oder Schreibfehler – ${e.message}`)
      }
      const sonder = /[^\x00-\x7F]/.exec(text)
      if (sonder) fehler.push(`${d.pfad}: enthält das Sonderzeichen «${sonder[0]}», das im Spielcode nicht erlaubt ist`)
    } else if (/\.yml$/i.test(d.pfad)) {
      const b = alsBytes(d.inhalt)
      if (b[0] !== 0xEF || b[1] !== 0xBB || b[2] !== 0xBF) {
        fehler.push(`${d.pfad}: Sprachdatei ohne BOM`)
        continue
      }
      const text = new TextDecoder().decode(b.subarray(3))
      if (!/^l_(german|english):/.test(text)) fehler.push(`${d.pfad}: Sprachdatei ohne Kopfzeile l_german:/l_english:`)
    }
  }
  for (const k of benutzteSprache) if (!definierteSprache.has(k)) fehler.push(`Text fehlt: ${k}`)
  for (const g of benutzteGfx) if (!bekannteGfx.has(g)) fehler.push(`Bild fehlt: ${g}`)
  return fehler
}
