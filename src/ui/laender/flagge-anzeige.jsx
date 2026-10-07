import { useEffect, useRef } from 'preact/hooks'
import { zeichneFlagge } from '../../erzeuger/flagge.js'
import { projektBildRgba } from '../bilder.js'
import { SpielBild } from '../bild.jsx'

/** Flagge eines Landes: selbst gezeichnet (neu/geaendert) oder aus dem Spiel. */
export function FlaggeAnzeige({ land, tag, projekt, breite = 41, hoehe = 26, test }) {
  const eigen = land && (land.art === 'neu' || land.aendern?.flagge)
  const c = useRef(null)
  useEffect(() => {
    if (!eigen || !c.current) return
    const rgba = zeichneFlagge(land.flagge, 82, 52, (id) => projektBildRgba(projekt, id))
    c.current.getContext('2d').putImageData(new ImageData(rgba, 82, 52), 0, 0)
  })
  if (eigen) return <canvas ref={c} width={82} height={52} style={{ width: `${breite}px`, height: `${hoehe}px` }} class="flagge" data-test={test} />
  return <SpielBild schluessel={`flagge:${tag || land?.tag}`} klasse="flagge-klein" alt="Flagge" test={test} />
}
