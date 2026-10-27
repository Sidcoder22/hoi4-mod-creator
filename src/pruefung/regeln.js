// Pruefregeln: Was muss stimmen, bevor die Mod gespeichert werden darf?

import { tagGesperrt } from '../projekt/modell.js'
import { effektiveBesitzer, landName, verlaufsWerte } from '../projekt/abgeleitet.js'
import { fuegeLandHinzu, aendereLand } from '../projekt/aenderungen.js'
import { fokusZyklus } from '../projekt/fokus.js'
import { pruefeBausteine } from '../bausteine/erzeugen.js'
import { pruefeFeld } from '../bausteine/felder.js'
import { pruefeBonus } from '../projekt/boni.js'
import { effektiveStaatswerte, normalisiereStaat, verwerfeStaat, aendereStaat } from '../projekt/staaten.js'
import { setzeForschung, alleVoraussetzungen, forschungVon } from '../projekt/forschung.js'
import { kampfbreite } from '../projekt/armee.js'
import { asciiName } from '../erzeuger/armee.js'

const zaehlt = (l, feld) => l.art === 'neu' || l.aendern?.[feld]

export function hatFehler(meldungen) {
  return meldungen.some(m => m.schwere === 'fehler')
}

export function pruefeProjekt(p, sd) {
  const meldungen = []
  const fehler = (regel, text, ziel, behebung) => meldungen.push({ regel, schwere: 'fehler', text, ziel, ...(behebung ? { behebung } : {}) })
  const hinweis = (regel, text, ziel, behebung) => meldungen.push({ regel, schwere: 'hinweis', text, ziel, ...(behebung ? { behebung } : {}) })
  const staatName = (id) => sd.staaten[id]?.name ?? `Staat ${id}`
  const besitzer = effektiveBesitzer(p, sd)
  const einstellungen = { bereich: 'einstellungen' }

  // Mod
  if (!String(p.mod.name || '').trim()) fehler('mod-name', 'Die Mod braucht einen Namen.', einstellungen)
  if (!/^[a-z][a-z0-9_]{0,19}$/.test(p.mod.modid || '')) {
    fehler('modid', 'Der interne Name der Mod darf nur Kleinbuchstaben, Ziffern und _ enthalten, muss mit einem Buchstaben beginnen und höchstens 20 Zeichen lang sein.', einstellungen)
  }

  // Laender
  const tagZaehler = new Map()
  const staatZuLaendern = new Map()
  const gruppeVon = new Map()
  for (const g of sd.ideologien || []) for (const u of g.unter) gruppeVon.set(u.id, g.id)

  for (const l of p.laender) {
    const anzeige = l.art === 'neu' ? (l.name ? `«${l.name}»` : 'Ein neues Land') : `«${landName(l.tag, p, sd)}»`
    const ziel = (reiter) => ({ bereich: 'land', id: l.id, reiter })
    tagZaehler.set(l.tag, (tagZaehler.get(l.tag) || 0) + 1)
    if (tagZaehler.get(l.tag) === 2) fehler('land-doppelt', `Das Kürzel «${l.tag}» kommt im Projekt zweimal vor.`, ziel('name'))

    if (l.art === 'neu') {
      if (!String(l.name || '').trim()) fehler('land-name', 'Ein neues Land braucht einen Namen.', ziel('name'))
      if (!/^[A-Z][A-Z0-9]{2}$/.test(l.tag) || tagGesperrt(l.tag)) {
        fehler('tag-format', `Das Kürzel «${l.tag}» ist nicht erlaubt. Es braucht drei Grossbuchstaben oder Ziffern (erstes Zeichen ein Buchstabe); AND, NOT, ALL, ANY und D00–D99 sind gesperrt.`, ziel('name'))
      } else if (sd.laender[l.tag]) {
        fehler('tag-belegt', `Das Kürzel «${l.tag}» gehört schon ${sd.laender[l.tag].name}.`, ziel('name'))
      } else if (p.laender.some(x => x.id !== l.id && x.art === 'neu' && x.tag === l.tag) && tagZaehler.get(l.tag) === 1) {
        fehler('tag-belegt', `Das Kürzel «${l.tag}» hat schon ein anderes Land im Projekt.`, ziel('name'))
      }
      if (!l.staaten.length) fehler('ohne-staaten', `${anzeige} hat noch kein Gebiet.`, ziel('gebiet'))
      else if (!l.hauptstadt) fehler('ohne-hauptstadt', `${anzeige} hat noch keine Hauptstadt.`, ziel('gebiet'))
      if (!l.anfuehrer?.name) hinweis('ohne-anfuehrer', `${anzeige} hat keinen Anführer. Das Spiel setzt dann einen zufälligen ein.`, ziel('anfuehrer'))
    }
    if (zaehlt(l, 'gebiet')) {
      for (const s of l.staaten) {
        if (!staatZuLaendern.has(s)) staatZuLaendern.set(s, [])
        staatZuLaendern.get(s).push(l)
      }
      if (l.hauptstadt && besitzer.get(l.hauptstadt) !== l.tag) {
        fehler('hauptstadt-fremd', `Die Hauptstadt ${staatName(l.hauptstadt)} von ${anzeige} gehört nicht zum eigenen Gebiet.`, ziel('gebiet'))
      }
    }
    if (zaehlt(l, 'regierung')) {
      const summe = Object.values(l.regierung.parteien).reduce((s, x) => s + (Number(x.beliebtheit) || 0), 0)
      if (summe !== 100) fehler('beliebtheit', `Die Beliebtheit der Parteien von ${anzeige} ergibt ${summe} % statt 100 %.`, ziel('regierung'))
    }
    if (zaehlt(l, 'anfuehrer') && l.anfuehrer?.name) {
      const ideologie = zaehlt(l, 'regierung') ? l.regierung.ideologie : (verlaufsWerte(sd, l.tag).ideologie ?? l.regierung.ideologie)
      if (gruppeVon.get(l.anfuehrer.unterideologie) !== ideologie) {
        fehler('anfuehrer-ideologie', `Die Ideologie des Anführers von ${anzeige} passt nicht zur Regierung. Sonst wird er im Spiel nicht Staatsoberhaupt.`, ziel('anfuehrer'))
      }
    }
    if (zaehlt(l, 'geister')) {
      for (const geistId of l.ideen) {
        if (!p.ideen.some(g => g.id === geistId)) fehler('geist-verweis', `${anzeige} verweist auf einen gelöschten nationalen Geist.`, ziel('geister'))
      }
    }
    if (zaehlt(l, 'flagge') && l.flagge?.art === 'bild' && !p.bilder?.[l.flagge.bildId]) {
      fehler('bild-fehlt', `Das Flaggenbild von ${anzeige} fehlt. Bitte lade es neu hoch.`, ziel('flagge'))
    }
    if (zaehlt(l, 'anfuehrer') && l.anfuehrer?.bild?.art === 'eigen' && !p.bilder?.[l.anfuehrer.bild.bildId]) {
      fehler('bild-fehlt', `Das Bild des Anführers von ${anzeige} fehlt. Bitte lade es neu hoch.`, ziel('anfuehrer'))
    }
  }
  for (const [s, laender] of staatZuLaendern) {
    if (laender.length > 1) {
      const namen = laender.map(l => `«${landName(l.tag, p, sd)}»`).join(' und ')
      fehler('staat-doppelt', `${staatName(s)} ist gleichzeitig ${namen} zugewiesen.`, { bereich: 'land', id: laender[1].id, reiter: 'gebiet' })
    }
  }

  // Spiel-Laender, die ihre Hauptstadt oder alle Staaten verlieren
  const anzahlVorher = new Map()
  const anzahlNachher = new Map()
  for (const s of Object.values(sd.staaten)) anzahlVorher.set(s.besitzer, (anzahlVorher.get(s.besitzer) || 0) + 1)
  for (const tag of besitzer.values()) anzahlNachher.set(tag, (anzahlNachher.get(tag) || 0) + 1)
  for (const spiel of Object.values(sd.laender)) {
    const tag = spiel.tag
    if (!anzahlVorher.get(tag)) continue
    const projektLand = p.laender.find(l => l.tag === tag)
    if (!anzahlNachher.get(tag)) {
      hinweis('land-verschwindet', `${landName(tag, p, sd)} besitzt zum Start keine Staaten mehr und ist dann nicht mehr dabei.`,
        projektLand ? { bereich: 'land', id: projektLand.id, reiter: 'gebiet' } : { bereich: 'land' })
      continue
    }
    const eigeneHauptstadt = projektLand?.aendern?.gebiet && projektLand.hauptstadt
    if (eigeneHauptstadt || !spiel.hauptstadt || besitzer.get(spiel.hauptstadt) === tag) continue
    const ersatz = Object.values(sd.staaten).filter(s => besitzer.get(s.id) === tag).sort((a, b) => b.manpower - a.manpower || a.id - b.id)[0]
    fehler('hauptstadt-verloren', `${landName(tag, p, sd)} verliert seine Hauptstadt ${staatName(spiel.hauptstadt)}.`,
      projektLand ? { bereich: 'land', id: projektLand.id, reiter: 'gebiet' } : { bereich: 'land' },
      {
        text: `${ersatz.name} als neue Hauptstadt festlegen`,
        anwenden(projekt, spieldaten) {
          const [q, landId] = fuegeLandHinzu(projekt, spieldaten, 'geaendert', tag)
          const l = q.laender.find(x => x.id === landId)
          return aendereLand(q, spieldaten, landId, { hauptstadt: ersatz.id, aendern: { ...l.aendern, gebiet: true } })
        },
      })
  }

  // Nationale Geister
  for (const geist of p.ideen) {
    const ziel = { bereich: 'geist', id: geist.id }
    if (!String(geist.name || '').trim()) fehler('geist-name', 'Ein nationaler Geist braucht einen Namen.', ziel)
    else if (!String(geist.beschreibung || '').trim()) hinweis('geist-beschreibung', `Der nationale Geist «${geist.name}» hat keine Beschreibung.`, ziel)
    if (geist.bild?.art === 'eigen' && !p.bilder?.[geist.bild.bildId]) fehler('bild-fehlt', `Das Bild des nationalen Geists «${geist.name}» fehlt.`, ziel)
    if (geist.bild?.art !== 'eigen' && !sd.sprites?.[geist.bild?.sprite]) {
      fehler('geist-bild-unbekannt', `Das Bild des nationalen Geists «${geist.name || 'ohne Namen'}» gibt es im eingelesenen Spiel nicht. Bitte wähle ein anderes.`, ziel)
    }
  }

  // Fokusbaeume
  const tags = new Set(Object.keys(sd.laender))
  for (const l of p.laender) if (l.art === 'neu') tags.add(l.tag)
  const baumZaehler = new Map()
  for (const baum of p.fokusbaeume ?? []) {
    const zielBaum = { bereich: 'fokus', id: baum.id }
    const bname = `Fokusbaum «${baum.name || 'ohne Namen'}»`
    if (!tags.has(baum.land)) fehler('baum-land', `${bname} gehört zu keinem Land mehr. Wähle ein Land aus.`, zielBaum)
    baumZaehler.set(baum.land, (baumZaehler.get(baum.land) || 0) + 1)
    if (baumZaehler.get(baum.land) === 2) fehler('baum-doppelt', `${landName(baum.land, p, sd)} hat mehr als einen Fokusbaum. Das Spiel kann nur einen benutzen.`, zielBaum)
    if (!baum.fokusse.length) hinweis('baum-leer', `${bname} hat noch keine Fokusse.`, zielBaum)
    const ids = new Set(baum.fokusse.map(f => f.id))
    const felder = new Map()
    for (const f of baum.fokusse) {
      const ziel = { bereich: 'fokus', id: baum.id, fokus: f.id }
      const fname = `Fokus «${f.name || 'ohne Namen'}»`
      if (!String(f.name || '').trim()) fehler('fokus-name', `Ein Fokus in ${bname} braucht einen Namen.`, ziel)
      const feld = `${f.x},${f.y}`
      if (felder.has(feld)) fehler('fokus-ueberlappung', `${fname} liegt auf demselben Feld wie «${felder.get(feld).name || 'ohne Namen'}».`, ziel)
      else felder.set(feld, f)
      // Geteilte Fokusse aus dem Spiel (Etappe 4f) sind gesperrt und werden nicht geschrieben
      if (f.gesperrt) continue
      if ([...f.voraussetzungen, ...f.ausschluss].some(v => !ids.has(v))) fehler('fokus-verweis', `${fname} verweist auf einen Fokus, den es nicht mehr gibt.`, ziel)
      if (f.symbol?.art === 'eigen' ? !p.bilder?.[f.symbol.bildId] : !sd.sprites?.[f.symbol?.sprite]) {
        fehler('fokus-symbol', `Das Symbol von ${fname} fehlt. Bitte wähle ein anderes.`, ziel)
      }
      for (const m of [...pruefeBausteine(f.verfuegbar, { projekt: p, spieldaten: sd }, fname), ...pruefeBausteine(f.belohnung, { projekt: p, spieldaten: sd }, fname)]) {
        fehler('baustein', m.text, ziel)
      }
      if (!f.belohnung?.length) hinweis('fokus-ohne-belohnung', `${fname} hat keine Belohnung.`, ziel)
      if (String(f.name || '').trim() && !String(f.beschreibung || '').trim()) hinweis('fokus-beschreibung', `${fname} hat keine Beschreibung.`, ziel)
    }
    // Etappe 4f: importierte Baeume
    if (baum.herkunft?.art === 'aendern') {
      const vorhanden = new Set(baum.fokusse.map(f => f.spielId).filter(Boolean))
      const weg = (baum.herkunft.spielFokusIds ?? []).filter(id => !vorhanden.has(id))
      if (weg.length) hinweis('fokus-spiel-geloescht', `In ${bname} fehlen Fokusse aus dem Spiel (${weg.join(', ')}). Andere Inhalte des Spiels könnten noch auf sie verweisen.`, zielBaum)
    }
    if (baum.herkunft?.art === 'vorlage') {
      const mitSpielcode = baum.fokusse.filter(f => [...(f.belohnung ?? []), ...(f.verfuegbar?.liste ?? [])].some(b => b.ausSpiel))
      const anzahl = baum.fokusse.reduce((s, f) => s + [...(f.belohnung ?? []), ...(f.verfuegbar?.liste ?? [])].filter(b => b.ausSpiel).length, 0)
      if (anzahl) hinweis('fokus-spielcode-vorlage', `${bname} enthält ${anzahl} Bausteine mit Code aus dem Spiel. Sie beziehen sich oft auf das Originalland – prüfe, ob sie für dein Land passen.`, { bereich: 'fokus', id: baum.id, fokus: mitSpielcode[0].id })
    }
    const kreis = fokusZyklus(baum)
    if (kreis) {
      const namen = kreis.map(id => baum.fokusse.find(f => f.id === id)?.name || 'ohne Namen').join(' → ')
      fehler('fokus-kreis', `Die Voraussetzungen in ${bname} drehen sich im Kreis: ${namen}.`, { bereich: 'fokus', id: baum.id, fokus: kreis[0] })
    }
  }

  // Etappe 2b: Boni, Spielgeister, Eigenschaften, Diplomatie
  const bekannteModifikatoren = new Set((sd.modifikatoren ?? []).map(m => m.id))
  const pruefeBoni = (boni, wer, ziel) => {
    for (const b of boni ?? []) {
      const f = pruefeBonus(b)
      if (f) fehler(b.art === 'frei' ? 'bonus-name' : 'bonus-wert', `${wer}: ${f}`, ziel)
      else if (b.art === 'frei' && !bekannteModifikatoren.has(b.modifier)) hinweis('bonus-unbekannt', `${wer}: Den Bonus «${b.modifier}» kennt das eingelesene Spiel nicht. Prüfe die Schreibweise.`, ziel)
    }
  }
  for (const geist of p.ideen) pruefeBoni(geist.boni, `Nationaler Geist «${geist.name || 'ohne Namen'}»`, { bereich: 'geist', id: geist.id })
  const nutzerVon = (eigId) => p.laender.find(l => (l.anfuehrer?.eigenschaften ?? []).some(x => x.art === 'eigen' && x.id === eigId))
  for (const eig of p.eigenschaften ?? []) {
    const nutzer = nutzerVon(eig.id)
    // Unbenutzte Eigenschaften kommen nicht in die Mod und duerfen das Speichern nicht blockieren
    if (!nutzer) continue
    const ziel = nutzer ? { bereich: 'land', id: nutzer.id, reiter: 'anfuehrer' } : { bereich: 'land' }
    if (!String(eig.name || '').trim()) fehler('eigenschaft-name', 'Eine eigene Anführer-Eigenschaft braucht einen Namen.', ziel)
    pruefeBoni(eig.boni, `Eigenschaft «${eig.name || 'ohne Namen'}»`, ziel)
  }
  const spielGeistIds = new Set((sd.spielGeister ?? []).map(x => x.id))
  const spielEigenschaften = new Set((sd.anfuehrerEigenschaften ?? []).map(x => x.id))
  const eigeneEigenschaften = new Set((p.eigenschaften ?? []).map(x => x.id))
  const oberherren = new Map()
  const merkeOberherr = (marionette, herr) => {
    if (!oberherren.has(marionette)) oberherren.set(marionette, new Set())
    oberherren.get(marionette).add(herr)
  }
  const aktiveDiplomatie = new Map(p.laender.filter(l => l.diplomatie && (l.art === 'neu' || l.aendern?.diplomatie)).map(l => [l.tag, l]))
  for (const spiel of Object.values(sd.laender)) {
    if (aktiveDiplomatie.has(spiel.tag)) continue
    for (const m of spiel.marionetten ?? []) merkeOberherr(m.tag, spiel.tag)
  }
  const fraktionen = new Set(Object.values(sd.laender).filter(x => x.fraktion).map(x => x.tag))
  for (const l of aktiveDiplomatie.values()) {
    for (const m of l.diplomatie.marionetten ?? sd.laender[l.tag]?.marionetten ?? []) merkeOberherr(m.tag, l.tag)
    if (l.diplomatie.fraktion?.art === 'gruenden') fraktionen.add(l.tag)
  }
  const mitgliedschaften = new Map()
  const mitglied = (t, l) => {
    if (!mitgliedschaften.has(t)) mitgliedschaften.set(t, [])
    mitgliedschaften.get(t).push(l)
  }
  // Wer im Spiel eine Fraktion leitet, ist schon in einer Fraktion
  for (const spiel of Object.values(sd.laender)) if (spiel.fraktion) mitglied(spiel.tag, null)
  for (const l of p.laender) {
    const anzeige = `«${landName(l.tag, p, sd)}»`
    const ziel = (reiter) => ({ bereich: 'land', id: l.id, reiter })
    if (l.art === 'neu' || l.aendern?.geister) {
      for (const id of l.spielIdeen ?? []) if (!spielGeistIds.has(id)) fehler('spielgeist-fehlt', `${anzeige} hat den Geist «${id}» aus dem Spiel, den es im eingelesenen Spiel nicht gibt.`, ziel('geister'))
    }
    if (l.art === 'neu' || l.aendern?.anfuehrer) {
      for (const x of l.anfuehrer?.eigenschaften ?? []) {
        const da = x.art === 'spiel' ? spielEigenschaften.has(x.id) : eigeneEigenschaften.has(x.id)
        if (!da) fehler('eigenschaft-fehlt', `Der Anführer von ${anzeige} hat eine Eigenschaft, die es nicht mehr gibt.`, ziel('anfuehrer'))
      }
    }
    if (!aktiveDiplomatie.has(l.tag) || aktiveDiplomatie.get(l.tag) !== l) continue
    const d = l.diplomatie
    const pruefeZiel = (zielTag, was) => {
      if (!zielTag || !tags.has(zielTag) || zielTag === l.tag) {
        fehler('diplomatie-ziel', `${anzeige}: ${was} zielt auf ${zielTag === l.tag ? 'das Land selbst' : `ein unbekanntes Land «${zielTag ?? ''}»`}.`, ziel('diplomatie'))
        return
      }
      if (![...besitzer.values()].includes(zielTag)) hinweis('diplomatie-ohne-staaten', `${anzeige}: ${landName(zielTag, p, sd)} besitzt zum Start keine Staaten.`, ziel('diplomatie'))
    }
    const doppelt = (liste, schluessel, was) => {
      const gesehen = new Set()
      for (const x of liste ?? []) {
        const k = schluessel(x)
        if (gesehen.has(k)) fehler('diplomatie-doppelt', `${anzeige}: ${was} mit ${landName(x.tag, p, sd)} steht doppelt in der Liste.`, ziel('diplomatie'))
        gesehen.add(k)
      }
    }
    for (const m of d.marionetten ?? []) pruefeZiel(m.tag, 'Eine Marionette')
    for (const m of d.meinungen ?? []) pruefeZiel(m.tag, 'Eine Meinung')
    for (const v of d.vertraege ?? []) pruefeZiel(v.tag, 'Ein Vertrag')
    for (const z of d.kriegsziele ?? []) pruefeZiel(z.tag, 'Ein Kriegsziel')
    doppelt(d.marionetten, x => x.tag, 'Die Marionette')
    doppelt(d.meinungen, x => x.tag, 'Die Meinung')
    doppelt(d.vertraege, x => `${x.art}:${x.tag}`, 'Der Vertrag')
    doppelt(d.kriegsziele, x => x.tag, 'Das Kriegsziel')
    if (d.fraktion?.art === 'gruenden') {
      mitglied(l.tag, l)
      for (const t of d.fraktion.mitglieder ?? []) {
        pruefeZiel(t, 'Ein Fraktionsmitglied')
        mitglied(t, l)
      }
    } else if (d.fraktion?.art === 'beitreten') {
      pruefeZiel(d.fraktion.anfuehrer, 'Der Fraktionsbeitritt')
      if (d.fraktion.anfuehrer && !fraktionen.has(d.fraktion.anfuehrer)) {
        fehler('fraktion-ohne', `${anzeige} möchte der Fraktion von ${landName(d.fraktion.anfuehrer, p, sd)} beitreten, aber dieses Land hat zu Spielbeginn keine Fraktion.`, ziel('diplomatie'))
      }
      mitglied(l.tag, l)
    }
  }
  for (const [marionette, herren] of oberherren) {
    if (herren.size < 2) continue
    const projektLand = [...herren].map(h => aktiveDiplomatie.get(h)).find(Boolean)
    fehler('marionette-doppelt', `${landName(marionette, p, sd)} wäre Marionette von ${[...herren].map(h => landName(h, p, sd)).join(' und ')}.`,
      projektLand ? { bereich: 'land', id: projektLand.id, reiter: 'diplomatie' } : { bereich: 'land' })
  }
  for (const [t, laender] of mitgliedschaften) {
    if (laender.length < 2) continue
    const projektLand = laender.find(Boolean)
    const imSpiel = sd.laender[t]?.fraktion ? ` (im Spiel leitet ${landName(t, p, sd)} bereits eine Fraktion)` : ''
    fehler('fraktion-doppelt', `${landName(t, p, sd)} wäre Mitglied in mehreren Fraktionen${imSpiel}.`,
      projektLand ? { bereich: 'land', id: projektLand.id, reiter: 'diplomatie' } : { bereich: 'land' })
  }

  // Hinweise zur Mod
  // Etappe 3: Events, Kategorien, Entscheidungen
  const kontext = { projekt: p, spieldaten: sd }
  const symbolFehlt = (sym) => (sym?.art === 'eigen' ? !p.bilder?.[sym.bildId] : !sd.sprites?.[sym?.sprite])
  const ausgeloest = ausgeloesteEvents(p)
  for (const ev of p.events ?? []) {
    const ziel = { bereich: 'event', id: ev.id }
    const ename = `Event «${ev.titel || 'ohne Titel'}»`
    if (!String(ev.titel || '').trim()) fehler('event-titel', 'Ein Event braucht einen Titel.', ziel)
    if (!ev.antworten?.length) fehler('event-ohne-antwort', `${ename} braucht mindestens eine Antwort.`, ziel)
    ev.antworten?.forEach((a, i) => {
      if (!String(a.text || '').trim()) fehler('antwort-text', `Antwort ${i + 1} von ${ename} braucht einen Text.`, ziel)
      for (const m of pruefeBausteine(a.wirkungen, kontext, `${ename}, Antwort ${i + 1}`)) fehler('baustein', m.text, ziel)
    })
    const selbstPruefend = ev.ausloeser === 'datum' || ev.ausloeser === 'zufall'
    if (selbstPruefend && !ev.land) fehler('event-land', `${ename}: Bei «${ev.ausloeser === 'datum' ? 'An einem Datum' : 'Zufällig'}» musst du ein bestimmtes Land wählen.`, ziel)
    else if (ev.land && !tags.has(ev.land)) fehler('event-land', `${ename} gehört zu einem Land, das es nicht mehr gibt.`, ziel)
    if (ev.ausloeser === 'datum') {
      const f = pruefeFeld({ typ: 'datum', label: 'Datum' }, ev.datum, kontext)
      if (f) fehler('event-datum', `${ename}: ${f}. Gib Tag, Monat und Jahr ein.`, ziel)
    }
    if (symbolFehlt(ev.bild)) fehler('event-bild', `Das Bild von ${ename} fehlt. Bitte wähle ein anderes.`, ziel)
    if (selbstPruefend) for (const m of pruefeBausteine(ev.bedingungen, kontext, ename)) fehler('baustein', m.text, ziel)
    if (!selbstPruefend && !ausgeloest.has(ev.id)) {
      hinweis('event-nie', `${ename} wird nie ausgelöst. Füge irgendwo die Wirkung «Event auslösen» hinzu oder wähle einen anderen Auslöser.`, ziel)
    }
    if (String(ev.titel || '').trim() && !String(ev.text || '').trim()) hinweis('event-text', `${ename} hat keinen Text.`, ziel)
  }
  for (const [eventId, kette] of eventSchleifen(p)) {
    const titel = (id) => p.events.find(x => x.id === id)?.titel || 'ohne Titel'
    hinweis('event-schleife', `Event «${titel(eventId)}» löst sich immer wieder selbst aus (${kette.map(titel).join(' → ')}). Das ist nur gewollt, wenn es zum Beispiel mit Verzögerung regelmässig wiederkommen soll.`,
      { bereich: 'event', id: eventId })
  }
  const eigeneKategorien = new Set((p.kategorien ?? []).map(k => k.id))
  const spielKategorien = new Set((sd.entscheidungsKategorien ?? []).map(k => k.id))
  for (const kat of p.kategorien ?? []) {
    const ziel = { bereich: 'kategorie', id: kat.id }
    const kname = `Kategorie «${kat.name || 'ohne Namen'}»`
    if (!String(kat.name || '').trim()) fehler('kategorie-name', 'Eine Kategorie für Entscheidungen braucht einen Namen.', ziel)
    if (symbolFehlt(kat.symbol)) fehler('kategorie-symbol', `Das Symbol der ${kname} fehlt. Bitte wähle ein anderes.`, ziel)
    for (const t of kat.laender ?? []) if (!tags.has(t)) fehler('kategorie-land', `${kname} ist für das Land «${t}», das es nicht mehr gibt.`, ziel)
    if (!(p.entscheidungen ?? []).some(d => d.kategorie?.art === 'eigen' && d.kategorie.id === kat.id)) hinweis('kategorie-leer', `${kname} enthält noch keine Entscheidung.`, ziel)
  }
  for (const d of p.entscheidungen ?? []) {
    const ziel = { bereich: 'entscheidung', id: d.id }
    const dname = `Entscheidung «${d.name || 'ohne Namen'}»`
    if (!String(d.name || '').trim()) fehler('entscheidung-name', 'Eine Entscheidung braucht einen Namen.', ziel)
    const katDa = d.kategorie?.art === 'eigen' ? eigeneKategorien.has(d.kategorie.id) : spielKategorien.has(d.kategorie?.id)
    if (!katDa) fehler('entscheidung-kategorie', `${dname} gehört zu keiner Kategorie mehr. Wähle eine Kategorie aus.`, ziel)
    if (symbolFehlt(d.symbol)) fehler('entscheidung-symbol', `Das Symbol von ${dname} fehlt. Bitte wähle ein anderes.`, ziel)
    for (const t of d.laender ?? []) if (!tags.has(t)) fehler('entscheidung-land', `${dname} ist für das Land «${t}», das es nicht mehr gibt.`, ziel)
    const mitEnde = Number(d.dauer) > 0
    const teile = [[d.sichtbar, 'sichtbar wenn'], [d.verfuegbar, 'verfügbar wenn'], [d.wirkungen, 'Wirkung'], ...(mitEnde ? [[d.wirkungenEnde, 'Wirkung am Ende']] : [])]
    for (const [teil, wo] of teile) for (const m of pruefeBausteine(teil, kontext, `${dname} (${wo})`)) fehler('baustein', m.text, ziel)
    if (mitEnde) pruefeBoni(d.boniLaufzeit, `${dname} (Bonus während der Laufzeit)`, ziel)
    if (!d.wirkungen?.length && !(mitEnde && (d.wirkungenEnde?.length || d.boniLaufzeit?.length))) hinweis('entscheidung-ohne-wirkung', `${dname} bewirkt nichts.`, ziel)
    if (String(d.name || '').trim() && !String(d.beschreibung || '').trim()) hinweis('entscheidung-beschreibung', `${dname} hat keine Beschreibung.`, ziel)
  }

  // Etappe 3b: freie Boni in Bausteinen «Bonus erhalten», die das Spiel nicht kennt (Fehler meldet schon die Regel baustein)
  const unbekannteBoni = (liste, wer, ziel) => {
    for (const w of liste ?? []) {
      if (w.art === 'bei_land') unbekannteBoni(w.wirkungen, wer, ziel)
      if (w.art !== 'bonus') continue
      for (const b of w.werte?.boni ?? []) {
        if (b.art === 'frei' && !pruefeBonus(b) && !bekannteModifikatoren.has(b.modifier)) {
          hinweis('bonus-unbekannt', `${wer}: Den Bonus «${b.modifier}» im Baustein «${w.werte.name || 'Bonus'}» kennt das eingelesene Spiel nicht. Prüfe die Schreibweise.`, ziel)
        }
      }
    }
  }
  for (const baum of p.fokusbaeume ?? []) {
    for (const f of baum.fokusse) unbekannteBoni(f.belohnung, `Fokus «${f.name || 'ohne Namen'}»`, { bereich: 'fokus', id: baum.id, fokus: f.id })
  }
  for (const ev of p.events ?? []) {
    for (const a of ev.antworten ?? []) unbekannteBoni(a.wirkungen, `Event «${ev.titel || 'ohne Titel'}»`, { bereich: 'event', id: ev.id })
  }
  for (const d of p.entscheidungen ?? []) {
    const ziel = { bereich: 'entscheidung', id: d.id }
    unbekannteBoni(d.wirkungen, `Entscheidung «${d.name || 'ohne Namen'}»`, ziel)
    if (Number(d.dauer) > 0) unbekannteBoni(d.wirkungenEnde, `Entscheidung «${d.name || 'ohne Namen'}»`, ziel)
  }

  // Etappe 4e: Armee (neue Laender; bestehende nur mit Schalter)
  const einheitArt = new Map((sd.einheitenArten ?? []).map(e => [e.id, e]))
  for (const l of p.laender) {
    if (!(l.art === 'neu' || l.aendern?.armee)) continue
    const ziel = { bereich: 'land', id: l.id, reiter: 'armee' }
    const { vorlagen = [], verbaende = [] } = l.armee ?? {}
    const freigeschaltet = new Set(forschungVon(sd, l).flatMap(t => sd.technologien?.find(x => x.id === t)?.einheiten ?? []))
    const namen = new Map()
    for (const v of vorlagen) {
      const vname = `Vorlage «${v.name || 'ohne Namen'}» (${landName(l.tag, p, sd)})`
      const ascii = asciiName(v.name)
      if (!ascii) fehler('vorlage-name', `Eine Vorlage von ${landName(l.tag, p, sd)} braucht einen Namen.`, ziel)
      else if (namen.has(ascii)) fehler('vorlage-name', `${vname}: Den Namen hat schon eine andere Vorlage.`, ziel)
      namen.set(ascii, v)
      if (!v.bataillone.flat().some(Boolean)) fehler('vorlage-leer', `${vname} hat kein Bataillon.`, ziel)
      const zellen = [...v.bataillone.flat().filter(Boolean).map(art => [art, false]), ...v.unterstuetzung.filter(Boolean).map(art => [art, true])]
      const fehlend = new Set()
      for (const [art, kompanie] of zellen) {
        const info = einheitArt.get(art)
        if (!info) fehler('vorlage-einheit', `${vname} enthält die Einheit «${art}», die es im Spiel nicht gibt.`, ziel)
        else if (info.unterstuetzung !== kompanie) fehler('vorlage-einheit', `${vname}: «${info.name}» gehört ${info.unterstuetzung ? 'zu den Unterstützungskompanien' : 'in das Bataillonsraster'}.`, ziel)
        else if (!info.aktiv && !freigeschaltet.has(art)) fehlend.add(info.name)
      }
      if (fehlend.size) hinweis('vorlage-forschung', `${vname} enthält ${[...fehlend].join(', ')} – das Land hat die nötige Forschung zu Beginn noch nicht.`, ziel)
      const breite = kampfbreite(sd, v)
      if (breite > 40) hinweis('vorlage-breite', `${vname} hat Kampfbreite ${breite}. Üblich sind höchstens 40.`, ziel)
    }
    for (const vb of verbaende) {
      const vorlage = vorlagen.find(x => x.id === vb.vorlage)
      const staat = vb.staat ?? l.hauptstadt
      if (!vorlage) fehler('verband-verweis', `Ein Verband von ${landName(l.tag, p, sd)} nutzt eine Vorlage, die es nicht mehr gibt.`, ziel)
      if (staat == null || !sd.staaten[staat]) fehler('verband-verweis', `Ein Verband von ${landName(l.tag, p, sd)} hat keinen gültigen Staat${staat == null ? ' (das Land hat keine Hauptstadt)' : ''}.`, ziel)
      else if (besitzer.get(Number(staat)) !== l.tag) hinweis('verband-fremd', `Ein Verband von ${landName(l.tag, p, sd)} steht in ${staatName(staat)}, das dem Land zum Start nicht gehört.`, ziel)
      const n = Number(vb.anzahl)
      if (!Number.isInteger(n) || n < 1 || n > 99) fehler('verband-verweis', `Ein Verband von ${landName(l.tag, p, sd)} muss 1 bis 99 Divisionen haben.`, ziel)
    }
  }

  // Etappe 4d: Personen (neue Laender; bestehende nur mit Schalter)
  const fuehrerEig = new Map((sd.fuehrerEigenschaften ?? []).map(t => [t.id, t]))
  const spielBeraterEig = new Set((sd.anfuehrerEigenschaften ?? []).map(t => t.id))
  const eigeneEig = new Set((p.eigenschaften ?? []).map(t => t.id))
  for (const l of p.laender) {
    if (!(l.art === 'neu' || l.aendern?.personen)) continue
    const ziel = { bereich: 'land', id: l.id, reiter: 'personen' }
    const plaetze = new Map()
    for (const person of l.personen ?? []) {
      const pname = `«${person.name || 'ohne Namen'}» (${landName(l.tag, p, sd)})`
      if (!String(person.name || '').trim()) fehler('person-name', `Eine Person von ${landName(l.tag, p, sd)} braucht einen Namen.`, ziel)
      const imBereich = (w, min, max) => Number.isInteger(Number(w)) && Number(w) >= min && Number(w) <= max
      if (person.rolle === 'berater') {
        if (!imBereich(person.kosten, 0, 500)) fehler('person-wert', `${pname}: Die Kosten müssen zwischen 0 und 500 liegen.`, ziel)
        const be = person.beraterEigenschaft
        if (!be) hinweis('berater-ohne-eigenschaft', `${pname} hat keine Eigenschaft und bringt im Spiel nichts.`, ziel)
        else if (!(be.art === 'eigen' ? eigeneEig.has(be.id) : spielBeraterEig.has(be.id))) fehler('person-eigenschaft', `${pname} hat eine Eigenschaft, die es nicht mehr gibt.`, ziel)
        plaetze.set(person.platz, (plaetze.get(person.platz) ?? 0) + 1)
        if (plaetze.get(person.platz) === 2) hinweis('berater-platz-doppelt', `${landName(l.tag, p, sd)} hat mehrere Berater auf demselben Platz. Im Spiel kann nur einer davon gleichzeitig aktiv sein.`, ziel)
      } else {
        if (!imBereich(person.stufe, 1, 9) || Object.values(person.werte ?? {}).some(w => !imBereich(w, 1, 9))) fehler('person-wert', `${pname}: Stufe und Fähigkeiten müssen zwischen 1 und 9 liegen.`, ziel)
        for (const t of person.eigenschaften ?? []) {
          const info = fuehrerEig.get(t)
          if (!info) fehler('person-eigenschaft', `${pname} hat die Eigenschaft «${t}», die es im Spiel nicht gibt.`, ziel)
          else if (!info.rollen.includes(person.rolle)) fehler('person-eigenschaft', `${pname}: «${info.name}» passt nicht zu dieser Rolle.`, ziel)
        }
      }
      if (person.bild?.art === 'eigen' && !p.bilder?.[person.bild.bildId]) fehler('person-bild', `Das Porträt von ${pname} fehlt. Bitte wähle ein anderes.`, ziel)
    }
  }

  // Etappe 4c: Forschung (nur eigene Listen; bei bestehenden Laendern nur mit Schalter)
  const technologieIds = new Set((sd.technologien ?? []).map(t => t.id))
  for (const l of p.laender) {
    if (!Array.isArray(l.forschung) || !(l.art === 'neu' || l.aendern?.forschung)) continue
    const ziel = { bereich: 'land', id: l.id, reiter: 'forschung' }
    const lname = `«${landName(l.tag, p, sd)}»`
    const unbekannt = l.forschung.filter(t => !technologieIds.has(t))
    if (unbekannt.length) {
      fehler('forschung-unbekannt', `${lname} hat Technologien, die es im eingelesenen Spiel nicht gibt: ${unbekannt.join(', ')}.`, ziel,
        { text: 'unbekannte entfernen', anwenden: (q, s) => setzeForschung(q, s, l.id, l.forschung.filter(t => technologieIds.has(t))) })
    }
    const fehlend = [...new Set(l.forschung.filter(t => technologieIds.has(t)).flatMap(t => alleVoraussetzungen(sd, t)).filter(v => !l.forschung.includes(v)))]
    if (fehlend.length) {
      const namen = fehlend.map(v => sd.technologien.find(t => t.id === v)?.name ?? v).join(', ')
      hinweis('forschung-voraussetzung', `${lname} hat Technologien ohne ihre Voraussetzungen (es fehlen: ${namen}).`, ziel,
        { text: 'Voraussetzungen ergänzen', anwenden: (q, s) => setzeForschung(q, s, l.id, [...l.forschung, ...fehlend]) })
    }
    if (l.art === 'neu' && !l.forschung.length) hinweis('forschung-leer', `${lname} beginnt ganz ohne Forschung.`, ziel)
  }

  // Etappe 4b: Staaten-Editor
  const gebaeudeArt = new Map((sd.gebaeudeArten ?? []).map(g => [g.id, g]))
  for (const [schluessel, a] of Object.entries(p.staaten ?? {})) {
    const id = Number(schluessel)
    const ziel = { bereich: 'staat', id }
    const staat = sd.staaten[id]
    if (!staat) {
      fehler('staat-unbekannt', `Den Staat ${id} gibt es im eingelesenen Spiel nicht mehr. Verwirf seine Änderungen.`, ziel)
      continue
    }
    const sname = `Staat «${a.name || staat.name}»`
    if (a.kategorie && !(sd.staatsKategorien ?? []).some(k => k.id === a.kategorie)) fehler('staat-kategorie', `${sname}: Die Kategorie «${a.kategorie}» gibt es im Spiel nicht.`, ziel)
    const werte = effektiveStaatswerte(p, sd, id)
    if (werte.belegt > werte.bauplaetze) {
      const kategoriePlaetze = werte.bauplaetze - werte.extraBauplaetze
      fehler('staat-bauplaetze', `${sname}: ${werte.belegt} Fabriken und Werften brauchen mehr Bauplätze, als der Staat hat (${werte.bauplaetze}).`, ziel,
        { text: 'Bauplätze passend erhöhen', anwenden: (q, s) => aendereStaat(q, s, id, { extraBauplaetze: werte.belegt - kategoriePlaetze }) })
    }
    const stufe = (art, n, wo) => {
      const info = gebaeudeArt.get(art)
      if (info && Number(n) > info.maxStufe) fehler('staat-stufe', `${sname}: «${info.name}»${wo} hat Stufe ${n}, im Spiel geht es höchstens bis ${info.maxStufe}.`, ziel)
    }
    const staatMitKueste = staat.provinzen.some(prov => sd.provinzKueste?.[prov])
    for (const [art, n] of Object.entries(a.gebaeude ?? {})) {
      stufe(art, n, '')
      if (gebaeudeArt.get(art)?.kueste && Number(n) > 0 && !staatMitKueste) {
        fehler('staat-kueste', `${sname}: «${gebaeudeArt.get(art).name}» braucht Küste, der Staat liegt aber nicht am Meer.`, ziel)
      }
    }
    for (const [provinz, prov] of Object.entries(a.provinzen ?? {})) {
      if (!staat.provinzen.includes(Number(provinz))) {
        fehler('staat-provinz', `${sname}: Die Provinz ${provinz} gehört nicht zu diesem Staat.`, ziel)
        continue
      }
      for (const [art, n] of Object.entries(prov.gebaeude ?? {})) {
        stufe(art, n, ` in Provinz ${provinz}`)
        if (gebaeudeArt.get(art)?.kueste && Number(n) > 0 && !sd.provinzKueste?.[provinz]) {
          fehler('staat-kueste', `${sname}: «${gebaeudeArt.get(art).name}» braucht Küste, Provinz ${provinz} liegt aber nicht am Meer.`, ziel)
        }
      }
    }
    if (!normalisiereStaat(sd, id, a)) {
      hinweis('staat-unveraendert', `${sname} entspricht wieder ganz dem Spiel.`, ziel, { text: 'aufräumen', anwenden: (q) => verwerfeStaat(q, id) })
    }
  }

  if (p.mod.spielversion && sd.version && p.mod.spielversion !== sd.version) {
    hinweis('spielversion', `Die Mod wurde zuletzt mit Spielversion ${p.mod.spielversion} gespeichert, eingelesen ist ${sd.version}. Kopierte Spieldateien werden beim Speichern erneuert.`, einstellungen)
  }
  if (p.mod.gespeichertAls && p.mod.gespeichertAls !== p.mod.modid) {
    hinweis('modid-geaendert', `Die Mod wurde bisher als «${p.mod.gespeichertAls}» gespeichert. Mit dem neuen internen Namen entsteht eine zweite Mod.`, einstellungen)
  }
  if (p.laender.some(l => l.art === 'geaendert')) {
    hinweis('start-1939', 'Änderungen an bestehenden Ländern gelten für den Start 1936. Beim Start 1939 kann das Spiel einzelne Werte überschreiben.', { bereich: 'land' })
  }
  return meldungen
}

