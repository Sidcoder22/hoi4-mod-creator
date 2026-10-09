// Fortlaufende Nummern fuer Spielkennungen (stabil, aus projekt.zaehler).

export function zaehle(p, art) {
  const nummer = (p.zaehler?.[art] ?? 0) + 1
  return [{ ...p, zaehler: { ...p.zaehler, [art]: nummer } }, nummer]
}
