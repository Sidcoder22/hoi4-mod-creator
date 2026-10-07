// Schreibt die Mod in den Benutzerordner «Hearts of Iron IV» (Ordner-Schnittstelle des Browsers).
// Geloescht werden nur Dateien aus der eigenen Dateiliste.

const LISTE = 'hoi4-mod-creator-dateien.json'

async function holeOrdner(wurzel, teile, erstellen) {
  let o = wurzel
  for (const t of teile) o = await o.getDirectoryHandle(t, { create: erstellen })
  return o
}

async function leseDatei(wurzel, pfad) {
  const teile = pfad.split('/')
  try {
    const o = await holeOrdner(wurzel, teile.slice(0, -1), false)
    const f = await (await o.getFileHandle(teile.at(-1))).getFile()
    return new Uint8Array(await f.arrayBuffer())
  } catch {
    return null
  }
}

async function schreibeDatei(wurzel, pfad, inhalt) {
  const teile = pfad.split('/')
  const o = await holeOrdner(wurzel, teile.slice(0, -1), true)
  const f = await o.getFileHandle(teile.at(-1), { create: true })
  const w = await f.createWritable()
  await w.write(typeof inhalt === 'string' ? new TextEncoder().encode(inhalt) : inhalt)
  await w.close()
}

async function loescheDatei(wurzel, pfad) {
  const teile = pfad.split('/')
  try {
    const o = await holeOrdner(wurzel, teile.slice(0, -1), false)
    await o.removeEntry(teile.at(-1))
    return true
  } catch {
    return false
  }
}

/** true, wenn das wie der Ordner «Dokumente\Paradox Interactive\Hearts of Iron IV» aussieht. */
export async function pruefeZielordner(wurzel) {
  try {
    await wurzel.getFileHandle('settings.txt')
    return true
  } catch { /* weiter pruefen */ }
  try {
    await wurzel.getDirectoryHandle('mod')
    return true
  } catch {
    return false
  }
}

export async function schreibeMod(wurzel, modid, dateien, fortschritt = () => {}) {
  const listenPfad = `mod/${modid}/${LISTE}`
  const eigen = (p) => p === `mod/${modid}.mod` || p.startsWith(`mod/${modid}/`)
  let alt = []
  const altRoh = await leseDatei(wurzel, listenPfad)
  if (altRoh) {
    try {
      const liste = JSON.parse(new TextDecoder().decode(altRoh))
      if (Array.isArray(liste)) alt = liste.filter(p => typeof p === 'string' && eigen(p) && p !== listenPfad)
    } catch { /* kaputte Liste: nichts loeschen */ }
  }
  const neu = new Set(dateien.map(d => d.pfad))
  // Windows unterscheidet nicht zwischen Gross- und Kleinschreibung: «Reich.txt» und «reich.txt» sind dieselbe Datei
  const neuKlein = new Set([...neu].map(p => p.toLowerCase()))
  let n = 0
  for (const d of dateien) {
    await schreibeDatei(wurzel, d.pfad, d.inhalt)
    fortschritt(++n / (dateien.length + 1))
  }
  const geloescht = []
  for (const p of alt) {
    if (neuKlein.has(p.toLowerCase())) continue
    if (await loescheDatei(wurzel, p)) geloescht.push(p)
  }
  await schreibeDatei(wurzel, listenPfad, JSON.stringify([...neu]))
  fortschritt(1)
  return { geschrieben: dateien.length, geloescht }
}

export async function leseFehlerlog(wurzel) {
  const b = await leseDatei(wurzel, 'logs/error.log')
  return b ? new TextDecoder().decode(b) : null
}

/** Gibt es im Benutzerordner schon einen Mod-Ordner mit dieser modid? */
export async function modOrdnerVorhanden(wurzel, modid) {
  try {
    await holeOrdner(wurzel, ['mod', modid], false)
    return true
  } catch {
    return false
  }
}
