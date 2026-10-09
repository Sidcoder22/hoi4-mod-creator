// Entscheidungen (common/decisions) und eigene Kategorien (common/decisions/categories).

import { schreibeParadox } from '../leser/paradox.js'
import { erzeugeWirkungen, erzeugeBedingungen } from '../bausteine/erzeugen.js'
import { e, wort, text as _t, block, zahlWort } from '../bausteine/hilfen.js'
import { schreibeDds, skaliereRgba } from './bilder.js'
import { bausteinKontext } from './baustein-kontext.js'
import { entscheidungKennung, kategorieKennung, modPfad } from './kennungen.js'

/** allowed-Block fuer eine Laenderliste; ohne Laender kein Block. */
function erlaubt(laender) {
  if (!laender?.length) return []
  const tags = laender.map(t => e('tag', wort(t)))
  return [e('allowed', block(tags.length > 1 ? [e('OR', block(tags))] : tags))]
}

export function erzeugeEntscheidungen(k) {
  const { projekt, spieldaten, modid } = k
  const kategorien = projekt.kategorien ?? []
  const entscheidungen = projekt.entscheidungen ?? []
  if (!kategorien.length && !entscheidungen.length) return
  const sprites = []

  // Symbol: im Skript ohne Praefix wie im Spiel; eigene Bilder bekommen ein Sprite mit Praefix
  const symbol = (sym, praefix, kennung, groesse) => {
    if (sym?.art === 'eigen') {
      const sprite = `${praefix}${kennung}`
      const roh = k.holeBild(sym.bildId)
      if (roh) {
        const [b, h] = groesse
        const pfad = `gfx/interface/decisions/${kennung}.dds`
        k.schreibe(modPfad(modid, pfad), schreibeDds(skaliereRgba(roh.rgba, roh.breite, roh.hoehe, b, h), b, h))
        sprites.push(e('spriteType', block([e('name', _t(sprite)), e('texturefile', _t(pfad))])))
      }
      k.braucheGfx(sprite)
      return kennung
    }
    const sprite = sym?.sprite || ''
    k.braucheGfx(sprite)
    return sprite.slice(sprite.toLowerCase().startsWith(praefix.toLowerCase()) ? praefix.length : 0)
  }

  const kategorieTeile = []
  const eigeneKennung = new Map()
  for (const kat of kategorien) {
    const kennung = kategorieKennung(projekt, kat)
    eigeneKennung.set(kat.id, kennung)
    kategorieTeile.push(e(kennung, block([
      e('icon', wort(symbol(kat.symbol, 'GFX_decision_category_', kennung, spieldaten.bildgroessen?.kategorie || [32, 32]))),
      ...erlaubt(kat.laender),
    ])))
    k.sprache.setze(kennung, kat.name)
    k.sprache.setze(`${kennung}_desc`, kat.beschreibung || '')
    k.braucheSprache(kennung)
  }

  const spielKategorien = new Set((spieldaten.entscheidungsKategorien ?? []).map(x => x.id))
  const bloecke = new Map()
  for (const d of entscheidungen) {
    // Entscheidungen ohne gueltige Kategorie meldet die Pruefung; hier werden sie uebersprungen
    const katKennung = d.kategorie?.art === 'eigen' ? eigeneKennung.get(d.kategorie.id) : (spielKategorien.has(d.kategorie?.id) ? d.kategorie.id : null)
    if (!katKennung) continue
    const kennung = entscheidungKennung(projekt, d)
    const bk = bausteinKontext(k, kennung)
    const teile = [
      e('icon', wort(symbol(d.symbol, 'GFX_decision_', kennung, spieldaten.bildgroessen?.entscheidung || [32, 32]))),
      e('cost', zahlWort(d.kosten ?? 0)),
      ...erlaubt(d.laender),
    ]
    const sichtbar = erzeugeBedingungen(d.sichtbar, bk)
    if (sichtbar.length) teile.push(e('visible', block(sichtbar)))
    const verfuegbar = erzeugeBedingungen(d.verfuegbar, bk)
    if (verfuegbar.length) teile.push(e('available', block(verfuegbar)))
    if (d.nurEinmal) teile.push(e('fire_only_once', wort('yes')))
    else teile.push(e('days_re_enable', zahlWort(Math.max(0, Math.round(Number(d.wartezeit) || 0)))))
    teile.push(e('complete_effect', block(erzeugeWirkungen(d.wirkungen, bk))))
    const dauer = Math.round(Number(d.dauer) || 0)
    if (dauer > 0) {
      teile.push(e('days_remove', zahlWort(dauer)))
      teile.push(e('remove_effect', block(erzeugeWirkungen(d.wirkungenEnde, bk))))
    }
    teile.push(e('ai_will_do', block([e('factor', zahlWort(d.kiGewicht ?? 1))])))
    if (!bloecke.has(katKennung)) bloecke.set(katKennung, [])
    bloecke.get(katKennung).push(e(kennung, block(teile)))
    k.sprache.setze(kennung, d.name)
    k.sprache.setze(`${kennung}_desc`, d.beschreibung || '')
    k.braucheSprache(kennung)
  }

  if (kategorieTeile.length) k.schreibe(modPfad(modid, `common/decisions/categories/${modid}_categories.txt`), schreibeParadox(kategorieTeile))
  if (bloecke.size) k.schreibe(modPfad(modid, `common/decisions/${modid}_decisions.txt`), schreibeParadox([...bloecke].map(([kat, inhalt]) => e(kat, block(inhalt)))))
  if (sprites.length) k.schreibe(modPfad(modid, `interface/${modid}_decisions.gfx`), schreibeParadox([e('spriteTypes', block(sprites))]))
}
