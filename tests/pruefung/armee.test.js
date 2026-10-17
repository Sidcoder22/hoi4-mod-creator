import { test, expect } from 'vitest'
import { miniSpieldaten, testprojekt } from '../hilfe.js'
import { pruefeProjekt } from '../../src/pruefung/regeln.js'
import { aendereLand, schalteStaat, fuegeLandHinzu } from '../../src/projekt/aenderungen.js'
import { fuegeVorlageHinzu, aendereVorlage, setzeZelle, aendereVerband } from '../../src/projekt/armee.js'
import { setzeForschung } from '../../src/projekt/forschung.js'

const sd = await miniSpieldaten()

function gueltig() {
  let p = testprojekt(sd)
  const id = p.laender[0].id
  p = aendereLand(schalteStaat(schalteStaat(p, id, 1), id, 2), sd, id, { hauptstadt: 2 })
  return { p, id }
}
const { p: g, id } = gueltig()
const a = g.laender[0].armee
const v = a.vorlagen[0].id
const vb = a.verbaende[0].id
const meldungen = (p) => pruefeProjekt(p, sd)
const regeln = (p) => meldungen(p).map(m => m.regel)
const ziel = { bereich: 'land', id, reiter: 'armee' }
const leeren = (p) => { let q = p; for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) q = setzeZelle(q, id, v, 'bataillon', x, y, null); return q }

test('Vorgabe-Armee meldet nichts', () => {
  expect(regeln(g)).toEqual([])
})

const FAELLE = [
  ['vorlage-leer', () => leeren(g), 'fehler'],
  ['vorlage-name', () => aendereVorlage(g, id, v, { name: ' ' }), 'fehler'],
  ['vorlage-name', () => { const [q, n] = fuegeVorlageHinzu(g, id); return setzeZelle(aendereVorlage(q, id, n, { name: 'Infanterie-Division' }), id, n, 'bataillon', 0, 0, 'infantry') }, 'fehler'],
  ['vorlage-einheit', () => setzeZelle(g, id, v, 'bataillon', 3, 0, 'engineer'), 'fehler'],
  ['vorlage-einheit', () => setzeZelle(g, id, v, 'unterstuetzung', 0, 0, 'infantry'), 'fehler'],
  ['vorlage-einheit', () => setzeZelle(g, id, v, 'bataillon', 3, 0, 'gibtsnicht'), 'fehler'],
  ['verband-verweis', () => aendereVerband(g, id, vb, { vorlage: 'weg' }), 'fehler'],
  ['verband-verweis', () => aendereVerband(g, id, vb, { staat: 999 }), 'fehler'],
  ['verband-verweis', () => aendereVerband(g, id, vb, { anzahl: 0 }), 'fehler'],
  ['verband-verweis', () => aendereLand(g, sd, id, { hauptstadt: null }), 'fehler'],
  ['vorlage-forschung', () => setzeZelle(g, id, v, 'bataillon', 3, 0, 'motorized'), 'hinweis'],
  ['verband-fremd', () => aendereVerband(g, id, vb, { staat: 3 }), 'hinweis'],
  ['vorlage-breite', () => { let q = g; for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) q = setzeZelle(q, id, v, 'bataillon', x, y, 'artillery_brigade'); return q }, 'hinweis'],
]

for (const [regel, bau, schwere] of FAELLE) {
  test(`Regel ${regel}`, () => {
    expect(meldungen(bau()).find(x => x.regel === regel)).toMatchObject({ schwere, ziel })
  })
}

test('freigeschaltete Kompanie meldet keinen Forschungshinweis', () => {
  const mitPionier = setzeZelle(g, id, v, 'unterstuetzung', 0, 0, 'engineer')
  expect(regeln(setzeForschung(mitPionier, sd, id, ['infantry_weapons', 'tech_support']))).not.toContain('vorlage-forschung')
  expect(regeln(setzeForschung(mitPionier, sd, id, ['infantry_weapons']))).toContain('vorlage-forschung')
})

test('bestehendes Land ohne Schalter wird nicht geprueft', () => {
  let [p, swi] = fuegeLandHinzu(g, sd, 'geaendert', 'SWI')
  let n
  ;[p, n] = fuegeVorlageHinzu(p, swi)
  expect(regeln(p)).not.toContain('vorlage-leer')
  const l = p.laender.find(x => x.id === swi)
  expect(regeln(aendereLand(p, sd, swi, { aendern: { ...l.aendern, armee: true } }))).toContain('vorlage-leer')
  expect(n).toBeTruthy()
})
