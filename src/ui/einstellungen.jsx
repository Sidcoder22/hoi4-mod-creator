import { aktionen } from './zustand.js'
import { setzeModFeld } from '../projekt/aenderungen.js'
import { TextFeld } from './felder.jsx'

const setze = (feld, gruppe) => (wert) => aktionen.aendere((p) => setzeModFeld(p, feld, wert), { gruppe })

async function vorschaubildAusDatei(datei) {
  const bild = await createImageBitmap(datei)
  const faktor = Math.min(1, 512 / Math.max(bild.width, bild.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bild.width * faktor)
  c.height = Math.round(bild.height * faktor)
  c.getContext('2d').drawImage(bild, 0, 0, c.width, c.height)
  return c.toDataURL('image/png').split(',')[1]
}

export function Einstellungen({ z }) {
  const m = z.projekt.mod
  return (
    <div class="ansicht">
      <h1>Mod-Einstellungen</h1>
      <div class="karte formular">
        <TextFeld label="Name der Mod" hilfe="So heisst die Mod im Paradox-Launcher." wert={m.name} test="mod-name" onAendere={setze('name', 'mod:name')} />
        <TextFeld label="Version" hilfe="Frei wählbar, z. B. 1.0. Hilft dir, verschiedene Stände auseinanderzuhalten." wert={m.version} test="mod-version" onAendere={setze('version', 'mod:version')} />
        <TextFeld label="Beschreibung" hilfe="Nur für dich – sie erscheint nicht im Spiel." wert={m.beschreibung} test="mod-beschreibung" mehrzeilig onAendere={setze('beschreibung', 'mod:beschreibung')} />
        <div class="feld breit">
          <span class="feld-titel">Vorschaubild (optional)</span>
          <div class="vorschaubild-zeile">
            {m.vorschaubild?.pngBase64 && <img class="vorschaubild" alt="Vorschaubild" src={`data:image/png;base64,${m.vorschaubild.pngBase64}`} />}
            <label class="knopf leise datei-knopf">
              Bild wählen
              <input type="file" accept="image/*" data-test="mod-vorschaubild"
                onChange={async (e) => {
                  const feld = e.currentTarget
                  const f = feld.files?.[0]
                  feld.value = ''
                  if (f) {
                    const pngBase64 = await vorschaubildAusDatei(f)
                    aktionen.aendere((p) => setzeModFeld(p, 'vorschaubild', { pngBase64 }))
                  }
                }} />
            </label>
            {m.vorschaubild && <button class="knopf leise" onClick={() => aktionen.aendere((p) => setzeModFeld(p, 'vorschaubild', null))}>Entfernen</button>}
          </div>
          <span class="feld-hilfe">Erscheint im Launcher neben dem Namen der Mod.</span>
        </div>
        <p class="leise" data-test="modid-anzeige">Interner Name: <code>{m.modid}</code></p>
        <details class="erweitert">
          <summary>Erweitert</summary>
          <TextFeld label="Interner Name (modid)" hilfe="Wird für Ordner und Kennungen benutzt: nur Kleinbuchstaben, Ziffern und _. Ändere ihn nach dem ersten Speichern besser nicht mehr." wert={m.modid} test="mod-modid" maxLaenge={20} onAendere={setze('modid', 'mod:modid')} />
          <TextFeld label="Windows-Benutzername (nur bei Problemen)" hilfe="Nur ausfüllen, wenn der Launcher die Mod nicht anzeigt. Dann schreibt der Creator den vollständigen Pfad C:/Users/<Name>/Documents/… in die .mod-Datei." wert={m.windowsBenutzer} test="mod-windowsbenutzer" onAendere={setze('windowsBenutzer', 'mod:benutzer')} />
        </details>
      </div>
    </div>
  )
}
