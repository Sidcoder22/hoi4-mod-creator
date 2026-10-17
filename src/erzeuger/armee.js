// Divisionsvorlagen und Startverbaende (history/units) eines Landes (Etappe 4e).

import { schreibeParadox } from '../leser/paradox.js'
import { transliteriere } from '../projekt/modell.js'
import { e, wort, text, block } from '../bausteine/hilfen.js'

/** Name fuer Skriptdateien: nur ASCII-Buchstaben, Ziffern, Leerzeichen, Punkt und Bindestrich. */
export function asciiName(name) {
  return transliteriere(String(name ?? '')).replace(/[^A-Za-z0-9 .\-]+/g, '').replace(/\s+/g, ' ').trim()
}

export function oobName(modid, land) {
  return land.art === 'neu' ? `${land.tag}_1936` : `${modid}_${land.tag}_1936`
}

/** Erste Landprovinz eines Staats; null, wenn es keine gibt. */
function landProvinz(sd, staatId) {
  const provinzen = [...(sd.staaten[staatId]?.provinzen ?? [])].sort((a, b) => a - b)
  return provinzen.find(p => sd.provinzArten[p] !== 'sea' && sd.provinzArten[p] !== 'lake') ?? provinzen[0] ?? null
}

function vorlagenBlock(vorlage) {
  const regimenter = []
  vorlage.bataillone.forEach((spalte, x) => spalte.forEach((art, y) => { if (art) regimenter.push(e(art, block([e('x', wort(x)), e('y', wort(y))]))) }))
  const kompanien = []
  vorlage.unterstuetzung.forEach((art, y) => { if (art) kompanien.push(e(art, block([e('x', wort(0)), e('y', wort(y))]))) })
  return e('division_template', block([
    e('name', text(asciiName(vorlage.name))),
    e('regiments', block(regimenter)),
    ...(kompanien.length ? [e('support', block(kompanien))] : []),
  ]))
}

/** Inhalt der OOB-Datei oder null ohne Verbaende mit gueltigem Ort. */
export function oobDatei(sd, land) {
  const { vorlagen = [], verbaende = [] } = land.armee ?? {}
  const zaehler = new Map()
  const divisionen = []
  for (const v of verbaende) {
    const vorlage = vorlagen.find(x => x.id === v.vorlage)
    const ort = landProvinz(sd, v.staat ?? land.hauptstadt)
    // Ungueltige Verbaende meldet die Pruefung; hier werden sie uebersprungen
    if (!vorlage || ort == null) continue
    for (let i = 0; i < Math.max(0, Math.round(Number(v.anzahl) || 0)); i++) {
      const n = (zaehler.get(vorlage.id) ?? 0) + 1
      zaehler.set(vorlage.id, n)
      divisionen.push(e('division', block([
        e('name', text(`${n}. ${asciiName(vorlage.name)}`)),
        e('location', wort(ort)),
        e('division_template', text(asciiName(vorlage.name))),
        e('start_experience_factor', wort(0.2)),
      ])))
    }
  }
  if (!divisionen.length) return null
  return schreibeParadox([...vorlagen.filter(v => v.bataillone.flat().some(Boolean)).map(vorlagenBlock), e('units', block(divisionen))])
}
