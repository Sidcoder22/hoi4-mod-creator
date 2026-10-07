import { useState } from 'preact/hooks'
import { aktionen } from './zustand.js'

const datum = (ms) => (ms ? new Date(ms).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' }) : '')

export function Start({ z }) {
  const [name, setName] = useState('')
  const anlegen = (e) => {
    e.preventDefault()
    aktionen.neuesProjekt(name)
    setName('')
  }
  return (
    <div class="start">
      <section class="willkommen">
        <h1>Willkommen beim HOI4 Mod Creator</h1>
        <p>Hier baust du eigene Mods für Hearts of Iron IV – ganz ohne Programmieren. Du klickst dir ein Land zusammen,
          speicherst die Mod und spielst sie direkt im Spiel.</p>
      </section>

      {!z.spieldaten && (
        <section class="karte hervorgehoben">
          <h2>Schritt 1: Spielordner einlesen</h2>
          <p>Der Creator braucht einmal deinen Hearts-of-Iron-IV-Ordner, um Karte, Länder und Bilder zu kennen. Er liest dort nur und verändert nichts.</p>
          <button class="knopf haupt" data-test="spielordner-oeffnen" onClick={() => aktionen.gehe({ bereich: 'spielordner' })}>Spielordner einlesen</button>
        </section>
      )}

      <section class="karte">
        <h2>{z.projekte.length ? 'Deine Mods' : 'Neue Mod anlegen'}</h2>
        {z.projekte.length > 0 && (
          <ul class="projektliste">
            {z.projekte.map(p => (
              <li key={p.id}>
                <button class="projekt-name" data-test={`projekt-${p.id}`} onClick={() => aktionen.oeffneProjekt(p.id)}>
                  <strong>{p.name}</strong>
                  <span class="leise">zuletzt geändert {datum(p.geaendert)}</span>
                </button>
                <button class="knopf leise" data-test={`duplizieren-${p.id}`} onClick={() => aktionen.dupliziereProjekt(p.id)}>Duplizieren</button>
                <button class="knopf leise gefahr" data-test={`loeschen-${p.id}`}
                  onClick={() => { if (confirm(`Die Mod «${p.name}» wirklich aus dem Creator löschen? Bereits gespeicherte Mod-Dateien im Spielordner bleiben erhalten.`)) aktionen.loescheProjekt(p.id) }}>
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
        <form class="neues-projekt" onSubmit={anlegen}>
          <input type="text" placeholder="Name der neuen Mod, z. B. «Grossreich Helvetien»" value={name}
            data-test="neues-projekt-name" onInput={(e) => setName(e.currentTarget.value)} />
          <button class="knopf haupt" type="submit" data-test="neues-projekt-anlegen">Neue Mod anlegen</button>
        </form>
        <p class="leise">
          Schon eine Mod mit dem Creator gespeichert? Öffne ihre Projektdatei <code>hoi4-mod-creator-projekt.json</code> aus dem Mod-Ordner:{' '}
          <label class="knopf leise datei-knopf">
            Projektdatei öffnen
            <input type="file" accept=".json,application/json" data-test="projekt-importieren"
              onChange={async (e) => {
                const feld = e.currentTarget
                const f = feld.files?.[0]
                feld.value = ''
                if (f) await aktionen.importiereProjekt(await f.text())
              }} />
          </label>
        </p>
      </section>
    </div>
  )
}
