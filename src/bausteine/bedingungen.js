// Katalog der Bedingungen (Trigger) fuer «verfuegbar wenn», «sichtbar wenn» und Event-Ausloeser.

import { parseParadox } from '../leser/paradox.js'
import { e, wort, zahlWort, prozent } from './hilfen.js'
import { VERGLEICH, VERGLEICH_DATUM } from './felder.js'

const LAND = { name: 'land', typ: 'land', label: 'Land', standard: '' }
const STAAT = { name: 'staat', typ: 'staat', label: 'Staat', standard: null }
const vergleich = (optionen = VERGLEICH) => ({ name: 'vergleich', typ: 'auswahl', label: 'Vergleich', standard: '>', optionen })

export const BEDINGUNGEN = [
  { art: 'ist_land', gruppe: 'Land', name: 'Ist ein bestimmtes Land', satz: 'Land ist {land}', felder: [LAND], erzeuge: (w) => [e('tag', wort(w.land))] },
  { art: 'land_existiert', gruppe: 'Land', name: 'Land existiert', satz: '{land} existiert', felder: [LAND], erzeuge: (w) => [e('country_exists', wort(w.land))] },
  { art: 'regierung', gruppe: 'Land', name: 'Regierung ist', satz: 'Regierung ist {ideologie}',
    felder: [{ name: 'ideologie', typ: 'ideologie', label: 'Ideologie', standard: 'democratic' }], erzeuge: (w) => [e('has_government', wort(w.ideologie))] },
  { art: 'stabilitaet', gruppe: 'Land', name: 'Stabilität', satz: 'Stabilität {vergleich} {prozent} %',
    felder: [vergleich(), { name: 'prozent', typ: 'prozent', label: 'Prozent', standard: 50, min: 0, max: 100 }],
    erzeuge: (w) => [e('has_stability', prozent(w.prozent), w.vergleich)] },
  { art: 'kriegsunterstuetzung', gruppe: 'Land', name: 'Kriegsunterstützung', satz: 'Kriegsunterstützung {vergleich} {prozent} %',
    felder: [vergleich(), { name: 'prozent', typ: 'prozent', label: 'Prozent', standard: 50, min: 0, max: 100 }],
    erzeuge: (w) => [e('has_war_support', prozent(w.prozent), w.vergleich)] },
  { art: 'politische_macht', gruppe: 'Land', name: 'Politische Macht', satz: 'Politische Macht {vergleich} {menge}',
    felder: [vergleich(), { name: 'menge', typ: 'zahl', label: 'Menge', standard: 100, min: 0, max: 5000 }],
    erzeuge: (w) => [e('has_political_power', zahlWort(w.menge), w.vergleich)] },
  { art: 'fabriken', gruppe: 'Land', name: 'Anzahl Fabriken', satz: 'Hat mehr als {menge} Fabriken',
    felder: [{ name: 'menge', typ: 'zahl', label: 'Anzahl', standard: 20, min: 0, max: 1000 }], erzeuge: (w) => [e('num_of_factories', zahlWort(w.menge), '>')] },
  { art: 'geist', gruppe: 'Land', name: 'Hat nationalen Geist', satz: 'Hat nationalen Geist «{geist}»',
    felder: [{ name: 'geist', typ: 'geist', label: 'Nationaler Geist', standard: '' }], erzeuge: (w, k) => [e('has_idea', wort(k.kennung.geist(w.geist)))] },

  { art: 'im_krieg', gruppe: 'Krieg und Diplomatie', name: 'Ist im Krieg', satz: 'Ist im Krieg', felder: [], erzeuge: () => [e('has_war', wort('yes'))] },
  { art: 'krieg_mit', gruppe: 'Krieg und Diplomatie', name: 'Ist im Krieg mit', satz: 'Ist im Krieg mit {land}', felder: [LAND], erzeuge: (w) => [e('has_war_with', wort(w.land))] },
  { art: 'in_fraktion', gruppe: 'Krieg und Diplomatie', name: 'Ist in einer Fraktion', satz: 'Ist in einer Fraktion', felder: [], erzeuge: () => [e('is_in_faction', wort('yes'))] },
  { art: 'fraktion_mit', gruppe: 'Krieg und Diplomatie', name: 'Ist in Fraktion mit', satz: 'Ist in einer Fraktion mit {land}', felder: [LAND], erzeuge: (w) => [e('is_in_faction_with', wort(w.land))] },

  { art: 'besitzt_staat', gruppe: 'Gebiet', name: 'Besitzt Staat', satz: 'Besitzt {staat}', felder: [STAAT], erzeuge: (w) => [e('owns_state', wort(w.staat))] },
  { art: 'kontrolliert_staat', gruppe: 'Gebiet', name: 'Kontrolliert Staat', satz: 'Kontrolliert {staat}', felder: [STAAT], erzeuge: (w) => [e('controls_state', wort(w.staat))] },

  { art: 'fokus_erledigt', gruppe: 'Zeit und Merker', name: 'Fokus erledigt', satz: 'Fokus «{fokus}» ist erledigt',
    felder: [{ name: 'fokus', typ: 'fokus', label: 'Fokus', standard: '' }], erzeuge: (w, k) => [e('has_completed_focus', wort(k.kennung.fokus(w.fokus)))] },
  { art: 'datum', gruppe: 'Zeit und Merker', name: 'Datum', satz: 'Datum {vergleich} {datum}',
    felder: [vergleich(VERGLEICH_DATUM), { name: 'datum', typ: 'datum', label: 'Datum', standard: '1938.1.1' }],
    erzeuge: (w) => [e('date', wort(w.datum), w.vergleich)] },
  { art: 'merker', gruppe: 'Zeit und Merker', name: 'Merker gesetzt', satz: 'Merker «{merker}» ist gesetzt',
    felder: [{ name: 'merker', typ: 'merker', label: 'Merker', standard: '' }], erzeuge: (w, k) => [e('has_country_flag', wort(k.kennung.merker(w.merker)))] },
  { art: 'code', gruppe: 'Zeit und Merker', name: 'Eigener Code (für Profis)', satz: 'Eigener Code',
    felder: [{ name: 'code', typ: 'code', label: 'Code', standard: '' }], erzeuge: (w) => parseParadox(String(w.code ?? '')).eintraege },
]
