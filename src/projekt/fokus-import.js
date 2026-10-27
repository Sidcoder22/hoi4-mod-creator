// Fokusbaeume aus dem Spiel in den Editor uebernehmen (Etappe 4f): «aendern» oder «vorlage».

import { neueId } from './modell.js'
import { zaehle } from './zaehler.js'
import { neueWirkung, neueBedingung } from '../bausteine/erzeugen.js'
import { schreibeParadox, wertText } from '../leser/paradox.js'

const STANDARD_SYMBOL = 'GFX_goal_generic_construct_civ_factory'
const runde = (x) => Math.round(x * 1e6) / 1e6

function mit(baustein, werte, extra = {}) {
  return { ...baustein, werte, ...extra }
}

const alsCode = (eintrag, art = 'wirkung') => {
  const b = art === 'wirkung' ? neueWirkung('code') : neueBedingung('code')
  return mit(b, { code: schreibeParadox([eintrag]) }, { ausSpiel: true })
}

/** Uebersetzt die Eintraege einer completion_reward in Bausteine; Unbekanntes wird Eigener Code (aus dem Spiel). */
export function uebersetzeWirkungen(eintraege, sd) {
  const spielGeister = new Set((sd.spielGeister ?? []).map(g => g.id))
  return (eintraege ?? []).map(e => {
    const k = e.schluessel?.toLowerCase()
    const t = e.wert?.typ !== 'block' ? wertText(e.wert) : null
    const z = Number(t)
    const zahl = t !== null && t !== '' && Number.isFinite(z) && e.op === '='
    if (k === 'add_political_power' && zahl) return mit(neueWirkung('politische_macht'), { menge: z })
    if (k === 'add_stability' && zahl) return mit(neueWirkung('stabilitaet'), { prozent: runde(z * 100) })
    if (k === 'add_war_support' && zahl) return mit(neueWirkung('kriegsunterstuetzung'), { prozent: runde(z * 100) })
    if (k === 'add_manpower' && zahl) return mit(neueWirkung('rekruten'), { menge: z })
    if (k === 'add_research_slot' && zahl && z === 1) return mit(neueWirkung('forschungsplatz'), {})
    if (['army_experience', 'navy_experience', 'air_experience'].includes(k) && zahl) return mit(neueWirkung('erfahrung'), { teilstreitkraft: k, menge: z })
    if (k === 'add_ideas' && t && spielGeister.has(t)) return mit(neueWirkung('spielgeist_hinzu'), { spielgeist: t })
    if (k === 'remove_ideas' && t && spielGeister.has(t)) return mit(neueWirkung('spielgeist_weg'), { spielgeist: t })
    return alsCode(e)
  })
}

/** Uebersetzt available in einen Bedingungsblock; idVon(spielId) liefert die interne Fokus-ID oder undefined. */
export function uebersetzeBedingungen(eintraege, idVon) {
  const liste = (eintraege ?? []).map(e => {
    const k = e.schluessel?.toLowerCase()
    const t = e.wert?.typ !== 'block' ? wertText(e.wert) : null
    if (k === 'has_completed_focus' && e.op === '=' && t && idVon(t)) return mit(neueBedingung('fokus_erledigt'), { fokus: idVon(t) })
    if (k === 'has_war' && e.op === '=' && t?.toLowerCase() === 'yes') return mit(neueBedingung('im_krieg'), {})
    return alsCode(e, 'bedingung')
  })
  return { modus: 'alle', liste }
}

/** Uebernimmt einen Baum aus spielfokus; art 'aendern' (Originalland, Spielkennungen) oder 'vorlage' (landTag). */
export function importiereSpielbaum(p, sd, spielfokus, spielBaumId, art, landTag) {
  const quelle = spielfokus.baeume[spielBaumId]
  if (!quelle) throw new Error(`Unbekannter Fokusbaum: ${spielBaumId}`)
  const aendern = art === 'aendern'
  const land = aendern ? quelle.land : landTag
  let q = p
  const neueNummer = () => { let n; [q, n] = zaehle(q, 'fokus'); return n }
  const idVon = new Map()
  for (const f of quelle.fokusse) idVon.set(f.id, neueId())
  const geteilt = quelle.geteilt.filter(id => spielfokus.geteilt[id])
  for (const id of geteilt) if (!idVon.has(id)) idVon.set(id, neueId())

  const fokusse = []
  for (const id of geteilt) {
    const g = spielfokus.geteilt[id]
    fokusse.push({
      id: idVon.get(id), nummer: neueNummer(), spielId: id, spielName: g.name, spielBeschreibung: '', gesperrt: true,
      name: g.name, beschreibung: '', x: g.x, y: g.y, dauer: 10, symbol: { art: 'spiel', sprite: g.symbol || STANDARD_SYMBOL },
      voraussetzungen: [], voraussetzungsArt: 'alle', voraussetzungsGruppen: null, ausschluss: [],
      verfuegbar: { modus: 'alle', liste: [] }, belohnung: [], kiGewicht: null, weitere: '',
    })
  }
  for (const f of quelle.fokusse) {
    const gruppen = f.voraussetzungen.map(gr => gr.map(v => idVon.get(v)).filter(Boolean)).filter(gr => gr.length)
    const einzeln = gruppen.every(gr => gr.length === 1)
    const flach = [...new Set(gruppen.flat())]
    fokusse.push({
      id: idVon.get(f.id), nummer: neueNummer(), ...(aendern ? { spielId: f.id } : {}),
      spielName: f.name, spielBeschreibung: f.beschreibung,
      name: f.name, beschreibung: f.beschreibung, x: f.x, y: f.y, dauer: f.dauer,
      symbol: { art: 'spiel', sprite: f.symbol || STANDARD_SYMBOL },
      voraussetzungen: flach,
      voraussetzungsArt: !einzeln && gruppen.length === 1 ? 'eine' : 'alle',
      voraussetzungsGruppen: einzeln || gruppen.length === 1 ? null : gruppen,
      ausschluss: [...new Set(f.ausschluss.map(v => idVon.get(v)).filter(Boolean))],
      verfuegbar: uebersetzeBedingungen(f.verfuegbar, (s) => idVon.get(s)),
      belohnung: uebersetzeWirkungen(f.belohnung, sd),
      kiGewicht: null, weitere: f.weitere,
    })
  }
  // Ausschluesse beidseitig, wie im Editor
  for (const f of fokusse) {
    for (const andere of f.ausschluss) {
      const g = fokusse.find(x => x.id === andere)
      if (g && !g.ausschluss.includes(f.id)) g.ausschluss.push(f.id)
    }
  }
  const landName = sd.laender?.[quelle.land]?.name ?? quelle.land ?? quelle.id
  const baumId = neueId()
  let nummer
  ;[q, nummer] = zaehle(q, 'baum')
  const baum = {
    id: baumId, nummer, land,
    name: aendern ? `${landName} (aus dem Spiel)` : `${landName} (Vorlage)`,
    fokusse,
    herkunft: { art: aendern ? 'aendern' : 'vorlage', spielId: quelle.id, datei: quelle.datei, weitere: quelle.weitere, geteilt, vonLand: quelle.land, spielFokusIds: quelle.fokusse.map(f => f.id) },
  }
  return [{ ...q, fokusbaeume: [...(q.fokusbaeume ?? []), baum] }, baumId]
}
