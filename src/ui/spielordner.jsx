import { useState } from 'preact/hooks'
import { aktionen } from './zustand.js'
import { dateiquelleAusFileList } from '../leser/dateiquelle.js'
import { grundlageText } from '../projekt/modell.js'
import { brauchtKopie, kopierBefehl } from '../projekt/grundlage.js'

const mitGrundlage = (sd) => (sd.bericht?.grundlage?.length ? ` + ${sd.bericht.grundlage.join(' + ')}` : '')

/** Bericht als Text, damit der Nutzer ihn kopieren und weitergeben kann. */
export function berichtAlsText(sd) {
  const b = sd.bericht
  const f = b.flaggen
  return [
    `HOI4 Mod Creator – Einlese-Bericht (Spiel ${sd.version ?? 'unbekannt'}${mitGrundlage(sd)})`,
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
      <h2>Eingelesen: Spiel {sd.version ?? 'unbekannt'}{mitGrundlage(sd)}</h2>
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

/** Ordnerwahl fuer einen Mod-Ordner (Etappe 4g). */
function ModOrdnerKnopf({ test, text, erwartet, gesperrt }) {
  return (
    <label class={`knopf klein datei-knopf${gesperrt ? ' gesperrt' : ''}`}>
      {text}
      <input type="file" webkitdirectory={true} multiple disabled={gesperrt} data-test={test}
        onChange={async (e) => {
          const files = e.currentTarget.files
          if (files && files.length) await aktionen.grundlageHinzufuegen(dateiquelleAusFileList(files), { erwartet })
          e.currentTarget.value = ''
        }} />
    </label>
  )
}

function Grundlage({ z }) {
  const [kopiert, setKopiert] = useState(null)
  const ohneSpiel = !aktionen.hatSpielQuelle()
  // Massgeblich ist, womit die Spieldaten eingelesen wurden (auch aus einer frueheren Sitzung)
  const eingelesen = z.spieldaten?.grundlage ?? []
  const pfadAnzeige = (m) => m.pfad || ''
  return (
    <div class="karte grundlage" data-test="grundlage-karte">
      <h2>Grundlage für Submods</h2>
      <p class="leise">Willst du eine Mod erweitern, zum Beispiel Kaiserreich? Dann lies sie hier zusätzlich ein. Deine Mod wird dadurch zur Submod und verlangt sie im Launcher.</p>
      <p>Grundlage: <strong data-test="grundlage-aktuell">{grundlageText(eingelesen)}</strong></p>
      {eingelesen.length > 0 && z.grundlageMods.length === 0 && (
        <p class="hinweis-zeile" data-test="grundlage-neu-waehlen">Eingelesen mit «{grundlageText(eingelesen)}». Liest du den Spielordner neu ein, wähle danach die Mod-Ordner hier nochmals – sonst fehlt die Grundlage.</p>
      )}
      {z.grundlageMods.length > 0 && (
        <ul class="grundlage-liste">
          {z.grundlageMods.map((m, i) => (
            <li key={m.name} data-test={`grundlage-${i}`}>
              {m.name}{m.version ? ` (Version ${m.version})` : ''}
              <button class="knopf klein leise" data-test={`grundlage-${i}-entfernen`} onClick={() => aktionen.grundlageEntfernen(i)}>Entfernen</button>
            </li>
          ))}
        </ul>
      )}
      {ohneSpiel && <p class="hinweis-zeile">Wähle zuerst oben den Spielordner (neu einlesen).</p>}
      <div class="knopfreihe">
        <button class="knopf" data-test="modliste-lesen" onClick={() => aktionen.modListeLesen()}>Installierte Mods anzeigen</button>
        <ModOrdnerKnopf test="grundlage-input" text="Anderen Mod-Ordner wählen" gesperrt={ohneSpiel} />
      </div>
      {z.modListe && (
        <>
          {z.modListe.length === 0 && <p class="leise">Keine Mods gefunden.</p>}
          <ul class="modliste">
            {z.modListe.map((m, i) => (
              <li key={m.datei} data-test={`modliste-${i}`}>
                <strong>{m.name}</strong>{m.version ? ` · Version ${m.version}` : ''}
                <div><code class="pfad">{pfadAnzeige(m)}</code>{!m.absolut && m.pfad && <span class="leise"> im Ordner «Hearts of Iron IV» (Dokumente)</span>}</div>
                <div class="knopfreihe">
                  {m.pfad && (
                    <button class="knopf klein" data-test={`modliste-${i}-pfad`}
                      onClick={async () => { try { await navigator.clipboard.writeText(m.pfad); setKopiert(m.datei) } catch { setKopiert(null) } }}>
                      {kopiert === m.datei ? 'Kopiert ✓' : 'Pfad kopieren'}
                    </button>
                  )}
                  {brauchtKopie(m) && (
                    <button class="knopf klein" data-test={`modliste-${i}-befehl`}
                      onClick={async () => { try { await navigator.clipboard.writeText(kopierBefehl(m)); setKopiert(`befehl:${m.datei}`) } catch { setKopiert(null) } }}>
                      {kopiert === `befehl:${m.datei}` ? 'Kopiert ✓' : 'Befehl fürs Terminal kopieren'}
                    </button>
                  )}
                  <ModOrdnerKnopf test={`grundlage-input-${i}`} text="Ordner wählen" erwartet={m.name} gesperrt={ohneSpiel} />
                </div>
                {brauchtKopie(m) && <p class="leise">Chrome öffnet diesen Ordner nicht («enthält Systemdateien»). Kopiere den Befehl, füge ihn im Programm Terminal ein und drücke Enter. Danach wählst du mit «Anderen Mod-Ordner wählen» den Ordner <code>Dokumente/HOI4-Grundlagen/…</code>. Die Kopie ist sofort fertig und braucht kaum Speicher. Aktualisiert Steam die Mod, führe den Befehl nochmals aus.</p>}
              </li>
            ))}
          </ul>
          <p class="leise">Im Auswahlfenster: Auf dem Mac ⌘⇧G drücken und den Pfad einfügen (der Steam-Ordner liegt im versteckten Ordner Library). Unter Windows den Pfad oben in die Adressleiste einfügen. Musst du später neu einlesen, wähle die Mod-Ordner dann nochmals.</p>
        </>
      )}
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
          <li>Rechtsklick auf <strong>Hearts of Iron IV</strong> → <strong>Verwalten</strong> → <strong>Lokale Dateien durchsuchen</strong>. So siehst du, wo der Ordner liegt – meistens <code>C:\Program Files (x86)\Steam\steamapps\common\Hearts of Iron IV</code>. Auf dem Mac: <code>~/Library/Application Support/Steam/steamapps/common/Hearts of Iron IV</code> – im Auswahlfenster ⌘⇧G drücken und den Pfad einfügen.</li>
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
      {z.spieldaten && !z.einlesen && <Grundlage z={z} />}
    </div>
  )
}