/** Alle Events, die irgendwo «Event auslösen» trifft (Fokusse, Antworten anderer Events, Entscheidungen; auch verschachtelt). */
export function ausgeloesteEvents(p) {
  const gefunden = new Set()
  const sammle = (liste, ausser) => {
    for (const w of liste ?? []) {
      if (w.art === 'event' && w.werte?.event && w.werte.event !== ausser) gefunden.add(w.werte.event)
      if (w.art === 'bei_land') sammle(w.wirkungen, ausser)
    }
  }
  for (const b of p.fokusbaeume ?? []) for (const f of b.fokusse) sammle(f.belohnung)
  for (const ev of p.events ?? []) for (const a of ev.antworten ?? []) sammle(a.wirkungen, ev.id)
  for (const d of p.entscheidungen ?? []) {
    sammle(d.wirkungen)
    if (Number(d.dauer) > 0) sammle(d.wirkungenEnde)
  }
  return gefunden
}

/** Events, die sich über ihre Antworten (auch über andere Events) selbst auslösen: Map eventId → Kette [A, …, A]. */
export function eventSchleifen(p) {
  const ziele = new Map()
  const sammle = (liste, menge) => {
    for (const w of liste ?? []) {
      if (w.art === 'event' && w.werte?.event) menge.add(w.werte.event)
      if (w.art === 'bei_land') sammle(w.wirkungen, menge)
    }
  }
  for (const ev of p.events ?? []) {
    const menge = new Set()
    for (const a of ev.antworten ?? []) sammle(a.wirkungen, menge)
    ziele.set(ev.id, menge)
  }
  const schleifen = new Map()
  for (const start of ziele.keys()) {
    // Breitensuche: kürzester Weg zurück zum Start
    const vorgaenger = new Map()
    const warteschlange = [start]
    let gefunden = null
    while (warteschlange.length && !gefunden) {
      const jetzt = warteschlange.shift()
      for (const naechstes of ziele.get(jetzt) ?? []) {
        if (naechstes === start) { gefunden = jetzt; break }
        if (!ziele.has(naechstes) || vorgaenger.has(naechstes)) continue
        vorgaenger.set(naechstes, jetzt)
        warteschlange.push(naechstes)
      }
    }
    if (!gefunden) continue
    const kette = [start]
    for (let x = gefunden; x !== start; x = vorgaenger.get(x)) kette.splice(1, 0, x)
    kette.push(start)
    schleifen.set(start, kette)
  }
  return schleifen
}
