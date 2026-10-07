import { test, expect } from 'vitest'
import { werteFehlerlogAus } from '../../src/leser/fehlerlog.js'

const log = '[12:00:01][persistent.cpp:48]: Error: "Unexpected token: }, near line: 7" in file: "history/countries/MRE - Mein Reich.txt" near line: 7\n' +
  '[12:00:02][persistent.cpp:48]: Error: "Unexpected token: }, near line: 7" in file: "history/countries/MRE - Mein Reich.txt" near line: 7\n' +
  '[12:00:03][gfx.cpp:10]: Texture gfx/leaders/MRE/mein_reich_anfuehrer.dds not found\n' +
  '[12:00:04][x.cpp:1]: Error in vanilla file common/foo.txt\n'

test('nur Zeilen der Mod, zusammengefasst und erklaert', () => {
  const r = werteFehlerlogAus(log, { modid: 'mein_reich', pfade: ['mod/mein_reich/history/countries/MRE - Mein Reich.txt'], tags: ['MRE'] })
  expect(r.length).toBe(2)
  expect(r[0]).toMatchObject({ anzahl: 2, datei: 'history/countries/MRE - Mein Reich.txt', zeile: 7 })
  expect(r[0].erklaerung).toContain('Tippfehler')
  expect(r[1].erklaerung).toContain('Bild')
  expect(r[1].datei).toBeNull()
  expect(r[0].roh).toContain('Unexpected token')
})

test('Kuerzel nur als ganzes Wort, weitere Erklaerungen', () => {
  const text = '[1][a]: Unknown effect foo in MRE scope\n[2][b]: Something about AMRES\n[3][c]: Invalid state 99 for mein_reich\n[4][d]: mein_reich: seltsam\n'
  const r = werteFehlerlogAus(text, { modid: 'mein_reich', pfade: [], tags: ['MRE'] })
  expect(r.map(x => x.erklaerung.slice(0, 20))).toEqual([
    'Ein Befehl ist dem S', 'Mit einem Staat stim', 'Unbekannter Fehler –',
  ])
})

test('leeres Protokoll', () => {
  expect(werteFehlerlogAus('', { modid: 'm', pfade: [], tags: [] })).toEqual([])
})
