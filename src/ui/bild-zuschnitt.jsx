// Eigenes Bild hochladen und auf eine feste Groesse zuschneiden.

import { useEffect, useRef, useState } from 'preact/hooks'

export function BildZuschnitt({ zielBreite, zielHoehe, onFertig, test, anzeigeBreite = 320 }) {
  const anzeigeHoehe = Math.round((anzeigeBreite * zielHoehe) / zielBreite)
  const [bild, setBild] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [versatz, setVersatz] = useState({ x: 0, y: 0 })
  const c = useRef(null)
  const zug = useRef(null)

  const deckend = bild ? Math.max(anzeigeBreite / bild.width, anzeigeHoehe / bild.height) : 1
  const s = deckend * zoom

  const begrenze = (x, y) => bild ? {
    x: Math.min(0, Math.max(anzeigeBreite - bild.width * s, x)),
    y: Math.min(0, Math.max(anzeigeHoehe - bild.height * s, y)),
  } : { x, y }

  useEffect(() => {
    if (!c.current || !bild) return
    const ctx = c.current.getContext('2d')
    ctx.clearRect(0, 0, anzeigeBreite, anzeigeHoehe)
    ctx.drawImage(bild, versatz.x, versatz.y, bild.width * s, bild.height * s)
  })

  const laden = async (datei) => {
    const b = await createImageBitmap(datei)
    const d = Math.max(anzeigeBreite / b.width, anzeigeHoehe / b.height)
    setBild(b)
    setZoom(1)
    setVersatz({ x: (anzeigeBreite - b.width * d) / 2, y: (anzeigeHoehe - b.height * d) / 2 })
  }

  const neuerZoom = (z) => {
    const mitte = { x: anzeigeBreite / 2, y: anzeigeHoehe / 2 }
    const alt = s, neu = deckend * z
    setZoom(z)
    setVersatz(begrenzeMit(neu, mitte.x - ((mitte.x - versatz.x) * neu) / alt, mitte.y - ((mitte.y - versatz.y) * neu) / alt))
  }
  const begrenzeMit = (skala, x, y) => ({
    x: Math.min(0, Math.max(anzeigeBreite - bild.width * skala, x)),
    y: Math.min(0, Math.max(anzeigeHoehe - bild.height * skala, y)),
  })

  const uebernehmen = () => {
    const ziel = document.createElement('canvas')
    ziel.width = zielBreite
    ziel.height = zielHoehe
    const ctx = ziel.getContext('2d')
    const f = zielBreite / anzeigeBreite
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bild, versatz.x * f, versatz.y * f, bild.width * s * f, bild.height * s * f)
    onFertig({ breite: zielBreite, hoehe: zielHoehe, rgba: ctx.getImageData(0, 0, zielBreite, zielHoehe).data })
    setBild(null)
  }

  return (
    <div class="zuschnitt">
      <div>
        <label class="knopf datei-knopf">
          {bild ? 'Anderes Bild wählen' : 'Bild vom Computer wählen'}
          <input type="file" accept="image/*" data-test={`${test}-datei`}
            onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) laden(f); e.currentTarget.value = '' }} />
        </label>
        <p class="leise">PNG, JPG oder ähnlich. Danach kannst du den Ausschnitt verschieben und zoomen.</p>
      </div>
      {bild && (
        <div>
          <div class="zuschnitt-flaeche" style={{ width: `${anzeigeBreite}px`, height: `${anzeigeHoehe}px` }}
            onPointerDown={(e) => { zug.current = { x: e.clientX, y: e.clientY, vx: versatz.x, vy: versatz.y }; e.currentTarget.setPointerCapture?.(e.pointerId) }}
            onPointerMove={(e) => { const z = zug.current; if (z) setVersatz(begrenze(z.vx + e.clientX - z.x, z.vy + e.clientY - z.y)) }}
            onPointerUp={() => { zug.current = null }}>
            <canvas ref={c} width={anzeigeBreite} height={anzeigeHoehe} />
          </div>
          <div class="regler-zeile" style={{ marginTop: '0.5rem' }}>
            <span class="leise">Zoom</span>
            <input type="range" min={1} max={4} step={0.05} value={zoom} data-test={`${test}-zoom`} onInput={(e) => neuerZoom(Number(e.currentTarget.value))} />
          </div>
          <div class="knopfreihe">
            <button class="knopf haupt" data-test={`${test}-uebernehmen`} onClick={uebernehmen}>Ausschnitt übernehmen</button>
            <button class="knopf leise" onClick={() => setBild(null)}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  )
}
