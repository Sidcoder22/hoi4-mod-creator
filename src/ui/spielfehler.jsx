import { useState } from 'preact/hooks'
import { aktionen } from './zustand.js'
import { leseFehlerlog } from '../speicher/ordner.js'
import { werteFehlerlogAus } from '../leser/fehlerlog.js'
import { erzeugeMod } from '../erzeuger/index.js'

export function Spielfehler({ z }) {
  const [eintraege, setEintraege] = useState(null)
  const [hinweis, setHinweis] = useState('')
  const laden = async () => {
    setEintraege(null)
    setHinweis('')
    const handle = z.zielordner
    try {
      if (handle.queryPermission && (await handle.queryPermission({ mode: 'read' })) !== 'granted') {
        if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') return
      }
      const text = await leseFehlerlog(handle)
      if (text === null) {
        setHinweis('Es gibt noch kein Fehlerprotokoll. Starte das Spiel einmal mit deiner Mod und schaue danach wieder hier.')
        return
      }
      const pfade = erzeugeMod(z.projekt, z.spieldaten).dateien.map(d => d.pfad)
      const tags = z.projekt.laender.filter(l => l.art === 'neu').map(l => l.tag)
      setEintraege(werteFehlerlogAus(text, { modid: z.projekt.mod.modid, pfade, tags }))
    } catch (e) {
      aktionen.zeigeMeldung(`Das Fehlerprotokoll konnte nicht gelesen werden: ${e.message}`)
    }
  }
  return (
    <div class="ansicht">
      <h1>Spielfehler</h1>
      <p class="leise">Nach dem Spielen schreibt Hearts of Iron IV Probleme in die Datei <code>logs\error.log</code>. Hier siehst du nur die Fehler, die deine Mod betreffen – mit einer Erklärung.</p>
      {!z.zielordner ? (
        <div class="karte">
          <p>Speichere die Mod zuerst einmal in den Spielordner. Dann kennt der Creator den Ordner, in dem auch das Fehlerprotokoll liegt.</p>
          <button class="knopf" onClick={() => aktionen.gehe({ bereich: 'speichern' })}>Zum Speichern</button>
        </div>
      ) : (
        <div class="knopfreihe" style={{ marginBottom: '1rem' }}>
          <button class="knopf haupt" data-test="spielfehler-laden" onClick={laden}>Fehlerprotokoll lesen</button>
        </div>
      )}
      {hinweis && <p data-test="spielfehler-hinweis">{hinweis}</p>}
      {eintraege && eintraege.length === 0 && <div class="alles-gut" data-test="spielfehler-keine">Keine Fehler deiner Mod gefunden.</div>}
      {eintraege && eintraege.map((e, i) => (
        <div class="spielfehler-eintrag" key={i} data-test={`spielfehler-${i}`}>
          <strong>{e.erklaerung}</strong>
          <div class="leise">{e.datei ? `${e.datei}${e.zeile ? `, Zeile ${e.zeile}` : ''}` : ''}{e.anzahl > 1 ? ` · ${e.anzahl}-mal` : ''}</div>
          <details><summary class="leise">Originalzeile</summary><pre>{e.roh}</pre></details>
        </div>
      ))}
    </div>
  )
}
