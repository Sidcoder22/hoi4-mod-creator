// Events (events/<modid>_events.txt) samt eigenen Eventbildern.

import { schreibeParadox } from '../leser/paradox.js'
import { erzeugeWirkungen, erzeugeBedingungen } from '../bausteine/erzeugen.js'
import { e, wort, text as _t, block, zahlWort } from '../bausteine/hilfen.js'
import { schreibeDds, skaliereRgba } from './bilder.js'
import { bausteinKontext } from './baustein-kontext.js'
import { eventKennung, modPfad } from './kennungen.js'

const ANTWORT_BUCHSTABEN = ['a', 'b', 'c', 'd']

export function erzeugeEvents(k) {
  const { projekt, spieldaten, modid } = k
  const events = projekt.events ?? []
  if (!events.length) return
  const inhalt = [e('add_namespace', wort(modid))]
  const sprites = []
  for (const ev of events) {
    const kennung = eventKennung(projekt, ev)
    let bild = ev.bild?.sprite || 'GFX_report_event_generic_rally'
    if (ev.bild?.art === 'eigen') {
      bild = `GFX_report_event_${modid}_${ev.nummer}`
      const roh = k.holeBild(ev.bild.bildId)
      if (roh) {
        const [b, h] = spieldaten.bildgroessen?.event || [210, 176]
        const pfad = `gfx/event_pictures/${modid}_event_${ev.nummer}.dds`
        k.schreibe(modPfad(modid, pfad), schreibeDds(skaliereRgba(roh.rgba, roh.breite, roh.hoehe, b, h), b, h))
        sprites.push(e('spriteType', block([e('name', _t(bild)), e('texturefile', _t(pfad))])))
      }
    }
    k.braucheGfx(bild)
    const bk = bausteinKontext(k, `${kennung}.t`)
    const teile = [
      e('id', wort(kennung)),
      e('title', wort(`${kennung}.t`)),
      e('desc', wort(`${kennung}.d`)),
      e('picture', wort(bild)),
    ]
    if (ev.ausloeser === 'datum' || ev.ausloeser === 'zufall') {
      // Diese Events prueft das Spiel laufend selbst; die Durchschnittszeit bestimmt, wie schnell sie kommen
      if (ev.ausloeser === 'datum' || ev.nurEinmal) teile.push(e('fire_only_once', wort('yes')))
      const bedingungen = [e('tag', wort(ev.land))]
      if (ev.ausloeser === 'datum') bedingungen.push(e('date', wort(ev.datum), '>'))
      bedingungen.push(...erzeugeBedingungen(ev.bedingungen, bk))
      teile.push(e('trigger', block(bedingungen)))
      teile.push(e('mean_time_to_happen', block([e('days', ev.ausloeser === 'datum' ? wort(1) : zahlWort(Math.max(1, Math.round(Number(ev.tage) || 1))))])))
    } else {
      teile.push(e('is_triggered_only', wort('yes')))
    }
    ev.antworten.forEach((a, i) => {
      const schluessel = `${kennung}.${ANTWORT_BUCHSTABEN[i]}`
      teile.push(e('option', block([
        e('name', wort(schluessel)),
        e('ai_chance', block([e('factor', zahlWort(a.kiProzent ?? 0))])),
        ...erzeugeWirkungen(a.wirkungen, bk),
      ])))
      k.sprache.setze(schluessel, a.text)
      k.braucheSprache(schluessel)
    })
    k.sprache.setze(`${kennung}.t`, ev.titel)
    k.sprache.setze(`${kennung}.d`, ev.text || '')
    k.braucheSprache(`${kennung}.t`)
    inhalt.push(e('country_event', block(teile)))
  }
  k.schreibe(modPfad(modid, `events/${modid}_events.txt`), schreibeParadox(inhalt))
  if (sprites.length) k.schreibe(modPfad(modid, `interface/${modid}_events.gfx`), schreibeParadox([e('spriteTypes', block(sprites))]))
}
