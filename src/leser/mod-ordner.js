// Mods als Grundlage (Etappe 4g): Deskriptor eines Mod-Ordners lesen.

import { parseParadox, finde, findeAlle, wertText } from './paradox.js'

export class ModOrdnerFehler extends Error {}

const KEIN_MOD_ORDNER = 'Das ist kein Mod-Ordner. Wähle den Ordner, in dem die Datei descriptor.mod liegt.'

/** Liest eine descriptor.mod oder <name>.mod. */
export function leseDeskriptor(text) {
  const e = parseParadox(text).eintraege
  const wert = (k) => {
    const w = finde(e, k)?.wert
    const t = w ? wertText(w) : null
    return t === null || t === undefined || t === '' ? null : String(t).replace(/"/g, '')
  }
  return {
    name: wert('name') ?? '',
    version: wert('version'),
    id: wert('remote_file_id'),
    replacePaths: findeAlle(e, 'replace_path').map(x => String(wertText(x.wert) ?? '').replace(/\\/g, '/').replace(/\/+$/, '')).filter(Boolean),
    pfad: wert('path'),
  }
}

/** Liest den gewählten Mod-Ordner; descriptor.mod muss oben liegen. */
export async function leseModOrdner(quelle) {
  if (!quelle.hat('descriptor.mod')) throw new ModOrdnerFehler(KEIN_MOD_ORDNER)
  const d = leseDeskriptor(await quelle.text('descriptor.mod'))
  if (!d.name) throw new ModOrdnerFehler(KEIN_MOD_ORDNER)
  const { pfad, ...rest } = d
  return { ...rest, quelle }
}
