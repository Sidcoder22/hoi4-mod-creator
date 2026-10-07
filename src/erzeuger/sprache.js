// Sammelt alle Texte der Mod und schreibt sie deutsch und englisch.

import { schreibeYml } from '../leser/yml.js'
import { modPfad } from './kennungen.js'

export function erstelleSprachsammler() {
  const neu = new Map()
  const ersetzt = new Map()
  return {
    setze(schluessel, text) { neu.set(schluessel, String(text ?? '')) },
    ersetze(schluessel, text) { ersetzt.set(schluessel, String(text ?? '')) },
    definiert: () => new Set([...neu.keys(), ...ersetzt.keys()]),
    dateien(modid) {
      const dateien = []
      for (const sprache of ['german', 'english']) {
        if (neu.size) dateien.push({ pfad: modPfad(modid, `localisation/${sprache}/${modid}_l_${sprache}.yml`), inhalt: schreibeYml(sprache, [...neu]) })
        if (ersetzt.size) dateien.push({ pfad: modPfad(modid, `localisation/${sprache}/replace/${modid}_replace_l_${sprache}.yml`), inhalt: schreibeYml(sprache, [...ersetzt]) })
      }
      return dateien
    },
  }
}
