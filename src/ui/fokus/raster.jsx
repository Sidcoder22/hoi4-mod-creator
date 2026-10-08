// Rasterflaeche mit Fokuskarten, Linien, Verschieben und Verbinden.

import { useRef, useState } from 'preact/hooks'
import { aktionen } from '../zustand.js'
import { fuegeFokusHinzu, verschiebeFokus, setzeVoraussetzung, setzeAusschluss } from '../../projekt/fokus.js'
import { FokusSymbol } from './symbole.jsx'
import { ZELLE_B, ZELLE_H } from './gemeinsam.js'

const KARTE_B = 96
const KARTE_H = 104

const mitteX = (f) => f.x * ZELLE_B + ZELLE_B / 2
const obenY = (f) => f.y * ZELLE_H + (ZELLE_H - KARTE_H) / 2
const untenY = (f) => obenY(f) + KARTE_H

export function Raster({ baum, projekt, gewaehlt, onWaehle }) {
  const flaeche = useRef(null)
  const [zug, setZug] = useState(null)
  const zugRef = useRef(null)
  const aktuell = useRef({ baum, onWaehle })
  aktuell.current = { baum, onWaehle }
  const spalten = Math.max(8, ...baum.fokusse.map(f => f.x + 3))
  const zeilen = Math.max(6, ...baum.fokusse.map(f => f.y + 3))

  const zelleAn = (clientX, clientY) => {
    const r = flaeche.current.getBoundingClientRect()
    return { x: Math.floor((clientX - r.left) / ZELLE_B), y: Math.floor((clientY - r.top) / ZELLE_H) }
  }

  const setzeZug = (z) => {
    zugRef.current = z
    setZug(z)
  }

  // Die Listener haengen sofort beim Druecken, damit auch ein schnelles Loslassen ankommt
  const beginne = (art, f, e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const r = flaeche.current.getBoundingClientRect()
    setzeZug({ art, id: f.id, startX: e.clientX, startY: e.clientY, bewegt: false, shift: e.shiftKey, px: e.clientX - r.left, py: e.clientY - r.top })
    const bewegen = (ev) => {
      const z = zugRef.current
      if (!z) return
      const bewegt = z.bewegt || Math.abs(ev.clientX - z.startX) + Math.abs(ev.clientY - z.startY) > 4
      const rr = flaeche.current.getBoundingClientRect()
      setzeZug({ ...z, bewegt, px: ev.clientX - rr.left, py: ev.clientY - rr.top })
    }
    const loslassen = (ev) => {
      document.removeEventListener('pointermove', bewegen)
      document.removeEventListener('pointerup', loslassen)
      const z = zugRef.current
      setzeZug(null)
      if (!z) return
      const { baum: b, onWaehle: waehle } = aktuell.current
      if (!z.bewegt) {
        if (z.art === 'verschieben') waehle(z.id)
        return
      }
      const zelle = zelleAn(ev.clientX, ev.clientY)
      if (z.art === 'verschieben') {
        aktionen.aendere((p) => verschiebeFokus(p, b.id, z.id, zelle.x, zelle.y))
        return
      }
      const ziel = b.fokusse.find(x => x.x === zelle.x && x.y === zelle.y)
      if (!ziel || ziel.id === z.id) return
      if (z.shift || ev.shiftKey) aktionen.aendere((p) => setzeAusschluss(p, b.id, z.id, ziel.id, true))
      else aktionen.aendere((p) => setzeVoraussetzung(p, b.id, z.id, ziel.id, true))
    }
    document.addEventListener('pointermove', bewegen)
    document.addEventListener('pointerup', loslassen)
  }

  const nachId = new Map(baum.fokusse.map(f => [f.id, f]))
  const linien = []
  for (const f of baum.fokusse) {
    for (const v of f.voraussetzungen) {
      const eltern = nachId.get(v)
      if (!eltern) continue
      const mitteY = (untenY(eltern) + obenY(f)) / 2
      linien.push(<path key={`v-${v}-${f.id}`} class={`linie-voraussetzung${f.voraussetzungsArt === 'eine' ? ' eine' : ''}`}
        d={`M ${mitteX(eltern)} ${untenY(eltern)} V ${mitteY} H ${mitteX(f)} V ${obenY(f)}`} />)
    }
    for (const a of f.ausschluss) {
      const anderer = nachId.get(a)
      if (!anderer || anderer.id < f.id) continue
      const y1 = obenY(f) + KARTE_H / 2, y2 = obenY(anderer) + KARTE_H / 2
      linien.push(<g key={`a-${f.id}-${a}`} class="linie-ausschluss">
        <line x1={mitteX(f)} y1={y1} x2={mitteX(anderer)} y2={y2} />
        <text x={(mitteX(f) + mitteX(anderer)) / 2} y={(y1 + y2) / 2 + 5} text-anchor="middle">⊘</text>
      </g>)
    }
  }
  const quelle = zug && zug.art === 'verbinden' ? nachId.get(zug.id) : null
  const geschoben = zug && zug.art === 'verschieben' && zug.bewegt ? zug : null

  const zellen = []
  for (let y = 0; y < zeilen; y++) {
    for (let x = 0; x < spalten; x++) {
      zellen.push(<div key={`${x}-${y}`} class="zelle" data-test={`zelle-${x}-${y}`} style={{ left: `${x * ZELLE_B}px`, top: `${y * ZELLE_H}px` }}
        onDblClick={() => {
          let neu
          aktionen.aendere((p, sd) => { const [q, id] = fuegeFokusHinzu(p, sd, baum.id, x, y); neu = id; return q })
          if (neu) onWaehle(neu)
        }} />)
    }
  }

  return (
    <div class="raster-huelle">
      <div class="raster" ref={flaeche} style={{ width: `${spalten * ZELLE_B}px`, height: `${zeilen * ZELLE_H}px` }} data-test="raster">
        {zellen}
        <svg class="raster-linien" width={spalten * ZELLE_B} height={zeilen * ZELLE_H}>
          {linien}
          {quelle && <line class="linie-neu" x1={mitteX(quelle)} y1={untenY(quelle)} x2={zug.px} y2={zug.py} />}
        </svg>
        {baum.fokusse.map(f => {
          const verschoben = geschoben && geschoben.id === f.id
          const stil = verschoben
            ? { left: `${geschoben.px - KARTE_B / 2}px`, top: `${geschoben.py - KARTE_H / 2}px`, zIndex: 5, opacity: 0.85 }
            : { left: `${f.x * ZELLE_B + (ZELLE_B - KARTE_B) / 2}px`, top: `${obenY(f)}px` }
          return (
            <div key={f.id} class={`fokus-karte${f.id === gewaehlt ? ' gewaehlt' : ''}`} data-test={`fokus-${f.id}`} style={stil}
              title={f.name || 'Fokus ohne Namen'} tabIndex={0} role="button" aria-label={`Fokus ${f.name || 'ohne Namen'}`}
              onPointerDown={(e) => beginne('verschieben', f, e)} onClick={() => onWaehle(f.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onWaehle(f.id) } }}>
              <FokusSymbol fokus={f} projekt={projekt} />
              <span class="fokus-schild">{f.name || '…'}</span>
              <span class="fokus-griff" data-test={`griff-${f.id}`} title="Ziehen, um zu verbinden (mit Umschalttaste: schliesst sich aus)"
                onPointerDown={(e) => beginne('verbinden', f, e)} onClick={(e) => e.stopPropagation()} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
