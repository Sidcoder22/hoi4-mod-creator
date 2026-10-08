// Pruefregeln: Was muss stimmen, bevor die Mod gespeichert werden darf?

import { tagGesperrt } from '../projekt/modell.js'
import { effektiveBesitzer, landName, verlaufsWerte } from '../projekt/abgeleitet.js'
import { fuegeLandHinzu, aendereLand } from '../projekt/aenderungen.js'
import { fokusZyklus } from '../projekt/fokus.js'
import { pruefeBausteine } from '../bausteine/erzeugen.js'

const zaehlt = (l, feld) => l.art === 'neu' || l.aendern?.[feld]

export function hatFehler(meldungen) {
  return meldungen.some(m => m.schwere === 'fehler')
}

export function pruefeProjekt(p, sd) {
  const meldungen = []
  const fehler = (regel, text, ziel, behebung) => meldungen.push({ regel, schwere: 'fehler', text, ziel, ...(behebung ? { behebung } : {}) })
  const hinweis = (regel, text, ziel) => meldungen.push({ regel, schwere: 'hinweis', text, ziel })
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
    const kreis = fokusZyklus(baum)
    if (kreis) {
      const namen = kreis.map(id => baum.fokusse.find(f => f.id === id)?.name || 'ohne Namen').join(' → ')
      fehler('fokus-kreis', `Die Voraussetzungen in ${bname} drehen sich im Kreis: ${namen}.`, { bereich: 'fokus', id: baum.id, fokus: kreis[0] })
    }
  }

  // Hinweise zur Mod
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
