import { useEffect, useState } from 'preact/hooks'
import { useSpeicher } from './zustand.js'
import { bildUrl } from './bilder.js'

/** Zeigt ein Bild aus den eingelesenen Spieldaten. */
export function SpielBild({ schluessel, alt = '', klasse = '', test }) {
  const db = useSpeicher(z => z.db)
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let aktiv = true
    setUrl(null)
    if (schluessel) bildUrl(db, schluessel).then(u => { if (aktiv) setUrl(u) })
    return () => { aktiv = false }
  }, [schluessel, db])
  if (!url) return <span class={`bild-platzhalter ${klasse}`} data-test={test} title={alt} />
  return <img src={url} alt={alt} class={klasse} data-test={test} />
}
