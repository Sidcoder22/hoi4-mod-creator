// Ablauf des Selbsttests: Die Schritte bauen aufeinander auf.

import { erstelleMiniSpielordner } from './mini-spielordner.js'
import { dateiquelleAusObjekt } from '../leser/dateiquelle.js'

const zustand = () => window.__hmc.speicher.lies()

export const SCHRITTE = [
  {
    name: 'Projekt anlegen',
    async lauf(h) {
      await h.tippe('neues-projekt-name', 'Selbsttest Reich')
      await h.klicke('neues-projekt-anlegen')
      await h.element('seitenleiste')
      h.pruefe(zustand().projekt.mod.modid === 'selbsttest_reich', 'modid falsch: ' + zustand().projekt.mod.modid)
    },
  },
  {
    name: 'Spielordner einlesen',
    async lauf(h) {
      await window.__hmc.aktionen.spielordnerEinlesen(dateiquelleAusObjekt(erstelleMiniSpielordner()))
      await h.warte(() => document.querySelector('[data-test="spielversion"]')?.textContent.includes('1.15.4'), 5000, 'Spielversion im Kopf')
    },
  },
  {
    name: 'Einstellungen',
    async lauf(h) {
      await h.klicke('nav-einstellungen')
      await h.tippe('mod-name', 'Selbsttest Reich 2')
      await h.warte(async () => (await h.text('modid-anzeige')).includes('selbsttest_reich_2'), 3000, 'modid-Anzeige')
    },
  },
  {
    name: 'Rückgängig',
    async lauf(h) {
      await h.klicke('rueckgaengig')
      await h.warte(async () => (await h.wert('mod-name')) === 'Selbsttest Reich', 3000, 'Name nach Rückgängig')
      await h.klicke('wiederholen')
      await h.warte(async () => (await h.wert('mod-name')) === 'Selbsttest Reich 2', 3000, 'Name nach Wiederholen')
      h.taste('z', { ctrl: true })
      await h.warte(async () => (await h.wert('mod-name')) === 'Selbsttest Reich', 3000, 'Name nach Strg+Z')
    },
  },
  {
    name: 'Duplizieren',
    async lauf(h) {
      const id = zustand().projekt.id
      await h.klicke('zur-startseite')
      await h.klicke(`duplizieren-${id}`)
      await h.warte(() => h.alle('projekt-e').length === 2, 3000, 'zwei Projekte')
      await h.klicke(`projekt-${id}`)
      await h.element('seitenleiste')
      h.pruefe(zustand().projekt.id === id, 'falsches Projekt geöffnet')
    },
  },
  {
    name: 'Bestehendes Land wählen',
    async lauf(h) {
      await h.klicke('nav-laender')
      await h.klicke('bestehendes-land')
      await h.klickeKarte('karte-auswahl', 3)
      await h.warte(async () => (await h.text('auswahl-bestaetigen')).includes('Schweiz'), 3000, 'Auswahl Schweiz')
      await h.klicke('auswahl-bestaetigen')
      await h.warte(async () => (await h.text('land-editor')).includes('Schweiz'), 3000, 'Editor Schweiz')
      h.pruefe(zustand().projekt.laender.some(l => l.tag === 'SWI' && l.art === 'geaendert'), 'SWI nicht im Projekt')
    },
  },
  {
    name: 'Neues Land',
    async lauf(h) {
      await h.klicke('nav-laender')
      await h.klicke('neues-land')
      await h.tippe('land-name', 'Mein Reich')
      await h.warte(async () => (await h.wert('land-tag')) === 'MRE', 3000, 'Kürzel MRE')
      await h.warte(async () => (await h.text('tag-status')).includes('frei'), 3000, 'Kürzel frei')
    },
  },
  {
    name: 'Kürzel belegt',
    async lauf(h) {
      await h.tippe('land-tag', 'GER')
      await h.warte(async () => (await h.text('tag-status')).includes('Deutschland'), 3000, 'Hinweis Deutschland')
      await h.tippe('land-tag', 'MRE')
      await h.warte(async () => (await h.text('tag-status')).includes('frei'), 3000, 'wieder frei')
    },
  },
  {
    name: 'Flagge',
    async lauf(h) {
      await h.klicke('reiter-flagge')
      await h.klicke('flagge-vorlage-drei_senkrecht')
      await h.tippe('flagge-farbe-1', '#00ff00')
      await h.warte(async () => mittelpixel(await h.element('flagge-vorschau')).join() === '0,255,0,255', 3000, 'grüne Mitte')
    },
  },
  {
    name: 'Flaggenbild',
    async lauf(h) {
      await h.klicke('flagge-art-bild')
      await h.ladeHoch('flaggenbild-datei', await rotesBild(100, 60))
      await h.klicke('flaggenbild-uebernehmen')
      await h.warte(async () => mittelpixel(await h.element('flagge-vorschau')).join() === '255,0,0,255', 3000, 'rote Mitte')
      await h.klicke('flagge-art-designer')
      await h.warte(async () => mittelpixel(await h.element('flagge-vorschau')).join() === '0,255,0,255', 3000, 'wieder grün')
    },
  },
  {
    name: 'Gebiet',
    async lauf(h) {
      await h.klicke('reiter-gebiet')
      await h.klickeKarte('karte-gebiet', 1)
      await h.klickeKarte('karte-gebiet', 4)
      await h.element('gebiet-staat-1')
      await h.element('gebiet-staat-4')
      await h.warte(async () => (await h.wert('land-hauptstadt')) === '1', 3000, 'Hauptstadt 1')
    },
  },
  {
    name: 'Regierung',
    async lauf(h) {
      await h.klicke('reiter-regierung')
      await h.waehle('land-ideologie', 'democratic')
      await h.tippe('partei-beliebtheit-democratic', '60')
      await h.warte(async () => (await h.text('beliebtheit-summe')).includes('100 %'), 3000, 'Summe 100 %')
      await h.tippe('partei-name-democratic', 'Volkspartei')
      const land = zustand().projekt.laender.find(l => l.tag === 'MRE')
      h.pruefe(land.regierung.parteien.democratic.beliebtheit === 60, 'Beliebtheit nicht 60')
      h.pruefe(land.regierung.parteien.democratic.name === 'Volkspartei', 'Parteiname fehlt')
    },
  },
  {
    name: 'Anführer',
    async lauf(h) {
      await h.klicke('reiter-anfuehrer')
      await h.tippe('anfuehrer-name', 'Max Muster')
      const auswahl = await h.element('anfuehrer-unterideologie')
      h.pruefe([...auswahl.options].some(o => o.value === 'conservatism'), 'conservatism fehlt')
      await h.warte(() => auswahl.value === 'conservatism', 3000, 'Unterideologie conservatism')
      await h.klicke('portraet-1')
      const land = zustand().projekt.laender.find(l => l.tag === 'MRE')
      h.pruefe(land.anfuehrer.bild.pfad === 'gfx/leaders/Europe/portrait_europe_generic_2.dds', 'Porträt nicht gewählt')
    },
  },
  {
    name: 'Startwerte',
    async lauf(h) {
      await h.klicke('reiter-startwerte')
      await h.tippe('start-stabilitaet', '70')
      await h.tippe('start-divisionen', '4')
      const land = zustand().projekt.laender.find(l => l.tag === 'MRE')
      h.pruefe(land.startwerte.stabilitaet === 70, 'Stabilität nicht 70')
      h.pruefe(land.armee.divisionen === 4, 'Divisionen nicht 4')
    },
  },
]

function mittelpixel(canvas) {
  return [...canvas.getContext('2d').getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data]
}

async function rotesBild(breite, hoehe) {
  const c = new OffscreenCanvas(breite, hoehe)
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#ff0000'
  ctx.fillRect(0, 0, breite, hoehe)
  return new File([await c.convertToBlob({ type: 'image/png' })], 'rot.png', { type: 'image/png' })
}
