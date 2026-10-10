import { test, expect } from 'vitest'
import { erstelleMiniSpielordner } from '../../src/selbsttest/mini-spielordner.js'
import { leseBmp } from '../../src/leser/bmp.js'
import { parseDefinition, berechneKarte, staatAn, schwerpunkt, faerbeKarte } from '../../src/leser/karte.js'

const o = erstelleMiniSpielordner()
const provinzen = parseDefinition(o['map/definition.csv'])
const staaten = { 1: { provinzen: [1, 2] }, 2: { provinzen: [3] }, 3: { provinzen: [4] }, 4: { provinzen: [5] }, 5: { provinzen: [6] }, 6: { provinzen: [7] } }
const k = berechneKarte(leseBmp(o['map/provinces.bmp']), provinzen, staaten)
const pixel = (ziel, x, y) => [...ziel.slice((y * 64 + x) * 4, (y * 64 + x) * 4 + 4)]

test('parseDefinition ueberspringt Provinz 0 und kaputte Zeilen', () => {
  const p = parseDefinition('0;0;0;0;land;false;unknown;0\n1;20;0;0;land;false;plains;1\nkaputt\n8;0;0;200;sea;true;ocean;0\r\n')
  expect(p).toEqual([{ id: 1, r: 20, g: 0, b: 0, art: 'land', kueste: false }, { id: 8, r: 0, g: 0, b: 200, art: 'sea', kueste: true }])
})

test('staatAn findet Staaten und Meer', () => {
  expect(staatAn(k, 2, 2)).toBe(1)
  expect(staatAn(k, 20, 2)).toBe(1)
  expect(staatAn(k, 40, 2)).toBe(2)
  expect(staatAn(k, 60, 20)).toBeNull()
  expect(staatAn(k, -1, 0)).toBeNull()
})

test('schwerpunkt', () => {
  expect(schwerpunkt(k, 2)).toEqual([39.5, 7.5])
})

test('faerbeKarte mit Grenzen und Meer', () => {
  const meer = [20, 40, 80]
  const farben = new Uint8Array(k.staatIds.length * 3)
  farben.set([255, 0, 0], k.staatIds.indexOf(1) * 3)
  farben.set([0, 0, 255], k.staatIds.indexOf(2) * 3)
  const ziel = new Uint8ClampedArray(64 * 32 * 4)
  faerbeKarte(k, farben, ziel, { meer })
  expect(pixel(ziel, 2, 2)).toEqual([255, 0, 0, 255])
  expect(pixel(ziel, 15, 2)).toEqual([255, 0, 0, 255])
  expect(pixel(ziel, 31, 2)).toEqual([153, 0, 0, 255])
  expect(pixel(ziel, 60, 20)).toEqual([...meer, 255])
})

test('faerbeKarte hebt hervor', () => {
  const farben = new Uint8Array(k.staatIds.length * 3)
  const ziel = new Uint8ClampedArray(64 * 32 * 4)
  faerbeKarte(k, farben, ziel, { meer: [0, 0, 0], hervorheben: new Set([k.staatIds.indexOf(2)]) })
  expect(pixel(ziel, 40, 2)).toEqual([89, 89, 89, 255])
})
