// Neue Laender: Kuerzel, Laenderdatei, Verlauf, Einheiten, Anfuehrer, Flaggen, Texte.

import { parseParadox, schreibeParadox, findeAlle } from '../leser/paradox.js'
import { schreibeTga, schreibeDds, skaliereRgba } from './bilder.js'
import { zeichneFlagge } from './flagge.js'
import { anfuehrerKennung, asciiDateiname, geistKennung, eigenschaftKennung, modPfad, zahl } from './kennungen.js'
import { effektiveBesitzer } from '../projekt/abgeleitet.js'

const MINIMALE_TECHNIK = ['infantry_weapons', 'infantry_weapons1', 'tech_support', 'tech_engineers', 'gw_artillery']
export const FLAGGEN_GROESSEN = [['', 82, 52], ['medium/', 41, 26], ['small/', 10, 7]]

const wort = (t) => ({ typ: 'wort', text: String(t) })
const text = (t) => ({ typ: 'text', text: String(t) })
const block = (inhalt) => ({ typ: 'block', inhalt })
const eintrag = (schluessel, wert) => ({ schluessel, op: '=', wert })

/** Technologien eines Spiel-Landes (oberste Ebene, ohne Datumsbloecke). */
export function technikVon(spieldaten, tag) {
  const datei = spieldaten.laender[tag]?.verlaufDatei
  const original = datei ? spieldaten.originaltexte[datei] : null
  if (!original) return []
  const namen = []
  for (const b of findeAlle(parseParadox(original).eintraege, 'set_technology')) {
    if (b.wert.typ !== 'block') continue
    for (const x of b.wert.inhalt) if (x.schluessel && !namen.includes(x.schluessel)) namen.push(x.schluessel)
  }
  return namen
}

export function technikFuer(spieldaten, land) {
  const quelle = land.technikWie || spieldaten.staaten[land.hauptstadt]?.besitzer
  const technik = quelle ? technikVon(spieldaten, quelle) : []
  return technik.length ? technik : MINIMALE_TECHNIK
}

/** set_technology fuer ein neues Land: eigene Liste (Etappe 4c) oder wie bisher; eine leere Liste schreibt nichts. */
function forschungEintraege(spieldaten, land) {
  const liste = Array.isArray(land.forschung) ? land.forschung : technikFuer(spieldaten, land)
  return liste.length ? [eintrag('set_technology', block(liste.map(t => eintrag(t, wort(1)))))] : []
}

export function ideologieIds(spieldaten) {
  return spieldaten.ideologien?.length ? spieldaten.ideologien.map(g => g.id) : ['democratic', 'communism', 'fascism', 'neutrality']
}

/** Zeilen fuer Politik und Beliebtheit. */
export function politikEintraege(spieldaten, regierung) {
  const pop = ideologieIds(spieldaten).map(id => eintrag(id, wort(Math.round(regierung.parteien[id]?.beliebtheit ?? 0))))
  return [
    eintrag('set_politics', block([
      eintrag('ruling_party', wort(regierung.ideologie)),
      eintrag('last_election', text(regierung.letzteWahl || '1933.3.5')),
      eintrag('election_frequency', wort(regierung.wahlintervall || 48)),
      eintrag('elections_allowed', wort(regierung.wahlen ? 'yes' : 'no')),
    ])),
    eintrag('set_popularities', block(pop)),
  ]
}

/** Parteinamen; Rueckfall auf den Ideologie-Namen des Spiels. */
export function parteiTexte(k, land, { nurGesetzte = false } = {}) {
  const ziel = nurGesetzte ? k.sprache.ersetze : k.sprache.setze
  for (const g of k.spieldaten.ideologien || []) {
    const partei = land.regierung.parteien[g.id] || {}
    if (nurGesetzte && !partei.name) continue
    const kurz = partei.name || g.name
    ziel(`${land.tag}_${g.id}_party`, kurz)
    ziel(`${land.tag}_${g.id}_party_long`, partei.langname || kurz)
  }
}

