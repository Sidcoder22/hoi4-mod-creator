// Aenderungen aus dem Staaten-Editor: Staatsdateien (ueber k.staatAenderung) und neue Namen.

export function erzeugeStaaten(k) {
  const { projekt, spieldaten } = k
  for (const [id, aenderung] of Object.entries(projekt.staaten ?? {})) {
    const staat = spieldaten.staaten?.[id]
    // Unbekannte Staaten meldet die Pruefung
    if (!staat) continue
    k.staatAenderung(Number(id), aenderung)
    if (aenderung.name) k.sprache.ersetze(staat.nameSchluessel || `STATE_${id}`, aenderung.name)
    for (const [provinz, p] of Object.entries(aenderung.provinzen ?? {})) {
      if (p.siegpunktName !== undefined) k.sprache.ersetze(`VICTORY_POINTS_${provinz}`, p.siegpunktName)
    }
  }
}
