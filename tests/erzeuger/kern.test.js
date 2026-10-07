import { test, expect } from 'vitest'
import { miniSpieldaten, text } from '../hilfe.js'
import { neuesProjekt } from '../../src/projekt/modell.js'
import { setzeModFeld } from '../../src/projekt/aenderungen.js'
import { erzeugeMod } from '../../src/erzeuger/index.js'
import { aendereStaatsdatei, aendereColors, aendereLandDatei, verlaufMitAnhang } from '../../src/erzeuger/kern.js'
import { pruefeAusgabe } from '../../src/erzeuger/ausgabepruefung.js'
import { zahl, asciiDateiname, modPfad } from '../../src/erzeuger/kennungen.js'
import { erstelleSprachsammler } from '../../src/erzeuger/sprache.js'
import { parseParadox, finde, findeAlle, zahlen } from '../../src/leser/paradox.js'
import { parseYml } from '../../src/leser/yml.js'

const sd = await miniSpieldaten()
const leer = { benutzteSprache: new Set(), definierteSprache: new Set(), benutzteGfx: new Set(), bekannteGfx: new Set() }
const geschichte = (t) => finde(finde(parseParadox(t).eintraege, 'state').wert.inhalt, 'history').wert.inhalt

test('leere Mod: Deskriptoren und Projektdatei', () => {
  const p = setzeModFeld(neuesProjekt('Mein Reich'), 'version', '1.2')
  const { dateien, fehler } = erzeugeMod(p, sd)
  expect(fehler).toEqual([])
  expect(text(dateien, 'mod/mein_reich.mod')).toContain('path="mod/mein_reich"')
  expect(text(dateien, 'mod/mein_reich.mod')).toContain('name="Mein Reich"')
  expect(text(dateien, 'mod/mein_reich/descriptor.mod')).toContain('supported_version="1.15.*"')
  expect(text(dateien, 'mod/mein_reich/descriptor.mod')).toContain('version="1.2"')
  expect(text(dateien, 'mod/mein_reich/descriptor.mod')).not.toContain('path=')
  expect(text(dateien, 'mod/mein_reich/descriptor.mod')).not.toContain('picture=')
  expect(JSON.parse(text(dateien, 'mod/mein_reich/hoi4-mod-creator-projekt.json')).mod.version).toBe('1.2')
  const mitBenutzer = erzeugeMod(setzeModFeld(p, 'windowsBenutzer', 'Sid'), sd)
  expect(text(mitBenutzer.dateien, 'mod/mein_reich.mod')).toContain('path="C:/Users/Sid/Documents/Paradox Interactive/Hearts of Iron IV/mod/mein_reich"')
})

test('Vorschaubild', () => {
  const p = setzeModFeld(neuesProjekt('Mein Reich'), 'vorschaubild', { pngBase64: 'iVBORw==' })
  const { dateien } = erzeugeMod(p, sd)
  expect(text(dateien, 'mod/mein_reich/descriptor.mod')).toContain('picture="thumbnail.png"')
  expect([...dateien.find(d => d.pfad === 'mod/mein_reich/thumbnail.png').inhalt]).toEqual([0x89, 0x50, 0x4E, 0x47])
})

test('Anfuehrungszeichen im Modnamen werden entfernt', () => {
  const { dateien } = erzeugeMod(neuesProjekt('Das "beste" Reich'), sd)
  expect(text(dateien, 'mod/das_beste_reich.mod')).toContain('name="Das beste Reich"')
})

test('kennungen', () => {
  expect(zahl(0.05)).toBe('0.05')
  expect(zahl(0.1 + 0.2)).toBe('0.3')
  expect(zahl(2)).toBe('2')
  expect(zahl(-0.5)).toBe('-0.5')
  expect(zahl(0.12345)).toBe('0.123')
  expect(asciiDateiname('Grossherzogtum «Über» "Test"')).toBe('Grossherzogtum Ueber Test')
  expect(modPfad('m', 'a/b.txt')).toBe('mod/m/a/b.txt')
})

test('Sprachsammler schreibt Deutsch und Englisch, Ersetzungen getrennt', () => {
  const s = erstelleSprachsammler()
  s.setze('A', 'eins')
  s.ersetze('GER', 'Reich')
  const dateien = s.dateien('m')
  expect(dateien.map(d => d.pfad).sort()).toEqual([
    'mod/m/localisation/english/m_l_english.yml', 'mod/m/localisation/english/replace/m_replace_l_english.yml',
    'mod/m/localisation/german/m_l_german.yml', 'mod/m/localisation/german/replace/m_replace_l_german.yml'])
  expect(parseYml(text(dateien, 'mod/m/localisation/english/m_l_english.yml')).eintraege.get('A')).toBe('eins')
  expect(parseYml(text(dateien, 'mod/m/localisation/german/replace/m_replace_l_german.yml')).eintraege.get('GER')).toBe('Reich')
  expect([...s.definiert()].sort()).toEqual(['A', 'GER'])
  expect(erstelleSprachsammler().dateien('m')).toEqual([])
})

