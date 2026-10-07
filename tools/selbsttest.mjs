// Startet die gebaute Datei mit ?selbsttest in Chrome und meldet das Ergebnis.
import puppeteer from 'puppeteer-core'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const wurzel = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const datei = path.join(wurzel, 'dist', 'hoi4-mod-creator.html')
const chrome = process.env.CHROME_PFAD ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--window-size=1400,900'] })
const seite = await browser.newPage()
await seite.setViewport({ width: 1400, height: 900 })
const seitenFehler = []
seite.on('pageerror', e => seitenFehler.push(String(e && e.stack ? e.stack : e)))
seite.on('console', m => { if (m.type() === 'error') console.log('[Konsole]', m.text()) })
await seite.goto(pathToFileURL(datei).href + '?selbsttest')
let ergebnis = null
try {
  await seite.waitForFunction(() => document.title.startsWith('SELBSTTEST'), { timeout: 120000, polling: 200 })
  ergebnis = await seite.evaluate(() => window.__selbsttest)
} catch (e) {
  console.log('Selbsttest hat nicht geantwortet:', e.message)
}
await browser.close()
if (ergebnis) for (const s of ergebnis.schritte) console.log(`${s.ok ? '✓' : '✗'} ${s.name}${s.fehler ? '\n    ' + s.fehler.split('\n').slice(0, 4).join('\n    ') : ''}`)
for (const f of seitenFehler) console.log('[Seitenfehler]', f.split('\n').slice(0, 4).join('\n    '))
const ok = ergebnis?.ok && seitenFehler.length === 0
console.log(ok ? 'SELBSTTEST OK' : 'SELBSTTEST FEHLER')
process.exit(ok ? 0 : 1)
