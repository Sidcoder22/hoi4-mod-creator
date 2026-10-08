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
  { art: 'konsumgueter', name: 'Konsumgüter', modifier: 'consumer_goods_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'ausbildungszeit', name: 'Ausbildungszeit', modifier: 'training_time_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'bau_zivilfabrik', name: 'Bau von Zivilfabriken', modifier: 'production_speed_industrial_complex_factor', einheit: 'prozent', min: -50, max: 100, schritt: 1 },
  { art: 'bau_militaerfabrik', name: 'Bau von Militärfabriken', modifier: 'production_speed_arms_factory_factor', einheit: 'prozent', min: -50, max: 100, schritt: 1 },
  { art: 'rohstoffe', name: 'Rohstoffförderung', modifier: 'local_resources_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
  { art: 'politische_macht_prozent', name: 'Politische Macht in %', modifier: 'political_power_factor', einheit: 'prozent', min: -50, max: 100, schritt: 1 },
  { art: 'rekruten_prozent', name: 'Rekrutierbare Bevölkerung in %', modifier: 'conscription_factor', einheit: 'prozent', min: -50, max: 100, schritt: 1 },
  { art: 'fabrikeffizienz', name: 'Maximale Fabrikeffizienz', modifier: 'production_factory_max_efficiency_factor', einheit: 'prozent', min: -50, max: 50, schritt: 1 },
]

export function bonusInfo(art) {
  return BONI.find(b => b.art === art)
}

/** Name des Modifikators im Spiel. */
export function bonusModifier(bonus) {
  return bonus.art === 'frei' ? bonus.modifier : bonusInfo(bonus.art)?.modifier
}

/** Bonus aus einem Modifikator des Spiels: feste Liste in deren Einheit, sonst frei in Spieleinheit. */
export function bonusAusSpiel(modifier, wert) {
  const info = BONI.find(b => b.modifier === modifier)
  if (!info) return { art: 'frei', modifier, wert }
  const umgerechnet = info.einheit === 'prozent' ? Math.round(wert * 100 * 1000) / 1000 : wert
  // Ausserhalb des Bereichs der festen Liste: als freier Bonus uebernehmen, damit die Kopie gueltig bleibt
  if (umgerechnet < info.min || umgerechnet > info.max) return { art: 'frei', modifier, wert }
  return { art: info.art, wert: umgerechnet }
}

/** Wert, wie er in die Spieldatei kommt (Prozent geteilt durch 100; frei bleibt unveraendert). */
export function bonusWertImSpiel(bonus) {
  if (bonus.art === 'frei') return Number(bonus.wert) || 0
  const info = bonusInfo(bonus.art)
  const wert = Number(bonus.wert) || 0
  return info && info.einheit === 'prozent' ? Math.round(wert * 1000) / 100000 : wert
}
