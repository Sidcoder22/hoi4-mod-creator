import { SpielBild } from '../bild.jsx'
import { projektBildUrl } from '../bilder.js'

/** Bild eines nationalen Geists (Spielbild oder eigenes Bild). */
export function GeistBild({ geist, projekt, groesse = 48 }) {
  const stil = { width: `${groesse}px`, height: `${groesse}px`, objectFit: 'contain' }
  if (geist.bild?.art === 'eigen') {
    const url = projektBildUrl(projekt, geist.bild.bildId)
    return url ? <img src={url} alt="" style={stil} /> : <span class="bild-platzhalter" style={stil} />
  }
  return <span style={{ display: 'inline-block', ...stil }}><SpielBild schluessel={`idee:${geist.bild?.sprite}`} alt="" klasse="" /></span>
}

export function boniText(geist, BONI) {
  return (geist.boni || []).map(b => {
    const info = BONI.find(x => x.art === b.art)
    if (!info) return ''
    const vorzeichen = b.wert > 0 ? '+' : ''
    return `${info.name} ${vorzeichen}${b.wert}${info.einheit === 'prozent' ? ' %' : ' pro Tag'}`
  }).filter(Boolean).join(', ')
}