test('Staatsdatei: Besitzer, Kerne, Datumsbloecke', () => {
  const neu = aendereStaatsdatei(sd.originaltexte['history/states/6-Elsass.txt'], { neuerBesitzer: 'MRE', kernAltEntfernen: false })
  expect(neu.startsWith('# Geaendert durch HOI4 Mod Creator')).toBe(true)
  const hist = geschichte(neu)
  expect(finde(hist, 'owner').wert.text).toBe('MRE')
  expect(findeAlle(hist, 'add_core_of').map(e => e.wert.text)).toEqual(['FRA', 'GER', 'MRE'])
  expect(finde(finde(hist, '1939.1.1').wert.inhalt, 'owner').wert.text).toBe('GER')
  const ohneAlt = geschichte(aendereStaatsdatei(sd.originaltexte['history/states/6-Elsass.txt'], { neuerBesitzer: 'MRE', kernAltEntfernen: true }))
  expect(findeAlle(ohneAlt, 'add_core_of').map(e => e.wert.text)).toEqual(['GER', 'MRE'])
  const doppelt = geschichte(aendereStaatsdatei(sd.originaltexte['history/states/1-Brandenburg.txt'], { neuerBesitzer: 'GER', kernAltEntfernen: false }))
  expect(findeAlle(doppelt, 'add_core_of').map(e => e.wert.text)).toEqual(['GER'])
})

test('colors.txt und Laenderdatei', () => {
  const c = aendereColors(sd.originaltexte['common/countries/colors.txt'], new Map([['MRE', [10, 20, 30]], ['SWI', [1, 2, 3]]]))
  expect(c).toMatch(/MRE = \{\s*color = rgb \{ 10 20 30 \}\s*color_ui = rgb \{ 37 49 61 \}/)
  expect(c).toMatch(/SWI = \{\s*color = rgb \{ 1 2 3 \}\s*color_ui = rgb \{ 26 27 29 \}/)
  expect(c).toMatch(/GER = \{\s*color = rgb \{ 75 75 75 \}/)
  expect(aendereColors(null, new Map([['MRE', [0, 0, 0]]]))).toContain('MRE = {')
  const land = aendereLandDatei(sd.originaltexte['common/countries/Germany.txt'], [5, 6, 7])
  expect(zahlen(finde(parseParadox(land).eintraege, 'color').wert)).toEqual([5, 6, 7])
  expect(land).toContain('graphical_culture = western_european_gfx')
})

test('Verlauf mit Anhang', () => {
  const t = verlaufMitAnhang('capital = 1\n', ['capital = 2'], 'mein_reich')
  expect(t).toBe('capital = 1\n\n# --- Aenderungen aus dem HOI4 Mod Creator (mein_reich) ---\ncapital = 2\n')
  expect(verlaufMitAnhang('capital = 1', ['x = 1'], 'm').startsWith('capital = 1\n\n#')).toBe(true)
})

test('pruefeAusgabe', () => {
  expect(pruefeAusgabe([{ pfad: 'a.txt', inhalt: 'x = {' }], leer)[0]).toMatch(/^a\.txt/)
  expect(pruefeAusgabe([{ pfad: 'a.txt', inhalt: 'x = "ä"' }], leer).length).toBe(1)
  expect(pruefeAusgabe([{ pfad: 'a.txt', inhalt: 'x = "ä"', kopie: true }], leer)).toEqual([])
  expect(pruefeAusgabe([{ pfad: 'a.gfx', inhalt: 'x = { y = 1 }' }], leer)).toEqual([])
  expect(pruefeAusgabe([{ pfad: 'x_l_german.yml', inhalt: new TextEncoder().encode('l_german:\r\n') }], leer).length).toBe(1)
  const gut = Uint8Array.from([0xEF, 0xBB, 0xBF, ...new TextEncoder().encode('l_german:\r\n')])
  expect(pruefeAusgabe([{ pfad: 'x_l_german.yml', inhalt: gut }], leer)).toEqual([])
  const ohneKopf = Uint8Array.from([0xEF, 0xBB, 0xBF, ...new TextEncoder().encode(' A:0 "x"\r\n')])
  expect(pruefeAusgabe([{ pfad: 'x_l_german.yml', inhalt: ohneKopf }], leer).length).toBe(1)
  expect(pruefeAusgabe([], { ...leer, benutzteSprache: new Set(['FEHLT']) })[0]).toContain('FEHLT')
  expect(pruefeAusgabe([], { ...leer, benutzteSprache: new Set(['DA']), definierteSprache: new Set(['DA']) })).toEqual([])
  expect(pruefeAusgabe([], { ...leer, benutzteGfx: new Set(['GFX_x']) })[0]).toContain('GFX_x')
})
