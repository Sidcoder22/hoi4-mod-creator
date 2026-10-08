// Eigene Anfuehrer-Eigenschaften (common/country_leader).

import { schreibeParadox } from '../leser/paradox.js'
import { bonusModifier, bonusWertImSpiel } from '../projekt/boni.js'
import { e, wort, block } from '../bausteine/hilfen.js'
import { eigenschaftKennung, modPfad, zahl } from './kennungen.js'

export function erzeugeEigenschaften(k) {
  const { projekt, modid } = k
  const benutzt = new Set(projekt.laender.flatMap(l => (l.anfuehrer?.eigenschaften ?? []).filter(x => x.art === 'eigen').map(x => x.id)))
  const liste = (projekt.eigenschaften ?? []).filter(x => benutzt.has(x.id))
  if (!liste.length) return
  const eintraege = liste.map(eig => {
    const kennung = eigenschaftKennung(projekt, eig)
    k.sprache.setze(kennung, eig.name)
    k.sprache.setze(`${kennung}_desc`, eig.beschreibung || '')
    k.braucheSprache(kennung)
    const boni = (eig.boni ?? []).map(b => [bonusModifier(b), bonusWertImSpiel(b)]).filter(([m]) => m).map(([m, w]) => e(m, wort(zahl(w))))
    return e(kennung, block([e('random', wort('no')), ...boni]))
  })
  k.schreibe(modPfad(modid, `common/country_leader/${modid}_eigenschaften.txt`), schreibeParadox([e('leader_traits', block(eintraege))]))
}
