// Katalog der Wirkungen (Effekte) fuer Fokus-Belohnungen, Event-Antworten und Entscheidungen.

import { parseParadox } from '../leser/paradox.js'
import { e, wort, block, zahlWort, prozent } from './hilfen.js'

const LAND = { name: 'land', typ: 'land', label: 'Land', standard: '' }
const STAAT = { name: 'staat', typ: 'staat', label: 'Staat', standard: null }
const GEIST = { name: 'geist', typ: 'geist', label: 'Nationaler Geist', standard: '' }
const IDEOLOGIE = { name: 'ideologie', typ: 'ideologie', label: 'Ideologie', standard: 'democratic' }
const MERKER = { name: 'merker', typ: 'merker', label: 'Merker', standard: '' }
const prozentFeld = (standard, min = -100, max = 100) => ({ name: 'prozent', typ: 'prozent', label: 'Prozent', standard, min, max })
const mengeFeld = (standard, min, max, label = 'Menge') => ({ name: 'menge', typ: 'zahl', label, standard, min, max })

export const GEBAEUDE = [
  { wert: 'industrial_complex', text: 'Zivilfabrik' },
  { wert: 'arms_factory', text: 'Militärfabrik' },
  { wert: 'dockyard', text: 'Werft' },
  { wert: 'infrastructure', text: 'Infrastruktur' },
  { wert: 'air_base', text: 'Luftwaffenstützpunkt' },
]
const FABRIKEN = new Set(['industrial_complex', 'arms_factory', 'dockyard'])

export const AUSRUESTUNG = [
  { wert: 'infantry_equipment_1', text: 'Infanterieausrüstung' },
  { wert: 'support_equipment_1', text: 'Unterstützungsausrüstung' },
  { wert: 'artillery_equipment_1', text: 'Artillerie' },
  { wert: 'anti_tank_equipment_1', text: 'Panzerabwehr' },
  { wert: 'anti_air_equipment_1', text: 'Flugabwehr' },
  { wert: 'motorized_equipment_1', text: 'Lastwagen' },
]

