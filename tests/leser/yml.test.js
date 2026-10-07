import { test, expect } from 'vitest'
import { parseYml, schreibeYml } from '../../src/leser/yml.js'

test('schreibt BOM, Kopf, CRLF und maskiert', () => {
  const b = schreibeYml('german', [['MRE', 'Mein «Reich»'], ['MRE_ADJ', 'sagt "hi"\nneu']])
  expect([...b.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF])
  expect(new TextDecoder().decode(b.slice(3))).toBe('l_german:\r\n MRE:0 "Mein «Reich»"\r\n MRE_ADJ:0 "sagt \\"hi\\"\\nneu"\r\n')
})

test('liest Kommentare, fehlende Versionsnummer und Anfuehrungszeichen im Text', () => {
  const r = parseYml('\uFEFFl_german:\n # Kommentar\n A:0 "eins" # hinten\n B: "zwei"\n C:1 "a "b" c"\n')
  expect(r.sprache).toBe('german')
  expect([...r.eintraege]).toEqual([['A', 'eins'], ['B', 'zwei'], ['C', 'a "b" c']])
})

test('Rundreise', () => {
  const t = new TextDecoder().decode(schreibeYml('english', [['X', 'sagt "hi"']]))
  expect(parseYml(t).eintraege.get('X')).toBe('sagt "hi"')
})

test('Datei ohne Sprachkopf', () => {
  expect(parseYml(' A:0 "x"').sprache).toBeNull()
})
