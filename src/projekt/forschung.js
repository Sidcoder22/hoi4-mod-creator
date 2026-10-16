// Startforschung eines Landes: Liste von Technologien, Voraussetzungen werden mitgefuehrt.

const technologie = (sd, id) => (sd.technologien ?? []).find(t => t.id === id)

/** Die geltende Forschung; bei forschung = null wie bisher (Spiel bzw. technikWie oder bisheriger Besitzer der Hauptstadt). */
export function forschungVon(sd, land) {
  if (Array.isArray(land.forschung)) return land.forschung
  if (land.art === 'geaendert') return [...(sd.laender?.[land.tag]?.forschung ?? [])]
  const quelle = land.technikWie || sd.staaten?.[land.hauptstadt]?.besitzer
  return quelle ? [...(sd.laender?.[quelle]?.forschung ?? [])] : []
}

function mitLand(p, landId, fn) {
  return { ...p, laender: p.laender.map(l => (l.id === landId ? fn(l) : l)) }
}

export function setzeForschung(p, sd, landId, liste) {
  return mitLand(p, landId, l => ({ ...l, forschung: [...new Set(liste)] }))
}

export function forschungZuruecksetzen(p, landId) {
  return mitLand(p, landId, l => ({ ...l, forschung: null }))
}

/** Alle Voraussetzungen von id, rekursiv (Breitensuche, naechste zuerst). */
export function alleVoraussetzungen(sd, id) {
  const gefunden = []
  const warteschlange = [...(technologie(sd, id)?.voraussetzungen ?? [])]
  while (warteschlange.length) {
    const v = warteschlange.shift()
    if (gefunden.includes(v)) continue
    gefunden.push(v)
    warteschlange.push(...(technologie(sd, v)?.voraussetzungen ?? []))
  }
  return gefunden
}

/** Alle Technologien, die id direkt oder indirekt voraussetzen. */
function alleAbhaengigen(sd, id) {
  const gefunden = []
  const warteschlange = [id]
  while (warteschlange.length) {
    const jetzt = warteschlange.shift()
    for (const t of sd.technologien ?? []) {
      if (t.voraussetzungen.includes(jetzt) && !gefunden.includes(t.id)) {
        gefunden.push(t.id)
        warteschlange.push(t.id)
      }
    }
  }
  return gefunden
}

/** Schaltet eine Technologie; gibt [p, automatisch mitgeaenderte Technologien] zurueck. */
export function schalteTechnologie(p, sd, landId, techId, an) {
  const land = p.laender.find(l => l.id === landId)
  const liste = forschungVon(sd, land)
  let mit
  let neu
  if (an) {
    mit = alleVoraussetzungen(sd, techId).filter(v => !liste.includes(v))
    neu = liste.includes(techId) ? [...liste, ...mit] : [...liste, techId, ...mit]
  } else {
    mit = alleAbhaengigen(sd, techId).filter(a => liste.includes(a))
    neu = liste.filter(t => t !== techId && !mit.includes(t))
  }
  return [setzeForschung(p, sd, landId, neu), mit]
}

/** Schnellwahl: 'land' (Forschung dieses Landes), 'jahr' (alle Nicht-Doktrinen bis zum Jahr samt Voraussetzungen), 'nichts'. */
export function schnellwahl(sd, art, wert) {
  if (art === 'land') return [...(sd.laender?.[wert]?.forschung ?? [])]
  if (art === 'jahr') {
    const ziel = new Set()
    for (const t of sd.technologien ?? []) {
      if (t.doktrin || t.jahr == null || t.jahr > Number(wert)) continue
      ziel.add(t.id)
      for (const v of alleVoraussetzungen(sd, t.id)) ziel.add(v)
    }
    return (sd.technologien ?? []).map(t => t.id).filter(id => ziel.has(id))
  }
  return []
}
