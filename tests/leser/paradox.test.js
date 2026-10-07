import { test, expect } from 'vitest'
import { parseParadox, schreibeParadox, finde, findeAlle, wertText, zahlen, ParadoxFehler } from '../../src/leser/paradox.js'

const TEXT = '﻿state = { id = 64 # Kommentar mit }\r\n\tname = "STATE_64"\r\n\tprovinces = { 1 2 3 }\r\n' +
  '\thistory = { owner = GER 1939.1.1 = { owner = SOV } }\r\n}\r\nfarbe = rgb { 10 20 30 }\r\nlimit = { has_stability > 0.5 }\r\n'

test('liest Bloecke, Listen, Operatoren, Datumsschluessel und rgb', () => {
  const { eintraege, warnungen } = parseParadox(TEXT)
  expect(warnungen).toEqual([])
  const state = finde(eintraege, 'state').wert
  expect(wertText(finde(state.inhalt, 'id').wert)).toBe('64')
  expect(finde(state.inhalt, 'name').wert).toEqual({ typ: 'text', text: 'STATE_64' })
  expect(zahlen(finde(state.inhalt, 'provinces').wert)).toEqual([1, 2, 3])
  const hist = finde(state.inhalt, 'history').wert
  expect(finde(finde(hist.inhalt, '1939.1.1').wert.inhalt, 'owner').wert.text).toBe('SOV')
  expect(finde(eintraege, 'farbe').wert.tag).toBe('rgb')
  expect(finde(finde(eintraege, 'limit').wert.inhalt, 'has_stability').op).toBe('>')
})

test('behaelt doppelte Schluessel in Reihenfolge', () => {
  const { eintraege } = parseParadox('add_core_of = GER add_core_of = FRA')
  expect(findeAlle(eintraege, 'add_core_of').map(e => e.wert.text)).toEqual(['GER', 'FRA'])
})

test('maskierte Anfuehrungszeichen', () => {
  expect(finde(parseParadox('a = "sagt \\"hi\\""').eintraege, 'a').wert.text).toBe('sagt "hi"')
})

test('Schreiben und Lesen ergibt denselben Baum', () => {
  const { eintraege } = parseParadox(TEXT)
  expect(parseParadox(schreibeParadox(eintraege)).eintraege).toEqual(eintraege)
})

test('Schreiben maskiert Anfuehrungszeichen und schreibt Listen auf eine Zeile', () => {
  const { eintraege } = parseParadox('a = "sagt \\"hi\\"" b = { 1 2 3 }')
  const text = schreibeParadox(eintraege)
  expect(text).toContain('a = "sagt \\"hi\\""')
  expect(text).toContain('b = { 1 2 3 }')
})

test('tolerant bei fehlender Klammer am Ende, streng wirft', () => {
  const r = parseParadox('a = { b = 1')
  expect(r.warnungen.length).toBe(1)
  expect(finde(finde(r.eintraege, 'a').wert.inhalt, 'b').wert.text).toBe('1')
  expect(() => parseParadox('a = { b = 1', { streng: true })).toThrow(ParadoxFehler)
  expect(parseParadox('a = 1 }').warnungen.length).toBe(1)
})

test('streng meldet die Zeile', () => {
  try {
    parseParadox('a = 1\nb = 2\n}', { streng: true })
    throw new Error('haette werfen sollen')
  } catch (e) {
    expect(e).toBeInstanceOf(ParadoxFehler)
    expect(e.zeile).toBe(3)
  }
})
