// Fuehrt den Selbsttest aus und meldet das Ergebnis im Seitentitel.

import * as helfer from './helfer.js'
import { SCHRITTE } from './szenario.js'

export async function starteSelbsttest() {
  const schritte = []
  let ok = true
  for (const s of SCHRITTE) {
    try {
      await s.lauf(helfer)
      schritte.push({ name: s.name, ok: true })
    } catch (e) {
      ok = false
      schritte.push({ name: s.name, ok: false, fehler: String(e && e.stack ? e.stack : e) })
      break
    }
  }
  window.__selbsttest = { ok, schritte }
  document.title = ok ? 'SELBSTTEST OK' : 'SELBSTTEST FEHLER'
}
