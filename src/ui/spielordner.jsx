import { aktionen } from './zustand.js'
import { dateiquelleAusFileList } from '../leser/dateiquelle.js'

export function Spielordner({ z }) {
  const zurueck = () => aktionen.gehe(z.projekt ? { bereich: 'laender' } : { bereich: 'start' })
  return (
    <div class="spielordner karte">
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
          <label class="knopf haupt datei-knopf">
            Ordner auswählen
            <input type="file" webkitdirectory={true} multiple data-test="spielordner-input"
              onChange={async (e) => {
                const files = e.currentTarget.files
                if (!files || !files.length) return
                const ergebnis = await aktionen.spielordnerEinlesen(dateiquelleAusFileList(files))
                if (ergebnis) zurueck()
              }} />
          </label>
          {z.spieldaten && <button class="knopf leise" onClick={zurueck}>Abbrechen</button>}
        </div>
      )}
    </div>
  )
}
