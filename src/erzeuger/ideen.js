// Nationale Geister (common/ideas) samt eigenen Bildern.

import { schreibeParadox } from '../leser/paradox.js'
import { bonusModifier, bonusWertImSpiel } from '../projekt/boni.js'
import { schreibeDds, skaliereRgba } from './bilder.js'
import { geistKennung, modPfad, zahl } from './kennungen.js'

const wort = (t) => ({ typ: 'wort', text: String(t) })
const text = (t) => ({ typ: 'text', text: String(t) })
const block = (inhalt) => ({ typ: 'block', inhalt })
const eintrag = (schluessel, wert) => ({ schluessel, op: '=', wert })

export function erzeugeIdeen(k) {
  const { projekt, spieldaten, modid } = k
  if (!projekt.ideen.length) return
  const ideen = []
  const sprites = []
  for (const geist of projekt.ideen) {
    const kennung = geistKennung(projekt, geist)
    let bild
    if (geist.bild?.art === 'eigen') {
      const sprite = `GFX_idea_${kennung}`
      k.braucheGfx(sprite)
      const roh = k.holeBild(geist.bild.bildId)
      if (roh) {
        const [b, h] = spieldaten.bildgroessen?.idee || [64, 64]
        const pfad = `gfx/interface/ideas/${kennung}.dds`
        k.schreibe(modPfad(modid, pfad), schreibeDds(skaliereRgba(roh.rgba, roh.breite, roh.hoehe, b, h), b, h))
        sprites.push(eintrag('spriteType', block([eintrag('name', text(sprite)), eintrag('texturefile', text(pfad))])))
      }
      bild = kennung
    } else {
      const sprite = geist.bild?.sprite || 'GFX_idea_generic_army'
      k.braucheGfx(sprite)
      bild = sprite.replace(/^GFX_idea_/, '')
    }
    const modifier = []
    for (const bonus of geist.boni || []) {
      const name = bonusModifier(bonus)
      if (name) modifier.push(eintrag(name, wort(zahl(bonusWertImSpiel(bonus), 6))))
    }
    ideen.push(eintrag(kennung, block([
      eintrag('picture', wort(bild)),
      eintrag('allowed', block([eintrag('always', wort('no'))])),
      eintrag('removal_cost', wort(-1)),
      eintrag('modifier', block(modifier)),
    ])))
    k.sprache.setze(kennung, geist.name)
    k.sprache.setze(`${kennung}_desc`, geist.beschreibung || '')
    k.braucheSprache(kennung)
  }
  k.schreibe(modPfad(modid, `common/ideas/${modid}_ideas.txt`), schreibeParadox([eintrag('ideas', block([eintrag('country', block(ideen))]))]))
  if (sprites.length) k.schreibe(modPfad(modid, `interface/${modid}_ideas.gfx`), schreibeParadox([eintrag('spriteTypes', block(sprites))]))
}
