// Diplomatie zum Spielstart: Marionetten, Meinung, Vertraege, Fraktion, Kriegsziele.

import { schreibeParadox, finde, wertText } from '../leser/paradox.js'
import { e, wort, block } from '../bausteine/hilfen.js'
import { modPfad } from './kennungen.js'

export function meinungKennung(modid, wert) {
  return `${modid}_meinung_${wert >= 0 ? `p${wert}` : `m${-wert}`}`
}

const autonomieZeile = (tag, stufe) => `set_autonomy = { target = ${tag} autonomous_state = ${stufe} }`

const VERTRAG = {
  garantie: (ziel) => `give_guarantee = ${ziel}`,
  nichtangriffspakt: (ziel) => `diplomatic_relation = { country = ${ziel} relation = non_aggression_pact active = yes }`,
  militaerzugang: (ziel) => `diplomatic_relation = { country = ${ziel} relation = military_access active = yes }`,
}

/** Trifft «puppet = X» oder «set_autonomy = { target = X … }» auf oberster Ebene. */
function marionettenEintrag(ziel) {
  return (x) => {
    const k = x.schluessel.toLowerCase()
    if (k === 'puppet') return x.wert.typ === 'block' ? wertText(finde(x.wert.inhalt, 'target')?.wert) === ziel : x.wert.text === ziel
    if (k === 'set_autonomy' && x.wert.typ === 'block') return wertText(finde(x.wert.inhalt, 'target')?.wert) === ziel
    return false
  }
}

export function erzeugeDiplomatie(k) {
  const { projekt, spieldaten, modid } = k
  const meinungsWerte = new Set()
  // Beitritte kommen erst nach allen Gruendungen, sonst steht add_to_faction vor create_faction
  const beitritte = []
  for (const land of projekt.laender) {
    if (land.art === 'geaendert' && !land.aendern?.diplomatie) continue
    const d = land.diplomatie
    if (!d) continue
    const tag = land.tag
    const zeilen = []

    const vorher = land.art === 'neu' ? [] : (spieldaten.laender[tag]?.marionetten ?? [])
    const nachher = d.marionetten ?? vorher
    for (const m of nachher) {
      const alt = vorher.find(v => v.tag === m.tag)
      if (!alt) {
        zeilen.push(`puppet = ${m.tag}`)
        if (m.autonomie && m.autonomie !== 'autonomy_puppet') zeilen.push(autonomieZeile(m.tag, m.autonomie))
      } else if (alt.autonomie !== m.autonomie) {
        zeilen.push(autonomieZeile(m.tag, m.autonomie))
      }
    }
    for (const alt of vorher) {
      if (!nachher.some(m => m.tag === alt.tag)) k.verlaufEntfernen(tag, marionettenEintrag(alt.tag))
    }

    for (const m of d.meinungen ?? []) {
      const wert = Math.round(Number(m.wert) || 0)
      const kennung = meinungKennung(modid, wert)
      meinungsWerte.add(wert)
      zeilen.push(`add_opinion_modifier = { target = ${m.tag} modifier = ${kennung} }`)
      if (m.gegenseitig) zeilen.push(`${m.tag} = { add_opinion_modifier = { target = ${tag} modifier = ${kennung} } }`)
    }

    for (const v of d.vertraege ?? []) if (VERTRAG[v.art]) zeilen.push(VERTRAG[v.art](v.tag))

    if (d.fraktion?.art === 'gruenden') {
      const kennung = `${modid}_fraktion_${tag.toLowerCase()}`
      k.sprache.setze(kennung, d.fraktion.name || 'Fraktion')
      zeilen.push(`create_faction = ${kennung}`)
      for (const mitglied of d.fraktion.mitglieder ?? []) zeilen.push(`add_to_faction = ${mitglied}`)
    } else if (d.fraktion?.art === 'beitreten' && d.fraktion.anfuehrer) {
      beitritte.push([d.fraktion.anfuehrer, `add_to_faction = ${tag}`])
    }

    for (const z of d.kriegsziele ?? []) zeilen.push(`create_wargoal = { type = ${z.art} target = ${z.tag} }`)

    if (zeilen.length) k.startZeilen(tag, zeilen)
  }

  for (const [anfuehrer, zeile] of beitritte) k.startZeilen(anfuehrer, [zeile])

  if (meinungsWerte.size) {
    const eintraege = [...meinungsWerte].sort((a, b) => a - b).map(wert => {
      const kennung = meinungKennung(modid, wert)
      k.sprache.setze(kennung, `Beziehung (Mod) ${wert >= 0 ? '+' : ''}${wert}`)
      return e(kennung, block([e('value', wort(wert))]))
    })
    k.schreibe(modPfad(modid, `common/opinion_modifiers/${modid}_meinungen.txt`), schreibeParadox([e('opinion_modifiers', block(eintraege))]))
  }
}
