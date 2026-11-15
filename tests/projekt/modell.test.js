import { test, expect } from 'vitest'
import { modidAusName, tagVorschlag, neuesProjekt, neueId, ladeProjektAusJson, ProjektFehler, GRAFIKSTILE, kopiereProjekt } from '../../src/projekt/modell.js'
import { zuBase64, ausBase64 } from '../../src/projekt/base64.js'
import { BONI, bonusWertImSpiel } from '../../src/projekt/boni.js'

test('modidAusName', () => {
  expect(modidAusName('Mein Reich')).toBe('mein_reich')
  expect(modidAusName('Grösste Schweiz!')).toBe('groesste_schweiz')
  expect(modidAusName('1936 Neu')).toBe('mod_1936_neu')
  expect(modidAusName('')).toBe('meine_mod')
  expect(modidAusName('Ein sehr sehr langer Modname')).toMatch(/^[a-z][a-z0-9_]{0,19}$/)
  expect(modidAusName('Ein sehr sehr langer Modname').endsWith('_')).toBe(false)
  expect(modidAusName('Straße')).toBe('strasse')
})

test('tagVorschlag', () => {
  expect(tagVorschlag('Mein Reich', new Set())).toBe('MRE')
  expect(tagVorschlag('Helvetien', new Set())).toBe('HEL')
  expect(tagVorschlag('Helvetien', new Set(['HEL']))).toBe('HEV')
  expect(tagVorschlag('Über Land', new Set())).toBe('ULA')
  expect(tagVorschlag('Andorra', new Set())).toBe('ANO')
  expect(tagVorschlag('D12', new Set())).not.toMatch(/^D\d\d$/)
  expect(tagVorschlag('', new Set())).toMatch(/^[A-Z][A-Z0-9]{2}$/)
  expect(tagVorschlag('!!!', new Set(['X00']))).toMatch(/^[A-Z][A-Z0-9]{2}$/)
})

test('neuesProjekt', () => {
  const p = neuesProjekt('Mein Reich')
  expect(p).toMatchObject({ formatVersion: 1, laender: [], ideen: [], bilder: {}, zaehler: { geist: 0 } })
  expect(p.mod).toEqual({ name: 'Mein Reich', modid: 'mein_reich', modidManuell: false, version: '1.0', beschreibung: '',
    spielversion: null, benutzerOrdner: '', gespeichertAls: null, grundlage: [], vorschaubild: null })
  expect(p.id).toMatch(/^e[0-9a-z]{10}$/)
  expect(neueId()).not.toBe(neueId())
  expect(GRAFIKSTILE.map(g => g.id)).toContain('western_european')
})

test('ladeProjektAusJson', () => {
  expect(() => ladeProjektAusJson('{"x":1}')).toThrow(ProjektFehler)
  expect(() => ladeProjektAusJson('kein json')).toThrow(ProjektFehler)
  expect(() => ladeProjektAusJson('{"formatVersion":99}')).toThrow(ProjektFehler)
  const p = neuesProjekt('A')
  const q = ladeProjektAusJson(JSON.stringify(p))
  expect(q.id).not.toBe(p.id)
  expect({ ...q, id: p.id }).toEqual(p)
})

test('base64', () => {
  const alle = Uint8Array.from({ length: 256 }, (_, i) => i)
  expect([...ausBase64(zuBase64(alle))]).toEqual([...alle])
  for (const n of [1, 2, 3]) {
    const b = alle.slice(0, n)
    expect([...ausBase64(zuBase64(b))]).toEqual([...b])
  }
  expect(zuBase64(new TextEncoder().encode('hallo'))).toBe('aGFsbG8=')
})

test('Boni', () => {
  expect(BONI.map(b => b.art)).toEqual(['politische_macht', 'stabilitaet', 'kriegsunterstuetzung', 'forschung', 'fabrikleistung',
    'baugeschwindigkeit', 'rekruten', 'bevoelkerung', 'angriff', 'verteidigung', 'organisation', 'konsumgueter', 'ausbildungszeit',
    'bau_zivilfabrik', 'bau_militaerfabrik', 'rohstoffe', 'politische_macht_prozent', 'rekruten_prozent', 'fabrikeffizienz'])
  expect(BONI.find(b => b.art === 'rekruten')).toMatchObject({ modifier: 'conscription', min: -5, max: 10, schritt: 0.5 })
  expect(bonusWertImSpiel({ art: 'stabilitaet', wert: 5 })).toBe(0.05)
  expect(bonusWertImSpiel({ art: 'politische_macht', wert: 0.1 })).toBe(0.1)
})

test('kopiereProjekt bekommt eigene modid (Review I2)', () => {
  const p = { ...neuesProjekt('Mein Reich'), mod: { ...neuesProjekt('Mein Reich').mod, gespeichertAls: 'mein_reich', modidManuell: true } }
  const k = kopiereProjekt(p)
  expect(k.id).not.toBe(p.id)
  expect(k.mod).toMatchObject({ name: 'Mein Reich (Kopie)', modid: 'mein_reich_kopie', modidManuell: false, gespeichertAls: null })
})

import { ergaenzeProjekt, grundlageText } from '../../src/projekt/modell.js'

test('neuesProjekt übernimmt die Grundlage ohne version', () => {
  expect(neuesProjekt('A').mod.grundlage).toEqual([])
  expect(neuesProjekt('A', [{ name: 'Kaiserreich', version: '0.27', id: '1521695605' }]).mod.grundlage).toEqual([{ name: 'Kaiserreich', id: '1521695605' }])
})

test('ergaenzeProjekt ergänzt grundlage []', () => {
  const alt = neuesProjekt('A')
  delete alt.mod.grundlage
  expect(ergaenzeProjekt(alt).mod.grundlage).toEqual([])
  const mit = neuesProjekt('B', [{ name: 'K', id: null }])
  expect(ergaenzeProjekt(mit).mod.grundlage).toEqual([{ name: 'K', id: null }])
})

test('grundlageText', () => {
  expect(grundlageText([])).toBe('Nur das Spiel')
  expect(grundlageText(undefined)).toBe('Nur das Spiel')
  expect(grundlageText([{ name: 'Kaiserreich' }, { name: 'KR Submod' }])).toBe('Kaiserreich + KR Submod')
})
