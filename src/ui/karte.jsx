// Weltkarte mit Verschieben, Zoomen, Tooltip und Klick auf Staaten.

import { useEffect, useImperativeHandle, useRef, useState } from 'preact/hooks'
import { faerbeKarte, staatAn, schwerpunkt } from '../leser/karte.js'

const MEER = [24, 38, 52]

function gleich(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function Karte({ karte, farbeFuer, hervorheben, beschreibe, onKlick, test, steuerung, hoehe = 480 }) {
  const behaelter = useRef(null)
  const leinwand = useRef(null)
  const [ansicht, setAnsicht] = useState(null)
  const [tipp, setTipp] = useState(null)
  const zug = useRef(null)
  const letzteFarben = useRef(null)
  const bild = useRef(null)

  // Farben je Staatsindex (3 Byte) und Hervorhebung
  const farben = new Uint8Array(karte.staatIds.length * 3)
  for (let i = 1; i < karte.staatIds.length; i++) farben.set(farbeFuer(karte.staatIds[i]) || [90, 90, 90], i * 3)
  const hell = new Uint8Array(karte.staatIds.length)
  if (hervorheben) for (const id of hervorheben) { const i = karte.staatIds.indexOf(id); if (i > 0) hell[i] = 1 }
  const signatur = new Uint8Array(farben.length + hell.length)
  signatur.set(farben)
  signatur.set(hell, farben.length)

  useEffect(() => {
    const c = leinwand.current
    if (!c) return
    if (gleich(letzteFarben.current, signatur) && bild.current?.karte === karte) return
    letzteFarben.current = signatur
    const ctx = c.getContext('2d')
    if (!bild.current || bild.current.karte !== karte) {
      c.width = karte.breite
      c.height = karte.hoehe
      bild.current = { karte, daten: ctx.createImageData(karte.breite, karte.hoehe) }
    }
    const indizes = new Set()
    for (let i = 1; i < hell.length; i++) if (hell[i]) indizes.add(i)
    faerbeKarte(karte, farben, bild.current.daten.data, { meer: MEER, hervorheben: indizes })
    ctx.putImageData(bild.current.daten, 0, 0)
  })

  const einpassen = () => {
    const r = behaelter.current?.getBoundingClientRect()
    if (!r || !r.width) return null
    const s = Math.min(r.width / karte.breite, r.height / karte.hoehe)
    const neu = { s, x: (r.width - karte.breite * s) / 2, y: (r.height - karte.hoehe * s) / 2, fit: s }
    setAnsicht(neu)
    return neu
  }
  useEffect(() => { einpassen() }, [karte])

  const begrenze = (s, fit) => Math.min(Math.max(fit * 8, 6), Math.max(fit * 0.5, s))

  useImperativeHandle(steuerung, () => ({
    zeigeStaat(staatId) {
      const p = schwerpunkt(karte, staatId)
      const r = behaelter.current?.getBoundingClientRect()
      if (!p || !r) return
      setAnsicht(a => {
        const basis = a || einpassen()
        const s = begrenze(Math.max(basis.s, basis.fit * 4), basis.fit)
        return { ...basis, s, x: r.width / 2 - (p[0] + 0.5) * s, y: r.height / 2 - (p[1] + 0.5) * s }
      })
    },
    einpassen,
  }), [karte])

  const kartenPunkt = (e) => {
    const r = behaelter.current.getBoundingClientRect()
    return [(e.clientX - r.left - ansicht.x) / ansicht.s, (e.clientY - r.top - ansicht.y) / ansicht.s, e.clientX - r.left, e.clientY - r.top]
  }

  const runter = (e) => {
    if (!ansicht || e.button !== 0) return
    zug.current = { startX: e.clientX, startY: e.clientY, x: ansicht.x, y: ansicht.y, bewegt: false }
    behaelter.current.setPointerCapture?.(e.pointerId)
  }
  const bewegen = (e) => {
    if (!ansicht) return
    const z = zug.current
    if (z) {
      const dx = e.clientX - z.startX, dy = e.clientY - z.startY
      if (Math.abs(dx) + Math.abs(dy) > 4) z.bewegt = true
      if (z.bewegt) {
        setAnsicht(a => ({ ...a, x: z.x + dx, y: z.y + dy }))
        setTipp(null)
        return
      }
    }
    const [mx, my, bx, by] = kartenPunkt(e)
    const id = staatAn(karte, mx, my)
    setTipp(id && beschreibe ? { x: bx, y: by, text: beschreibe(id) } : null)
  }
  const hoch = (e) => {
    const z = zug.current
    zug.current = null
    if (!ansicht || !z || z.bewegt) return
    const [mx, my] = kartenPunkt(e)
    const id = staatAn(karte, mx, my)
    if (id && onKlick) onKlick(id)
  }
  const rad = (e) => {
    if (!ansicht) return
    e.preventDefault()
    const r = behaelter.current.getBoundingClientRect()
    const px = e.clientX - r.left, py = e.clientY - r.top
    setAnsicht(a => {
      const s = begrenze(a.s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), a.fit)
      return { ...a, s, x: px - ((px - a.x) * s) / a.s, y: py - ((py - a.y) * s) / a.s }
    })
  }

  const stil = ansicht
    ? { transform: `translate(${ansicht.x}px, ${ansicht.y}px) scale(${ansicht.s})`, imageRendering: ansicht.s >= 1.5 ? 'pixelated' : 'auto' }
    : { visibility: 'hidden' }
  return (
    <div class={`weltkarte${zug.current?.bewegt ? ' zieht' : ''}`} style={{ height: `${hoehe}px` }} ref={behaelter} data-test={test}
      onPointerDown={runter} onPointerMove={bewegen} onPointerUp={hoch} onPointerLeave={() => setTipp(null)} onWheel={rad}>
      <canvas ref={leinwand} style={stil} />
      <div class="karte-knoepfe">
        <button class="knopf klein" title="Hineinzoomen" onPointerDown={e => e.stopPropagation()}
          onClick={() => setAnsicht(a => { const r = behaelter.current.getBoundingClientRect(); const s = begrenze(a.s * 1.5, a.fit); return { ...a, s, x: r.width / 2 - ((r.width / 2 - a.x) * s) / a.s, y: r.height / 2 - ((r.height / 2 - a.y) * s) / a.s } })}>＋</button>
        <button class="knopf klein" title="Herauszoomen" onPointerDown={e => e.stopPropagation()}
          onClick={() => setAnsicht(a => { const r = behaelter.current.getBoundingClientRect(); const s = begrenze(a.s / 1.5, a.fit); return { ...a, s, x: r.width / 2 - ((r.width / 2 - a.x) * s) / a.s, y: r.height / 2 - ((r.height / 2 - a.y) * s) / a.s } })}>－</button>
        <button class="knopf klein" data-test="karte-einpassen" title="Ganze Karte zeigen" onPointerDown={e => e.stopPropagation()} onClick={einpassen}>Ganze Karte</button>
      </div>
      {tipp && <div class="karte-tooltip" style={{ left: `${tipp.x + 14}px`, top: `${tipp.y + 10}px` }}>{tipp.text}</div>}
    </div>
  )
}