export const WIRKUNGEN = [
  { art: 'politische_macht', gruppe: 'Politik', name: 'Politische Macht', satz: '{menge} politische Macht erhalten',
    felder: [mengeFeld(50, -1000, 1000)], erzeuge: (w) => [e('add_political_power', zahlWort(w.menge))] },
  { art: 'stabilitaet', gruppe: 'Politik', name: 'Stabilität', satz: '{prozent} % Stabilität erhalten',
    felder: [prozentFeld(5)], erzeuge: (w) => [e('add_stability', prozent(w.prozent))] },
  { art: 'kriegsunterstuetzung', gruppe: 'Politik', name: 'Kriegsunterstützung', satz: '{prozent} % Kriegsunterstützung erhalten',
    felder: [prozentFeld(5)], erzeuge: (w) => [e('add_war_support', prozent(w.prozent))] },
  { art: 'beliebtheit', gruppe: 'Politik', name: 'Beliebtheit einer Ideologie', satz: 'Beliebtheit von {ideologie} um {prozent} % ändern',
    felder: [IDEOLOGIE, prozentFeld(10)],
    erzeuge: (w) => [e('add_popularity', block([e('ideology', wort(w.ideologie)), e('popularity', prozent(w.prozent))]))] },
  { art: 'regierung', gruppe: 'Politik', name: 'Regierung wechseln', satz: 'Regierung wechselt zu {ideologie} ({wahlen})',
    felder: [IDEOLOGIE, { name: 'wahlen', typ: 'auswahl', label: 'Wahlen', standard: 'no', optionen: [{ wert: 'yes', text: 'mit Wahlen' }, { wert: 'no', text: 'ohne Wahlen' }] }],
    erzeuge: (w) => [e('set_politics', block([e('ruling_party', wort(w.ideologie)), e('elections_allowed', wort(w.wahlen))]))] },
  { art: 'geist_hinzu', gruppe: 'Politik', name: 'Nationalen Geist hinzufügen', satz: 'Nationalen Geist «{geist}» erhalten',
    felder: [GEIST], erzeuge: (w, k) => [e('add_ideas', wort(k.kennung.geist(w.geist)))] },
  { art: 'geist_weg', gruppe: 'Politik', name: 'Nationalen Geist entfernen', satz: 'Nationalen Geist «{geist}» entfernen',
    felder: [GEIST], erzeuge: (w, k) => [e('remove_ideas', wort(k.kennung.geist(w.geist)))] },

  { art: 'spielgeist_hinzu', gruppe: 'Politik', name: 'Geist aus dem Spiel hinzufügen', satz: 'Geist «{spielgeist}» aus dem Spiel erhalten',
    felder: [{ name: 'spielgeist', typ: 'spielgeist', label: 'Geist aus dem Spiel', standard: '' }], erzeuge: (w) => [e('add_ideas', wort(w.spielgeist))] },
  { art: 'spielgeist_weg', gruppe: 'Politik', name: 'Geist aus dem Spiel entfernen', satz: 'Geist «{spielgeist}» aus dem Spiel entfernen',
    felder: [{ name: 'spielgeist', typ: 'spielgeist', label: 'Geist aus dem Spiel', standard: '' }], erzeuge: (w) => [e('remove_ideas', wort(w.spielgeist))] },

  { art: 'rekruten', gruppe: 'Wirtschaft und Forschung', name: 'Rekruten', satz: '{menge} Rekruten erhalten',
    felder: [mengeFeld(10000, 0, 10000000)], erzeuge: (w) => [e('add_manpower', zahlWort(w.menge))] },
  { art: 'gebaeude', gruppe: 'Wirtschaft und Forschung', name: 'Gebäude bauen',
    satz: (t, w) => `${t('anzahl')}× ${t('gebaeude')} bauen – ${w.wo === 'staat' ? `in ${t('staat')}` : 'irgendwo im eigenen Land'}`,
    felder: [
      { name: 'gebaeude', typ: 'auswahl', label: 'Gebäude', standard: 'industrial_complex', optionen: GEBAEUDE },
      { name: 'anzahl', typ: 'zahl', label: 'Anzahl', standard: 1, min: 1, max: 10 },
      { name: 'wo', typ: 'auswahl', label: 'Wo', standard: 'irgendwo', optionen: [{ wert: 'irgendwo', text: 'irgendwo im eigenen Land' }, { wert: 'staat', text: 'in einem bestimmten Staat' }] },
      { ...STAAT, nurWenn: { feld: 'wo', wert: 'staat' } },
    ],
    erzeuge: (w) => {
      const innen = []
      if (FABRIKEN.has(w.gebaeude)) innen.push(e('add_extra_state_shared_building_slots', zahlWort(w.anzahl)))
      innen.push(e('add_building_construction', block([e('type', wort(w.gebaeude)), e('level', zahlWort(w.anzahl)), e('instant_build', wort('yes'))])))
      if (w.wo === 'staat') return [e(String(w.staat), block(innen))]
      // Nur Staaten waehlen, in denen das Gebaeude auch Platz hat; sonst verpufft die Belohnung
      const grenze = w.gebaeude === 'dockyard'
        ? [e('limit', block([e('is_coastal', wort('yes'))]))]
        : FABRIKEN.has(w.gebaeude) ? [] : [e('limit', block([e('free_building_slots', block([
          e('building', wort(w.gebaeude)), e('size', zahlWort(Number(w.anzahl) - 1), '>'), e('include_locked', wort('yes')),
        ]))]))]
      return [e('random_owned_controlled_state', block([...grenze, ...innen]))]
    } },
  { art: 'forschungsplatz', gruppe: 'Wirtschaft und Forschung', name: 'Forschungsplatz', satz: 'Einen zusätzlichen Forschungsplatz erhalten',
    felder: [], erzeuge: () => [e('add_research_slot', wort(1))] },
  { art: 'forschungsbonus', gruppe: 'Wirtschaft und Forschung', name: 'Forschungsbonus', satz: '{prozent} % Forschungsbonus für {kategorie} ({anzahl}× nutzbar)',
    felder: [prozentFeld(50, 1, 300), { name: 'kategorie', typ: 'kategorie', label: 'Forschungskategorie', standard: 'industry' }, { name: 'anzahl', typ: 'zahl', label: 'Anzahl', standard: 1, min: 1, max: 5 }],
    erzeuge: (w, k) => [e('add_tech_bonus', block([e('name', wort(k.quelle)), e('bonus', prozent(w.prozent)), e('uses', zahlWort(w.anzahl)), e('category', wort(w.kategorie))]))] },
  { art: 'ausruestung', gruppe: 'Wirtschaft und Forschung', name: 'Ausrüstung erhalten', satz: '{menge}× {ausruestung} erhalten',
    felder: [{ name: 'ausruestung', typ: 'auswahl', label: 'Ausrüstung', standard: 'infantry_equipment_1', optionen: AUSRUESTUNG }, mengeFeld(1000, 1, 100000)],
    erzeuge: (w) => [e('add_equipment_to_stockpile', block([e('type', wort(w.ausruestung)), e('amount', zahlWort(w.menge)), e('producer', wort('ROOT'))]))] },

  { art: 'erfahrung', gruppe: 'Militär', name: 'Erfahrung', satz: '{menge} Erfahrung für {teilstreitkraft}',
    felder: [{ name: 'teilstreitkraft', typ: 'auswahl', label: 'Teilstreitkraft', standard: 'army_experience', optionen: [{ wert: 'army_experience', text: 'die Armee' }, { wert: 'navy_experience', text: 'die Marine' }, { wert: 'air_experience', text: 'die Luftwaffe' }] }, mengeFeld(25, 1, 500)],
    erzeuge: (w) => [e(w.teilstreitkraft, zahlWort(w.menge))] },
  { art: 'krieg', gruppe: 'Militär', name: 'Krieg erklären', satz: 'Krieg erklären an {land}',
    felder: [LAND], erzeuge: (w) => [e('declare_war_on', block([e('target', wort(w.land)), e('type', wort('annex_everything'))]))] },
  { art: 'kriegsziel', gruppe: 'Militär', name: 'Kriegsziel erhalten', satz: 'Kriegsziel gegen {land} erhalten',
    felder: [LAND], erzeuge: (w) => [e('create_wargoal', block([e('type', wort('annex_everything')), e('target', wort(w.land))]))] },

  { art: 'garantie', gruppe: 'Diplomatie', name: 'Garantie geben', satz: 'Unabhängigkeit von {land} garantieren',
    felder: [LAND], erzeuge: (w) => [e('give_guarantee', wort(w.land))] },
  { art: 'nichtangriffspakt', gruppe: 'Diplomatie', name: 'Nichtangriffspakt', satz: 'Nichtangriffspakt mit {land} schliessen',
    felder: [LAND], erzeuge: (w) => [e('diplomatic_relation', block([e('country', wort(w.land)), e('relation', wort('non_aggression_pact')), e('active', wort('yes'))]))] },
  { art: 'fraktion_gruenden', gruppe: 'Diplomatie', name: 'Fraktion gründen', satz: 'Fraktion «{name}» gründen',
    felder: [{ name: 'name', typ: 'text', label: 'Name der Fraktion', standard: '' }],
    erzeuge: (w, k, b) => {
      const kennung = k.kennung.fraktion(b.id)
      k.sprache.setze(kennung, w.name)
      return [e('create_faction', wort(kennung))]
    } },
  { art: 'fraktion_beitreten', gruppe: 'Diplomatie', name: 'Fraktion beitreten', satz: 'Der Fraktion von {land} beitreten',
    felder: [LAND], erzeuge: (w) => [e(w.land, block([e('add_to_faction', wort('ROOT'))]))] },
  { art: 'annektieren', gruppe: 'Diplomatie', name: 'Land annektieren', satz: '{land} annektieren',
    felder: [LAND], erzeuge: (w) => [e('annex_country', block([e('target', wort(w.land)), e('transfer_troops', wort('yes'))]))] },
  { art: 'marionette', gruppe: 'Diplomatie', name: 'Marionette', satz: '{land} zur Marionette machen',
    felder: [LAND], erzeuge: (w) => [e('puppet', wort(w.land))] },

  { art: 'staat_bekommen', gruppe: 'Gebiet', name: 'Staat bekommen', satz: 'Staat {staat} bekommen',
    felder: [STAAT], erzeuge: (w) => [e('transfer_state', wort(w.staat))] },
  { art: 'kern', gruppe: 'Gebiet', name: 'Kerngebiet', satz: 'Kerngebiet auf {staat}',
    felder: [STAAT], erzeuge: (w) => [e('add_state_core', wort(w.staat))] },

  { art: 'merker_setzen', gruppe: 'Merker und Profis', name: 'Merker setzen', satz: 'Merker «{merker}» setzen',
    felder: [MERKER], erzeuge: (w, k) => [e('set_country_flag', wort(k.kennung.merker(w.merker)))] },
  { art: 'merker_weg', gruppe: 'Merker und Profis', name: 'Merker entfernen', satz: 'Merker «{merker}» entfernen',
    felder: [MERKER], erzeuge: (w, k) => [e('clr_country_flag', wort(k.kennung.merker(w.merker)))] },
  { art: 'bei_land', gruppe: 'Merker und Profis', name: 'Bei einem anderen Land ausführen', satz: 'Bei {land} ausführen:',
    felder: [LAND], erzeuge: () => [] },
  { art: 'code', gruppe: 'Merker und Profis', name: 'Eigener Code (für Profis)', satz: 'Eigener Code',
    felder: [{ name: 'code', typ: 'code', label: 'Code', standard: '' }],
    erzeuge: (w) => parseParadox(String(w.code ?? '')).eintraege },
]