/** Charakterdatei fuer den Anfuehrer; liefert die Kennung oder null. */
export function schreibeAnfuehrer(k, land) {
  const { projekt, spieldaten, modid } = k
  if (!land.anfuehrer?.name) return null
  const kennung = anfuehrerKennung(projekt, land)
  let portraet = null
  if (land.anfuehrer.bild?.art === 'eigen') {
    const roh = k.holeBild(land.anfuehrer.bild.bildId)
    if (roh) {
      const [b, h] = spieldaten.bildgroessen?.portraet || [156, 210]
      portraet = `gfx/leaders/${land.tag}/${modid}_anfuehrer.dds`
      k.schreibe(modPfad(modid, portraet), schreibeDds(skaliereRgba(roh.rgba, roh.breite, roh.hoehe, b, h), b, h))
    }
  } else if (land.anfuehrer.bild?.pfad) {
    portraet = land.anfuehrer.bild.pfad
  }
  const inhalt = [eintrag('name', wort(kennung))]
  if (portraet) inhalt.push(eintrag('portraits', block([eintrag('civilian', block([eintrag('large', text(portraet))]))])))
  const leiter = [
    eintrag('ideology', wort(land.anfuehrer.unterideologie)),
    eintrag('expire', text('1965.1.1.1')),
    eintrag('id', wort(-1)),
  ]
  const eigenschaften = eigenschaftenKennungen(projekt, land)
  if (eigenschaften.length) leiter.push(eintrag('traits', block(eigenschaften.map(wort))))
  inhalt.push(eintrag('country_leader', block(leiter)))
  k.schreibe(modPfad(modid, `common/characters/${modid}_${land.tag}.txt`),
    schreibeParadox([eintrag('characters', block([eintrag(kennung, block(inhalt))]))]))
  k.sprache.setze(kennung, land.anfuehrer.name)
  k.braucheSprache(kennung)
  return kennung
}

/** Flagge in drei Groessen fuer jede Datei (Kuerzel und Varianten). */
export function schreibeFlaggen(k, flagge, dateinamen) {
  for (const [ordner, b, h] of FLAGGEN_GROESSEN) {
    const rgba = zeichneFlagge(flagge, b, h, k.holeBild)
    const bytes = schreibeTga(rgba, b, h)
    for (const name of dateinamen) k.schreibe(modPfad(k.modid, `gfx/flags/${ordner}${name}.tga`), bytes)
  }
}

/** Eigene Geister (Kennungen) und Geister aus dem Spiel (IDs) fuer add_ideas. */
export function geisterKennungen(projekt, land) {
  const eigene = land.ideen.map(id => projekt.ideen.find(g => g.id === id)).filter(Boolean).map(g => geistKennung(projekt, g))
  return [...eigene, ...(land.spielIdeen ?? [])]
}

/** Eigenschaften des Anfuehrers: Spiel-IDs und Kennungen eigener Eigenschaften. */
export function eigenschaftenKennungen(projekt, land) {
  return (land.anfuehrer?.eigenschaften ?? []).map(x => {
    if (x.art === 'spiel') return x.id
    const e = (projekt.eigenschaften ?? []).find(y => y.id === x.id)
    return e ? eigenschaftKennung(projekt, e) : null
  }).filter(Boolean)
}

/** Bevoelkerung der Staaten, die dem Land zum Start gehoeren. */
export function bevoelkerungAnpassen(k, land) {
  const prozent = Number(land.startwerte?.bevoelkerung) || 0
  if (!prozent) return
  for (const [staatId, tag] of effektiveBesitzer(k.projekt, k.spieldaten)) {
    if (tag === land.tag) k.staatManpower(staatId, 1 + prozent / 100)
  }
}

