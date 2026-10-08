// Bestehende Laender: Nur Reiter mit aendern.<reiter> === true wirken.

import { schreibeParadox } from '../leser/paradox.js'
import { aendereLandDatei } from './kern.js'
import { modPfad, zahl } from './kennungen.js'
import { politikEintraege, parteiTexte, schreibeAnfuehrer, schreibeFlaggen, geisterKennungen, eigenschaftenKennungen, bevoelkerungAnpassen, technikVon } from './land-neu.js'

const wort = (t) => ({ typ: 'wort', text: String(t) })
const block = (inhalt) => ({ typ: 'block', inhalt })
const eintrag = (schluessel, wert) => ({ schluessel, op: '=', wert })
const alsZeilen = (eintraege) => schreibeParadox(eintraege).split('\n').filter(Boolean)

export function erzeugeGeaenderteLaender(k) {
  const { projekt, spieldaten, modid } = k
  for (const land of projekt.laender.filter(l => l.art === 'geaendert')) {
    const tag = land.tag
    const spiel = spieldaten.laender[tag]
    const a = land.aendern || {}
    if (!spiel) continue
    const anhang = []

    if (a.name) {
      const name = land.name || spiel.name
      const def = land.nameDef || name
      const adj = land.adjektiv || name
      k.sprache.ersetze(tag, name)
      k.sprache.ersetze(`${tag}_DEF`, def)
      k.sprache.ersetze(`${tag}_ADJ`, adj)
      for (const v of spiel.namensVarianten) k.sprache.ersetze(v, v.endsWith('_DEF') ? def : v.endsWith('_ADJ') ? adj : name)
    }
    if (a.farbe) {
      k.neueFarbe(tag, land.farbe)
      const original = spieldaten.originaltexte[spiel.landDatei]
      if (original !== undefined) k.schreibe(modPfad(modid, spiel.landDatei), aendereLandDatei(original, land.farbe), { kopie: true })
    }
    if (a.flagge) schreibeFlaggen(k, land.flagge, spiel.flaggen.length ? spiel.flaggen : [tag])
    if (a.gebiet) {
      for (const s of land.staaten) k.staatAnLand(s, tag, { kernAltEntfernen: !land.kerneAltBesitzerBehalten })
      if (land.hauptstadt && land.hauptstadt !== spiel.hauptstadt) anhang.push(`capital = ${land.hauptstadt}`)
    }
    if (a.startwerte) {
      anhang.push(
        `set_research_slots = ${land.startwerte.forschungsplaetze}`,
        `set_stability = ${zahl(land.startwerte.stabilitaet / 100)}`,
        `set_war_support = ${zahl(land.startwerte.kriegsunterstuetzung / 100)}`,
      )
      const technik = land.technikWie ? technikVon(spieldaten, land.technikWie) : []
      if (technik.length) anhang.push(...alsZeilen([eintrag('set_technology', block(technik.map(t => eintrag(t, wort(1)))))]))
      if (Number(land.startwerte.rekruten) > 0) anhang.push(`add_manpower = ${Math.round(land.startwerte.rekruten)}`)
      bevoelkerungAnpassen(k, land)
    }
    if (a.regierung) {
      anhang.push(...alsZeilen(politikEintraege(spieldaten, land.regierung)))
      parteiTexte(k, land, { nurGesetzte: true })
    }
    if (a.anfuehrer) {
      if (land.anfuehrer.modus === 'behalten') {
        for (const id of eigenschaftenKennungen(projekt, land)) anhang.push(`add_country_leader_trait = ${id}`)
      } else {
        const kennung = schreibeAnfuehrer(k, land)
        if (kennung) anhang.push(`recruit_character = ${kennung}`, `promote_character = ${kennung}`)
      }
    }
    if (a.geister) {
      const geister = geisterKennungen(projekt, land)
      if (geister.length) anhang.push(`add_ideas = { ${geister.join(' ')} }`)
    }
    if (anhang.length) k.verlaufAnhaengen(tag, anhang)
  }
}
