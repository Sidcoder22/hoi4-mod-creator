import { useEffect, useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { fuegeBaumHinzu } from '../../projekt/fokus.js'
import { landName } from '../../projekt/abgeleitet.js'
import { FlaggeAnzeige } from '../laender/flagge-anzeige.jsx'
import { landOptionen } from './gemeinsam.js'
import { importiereSpielbaum } from '../../projekt/fokus-import.js'

function NeuerBaumDialog({ z, onSchliessen }) {
  const optionen = landOptionen(z.projekt, z.spieldaten)
  const [land, setLand] = useState(optionen[0]?.wert ?? '')
  const [name, setName] = useState('')
  const anlegen = () => {
    let id
    aktionen.aendere((p) => { const [q, neueId] = fuegeBaumHinzu(p, land, name.trim() || `Fokusbaum ${landName(land, p, z.spieldaten)}`); id = neueId; return q })
    onSchliessen()
    aktionen.gehe({ bereich: 'fokus', id })
  }
  return (
    <div class="dialog-hintergrund">
      <div class="dialog" style={{ width: 'min(560px, 100%)' }}>
        <h2>Neuer Fokusbaum</h2>
        <div class="formular">
          <label class="feld">
            <span class="feld-titel">Für welches Land?</span>
            <select value={land} data-test="baum-land" onChange={(e) => setLand(e.currentTarget.value)}>
              {optionen.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
            </select>
            <span class="feld-hilfe">Der neue Baum ersetzt im Spiel den Fokusbaum dieses Landes.</span>
          </label>
          <label class="feld">
            <span class="feld-titel">Name (nur für dich)</span>
            <input type="text" value={name} placeholder="z. B. «Weg zur Grösse»" data-test="baum-name" onInput={(e) => setName(e.currentTarget.value)} />
          </label>
        </div>
        <div class="knopfreihe">
          <button class="knopf haupt" data-test="baum-anlegen" disabled={!land} onClick={anlegen}>Fokusbaum anlegen</button>
          <button class="knopf leise" onClick={onSchliessen}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

/** Fokusbaum aus dem Spiel uebernehmen: aendern (Originalland) oder als Vorlage fuer ein Land (Etappe 4f). */
function SpielbaumDialog({ z, onSchliessen }) {
  const sd = z.spieldaten
  const [spielfokus, setSpielfokus] = useState(undefined)
  const [suche, setSuche] = useState('')
  const [gewaehlt, setGewaehlt] = useState(null)
  const [art, setArt] = useState('aendern')
  const laender = landOptionen(z.projekt, sd)
  const [land, setLand] = useState(laender[0]?.wert ?? '')
  useEffect(() => { aktionen.ladeSpielfokus().then(setSpielfokus) }, [])
  const s = suche.trim().toLowerCase()
  const baeume = (sd.spielFokusbaeume ?? []).filter(b => !s || b.id.toLowerCase().includes(s) || (b.land && landName(b.land, z.projekt, sd).toLowerCase().includes(s)))
  const auswahl = (sd.spielFokusbaeume ?? []).find(b => b.id === gewaehlt)
  const kannAendern = !!auswahl?.land
  const wirklicheArt = kannAendern ? art : 'vorlage'
  const importieren = () => {
    let id
    aktionen.aendere((p, spieldaten) => { const [q, neu] = importiereSpielbaum(p, spieldaten, spielfokus, gewaehlt, wirklicheArt, land); id = neu; return q })
    onSchliessen()
    aktionen.gehe({ bereich: 'fokus', id })
  }
  return (
    <div class="dialog-hintergrund">
      <div class="dialog" style={{ width: 'min(680px, 100%)' }}>
        <h2>Fokusbaum aus dem Spiel</h2>
        {spielfokus === undefined && <p class="leise">Fokusbäume werden geladen …</p>}
        {spielfokus === null && <p class="hinweis-zeile" data-test="spielbaum-neu-einlesen">Bitte den Spielordner neu einlesen – danach stehen die Fokusbäume des Spiels zur Wahl.</p>}
        {spielfokus && <>
          <input type="text" placeholder="Land oder Baum suchen …" value={suche} data-test="spielbaum-suche" onInput={(e) => setSuche(e.currentTarget.value)} />
          <div class="liste spielbaeume">
            {baeume.length === 0 && <div class="zeile leise">Kein Fokusbaum gefunden.</div>}
            {baeume.map(b => (
              <button key={b.id} class={`zeile${b.id === gewaehlt ? ' aktiv' : ''}`} data-test={`spielbaum-${b.id}`} onClick={() => setGewaehlt(b.id)}>
                <span>{b.land ? landName(b.land, z.projekt, sd) : 'Allgemeiner Baum'}</span>
                <span class="leise">{b.id} · {b.anzahl} Fokusse{b.quelle && b.quelle !== 'Spiel' ? ` · ${b.quelle}` : ''}</span>
              </button>
            ))}
          </div>
          {auswahl && (
            <div class="formular" style={{ marginTop: '0.8rem' }}>
              <label class="feld">
                <span class="feld-titel">Was willst du damit machen?</span>
                <select value={wirklicheArt} data-test="spielbaum-art" onChange={(e) => setArt(e.currentTarget.value)}>
                  {kannAendern && <option value="aendern">Diesen Baum ändern ({landName(auswahl.land, z.projekt, sd)})</option>}
                  <option value="vorlage">Als Vorlage für ein anderes Land</option>
                </select>
                <span class="feld-hilfe">{wirklicheArt === 'aendern'
                  ? 'Die Mod ersetzt den Baum des Spiels. Kennungen bleiben, damit Events und Entscheidungen des Spiels weiter funktionieren.'
                  : 'Eine Kopie mit eigenen Kennungen. Code aus dem Spiel bezieht sich oft auf das Originalland – die Prüfung weist darauf hin.'}</span>
              </label>
              {wirklicheArt === 'vorlage' && (
                <label class="feld">
                  <span class="feld-titel">Für welches Land?</span>
                  <select value={land} data-test="spielbaum-land" onChange={(e) => setLand(e.currentTarget.value)}>
                    {laender.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
        </>}
        <div class="knopfreihe">
          <button class="knopf haupt" data-test="spielbaum-importieren" disabled={!spielfokus || !auswahl || (wirklicheArt === 'vorlage' && !land)} onClick={importieren}>Übernehmen</button>
          <button class="knopf leise" onClick={onSchliessen}>Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

export function Baeume({ z }) {
  const [dialog, setDialog] = useState(false)
  const [spielDialog, setSpielDialog] = useState(false)
  const baeume = z.projekt.fokusbaeume ?? []
  return (
    <div class="ansicht">
      <h1>Fokusbäume</h1>
      <p class="leise">Ein Fokusbaum ist die Liste der nationalen Ziele, die ein Land nacheinander verfolgt. Hier baust du einem Land einen eigenen.</p>
      {baeume.length > 0 && (
        <div class="kacheln">
          {baeume.map(b => (
            <button key={b.id} class="kachel" data-test={`baum-${b.id}`} onClick={() => aktionen.gehe({ bereich: 'fokus', id: b.id })}>
              <FlaggeAnzeige tag={b.land} land={z.projekt.laender.find(l => l.tag === b.land)} projekt={z.projekt} />
              <span>
                <strong>{b.name}</strong>
                <span class="art"><br />{landName(b.land, z.projekt, z.spieldaten)} · {b.fokusse.length} Fokusse</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <div class="knopfreihe">
        <button class="knopf haupt" data-test="neuer-baum" onClick={() => setDialog(true)}>＋ Neuer Fokusbaum</button>
        <button class="knopf" data-test="baum-aus-spiel" onClick={() => setSpielDialog(true)}>Baum aus Spiel oder Mod …</button>
      </div>
      {dialog && <NeuerBaumDialog z={z} onSchliessen={() => setDialog(false)} />}
      {spielDialog && <SpielbaumDialog z={z} onSchliessen={() => setSpielDialog(false)} />}
    </div>
  )
}