function einheiten(spieldaten, land) {
  const provinzen = [...(spieldaten.staaten[land.hauptstadt]?.provinzen || [])].sort((a, b) => a - b)
  const ort = provinzen.find(p => spieldaten.provinzArten[p] !== 'sea' && spieldaten.provinzArten[p] !== 'lake') ?? provinzen[0]
  const regimenter = []
  for (let x = 0; x < 2; x++) for (let y = 0; y < 3; y++) regimenter.push(eintrag('infantry', block([eintrag('x', wort(x)), eintrag('y', wort(y))])))
  const divisionen = []
  for (let n = 1; n <= land.armee.divisionen; n++) {
    divisionen.push(eintrag('division', block([
      eintrag('name', text(`${n}. Infanterie-Division`)),
      eintrag('location', wort(ort)),
      eintrag('division_template', text('Infanterie-Division')),
      eintrag('start_experience_factor', wort(0.2)),
    ])))
  }
  return schreibeParadox([
    eintrag('division_template', block([eintrag('name', text('Infanterie-Division')), eintrag('regiments', block(regimenter))])),
    eintrag('units', block(divisionen)),
  ])
}

export function erzeugeNeueLaender(k) {
  const { projekt, spieldaten, modid } = k
  const neue = projekt.laender.filter(l => l.art === 'neu')
  if (!neue.length) return
  const tags = []
  for (const land of neue) {
    const tag = land.tag
    tags.push(`${tag} = "countries/${modid}_${tag}.txt"`)
    k.schreibe(modPfad(modid, `common/countries/${modid}_${tag}.txt`),
      `graphical_culture = ${land.grafikstil}_gfx\ngraphical_culture_2d = ${land.grafikstil}_2d\n\ncolor = { ${land.farbe.join(' ')} }\n`)
    k.neueFarbe(tag, land.farbe)

    const verlauf = [eintrag('capital', wort(land.hauptstadt))]
    const mitArmee = land.armee?.divisionen > 0
    if (mitArmee) verlauf.push(eintrag('oob', text(`${tag}_1936`)))
    verlauf.push(
      eintrag('set_research_slots', wort(land.startwerte.forschungsplaetze)),
      eintrag('set_stability', wort(zahl(land.startwerte.stabilitaet / 100))),
      eintrag('set_war_support', wort(zahl(land.startwerte.kriegsunterstuetzung / 100))),
      ...forschungEintraege(spieldaten, land),
      ...politikEintraege(spieldaten, land.regierung),
    )
    const anfuehrer = schreibeAnfuehrer(k, land)
    if (anfuehrer) verlauf.push(eintrag('recruit_character', wort(anfuehrer)))
    const geister = geisterKennungen(projekt, land)
    if (geister.length) verlauf.push(eintrag('add_ideas', block(geister.map(wort))))
    if (Number(land.startwerte.rekruten) > 0) verlauf.push(eintrag('add_manpower', wort(Math.round(land.startwerte.rekruten))))
    k.neuerVerlauf(tag, modPfad(modid, `history/countries/${tag} - ${asciiDateiname(land.name) || tag}.txt`), schreibeParadox(verlauf))
    bevoelkerungAnpassen(k, land)

    if (mitArmee) k.schreibe(modPfad(modid, `history/units/${tag}_1936.txt`), einheiten(spieldaten, land))
    for (const s of land.staaten) k.staatAnLand(s, tag, { kernAltEntfernen: !land.kerneAltBesitzerBehalten })
    schreibeFlaggen(k, land.flagge, [tag])

    k.sprache.setze(tag, land.name)
    k.sprache.setze(`${tag}_DEF`, land.nameDef || land.name)
    k.sprache.setze(`${tag}_ADJ`, land.adjektiv || land.name)
    k.braucheSprache(tag)
    parteiTexte(k, land)
  }
  k.schreibe(modPfad(modid, `common/country_tags/${modid}_countries.txt`), tags.join('\n') + '\n')
}
