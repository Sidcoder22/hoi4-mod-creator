// Ablauf des Selbsttests: Die Schritte bauen aufeinander auf.

import { erstelleMiniSpielordner } from './mini-spielordner.js'
import { dateiquelleAusObjekt } from '../leser/dateiquelle.js'
import { erstelleFakeOrdner } from './fake-ordner.js'
import { parseParadox } from '../leser/paradox.js'

let fakeOrdner = null

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
    name: 'Einlese-Bericht',
    async lauf(h) {
      await h.klicke('spielordner-neu')
      await h.warte(async () => (await h.text('spielordner-bericht')).includes('3 von 3 Ländern'), 3000, 'Bericht mit Flaggen')
      await h.klicke('spielordner-weiter')
      await h.element('seitenleiste')
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
  {
    name: 'Geist',
    async lauf(h) {
      await h.klicke('nav-geister')
      await h.klicke('neuer-geist')
      await h.tippe('geist-name', 'Alpenfestung')
      await h.klicke('bonus-neu')
      await h.waehle('bonus-art-0', 'stabilitaet')
      await h.tippe('bonus-wert-0', '5')
      const geist = zustand().projekt.ideen[0]
      h.pruefe(geist.name === 'Alpenfestung', 'Name des Geists fehlt')
      h.pruefe(JSON.stringify(geist.boni) === JSON.stringify([{ art: 'stabilitaet', wert: 5 }]), 'Bonus falsch: ' + JSON.stringify(geist.boni))
    },
  },
  {
    name: 'Geist zuweisen',
    async lauf(h) {
      const mre = zustand().projekt.laender.find(l => l.tag === 'MRE')
      const geist = zustand().projekt.ideen[0]
      await h.klicke('nav-laender')
      await h.klicke(`land-${mre.id}`)
      await h.klicke('reiter-geister')
      await h.hakeAn(`land-geist-${geist.id}`, true)
      await h.warte(() => zustand().projekt.laender.find(l => l.tag === 'MRE').ideen.includes(geist.id), 3000, 'Geist zugewiesen')
    },
  },
  {
    name: 'Geist aus dem Spiel kopieren',
    async lauf(h) {
      await h.klicke('nav-geister')
      await h.klicke('geister-spiel')
      await h.tippe('spielgeist-suche', 'Schweiz')
      await h.klicke('kopieren-schweizer_neutralitaet')
      await h.warte(async () => (await h.wert('geist-name')) === 'Kopie von Schweizer Neutralität', 3000, 'Kopie geöffnet')
      h.pruefe((await h.wert('bonus-art-0')) === 'konsumgueter', 'Konsumgüter nicht übernommen')
      await h.klicke('bonus-neu')
      await h.waehle('bonus-art-2', 'frei')
      await h.tippe('bonus-frei-2', 'industrial')
      await h.klicke('bonus-frei-2-industrial_capacity_factory')
      await h.tippe('bonus-wert-2', '10')
      const kopie = zustand().projekt.ideen.find(g => g.name === 'Kopie von Schweizer Neutralität')
      h.pruefe(JSON.stringify(kopie.boni[2]) === JSON.stringify({ art: 'frei', modifier: 'industrial_capacity_factory', wert: 0.1 }), 'Freier Bonus falsch: ' + JSON.stringify(kopie.boni[2]))
    },
  },
  {
    name: 'Spielgeist zuweisen',
    async lauf(h) {
      const mre = zustand().projekt.laender.find(l => l.tag === 'MRE')
      await h.klicke('nav-laender')
      await h.klicke(`land-${mre.id}`)
      await h.klicke('reiter-geister')
      await h.tippe('land-spielgeist-suche', 'Industrie')
      await h.klicke('land-spielgeist-hinzu-deutsche_industrie')
      await h.element('land-spielgeist-deutsche_industrie')
      h.pruefe(zustand().projekt.laender.find(l => l.tag === 'MRE').spielIdeen.includes('deutsche_industrie'), 'Spielgeist nicht zugewiesen')
    },
  },
  {
    name: 'Rekruten',
    async lauf(h) {
      await h.klicke('reiter-startwerte')
      await h.tippe('start-rekruten', '200000')
      await h.tippe('start-bevoelkerung', '50')
      const sw = zustand().projekt.laender.find(l => l.tag === 'MRE').startwerte
      h.pruefe(sw.rekruten === 200000 && sw.bevoelkerung === 50, 'Rekruten/Bevölkerung falsch: ' + JSON.stringify(sw))
    },
  },
  {
    name: 'Schweiz ändern',
    async lauf(h) {
      const swi = zustand().projekt.laender.find(l => l.tag === 'SWI')
      await h.klicke('nav-laender')
      await h.klicke(`land-${swi.id}`)
      await h.klicke('reiter-name')
      await h.hakeAn('aendern-name', true)
      await h.tippe('land-name', 'Helvetien')
      await h.klicke('nav-laender')
      await h.warte(async () => (await h.text(`land-${swi.id}`)).includes('Helvetien'), 3000, 'Kachel Helvetien')
    },
  },
  {
    name: 'Schweiz Anführer',
    async lauf(h) {
      const swi = zustand().projekt.laender.find(l => l.tag === 'SWI')
      await h.klicke(`land-${swi.id}`)
      await h.klicke('reiter-anfuehrer')
      await h.hakeAn('aendern-anfuehrer', true)
      await h.tippe('anfuehrer-name', 'Wilhelm Tell')
      const land = zustand().projekt.laender.find(l => l.tag === 'SWI')
      h.pruefe(land.aendern.anfuehrer && land.anfuehrer.name === 'Wilhelm Tell', 'Anführer der Schweiz nicht geändert')
    },
  },
  {
    name: 'Eigenes Land im Auswahldialog',
    async lauf(h) {
      await h.klicke('nav-laender')
      await h.klicke('bestehendes-land')
      await h.klickeKarte('karte-auswahl', 1)
      await h.warte(async () => (await h.text('auswahl-bestaetigen')).includes('Mein Reich'), 3000, 'Auswahl Mein Reich')
      await h.klicke('auswahl-bestaetigen')
      await h.warte(async () => (await h.text('land-editor')).includes('Mein Reich'), 3000, 'Editor Mein Reich')
      h.pruefe(zustand().projekt.laender.filter(l => l.tag === 'MRE').length === 1, 'MRE doppelt')
    },
  },
  {
    name: 'Eigenschaften',
    async lauf(h) {
      const mre = zustand().projekt.laender.find(l => l.tag === 'MRE')
      await h.klicke('nav-laender')
      await h.klicke(`land-${mre.id}`)
      await h.klicke('reiter-anfuehrer')
      await h.tippe('eigenschaft-suche', 'Volks')
      await h.klicke('eigenschaft-hinzu-popular_figurehead')
      await h.klicke('neue-eigenschaft')
      await h.tippe('eigenschaft-name', 'Eiserner Wille')
      await h.klicke('eigenschaft-bonus-neu')
      await h.klicke('eigenschaft-fertig')
      const z = zustand().projekt
      const l = z.laender.find(x => x.tag === 'MRE')
      h.pruefe(l.anfuehrer.eigenschaften.length === 2, 'Eigenschaften: ' + JSON.stringify(l.anfuehrer.eigenschaften))
      h.pruefe(z.eigenschaften[0]?.name === 'Eiserner Wille' && z.eigenschaften[0].boni[0]?.art === 'stabilitaet', 'Eigene Eigenschaft falsch')
    },
  },
  {
    name: 'Diplomatie',
    async lauf(h) {
      await h.klicke('reiter-diplomatie')
      await h.klicke('marionette-neu')
      await h.waehle('marionette-0-land', 'FRA')
      await h.waehle('marionette-0-autonomie', 'autonomy_dominion')
      await h.klicke('meinung-neu')
      await h.waehle('meinung-0-land', 'FRA')
      await h.tippe('meinung-0-wert', '50')
      await h.hakeAn('meinung-0-gegenseitig', true)
      await h.klicke('vertrag-neu')
      await h.waehle('vertrag-0-art', 'nichtangriffspakt')
      await h.waehle('vertrag-0-land', 'FRA')
      await h.klicke('kriegsziel-neu')
      await h.waehle('kriegsziel-0-land', 'GER')
      await h.waehle('kriegsziel-0-art', 'topple_government')
      await h.waehle('fraktion-art', 'gruenden')
      await h.tippe('fraktion-name', 'Alpenbund')
      await h.hakeAn('fraktion-mitglied-SWI', true)
      const d = zustand().projekt.laender.find(x => x.tag === 'MRE').diplomatie
      h.pruefe(JSON.stringify(d.marionetten) === JSON.stringify([{ tag: 'FRA', autonomie: 'autonomy_dominion' }]), 'Marionetten: ' + JSON.stringify(d.marionetten))
      h.pruefe(d.meinungen[0]?.wert === 50 && d.meinungen[0].gegenseitig, 'Meinung falsch')
      h.pruefe(d.vertraege[0]?.art === 'nichtangriffspakt' && d.vertraege[0].tag === 'FRA', 'Vertrag falsch')
      h.pruefe(d.kriegsziele[0]?.tag === 'GER' && d.kriegsziele[0].art === 'topple_government', 'Kriegsziel falsch')
      h.pruefe(d.fraktion?.art === 'gruenden' && d.fraktion.name === 'Alpenbund' && d.fraktion.mitglieder.includes('SWI'), 'Fraktion falsch')
    },
  },
  {
    name: 'Fokusbaum anlegen',
    async lauf(h) {
      await h.klicke('nav-fokusbaeume')
      await h.klicke('neuer-baum')
      await h.waehle('baum-land', 'MRE')
      await h.tippe('baum-name', 'Weg zur Grösse')
      await h.klicke('baum-anlegen')
      await h.element('baum-editor')
      h.pruefe(zustand().projekt.fokusbaeume[0]?.land === 'MRE', 'Baum gehört nicht zu MRE')
    },
  },
  {
    name: 'Fokusse anlegen',
    async lauf(h) {
      for (const [zelle, name] of [['zelle-0-0', 'A'], ['zelle-1-1', 'B'], ['zelle-2-1', 'C']]) {
        await h.doppelklicke(zelle)
        await h.tippe('fokus-name', name)
      }
      const fokusse = zustand().projekt.fokusbaeume[0].fokusse
      h.pruefe(fokusse.map(f => f.name).join() === 'A,B,C', 'Fokusse: ' + fokusse.map(f => f.name).join())
      for (const f of fokusse) await h.element(`fokus-${f.id}`)
    },
  },
  {
    name: 'Verbinden',
    async lauf(h) {
      const [a, b, c] = zustand().projekt.fokusbaeume[0].fokusse
      await h.zieheVon(`griff-${a.id}`, `fokus-${b.id}`)
      await h.klicke(`fokus-${c.id}`)
      await h.hakeAn(`voraussetzung-${a.id}`, true)
      await h.zieheVon(`griff-${b.id}`, `fokus-${c.id}`, { shift: true })
      const [, b2, c2] = zustand().projekt.fokusbaeume[0].fokusse
      h.pruefe(JSON.stringify(b2.voraussetzungen) === JSON.stringify([a.id]), 'B braucht nicht A')
      h.pruefe(JSON.stringify(c2.voraussetzungen) === JSON.stringify([a.id]), 'C braucht nicht A')
      h.pruefe(b2.ausschluss.includes(c.id) && c2.ausschluss.includes(b.id), 'Ausschluss fehlt')
    },
  },
  {
    name: 'Verschieben',
    async lauf(h) {
      const c = zustand().projekt.fokusbaeume[0].fokusse[2]
      await h.zieheVon(`fokus-${c.id}`, 'zelle-3-1')
      let c2 = zustand().projekt.fokusbaeume[0].fokusse[2]
      h.pruefe(c2.x === 3 && c2.y === 1, `C steht auf ${c2.x},${c2.y}`)
      await h.zieheVon(`fokus-${c.id}`, 'zelle-0-0')
      c2 = zustand().projekt.fokusbaeume[0].fokusse[2]
      h.pruefe(c2.x === 3 && c2.y === 1, 'C durfte auf ein besetztes Feld')
    },
  },
  {
    name: 'Symbol',
    async lauf(h) {
      const a = zustand().projekt.fokusbaeume[0].fokusse[0]
      await h.klicke(`fokus-${a.id}`)
      await h.klicke('fokussymbol-GFX_goal_generic_army_doctrines')
      h.pruefe(zustand().projekt.fokusbaeume[0].fokusse[0].symbol.sprite === 'GFX_goal_generic_army_doctrines', 'Symbol nicht gesetzt')
    },
  },
  {
    name: 'Belohnungen',
    async lauf(h) {
      const [a, b, c] = zustand().projekt.fokusbaeume[0].fokusse
      const geist = zustand().projekt.ideen[0]
      await h.klicke(`fokus-${a.id}`)
      await h.klicke('belohnung-neu')
      await h.waehle('belohnung-art-0', 'politische_macht')
      await h.tippe('belohnung-0-menge', '50')
      await h.klicke(`fokus-${b.id}`)
      await h.klicke('belohnung-neu')
      await h.waehle('belohnung-art-0', 'geist_hinzu')
      await h.waehle('belohnung-0-geist', geist.id)
      await h.klicke(`fokus-${c.id}`)
      await h.klicke('belohnung-neu')
      await h.waehle('belohnung-art-0', 'gebaeude')
      await h.waehle('belohnung-0-gebaeude', 'industrial_complex')
      await h.waehle('belohnung-0-wo', 'irgendwo')
      const [a2, b2, c2] = zustand().projekt.fokusbaeume[0].fokusse
      h.pruefe(a2.belohnung[0]?.art === 'politische_macht' && a2.belohnung[0].werte.menge === 50, 'Belohnung A falsch')
      h.pruefe(b2.belohnung[0]?.werte.geist === geist.id, 'Belohnung B falsch')
      h.pruefe(c2.belohnung[0]?.werte.gebaeude === 'industrial_complex', 'Belohnung C falsch')
      h.pruefe((await h.text('belohnung-satz-0')).includes('Zivilfabrik'), 'Klartext für C fehlt')
    },
  },
  {
    name: 'Bedingungen',
    async lauf(h) {
      const b = zustand().projekt.fokusbaeume[0].fokusse[1]
      await h.klicke(`fokus-${b.id}`)
      await h.klicke('verfuegbar-neu')
      await h.waehle('verfuegbar-art-0', 'stabilitaet')
      await h.waehle('verfuegbar-0-vergleich', '>')
      await h.tippe('verfuegbar-0-prozent', '50')
      await h.warte(async () => (await h.text('verfuegbar-satz-0')).includes('Stabilität über 50 %'), 3000, 'Klartext Stabilität')
      const b2 = zustand().projekt.fokusbaeume[0].fokusse[1]
      h.pruefe(b2.verfuegbar.liste[0]?.werte.prozent === 50, 'Bedingung nicht gespeichert')
    },
  },
  {
    name: 'Event anlegen',
    async lauf(h) {
      await h.klicke('nav-events')
      await h.klicke('neues-event')
      await h.element('event-editor')
      await h.tippe('event-titel', 'Volksfest')
      await h.tippe('event-text', 'Das Volk feiert.')
      await h.klicke('eventbild-GFX_report_event_soldiers_marching')
      const ev = zustand().projekt.events[0]
      h.pruefe(ev.titel === 'Volksfest' && ev.bild.sprite === 'GFX_report_event_soldiers_marching', 'Titel oder Bild nicht gesetzt')
      await h.warte(async () => (await h.text('event-vorschau')).includes('Volksfest'), 3000, 'Vorschau mit Titel')
    },
  },
  {
    name: 'Event-Antworten',
    async lauf(h) {
      await h.tippe('antwort-0-text', 'Feiern')
      await h.klicke('antwort-0-wirkung-neu')
      await h.waehle('antwort-0-wirkung-art-0', 'politische_macht')
      await h.tippe('antwort-0-wirkung-0-menge', '25')
      // Etappe 3b: Bonus wie bei Geistern
      await h.klicke('antwort-0-wirkung-neu')
      await h.waehle('antwort-0-wirkung-art-1', 'bonus')
      await h.tippe('antwort-0-wirkung-1-name', 'Festlaune')
      await h.tippe('antwort-0-wirkung-1-tage', '180')
      await h.klicke('antwort-0-wirkung-1-bild-GFX_idea_generic_industry')
      await h.element('antwort-0-wirkung-1-boni-wert-0')
      await h.warte(async () => (await h.text('antwort-0-wirkung-satz-1')) === 'Bonus «Festlaune»: Konsumgüter -10 % – für 180 Tage', 3000, 'Klartext Bonus')
      h.pruefe(zustand().projekt.events[0].antworten[0].wirkungen[1].werte.bild === 'GFX_idea_generic_industry', 'Bild des Bonus nicht gesetzt')
      h.pruefe((await h.text('vorschau-antwort-0')).includes('Festlaune'), 'Vorschau ohne Bonus')
      await h.klicke('antwort-neu')
      await h.tippe('antwort-1-text', 'Absagen')
      const ev = zustand().projekt.events[0]
      h.pruefe(ev.antworten.length === 2 && ev.antworten[1].text === 'Absagen', 'Zweite Antwort fehlt')
      h.pruefe(ev.antworten[0].wirkungen[0]?.werte.menge === 25, 'Wirkung der Antwort fehlt')
      await h.warte(async () => (await h.text('vorschau-antwort-0')).includes('25 politische Macht erhalten'), 3000, 'Vorschau Antwort 1')
      h.pruefe((await h.text('vorschau-antwort-1')).includes('Absagen'), 'Vorschau Antwort 2')
      await h.klicke('antwort-neu')
      await h.klicke('antwort-neu')
      h.pruefe(h.el('antwort-neu').disabled, 'Mehr als vier Antworten möglich')
      await h.klicke('antwort-3-entfernen')
      await h.klicke('antwort-2-entfernen')
      h.pruefe(zustand().projekt.events[0].antworten.length === 2, 'Antworten nicht entfernt')
    },
  },
  {
    name: 'Event an Datum',
    async lauf(h) {
      await h.klicke('nav-events')
      await h.element('event-' + zustand().projekt.events[0].id)
      await h.klicke('neues-event')
      await h.tippe('event-titel', 'Grenzstreit')
      await h.tippe('event-text', 'Es gibt Ärger an der Grenze.')
      const werEsAusloest = () => [...h.el('event-land').options].some(o => o.textContent === 'wer es auslöst')
      h.pruefe(werEsAusloest(), 'Auswahl «wer es auslöst» fehlt')
      await h.waehle('event-ausloeser', 'datum')
      await h.waehle('event-land', 'MRE')
      await h.tippe('event-datum-tag', '1')
      await h.tippe('event-datum-monat', '1')
      await h.tippe('event-datum-jahr', '1937')
      const ev = zustand().projekt.events[1]
      h.pruefe(ev.ausloeser === 'datum' && ev.land === 'MRE' && ev.datum === '1937.1.1', 'Datum-Event falsch: ' + JSON.stringify([ev.ausloeser, ev.land, ev.datum]))
      h.pruefe(!werEsAusloest(), '«wer es auslöst» trotz Datum')
    },
  },
  {
    name: 'Kategorie',
    async lauf(h) {
      await h.klicke('nav-entscheidungen')
      await h.klicke('neue-kategorie')
      await h.element('kategorie-editor')
      await h.tippe('kategorie-name', 'Reformen')
      await h.tippe('kategorie-beschreibung', 'Grosse Pläne für das Reich.')
      await h.waehle('kategorie-land-neu', 'MRE')
      await h.element('kategorie-land-weg-MRE')
      const kat = zustand().projekt.kategorien[0]
      h.pruefe(kat.name === 'Reformen' && kat.laender.join() === 'MRE', 'Kategorie falsch: ' + JSON.stringify(kat))
    },
  },
  {
    name: 'Entscheidung',
    async lauf(h) {
      await h.klicke('nav-entscheidungen')
      await h.klicke('neue-entscheidung')
      await h.element('entscheidung-editor')
      const kat = zustand().projekt.kategorien[0]
      h.pruefe(h.el('entscheidung-kategorie').value === 'eigen:' + kat.id, 'Kategorie ist nicht «Reformen»')
      await h.tippe('entscheidung-name', 'Armee reformieren')
      await h.tippe('entscheidung-beschreibung', 'Eine neue Ordnung für das Heer.')
      await h.tippe('entscheidung-kosten', '75')
      h.pruefe(!h.el('entscheidung-ende-neu'), 'Wirkung am Ende ohne Dauer sichtbar')
      await h.tippe('entscheidung-dauer', '30')
      await h.element('entscheidung-ende-neu')
      await h.klicke('entscheidung-laufzeit-neu')
      h.pruefe(zustand().projekt.entscheidungen[0].boniLaufzeit.length === 1, 'Laufzeit-Bonus fehlt')
      const d = zustand().projekt.entscheidungen[0]
      h.pruefe(d.kosten === 75 && d.dauer === 30, 'Kosten oder Dauer falsch')
      await h.warte(async () => (await h.text('entscheidung-vorschau')).includes('75'), 3000, 'Vorschau mit Kosten')
      h.pruefe((await h.text('entscheidung-vorschau')).includes('Armee reformieren'), 'Vorschau ohne Namen')
    },
  },
  {
    name: 'Event auslösen',
    async lauf(h) {
      const volksfest = zustand().projekt.events[0]
      await h.klicke('entscheidung-wirkung-neu')
      await h.waehle('entscheidung-wirkung-art-0', 'event')
      await h.waehle('entscheidung-wirkung-0-event', volksfest.id)
      await h.tippe('entscheidung-wirkung-0-tage', '5')
      await h.warte(async () => (await h.text('entscheidung-wirkung-satz-0')) === 'Event «Volksfest» auslösen – nach 5 Tagen', 3000, 'Klartext Event auslösen')
      await h.klicke('entscheidung-ende-neu')
      await h.waehle('entscheidung-ende-art-0', 'merker_setzen')
      await h.tippe('entscheidung-ende-0-merker', 'Armee Reform')
      const d = zustand().projekt.entscheidungen[0]
      h.pruefe(d.wirkungen[0]?.werte.event === volksfest.id && d.wirkungen[0].werte.tage === 5, 'Wirkung Event auslösen falsch')
      h.pruefe(d.wirkungenEnde[0]?.werte.merker === 'Armee Reform', 'Wirkung am Ende falsch')
    },
  },
  {
    name: 'Spielkategorie',
    async lauf(h) {
      const kat = zustand().projekt.kategorien[0]
      await h.waehle('entscheidung-kategorie', 'spiel:political_actions')
      h.pruefe(JSON.stringify(zustand().projekt.entscheidungen[0].kategorie) === JSON.stringify({ art: 'spiel', id: 'political_actions' }), 'Spielkategorie nicht gesetzt')
      await h.waehle('entscheidung-kategorie', 'eigen:' + kat.id)
      h.pruefe(zustand().projekt.entscheidungen[0].kategorie.id === kat.id, 'Eigene Kategorie nicht zurückgesetzt')
      await h.klicke('nav-entscheidungen')
      await h.element('entscheidung-' + zustand().projekt.entscheidungen[0].id)
      h.pruefe((await h.text('kategorie-gruppe-eigen-' + kat.id)).includes('Armee reformieren'), 'Entscheidung nicht unter Reformen gelistet')
    },
  },
  {
    name: 'Prüfung',
    async lauf(h) {
      await h.klicke('nav-pruefung')
      await h.warte(() => h.el('ampel')?.dataset.zustand === 'rot', 3000, 'Ampel rot')
      await h.element('meldung-hauptstadt-verloren-0')
      await h.klicke('behebung-hauptstadt-verloren-0')
      await h.warte(() => h.el('ampel')?.dataset.zustand === 'gelb', 3000, 'Ampel gelb')
      const ger = zustand().projekt.laender.find(l => l.tag === 'GER')
      h.pruefe(ger && ger.hauptstadt === 2 && ger.aendern.gebiet, 'Deutschland hat keine neue Hauptstadt')
      // Die Entscheidung loest «Volksfest» aus, «Grenzstreit» kommt an einem Datum
      h.pruefe(!h.el('meldung-event-nie-0'), 'Hinweis «wird nie ausgelöst» trotz Entscheidung')
    },
  },
  {
    name: 'Sprung zum Event',
    async lauf(h) {
      const volksfest = zustand().projekt.events[0]
      await h.klicke('nav-events')
      await h.klicke('event-' + volksfest.id)
      await h.tippe('antwort-1-text', '')
      await h.klicke('nav-pruefung')
      await h.warte(() => h.el('ampel')?.dataset.zustand === 'rot', 3000, 'Ampel rot ohne Antworttext')
      const meldung = await h.element('meldung-antwort-text-0')
      meldung.querySelector('.text').click()
      await h.element('event-editor')
      h.pruefe(zustand().ansicht.bereich === 'event' && zustand().ansicht.id === volksfest.id, 'Sprung führt nicht zum Event')
      await h.tippe('antwort-1-text', 'Absagen')
      await h.klicke('nav-pruefung')
      await h.warte(() => h.el('ampel')?.dataset.zustand === 'gelb', 3000, 'Ampel wieder gelb')
    },
  },
  {
    name: 'Sprung aus der Prüfung',
    async lauf(h) {
      await h.klicke('nav-pruefung')
      const meldung = await h.element('meldung-fokus-beschreibung-0')
      meldung.querySelector('.text').click()
      await h.element('baum-editor')
      await h.element('fokus-seite')
      h.pruefe(zustand().ansicht.bereich === 'fokus' && zustand().ansicht.fokus, 'Kein Fokus gewählt nach dem Sprung')
    },
  },
  {
    name: 'Speichern in Ordner',
    async lauf(h) {
      fakeOrdner = erstelleFakeOrdner({ 'settings.txt': '' })
      await window.__hmc.aktionen.merkeZielordner(fakeOrdner)
      await h.klicke('nav-speichern')
      await h.klicke('speichern-ordner')
      await h.element('speichern-ergebnis')
      const dateien = fakeOrdner.alsObjekt()
      for (const pfad of ['mod/selbsttest_reich.mod', 'mod/selbsttest_reich/history/countries/MRE - Mein Reich.txt',
        'mod/selbsttest_reich/gfx/flags/MRE.tga', 'mod/selbsttest_reich/history/countries/SWI - Switzerland.txt',
        'mod/selbsttest_reich/common/ideas/selbsttest_reich_ideas.txt', 'mod/selbsttest_reich/hoi4-mod-creator-projekt.json']) {
        h.pruefe(dateien[pfad], `Datei fehlt: ${pfad}`)
      }
      for (const [pfad, inhalt] of Object.entries(dateien)) {
        if (pfad.endsWith('.txt') && pfad.startsWith('mod/')) parseParadox(new TextDecoder().decode(inhalt), { streng: true })
      }
      const baum = dateien['mod/selbsttest_reich/common/national_focus/selbsttest_reich_selbsttest_reich_baum_1.txt']
      h.pruefe(baum, 'Fokusbaum-Datei fehlt')
      const baumText = new TextDecoder().decode(baum)
      h.pruefe(baumText.includes('add_political_power = 50'), 'Belohnung fehlt im Fokusbaum')
      h.pruefe(baumText.includes('mutually_exclusive'), 'Ausschluss fehlt im Fokusbaum')
      h.pruefe(baumText.includes('has_stability > 0.5'), 'Bedingung fehlt im Fokusbaum')
      h.pruefe(dateien['mod/selbsttest_reich/common/opinion_modifiers/selbsttest_reich_meinungen.txt'], 'Meinungs-Datei fehlt')
      const verlauf = new TextDecoder().decode(dateien['mod/selbsttest_reich/history/countries/MRE - Mein Reich.txt'])
      for (const teil of ['puppet = FRA', 'create_faction', 'add_manpower = 200000', 'add_ideas']) h.pruefe(verlauf.includes(teil), `Verlauf ohne «${teil}»`)
      const charakter = new TextDecoder().decode(dateien['mod/selbsttest_reich/common/characters/selbsttest_reich_MRE.txt'])
      h.pruefe(charakter.includes('traits = { popular_figurehead selbsttest_reich_eigenschaft_1 }'), 'Eigenschaften fehlen beim Anführer')
      const eig = dateien['mod/selbsttest_reich/common/country_leader/selbsttest_reich_eigenschaften.txt']
      h.pruefe(eig, 'Eigenschaften-Datei fehlt')
      parseParadox(new TextDecoder().decode(eig), { streng: true })
      const lies = (pfad) => {
        h.pruefe(dateien[pfad], `Datei fehlt: ${pfad}`)
        const t = new TextDecoder().decode(dateien[pfad])
        parseParadox(t, { streng: true })
        return t
      }
      const events = lies('mod/selbsttest_reich/events/selbsttest_reich_events.txt')
      for (const teil of ['add_namespace = selbsttest_reich', 'is_triggered_only = yes', 'date > 1937.1.1']) h.pruefe(events.includes(teil), `Events ohne «${teil}»`)
      const entscheidungen = lies('mod/selbsttest_reich/common/decisions/selbsttest_reich_decisions.txt')
      for (const teil of ['days_remove = 30', 'country_event', 'cost = 75', 'modifier = {']) h.pruefe(entscheidungen.includes(teil), `Entscheidungen ohne «${teil}»`)
      h.pruefe(events.includes('add_timed_idea'), 'Events ohne «add_timed_idea»')
      h.pruefe(lies('mod/selbsttest_reich/common/ideas/selbsttest_reich_ideas.txt').includes('consumer_goods_factor = -0.1'), 'Bonus-Geist fehlt')
      lies('mod/selbsttest_reich/common/decisions/categories/selbsttest_reich_categories.txt')
      h.pruefe(zustand().projekt.mod.gespeichertAls === 'selbsttest_reich', 'gespeichertAls nicht gesetzt')
    },
  },
  {
    name: 'ZIP',
    async lauf(h) {
      let erhalten = null
      window.__hmc.ladeHerunter = (blob, name) => { erhalten = { blob, name } }
      await h.klicke('speichern-zip')
      await h.warte(() => erhalten, 3000, 'ZIP-Download')
      h.pruefe(erhalten.name === 'selbsttest_reich.zip', 'ZIP-Name falsch: ' + erhalten.name)
      h.pruefe(erhalten.blob.size > 1000, 'ZIP zu klein')
    },
  },
  {
    name: 'Spielfehler',
    async lauf(h) {
      const logs = await fakeOrdner.getDirectoryHandle('logs', { create: true })
      const w = await (await logs.getFileHandle('error.log', { create: true })).createWritable()
      await w.write('[12:00:01][persistent.cpp:48]: Error: "Unexpected token: }, near line: 7" in file: "history/countries/MRE - Mein Reich.txt" near line: 7\n[12:00:02][x.cpp:1]: anderes Problem in common/foo.txt\n')
      await w.close()
      await h.klicke('nav-spielfehler')
      await h.klicke('spielfehler-laden')
      await h.warte(async () => (await h.text('spielfehler-0')).includes('Tippfehler'), 3000, 'Spielfehler erklärt')
      h.pruefe(!h.el('spielfehler-1'), 'fremder Fehler wurde angezeigt')
    },
  },
  {
    name: 'Projekt aus Mod öffnen',
    async lauf(h) {
      const json = fakeOrdner.alsObjekt()['mod/selbsttest_reich/hoi4-mod-creator-projekt.json']
      await h.klicke('zur-startseite')
      await h.element('neues-projekt-name')
      const vorher = zustand().projekte.length
      await h.ladeHoch('projekt-importieren', new File([json], 'hoi4-mod-creator-projekt.json', { type: 'application/json' }))
      await h.warte(() => zustand().projekte.length === vorher + 1, 3000, 'Projekt importiert')
      const mre = zustand().projekt.laender.find(l => l.tag === 'MRE')
      h.pruefe(JSON.stringify(mre.staaten) === '[1,4]', 'Staaten nach Import falsch')
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
