// Neue Personen eines Landes: Generaele, Feldmarschaelle, Admirale und Berater (Etappe 4d).

import { schreibeDds, skaliereRgba } from './bilder.js'
import { modPfad, personKennung, eigenschaftKennung } from './kennungen.js'
import { e, wort, text, block, zahlWort } from '../bausteine/hilfen.js'

const ROLLE_BLOCK = { general: 'corps_commander', feldmarschall: 'field_marshal', admiral: 'navy_leader' }
const HEER_WERTE = [['angriff', 'attack_skill'], ['verteidigung', 'defense_skill'], ['planung', 'planning_skill'], ['logistik', 'logistics_skill']]
const MARINE_WERTE = [['angriff', 'attack_skill'], ['verteidigung', 'defense_skill'], ['manoever', 'maneuvering_skill'], ['koordination', 'coordination_skill']]

function portraet(k, land, person, kennung) {
  if (person.bild?.art === 'eigen') {
    const roh = k.holeBild(person.bild.bildId)
    if (!roh) return null
    const [b, h] = k.spieldaten.bildgroessen?.portraet || [156, 210]
    const pfad = `gfx/leaders/${land.tag}/${kennung}.dds`
    k.schreibe(modPfad(k.modid, pfad), schreibeDds(skaliereRgba(roh.rgba, roh.breite, roh.hoehe, b, h), b, h))
    return pfad
  }
  return person.bild?.pfad || null
}

function beraterEigenschaft(k, person) {
  const be = person.beraterEigenschaft
  if (!be) return null
  if (be.art === 'eigen') {
    const eig = (k.projekt.eigenschaften ?? []).find(x => x.id === be.id)
    return eig ? eigenschaftKennung(k.projekt, eig) : null
  }
  return be.id
}

export function erzeugePersonen(k) {
  const { projekt } = k
  for (const land of projekt.laender) {
    if (!(land.art === 'neu' || land.aendern?.personen) || !land.personen?.length) continue
    const rekrutieren = []
    for (const person of land.personen) {
      const kennung = personKennung(projekt, person)
      const bild = portraet(k, land, person, kennung)
      const inhalt = [e('name', wort(kennung))]
      if (person.rolle === 'berater') {
        if (bild) inhalt.push(e('portraits', block([e('civilian', block([e('large', text(bild)), e('small', text(bild))]))])))
        const eig = beraterEigenschaft(k, person)
        inhalt.push(e('advisor', block([
          e('slot', wort(person.platz)),
          e('idea_token', wort(`${kennung}_berater`)),
          e('cost', zahlWort(person.kosten ?? 150)),
          e('allowed', block([e('original_tag', wort(land.tag))])),
          ...(eig ? [e('traits', block([wort(eig)]))] : []),
          e('ai_will_do', block([e('factor', wort(1))])),
        ])))
      } else {
        const marine = person.rolle === 'admiral'
        if (bild) inhalt.push(e('portraits', block([e(marine ? 'navy' : 'army', block([e('large', text(bild))]))])))
        const werte = (marine ? MARINE_WERTE : HEER_WERTE).map(([feld, schluessel]) => e(schluessel, zahlWort(person.werte?.[feld] ?? 1)))
        inhalt.push(e(ROLLE_BLOCK[person.rolle] ?? 'corps_commander', block([
          e('skill', zahlWort(person.stufe ?? 1)),
          ...werte,
          ...(person.eigenschaften?.length ? [e('traits', block(person.eigenschaften.map(wort)))] : []),
          e('legacy_id', wort(-1)),
        ])))
      }
      k.charakter(land.tag, kennung, inhalt)
      k.sprache.setze(kennung, person.name)
      k.braucheSprache(kennung)
      rekrutieren.push(`recruit_character = ${kennung}`)
    }
    k.startZeilen(land.tag, rekrutieren)
  }
}
