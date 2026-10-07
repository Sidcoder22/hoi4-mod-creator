// Zwischenspeicher im Browser: Projekte, eingelesene Spieldaten, Bilder und Einstellungen.

const VERSION = 1

function anfrage(req) {
  return new Promise((ok, fehler) => {
    req.onsuccess = () => ok(req.result)
    req.onerror = () => fehler(req.error)
  })
}

function fertig(tx) {
  return new Promise((ok, fehler) => {
    tx.oncomplete = () => ok()
    tx.onerror = () => fehler(tx.error)
    tx.onabort = () => fehler(tx.error || new Error('Abgebrochen'))
  })
}

export function oeffneDb(name = 'hoi4-mod-creator') {
  return new Promise((ok, fehler) => {
    const req = indexedDB.open(name, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('projekte')) db.createObjectStore('projekte', { keyPath: 'id' })
      for (const s of ['spieldaten', 'bilder', 'einstellungen']) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
    }
    req.onsuccess = () => ok(req.result)
    req.onerror = () => fehler(req.error)
  })
}

export function loescheDb(name) {
  return new Promise((ok, fehler) => {
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = () => ok()
    req.onerror = () => fehler(req.error)
    req.onblocked = () => ok()
  })
}

export async function alleProjekte(db) {
  const alle = await anfrage(db.transaction('projekte').objectStore('projekte').getAll())
  return alle.map(r => ({ id: r.id, name: r.projekt.mod.name, geaendert: r.geaendert })).sort((a, b) => b.geaendert - a.geaendert)
}

export async function ladeProjekt(db, id) {
  const r = await anfrage(db.transaction('projekte').objectStore('projekte').get(id))
  return r ? r.projekt : null
}

export async function speichereProjekt(db, projekt) {
  const tx = db.transaction('projekte', 'readwrite')
  tx.objectStore('projekte').put({ id: projekt.id, geaendert: Date.now(), projekt })
  await fertig(tx)
}

export async function loescheProjekt(db, id) {
  const tx = db.transaction('projekte', 'readwrite')
  tx.objectStore('projekte').delete(id)
  await fertig(tx)
}

export async function speichereSpieldaten(db, { spieldaten, karte, bilder }) {
  const tx = db.transaction(['spieldaten', 'bilder'], 'readwrite')
  tx.objectStore('spieldaten').put({ spieldaten, karte }, 'aktuell')
  const b = tx.objectStore('bilder')
  b.clear()
  for (const [schluessel, wert] of bilder) b.put(wert, schluessel)
  await fertig(tx)
}

export async function ladeSpieldaten(db) {
  return (await anfrage(db.transaction('spieldaten').objectStore('spieldaten').get('aktuell'))) ?? null
}

export async function ladeBild(db, schluessel) {
  return (await anfrage(db.transaction('bilder').objectStore('bilder').get(schluessel))) ?? null
}

export async function merke(db, schluessel, wert) {
  const tx = db.transaction('einstellungen', 'readwrite')
  tx.objectStore('einstellungen').put(wert, schluessel)
  await fertig(tx)
}

export async function hole(db, schluessel) {
  return (await anfrage(db.transaction('einstellungen').objectStore('einstellungen').get(schluessel))) ?? null
}
