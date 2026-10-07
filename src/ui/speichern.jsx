import { useState } from 'preact/hooks'
import { aktionen } from './zustand.js'
import { pruefeProjekt, hatFehler } from '../pruefung/regeln.js'
import { erzeugeMod } from '../erzeuger/index.js'
import { schreibeMod, pruefeZielordner } from '../speicher/ordner.js'
import { erstelleZip } from '../speicher/zip.js'
import { setzeModFeld } from '../projekt/aenderungen.js'

const ORDNER_HILFE = 'Bitte wähle den Ordner «Hearts of Iron IV» unter Dokumente\\Paradox Interactive. ' +
  'Nutzt du OneDrive, liegt er unter OneDrive\\Dokumente\\Paradox Interactive\\Hearts of Iron IV.'

function ladeHerunter(blob, name) {
  if (window.__hmc?.ladeHerunter) return window.__hmc.ladeHerunter(blob, name)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

function Checkliste({ zip }) {
  return (
    <ol class="checkliste">
      {zip && <li>Entpacke die ZIP-Datei in den Ordner <code>Dokumente\Paradox Interactive\Hearts of Iron IV</code>. Danach gibt es dort im Ordner <code>mod</code> deine Mod.</li>}
      <li>Öffne den Paradox-Launcher von Hearts of Iron IV.</li>
      <li>Gehe zu <strong>Spielsets</strong> (Playsets), lege ein neues Spielset an und füge deine Mod hinzu.</li>
      <li>Klicke auf <strong>Spielen</strong>.</li>
      <li>Wähle den Start 1936 und suche dein Land auf der Karte.</li>
      <li>Danach hier unter <strong>Spielfehler</strong> nachschauen, ob das Spiel etwas bemängelt hat.</li>
    </ol>
  )
}

export function Speichern({ z }) {
  const [laeuft, setLaeuft] = useState(null)
  const [ergebnis, setErgebnis] = useState(null)
  const p = z.projekt
  const meldungen = pruefeProjekt(p, z.spieldaten)
  const gesperrt = hatFehler(meldungen) || !!laeuft
  const kannOrdner = typeof window.showDirectoryPicker === 'function' || !!z.zielordner

  const erzeuge = () => {
    const r = erzeugeMod(p, z.spieldaten)
    if (r.fehler.length) {
      setErgebnis({ fehler: r.fehler })
      return null
    }
    return r.dateien
  }

  const inOrdner = async () => {
    setErgebnis(null)
    try {
      let handle = z.zielordner
      if (!handle) handle = await window.showDirectoryPicker({ id: 'hoi4-benutzerordner', mode: 'readwrite', startIn: 'documents' })
      if (handle.queryPermission && (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
          aktionen.zeigeMeldung('Ohne Schreiberlaubnis kann der Creator die Mod nicht speichern.')
          return
        }
      }
      if (!(await pruefeZielordner(handle))) {
        aktionen.zeigeMeldung(ORDNER_HILFE)
        return
      }
      await aktionen.merkeZielordner(handle)
      const dateien = erzeuge()
      if (!dateien) return
      setLaeuft({ anteil: 0 })
      const r = await schreibeMod(handle, p.mod.modid, dateien, (anteil) => setLaeuft({ anteil }))
      aktionen.aendere((q, sd) => setzeModFeld(setzeModFeld(q, 'gespeichertAls', q.mod.modid), 'spielversion', sd.version))
      setErgebnis({ ort: 'ordner', ...r })
    } catch (e) {
      if (e?.name !== 'AbortError') aktionen.zeigeMeldung(`Speichern hat nicht geklappt: ${e.message}`)
    } finally {
      setLaeuft(null)
    }
  }

  const alsZip = () => {
    setErgebnis(null)
    const dateien = erzeuge()
    if (!dateien) return
    ladeHerunter(new Blob([erstelleZip(dateien)], { type: 'application/zip' }), `${p.mod.modid}.zip`)
    setErgebnis({ ort: 'zip', geschrieben: dateien.length, geloescht: [] })
  }

  return (
    <div class="ansicht">
      <h1>Mod speichern</h1>
      {hatFehler(meldungen) && (
        <div class="karte" style={{ borderColor: 'var(--rot)' }}>
          <h2>Noch nicht bereit</h2>
          <p>Es gibt noch {meldungen.filter(m => m.schwere === 'fehler').length} Fehler. Behebe sie zuerst, sonst würde die Mod im Spiel nicht funktionieren.</p>
          <button class="knopf" onClick={() => aktionen.gehe({ bereich: 'pruefung' })}>Zur Prüfung</button>
        </div>
      )}
      <div class="karte">
        <h2>In den Spielordner speichern</h2>
        <p class="leise">Der Creator schreibt die Mod direkt nach <code>Dokumente\Paradox Interactive\Hearts of Iron IV\mod</code>. Beim ersten Mal fragt der Browser, welchen Ordner er benutzen darf.</p>
        {z.zielordner && <p class="leise">Gemerkter Ordner: <strong>{z.zielordner.name}</strong> <button class="knopf klein leise" onClick={() => aktionen.merkeZielordner(null)}>Anderen Ordner wählen</button></p>}
        <div class="knopfreihe">
          {kannOrdner && <button class="knopf haupt" data-test="speichern-ordner" disabled={gesperrt} onClick={inOrdner}>In den Spielordner speichern</button>}
          <button class={`knopf${kannOrdner ? '' : ' haupt'}`} data-test="speichern-zip" disabled={gesperrt} onClick={alsZip}>Als ZIP herunterladen</button>
        </div>
        {!kannOrdner && <p class="leise">Dieser Browser kann nicht direkt in Ordner schreiben. Nimm die ZIP-Datei – oder öffne den Creator in Chrome oder Edge.</p>}
        {laeuft && <div class="fortschritt"><div class="balken"><div style={{ width: `${Math.round(laeuft.anteil * 100)}%` }} /></div><span>Dateien werden geschrieben …</span></div>}
      </div>
      {ergebnis?.fehler && (
        <div class="karte" style={{ borderColor: 'var(--rot)' }} data-test="speichern-fehler">
          <h2>Interner Fehler – bitte melden</h2>
          <p>Der Creator hat in seinen eigenen Dateien einen Fehler gefunden und deshalb nichts gespeichert:</p>
          <ul class="fehlerliste">{ergebnis.fehler.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
      {ergebnis && !ergebnis.fehler && (
        <div class="karte erfolg" data-test="speichern-ergebnis">
          <h2>{ergebnis.ort === 'zip' ? 'ZIP-Datei erstellt' : 'Gespeichert!'}</h2>
          <p>{ergebnis.geschrieben} Dateien {ergebnis.ort === 'zip' ? 'in der ZIP-Datei' : 'geschrieben'}{ergebnis.geloescht.length ? `, ${ergebnis.geloescht.length} veraltete Dateien entfernt` : ''}.</p>
          <h3>So testest du die Mod im Spiel</h3>
          <Checkliste zip={ergebnis.ort === 'zip'} />
        </div>
      )}
    </div>
  )
}
