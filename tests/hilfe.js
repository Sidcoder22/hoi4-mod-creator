// Gemeinsame Testhilfen.
import { erstelleMiniSpielordner } from '../src/selbsttest/mini-spielordner.js'
import { dateiquelleAusObjekt } from '../src/leser/dateiquelle.js'
import { leseSpielordner } from '../src/leser/spielordner.js'

let zwischenspeicher = null

/** Spieldaten des Mini-Spielordners (einmal gelesen, danach zwischengespeichert). */
export async function miniSpieldaten() {
  if (!zwischenspeicher) zwischenspeicher = await leseSpielordner(dateiquelleAusObjekt(erstelleMiniSpielordner()))
  return zwischenspeicher.spieldaten
}

/** Inhalt einer erzeugten Datei als Text; wirft, wenn der Pfad fehlt. */
export function text(dateien, pfad) {
  const d = dateien.find(x => x.pfad === pfad)
  if (!d) throw new Error(`Datei fehlt: ${pfad}\nVorhanden:\n${dateien.map(x => x.pfad).join('\n')}`)
  return typeof d.inhalt === 'string' ? d.inhalt : new TextDecoder().decode(d.inhalt)
}

import { neuesProjekt } from '../src/projekt/modell.js'
import { fuegeLandHinzu, aendereLand, schalteStaat, fuegeGeistHinzu, aendereGeist } from '../src/projekt/aenderungen.js'

/** Projekt «Mein Reich» mit neuem Land MRE (Staaten 1 und 4, Hauptstadt 1) und einem Geist. */
export function testprojekt(sd) {
  let p = neuesProjekt('Mein Reich')
  let id, geist
  ;[p, id] = fuegeLandHinzu(p, sd, 'neu')
  ;[p, geist] = fuegeGeistHinzu(p, sd)
  p = aendereGeist(p, geist, { name: 'Alpenfestung', beschreibung: 'Die Berge schützen uns.', boni: [{ art: 'stabilitaet', wert: 5 }] })
  p = aendereLand(p, sd, id, {
    name: 'Mein Reich', adjektiv: 'reichisch', farbe: [10, 20, 30],
    flagge: { art: 'designer', vorlage: 'drei_senkrecht', farben: ['#0000ff', '#ffffff', '#ff0000'], symbol: null, symbolFarbe: '#ffd700' },
    regierung: {
      ideologie: 'democratic', wahlen: true, wahlintervall: 48,
      parteien: {
        democratic: { name: 'Volkspartei', langname: 'Demokratische Volkspartei', beliebtheit: 60 },
        communism: { name: '', langname: '', beliebtheit: 10 },
        fascism: { name: '', langname: '', beliebtheit: 10 },
        neutrality: { name: '', langname: '', beliebtheit: 20 },
      },
    },
    anfuehrer: { name: 'Max Muster', unterideologie: 'conservatism', bild: { art: 'spiel', pfad: 'gfx/leaders/Europe/portrait_europe_generic_1.dds' } },
    ideen: [geist],
  })
  p = schalteStaat(p, id, 1)
  p = schalteStaat(p, id, 4)
  return p
}
