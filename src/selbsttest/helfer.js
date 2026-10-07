// Hilfen, mit denen der Selbsttest die echte Oberflaeche bedient.

export function el(test) {
  return document.querySelector(`[data-test="${test}"]`)
}

export function alle(praefix) {
  return [...document.querySelectorAll(`[data-test^="${praefix}"]`)]
}

export function pause(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export async function warte(bedingung, ms = 5000, beschreibung = '') {
  const ende = Date.now() + ms
  let letzterFehler = null
  while (Date.now() < ende) {
    try {
      const r = await bedingung()
      if (r) return r
    } catch (e) {
      letzterFehler = e
    }
    await pause(20)
  }
  throw new Error(`Zeitüberschreitung beim Warten${beschreibung ? ': ' + beschreibung : ''}${letzterFehler ? ' (' + letzterFehler.message + ')' : ''}`)
}

export async function element(test) {
  return warte(() => el(test), 5000, `Element «${test}»`)
}

export async function klicke(test) {
  const e = await element(test)
  if (e.disabled) throw new Error(`Element «${test}» ist gesperrt`)
  e.click()
  await pause(30)
}

export async function tippe(test, text) {
  const e = await element(test)
  e.focus?.()
  e.value = text
  e.dispatchEvent(new Event('input', { bubbles: true }))
  e.dispatchEvent(new Event('change', { bubbles: true }))
  e.blur?.()
  await pause(30)
}

export async function waehle(test, wert) {
  const e = await element(test)
  e.value = String(wert)
  e.dispatchEvent(new Event('input', { bubbles: true }))
  e.dispatchEvent(new Event('change', { bubbles: true }))
  await pause(30)
}

export async function hakeAn(test, an) {
  const e = await element(test)
  if (e.checked !== an) e.click()
  await pause(30)
}

export async function text(test) {
  return (await element(test)).textContent
}

export async function wert(test) {
  return (await element(test)).value
}

export async function ladeHoch(test, datei) {
  const e = await element(test)
  const dt = new DataTransfer()
  dt.items.add(datei)
  e.files = dt.files
  e.dispatchEvent(new Event('change', { bubbles: true }))
  await pause(30)
}

export function taste(key, { ctrl = false, meta = false, shift = false } = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: ctrl, metaKey: meta, shiftKey: shift, bubbles: true }))
}

export function pruefe(bedingung, meldung) {
  if (!bedingung) throw new Error(meldung)
}

/** Klickt auf der Karte (Container mit data-test) in die Mitte eines Staats. */
export async function klickeKarte(test, staatId) {
  const { schwerpunkt } = await import('../leser/karte.js')
  const container = await element(test)
  const canvas = await warte(() => container.querySelector('canvas'), 3000, 'Karten-Canvas')
  const karte = window.__hmc.speicher.lies().karte
  const [x, y] = schwerpunkt(karte, staatId)
  const r = canvas.getBoundingClientRect()
  const clientX = r.left + ((x + 0.5) * r.width) / karte.breite
  const clientY = r.top + ((y + 0.5) * r.height) / karte.hoehe
  const optionen = { bubbles: true, clientX, clientY, pointerId: 1, button: 0, buttons: 1, isPrimary: true }
  canvas.dispatchEvent(new PointerEvent('pointerdown', optionen))
  canvas.dispatchEvent(new PointerEvent('pointerup', { ...optionen, buttons: 0 }))
  await pause(50)
}
