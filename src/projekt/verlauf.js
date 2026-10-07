// Rueckgaengig/Wiederholen ueber gespeicherte Projektzustaende.

export function erstelleVerlauf(max = 100) {
  let zurueck = []
  let vor = []
  return {
    merke(zustand) {
      zurueck.push(zustand)
      if (zurueck.length > max) zurueck.shift()
      vor = []
    },
    rueckgaengig(aktuell) {
      if (!zurueck.length) return null
      vor.push(aktuell)
      return zurueck.pop()
    },
    wiederholen(aktuell) {
      if (!vor.length) return null
      zurueck.push(aktuell)
      return vor.pop()
    },
    kannZurueck: () => zurueck.length > 0,
    kannVor: () => vor.length > 0,
    leeren() {
      zurueck = []
      vor = []
    },
  }
}
