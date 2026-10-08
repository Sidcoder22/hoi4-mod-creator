import { SpielBild } from '../bild.jsx'
import { projektBildUrl } from '../bilder.js'
import { bonusText } from '../bonus-editor.jsx'

/** Bild eines nationalen Geists (Spielbild oder eigenes Bild). */
export function GeistBild({ geist, projekt, groesse = 48 }) {
  const stil = { width: `${groesse}px`, height: `${groesse}px`, objectFit: 'contain' }
  if (geist.bild?.art === 'eigen') {
    const url = projektBildUrl(projekt, geist.bild.bildId)
    return url ? <img src={url} alt="" style={stil} /> : <span class="bild-platzhalter" style={stil} />
  }
  return <span style={{ display: 'inline-block', ...stil }}><SpielBild schluessel={`idee:${geist.bild?.sprite}`} alt="" klasse="" /></span>
}

export function boniText(geist, _boni, sd) {
  return (geist.boni || []).map(b => bonusText(b, sd)).filter(Boolean).join(', ')
}
