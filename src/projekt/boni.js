// Boni, die ein nationaler Geist geben kann (Modifier im Spiel).

export const BONI = [
  { art: 'politische_macht', name: 'Politische Macht pro Tag', modifier: 'political_power_gain', einheit: 'proTag', min: -2, max: 2, schritt: 0.05 },
  { art: 'stabilitaet', name: 'Stabilität', modifier: 'stability_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'kriegsunterstuetzung', name: 'Kriegsunterstützung', modifier: 'war_support_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'forschung', name: 'Forschungsgeschwindigkeit', modifier: 'research_speed_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'fabrikleistung', name: 'Fabrikleistung', modifier: 'industrial_capacity_factory', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'baugeschwindigkeit', name: 'Baugeschwindigkeit', modifier: 'production_speed_buildings_factor', einheit: 'prozent', min: -50, max: 100, schritt: 1 },
  { art: 'rekruten', name: 'Rekrutierbare Bevölkerung', modifier: 'conscription', einheit: 'prozent', min: -5, max: 10, schritt: 0.5 },
  { art: 'bevoelkerung', name: 'Bevölkerungswachstum', modifier: 'monthly_population', einheit: 'prozent', min: -50, max: 100, schritt: 1 },
  { art: 'angriff', name: 'Angriff der Armee', modifier: 'army_attack_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'verteidigung', name: 'Verteidigung der Armee', modifier: 'army_defence_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'organisation', name: 'Organisation der Armee', modifier: 'army_org_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'fabrikeffizienz', name: 'Maximale Fabrikeffizienz', modifier: 'production_factory_max_efficiency_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
]

export function bonusInfo(art) {
  return BONI.find(b => b.art === art)
}

/** Wert, wie er in die Spieldatei kommt (Prozent geteilt durch 100). */
export function bonusWertImSpiel(bonus) {
  const info = bonusInfo(bonus.art)
  const wert = Number(bonus.wert) || 0
  return info && info.einheit === 'prozent' ? Math.round(wert * 1000) / 100000 : wert
}
