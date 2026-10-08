import { useState } from 'preact/hooks'
import { aktionen } from './zustand.js'
import { dateiquelleAusFileList } from '../leser/dateiquelle.js'

/** Bericht als Text, damit der Nutzer ihn kopieren und weitergeben kann. */
export function berichtAlsText(sd) {
  const b = sd.bericht
  const f = b.flaggen
  return [
    `HOI4 Mod Creator – Einlese-Bericht (Spiel ${sd.version ?? 'unbekannt'})`,
    `Länder: ${b.laender}, Staaten: ${b.staaten}`,
    `Flaggen: ${f.gelesen} von ${b.laender} Ländern, ${f.dateien} Flaggen-Dateien gefunden`,
    f.ohneFlagge.length ? `Ohne Flagge: ${f.ohneFlagge.join(', ')}` : 'Ohne Flagge: keine',
    ...f.fehler.slice(0, 30).map(x => `Flagge unlesbar: ${x.datei} – ${x.grund}`),
    `Bilder für nationale Geister: ${b.ideenBilder}, Porträts: ${b.portraets}`,
    `Warnungen: ${b.warnungenGesamt}`,
    ...b.warnungen.slice(0, 50).map(w => `  ${w}`),
  ].join('\n')
}

function Bericht({ sd }) {
  const [kopiert, setKopiert] = useState(false)
  const b = sd.bericht
  if (!b) return null
  const f = b.flaggen
  return (
    <div class="karte" data-test="spielordner-bericht">
      <h2>Eingelesen: Spiel {sd.version ?? 'unbekannt'}</h2>
      <ul>
        <li>{b.laender} Länder und {b.staaten} Staaten</li>
        <li>Flaggen: {f.gelesen} von {b.laender} Ländern ({f.dateien} Flaggen-Dateien gefunden)</li>
        <li>{b.ideenBilder} Bilder für nationale Geister, {b.portraets} Porträts</li>
      </ul>
      {f.ohneFlagge.length > 0 && (
        <details>
          <summary>{f.ohneFlagge.length} Länder ohne lesbare Flagge</summary>
          <p class="leise">{f.ohneFlagge.join(', ')}</p>
          {f.fehler.length > 0 && <ul class="leise">{f.fehler.slice(0, 30).map((x, i) => <li key={i}>{x.datei}: {x.grund}</li>)}</ul>}
        </details>
      )}
      {b.warnungenGesamt > 0 && (
        <details>
          <summary>{b.warnungenGesamt} Dateien mit kleinen Problemen (meist harmlos)</summary>
          <ul class="leise">{b.warnungen.slice(0, 50).map((w, i) => <li key={i}>{w}</li>)}</ul>
        </details>
      )}
      <div class="knopfreihe">
        <button class="knopf" data-test="bericht-kopieren"
          onClick={async () => { try { await navigator.clipboard.writeText(berichtAlsText(sd)); setKopiert(true) } catch { setKopiert(false) } }}>
          {kopiert ? 'Kopiert ✓' : 'Bericht kopieren'}
        </button>
        <span class="leise">Fehlt etwas? Kopiere den Bericht und schicke ihn mit deiner Frage mit.</span>
      </div>
    </div>
  )
}

export function Spielordner({ z }) {
  const zurueck = () => aktionen.gehe(z.projekt ? { bereich: 'laender' } : { bereich: 'start' })
  return (
    <div class="spielordner">
      <div class="karte">
        <h1>Spielordner einlesen</h1>
        <ol class="anleitung">
          <li>Öffne Steam und gehe in deine Bibliothek.</li>
          <li>Rechtsklick auf <strong>Hearts of Iron IV</strong> → <strong>Verwalten</strong> → <strong>Lokale Dateien durchsuchen</strong>. So siehst du, wo der Ordner liegt – meistens <code>C:\Program Files (x86)\Steam\steamapps\common\Hearts of Iron IV</code>.</li>
          <li>Klicke unten auf «Ordner auswählen» und wähle genau diesen Ordner <strong>Hearts of Iron IV</strong>.</li>
          <li>Chrome fragt dann, ob du «Dateien hochladen» willst. Keine Sorge: Es wird nichts ins Internet geschickt. Der Creator liest die Dateien nur hier auf deinem Computer.</li>
        </ol>
        {z.einlesen ? (
          <div class="fortschritt" data-test="einlesen-fortschritt">
            <div class="balken"><div style={{ width: `${Math.round(z.einlesen.anteil * 100)}%` }} /></div>
            <span>{z.einlesen.text}</span>
          </div>
        ) : (
          <div class="knopfreihe">
            <label class={`knopf datei-knopf${z.spieldaten ? '' : ' haupt'}`}>
              {z.spieldaten ? 'Neu einlesen' : 'Ordner auswählen'}
              <input type="file" webkitdirectory={true} multiple data-test="spielordner-input"
                onChange={async (e) => {
                  const files = e.currentTarget.files
                  if (files && files.length) await aktionen.spielordnerEinlesen(dateiquelleAusFileList(files))
                }} />
            </label>
            {z.spieldaten && <button class="knopf haupt" data-test="spielordner-weiter" onClick={zurueck}>Weiter</button>}
          </div>
        )}
      </div>
      {z.spieldaten && !z.einlesen && <Bericht sd={z.spieldaten} />}
    </div>
  )
}
