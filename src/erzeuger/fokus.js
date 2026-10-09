// Fokusbaeume (common/national_focus) samt eigenen Symbolen und Schimmer.

import { schreibeParadox } from '../leser/paradox.js'
import { erzeugeWirkungen, erzeugeBedingungen } from '../bausteine/erzeugen.js'
import { e, wort, text as _t, block } from '../bausteine/hilfen.js'
import { schreibeDds, skaliereRgba } from './bilder.js'
import { baumKennung, fokusKennung, modPfad, zahl } from './kennungen.js'
import { bausteinKontext } from './baustein-kontext.js'

function schimmer(sprite, textur) {
  const animation = (drehung) => `\t\tanimation = {
\t\t\tanimationmaskfile = "${textur}"
\t\t\tanimationtexturefile = "gfx/interface/goals/shine_overlay.dds"
\t\t\tanimationrotation = ${drehung}
\t\t\tanimationlooping = no
\t\t\tanimationtime = 0.75
\t\t\tanimationdelay = 0
\t\t\tanimationblendmode = "add"
\t\t\tanimationtype = "scrolling"
\t\t\tanimationrotationoffset = { x = 0.0 y = 0.0 }
\t\t\tanimationtexturescale = { x = 1.0 y = 1.0 }
\t\t}
`
  return `\tSpriteType = {
\t\tname = "${sprite}_shine"
\t\ttexturefile = "${textur}"
\t\teffectFile = "gfx/FX/buttonstate.lua"
${animation('-90.0')}${animation('90.0')}\t\tlegacy_lazy_load = no
\t}
`
}

export function erzeugeFokusbaeume(k) {
  const { projekt, spieldaten, modid } = k
  const baeume = projekt.fokusbaeume ?? []
  if (!baeume.length) return
  const sprites = []
  const schimmerTeile = []
  const kennungVon = new Map(baeume.flatMap(b => b.fokusse).map(f => [f.id, fokusKennung(projekt, f)]))
  for (const baum of baeume) {
    const inhalt = [
      e('id', wort(baumKennung(projekt, baum))),
      e('country', block([e('factor', wort(0)), e('modifier', block([e('add', wort(100)), e('tag', wort(baum.land))]))])),
      e('default', wort('no')),
      // Die Leiste fuer Dauer-Fokusse liegt unter dem tiefsten Fokus (eine Zeile im Spiel = 130 Pixel)
      e('continuous_focus_position', block([e('x', wort(50)), e('y', wort(Math.max(1200, (Math.max(0, ...baum.fokusse.map(f => f.y)) + 2) * 130)))])),
    ]
    for (const f of baum.fokusse) {
      const kennung = kennungVon.get(f.id)
      let icon
      if (f.symbol?.art === 'eigen') {
        icon = `GFX_${kennung}`
        const roh = k.holeBild(f.symbol.bildId)
        if (roh) {
          const [b, h] = spieldaten.bildgroessen?.fokus || [94, 86]
          const pfad = `gfx/interface/goals/${kennung}.dds`
          k.schreibe(modPfad(modid, pfad), schreibeDds(skaliereRgba(roh.rgba, roh.breite, roh.hoehe, b, h), b, h))
          sprites.push(e('spriteType', block([e('name', _t(icon)), e('texturefile', _t(pfad))])))
          schimmerTeile.push(schimmer(icon, pfad))
        }
      } else {
        icon = f.symbol?.sprite || 'GFX_goal_generic_construct_civ_factory'
      }
      k.braucheGfx(icon)
      const fokus = [
        e('id', wort(kennung)),
        e('icon', wort(icon)),
        e('x', wort(f.x)),
        e('y', wort(f.y)),
        e('cost', wort(zahl(f.dauer || 10))),
      ]
      const voraus = f.voraussetzungen.filter(v => kennungVon.has(v)).map(v => e('focus', wort(kennungVon.get(v))))
      if (voraus.length) {
        if (f.voraussetzungsArt === 'eine') fokus.push(e('prerequisite', block(voraus)))
        else for (const v of voraus) fokus.push(e('prerequisite', block([v])))
      }
      const aus = f.ausschluss.filter(v => kennungVon.has(v)).map(v => e('focus', wort(kennungVon.get(v))))
      if (aus.length) fokus.push(e('mutually_exclusive', block(aus)))
      const bk = bausteinKontext(k, kennung)
      const verfuegbar = erzeugeBedingungen(f.verfuegbar, bk)
      if (verfuegbar.length) fokus.push(e('available', block(verfuegbar)))
      fokus.push(e('completion_reward', block(erzeugeWirkungen(f.belohnung, bk))))
      fokus.push(e('ai_will_do', block([e('factor', wort(zahl(f.kiGewicht ?? 1)))])))
      inhalt.push(e('focus', block(fokus)))
      k.sprache.setze(kennung, f.name)
      k.sprache.setze(`${kennung}_desc`, f.beschreibung || '')
      k.braucheSprache(kennung)
    }
    k.schreibe(modPfad(modid, `common/national_focus/${modid}_${baumKennung(projekt, baum)}.txt`), schreibeParadox([e('focus_tree', block(inhalt))]))
  }
  if (sprites.length) {
    k.schreibe(modPfad(modid, `interface/${modid}_goals.gfx`), schreibeParadox([e('spriteTypes', block(sprites))]))
    k.schreibe(modPfad(modid, `interface/${modid}_goals_shine.gfx`), `spriteTypes = {\n${schimmerTeile.join('')}}\n`)
  }
}
