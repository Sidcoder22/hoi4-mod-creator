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
]
