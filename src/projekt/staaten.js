// Reine Aenderungsfunktionen fuer Staaten: gespeichert wird nur, was vom Spiel abweicht.

const leer = (o) => !o || Object.keys(o).length === 0

/** Entfernt leere Teil-Objekte und den ganzen Eintrag, wenn nichts mehr abweicht. */
function aufraeumen(a) {
  for (const k of ['gebaeude', 'ressourcen']) if (leer(a[k])) delete a[k]
  for (const [id, prov] of Object.entries(a.provinzen ?? {})) {
    if (leer(prov.gebaeude)) delete prov.gebaeude
    if (leer(prov)) delete a.provinzen[id]
  }
  if (leer(a.provinzen)) delete a.provinzen
  return a
}

function mitStaat(p, staatId, fn) {
  const alle = structuredClone(p.staaten ?? {})
  const neu = aufraeumen(fn(alle[staatId] ?? {}))
  if (leer(neu)) delete alle[staatId]
  else alle[staatId] = neu
  return { ...p, staaten: alle }
}

/** Setzt wert unter schluessel oder loescht ihn, wenn er dem Spielwert entspricht. */
function setzeOderLoesche(obj, schluessel, wert, spielwert) {
  if (wert === spielwert || wert === undefined || wert === null) delete obj[schluessel]
  else obj[schluessel] = wert
  return obj
}

function spielAllgemein(sd, staatId) {
  const s = sd.staaten?.[staatId]
  return { name: s?.name ?? '', einwohner: s?.manpower ?? 0, kategorie: s?.kategorie ?? null, extraBauplaetze: 0 }
}

/** Name, Einwohner, Kategorie, Extra-Bauplaetze; ein leerer Name gilt als Spielwert. */
export function aendereStaat(p, sd, staatId, patch) {
  const spiel = spielAllgemein(sd, staatId)
  return mitStaat(p, staatId, (a) => {
    for (const [k, v] of Object.entries(patch)) {
      const wert = k === 'name' && !String(v ?? '').trim() ? spiel.name : v
      setzeOderLoesche(a, k, wert, spiel[k])
    }
    return a
  })
}

export function setzeGebaeude(p, sd, staatId, art, stufe) {
  return mitStaat(p, staatId, (a) => {
    a.gebaeude = setzeOderLoesche(a.gebaeude ?? {}, art, stufe, sd.staaten?.[staatId]?.gebaeude?.[art] ?? 0)
    return a
  })
}

export function setzeRessource(p, sd, staatId, art, menge) {
  return mitStaat(p, staatId, (a) => {
    a.ressourcen = setzeOderLoesche(a.ressourcen ?? {}, art, menge, sd.staaten?.[staatId]?.ressourcen?.[art] ?? 0)
    return a
  })
}

/** feld: 'siegpunkte' oder 'siegpunktName'. */
export function setzeProvinz(p, sd, staatId, provinzId, feld, wert) {
  const spielwert = feld === 'siegpunkte' ? (sd.staaten?.[staatId]?.siegpunkte?.[provinzId] ?? 0) : (sd.siegpunktNamen?.[provinzId] ?? '')
  return mitStaat(p, staatId, (a) => {
    a.provinzen = a.provinzen ?? {}
    a.provinzen[provinzId] = setzeOderLoesche(a.provinzen[provinzId] ?? {}, feld, wert, spielwert)
    return a
  })
}

export function setzeProvinzGebaeude(p, sd, staatId, provinzId, art, stufe) {
  const spielwert = sd.staaten?.[staatId]?.provinzGebaeude?.[provinzId]?.[art] ?? 0
  return mitStaat(p, staatId, (a) => {
    a.provinzen = a.provinzen ?? {}
    const prov = a.provinzen[provinzId] ?? {}
    prov.gebaeude = setzeOderLoesche(prov.gebaeude ?? {}, art, stufe, spielwert)
    a.provinzen[provinzId] = prov
    return a
  })
}

export function verwerfeStaat(p, staatId) {
  const alle = { ...(p.staaten ?? {}) }
  delete alle[staatId]
  return { ...p, staaten: alle }
}

/** Werte, die im Spiel gelten: Spielwert, darueber die Aenderung; null, wenn es den Staat nicht gibt. */
export function effektiveStaatswerte(p, sd, staatId) {
  const s = sd.staaten?.[staatId]
  if (!s) return null
  const a = p.staaten?.[staatId] ?? {}
  const spiel = spielAllgemein(sd, staatId)
  const gebaeude = { ...s.gebaeude, ...a.gebaeude }
  const ressourcen = { ...s.ressourcen, ...a.ressourcen }
  const siegpunkte = { ...s.siegpunkte }
  const siegpunktNamen = {}
  const provinzGebaeude = structuredClone(s.provinzGebaeude ?? {})
  for (const provinz of s.provinzen) if (sd.siegpunktNamen?.[provinz]) siegpunktNamen[provinz] = sd.siegpunktNamen[provinz]
  for (const [provinz, prov] of Object.entries(a.provinzen ?? {})) {
    if (prov.siegpunkte !== undefined) siegpunkte[provinz] = prov.siegpunkte
    if (prov.siegpunktName !== undefined) siegpunktNamen[provinz] = prov.siegpunktName
    if (prov.gebaeude) provinzGebaeude[provinz] = { ...provinzGebaeude[provinz], ...prov.gebaeude }
  }
  const kategorie = a.kategorie ?? spiel.kategorie
  const extraBauplaetze = a.extraBauplaetze ?? 0
  const platzArten = new Set((sd.gebaeudeArten ?? []).filter(g => g.gemeinsamerPlatz).map(g => g.id))
  return {
    name: a.name ?? spiel.name,
    einwohner: a.einwohner ?? spiel.einwohner,
    kategorie, extraBauplaetze,
    bauplaetze: (sd.staatsKategorien?.find(k => k.id === kategorie)?.bauplaetze ?? 0) + extraBauplaetze,
    belegt: Object.entries(gebaeude).filter(([art]) => platzArten.has(art)).reduce((summe, [, stufe]) => summe + (Number(stufe) || 0), 0),
    gebaeude, ressourcen, siegpunkte, siegpunktNamen, provinzGebaeude,
  }
}

/** Die Aenderung ohne alles, was dem Spiel entspricht; undefined, wenn nichts mehr abweicht. */
export function normalisiereStaat(sd, staatId, aenderung) {
  let q = { staaten: {} }
  const { gebaeude, ressourcen, provinzen, ...allgemein } = aenderung ?? {}
  q = aendereStaat(q, sd, staatId, allgemein)
  for (const [art, n] of Object.entries(gebaeude ?? {})) q = setzeGebaeude(q, sd, staatId, art, n)
  for (const [art, n] of Object.entries(ressourcen ?? {})) q = setzeRessource(q, sd, staatId, art, n)
  for (const [provinz, prov] of Object.entries(provinzen ?? {})) {
    for (const feld of ['siegpunkte', 'siegpunktName']) if (prov[feld] !== undefined) q = setzeProvinz(q, sd, staatId, provinz, feld, prov[feld])
    for (const [art, n] of Object.entries(prov.gebaeude ?? {})) q = setzeProvinzGebaeude(q, sd, staatId, provinz, art, n)
  }
  return q.staaten[staatId]
}
