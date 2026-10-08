// Diplomatie zum Spielstart: Marionetten, Meinung, Vertraege, Fraktion, Kriegsziele.

import { aendereFeld, bearbeitbar } from './gemeinsam.js'
import { landOptionen } from '../fokus/gemeinsam.js'
import { landName } from '../../projekt/abgeleitet.js'

const VERTRAEGE = [
  { wert: 'garantie', text: 'Garantie (Schutzversprechen)' },
  { wert: 'nichtangriffspakt', text: 'Nichtangriffspakt' },
  { wert: 'militaerzugang', text: 'Militärzugang' },
]
const KRIEGSZIELE = [
  { wert: 'annex_everything', text: 'Annexion' },
  { wert: 'puppet_wargoal_focus', text: 'Zur Marionette machen' },
  { wert: 'topple_government', text: 'Regierung stürzen' },
]

function Liste({ titel, erklaerung, eintraege, neu, test, kinder }) {
  return (
    <div class="karte">
      <h3>{titel}</h3>
      <p class="leise">{erklaerung}</p>
      {eintraege.length === 0 && <p class="leise">Noch nichts eingetragen.</p>}
      <div class="boni">{kinder}</div>
      <div class="knopfreihe"><button class="knopf klein" data-test={`${test}-neu`} onClick={neu}>＋ Hinzufügen</button></div>
    </div>
  )
}

export function ReiterDiplomatie({ land, z }) {
  const sd = z.spieldaten
  const an = bearbeitbar(land, 'diplomatie')
  const d = land.diplomatie ?? { marionetten: [], meinungen: [], vertraege: [], fraktion: null, kriegsziele: [] }
  const ausSpiel = sd.laender[land.tag]?.marionetten ?? []
  const marionetten = d.marionetten ?? ausSpiel
  const laender = landOptionen(z.projekt, sd).filter(o => o.wert !== land.tag)
  const setze = (patch) => aendereFeld(land, (l) => ({ diplomatie: { ...(l.diplomatie ?? d), marionetten: l.diplomatie?.marionetten ?? ausSpiel, ...patch } }))
  const liste = (name, liste_) => ({
    setze: (i, patch) => setze({ [name]: liste_.map((x, k) => (k === i ? { ...x, ...patch } : x)) }),
    weg: (i) => setze({ [name]: liste_.filter((_, k) => k !== i) }),
  })
  const landWahl = (wert, test, onAendere) => (
    <select value={wert ?? ''} data-test={test} onChange={(e) => onAendere(e.currentTarget.value)}>
      <option value="">– Land wählen –</option>
      {laender.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
    </select>
  )
  const mar = liste('marionetten', marionetten)
  const mei = liste('meinungen', d.meinungen)
  const ver = liste('vertraege', d.vertraege)
  const kri = liste('kriegsziele', d.kriegsziele)
  const fraktionsLaender = laender.filter(o => sd.laender[o.wert]?.fraktion
    || z.projekt.laender.some(l => l.tag === o.wert && l.diplomatie?.fraktion?.art === 'gruenden' && (l.art === 'neu' || l.aendern?.diplomatie)))
  return (
    <fieldset disabled={!an} style={{ border: 'none', padding: 0, margin: 0 }} class="diplomatie">
      <p class="leise">Alles hier gilt zum Spielstart 1936.</p>
      <Liste titel="Marionetten" test="marionette" eintraege={marionetten}
        erklaerung="Länder, die von diesem Land abhängig sind. Der Autonomiestatus bestimmt, wie viel sie selbst entscheiden dürfen."
        neu={() => setze({ marionetten: [...marionetten, { tag: '', autonomie: sd.autonomieStufen?.[0]?.id ?? 'autonomy_puppet' }] })}
        kinder={marionetten.map((m, i) => (
          <div class="bonus" key={i}>
            {landWahl(m.tag, `marionette-${i}-land`, (v) => mar.setze(i, { tag: v }))}
            <select value={m.autonomie} data-test={`marionette-${i}-autonomie`} onChange={(e) => mar.setze(i, { autonomie: e.currentTarget.value })}>
              {(sd.autonomieStufen ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <span>
              {ausSpiel.some(x => x.tag === m.tag) && <span class="leise">aus dem Spiel </span>}
              <button class="knopf klein leise" data-test={`marionette-${i}-weg`} onClick={() => mar.weg(i)}>{ausSpiel.some(x => x.tag === m.tag) ? 'Freilassen' : 'Entfernen'}</button>
            </span>
          </div>
        ))} />
      <Liste titel="Meinung" test="meinung" eintraege={d.meinungen}
        erklaerung="Wie sehr dieses Land ein anderes mag (−100 bis +100). Die KI richtet Bündnisse und Kriege danach aus."
        neu={() => setze({ meinungen: [...d.meinungen, { tag: '', wert: 50, gegenseitig: false }] })}
        kinder={d.meinungen.map((m, i) => (
          <div class="bonus" key={i}>
            {landWahl(m.tag, `meinung-${i}-land`, (v) => mei.setze(i, { tag: v }))}
            <span class="zahl-zeile">
              <input type="number" min={-100} max={100} value={m.wert} data-test={`meinung-${i}-wert`}
                onInput={(e) => { const v = Number(e.currentTarget.value); if (e.currentTarget.value !== '' && !Number.isNaN(v)) mei.setze(i, { wert: Math.max(-100, Math.min(100, Math.round(v))) }) }} />
              <label class="haken klein"><input type="checkbox" checked={!!m.gegenseitig} data-test={`meinung-${i}-gegenseitig`} onChange={(e) => mei.setze(i, { gegenseitig: e.currentTarget.checked })} /><span>gegenseitig</span></label>
            </span>
            <button class="knopf klein leise" data-test={`meinung-${i}-weg`} onClick={() => mei.weg(i)}>Entfernen</button>
          </div>
        ))} />
      <Liste titel="Verträge" test="vertrag" eintraege={d.vertraege}
        erklaerung="Garantien, Nichtangriffspakte und Militärzugang, die schon zu Spielbeginn gelten."
        neu={() => setze({ vertraege: [...d.vertraege, { art: 'garantie', tag: '' }] })}
        kinder={d.vertraege.map((v, i) => (
          <div class="bonus" key={i}>
            <select value={v.art} data-test={`vertrag-${i}-art`} onChange={(e) => ver.setze(i, { art: e.currentTarget.value })}>
              {VERTRAEGE.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
            </select>
            {landWahl(v.tag, `vertrag-${i}-land`, (x) => ver.setze(i, { tag: x }))}
            <button class="knopf klein leise" data-test={`vertrag-${i}-weg`} onClick={() => ver.weg(i)}>Entfernen</button>
          </div>
        ))} />
      <div class="karte">
        <h3>Fraktion</h3>
        <p class="leise">Ein Bündnis zu Spielbeginn: selbst gründen oder einer bestehenden Fraktion beitreten.</p>
        <div class="formular">
          <label class="feld">
            <span class="feld-titel">Fraktion</span>
            <select value={d.fraktion?.art ?? ''} data-test="fraktion-art"
              onChange={(e) => {
                const art = e.currentTarget.value
                setze({ fraktion: art === 'gruenden' ? { art, name: '', mitglieder: [] } : art === 'beitreten' ? { art, anfuehrer: '' } : null })
              }}>
              <option value="">Keine</option>
              <option value="gruenden">Eigene Fraktion gründen</option>
              <option value="beitreten">Einer Fraktion beitreten</option>
            </select>
          </label>
          {d.fraktion?.art === 'gruenden' && (
            <label class="feld">
              <span class="feld-titel">Name der Fraktion</span>
              <input type="text" value={d.fraktion.name} data-test="fraktion-name" onInput={(e) => setze({ fraktion: { ...d.fraktion, name: e.currentTarget.value } })} />
            </label>
          )}
          {d.fraktion?.art === 'beitreten' && (
            <label class="feld">
              <span class="feld-titel">Fraktion von …</span>
              <select value={d.fraktion.anfuehrer} data-test="fraktion-anfuehrer" onChange={(e) => setze({ fraktion: { ...d.fraktion, anfuehrer: e.currentTarget.value } })}>
                <option value="">– wählen –</option>
                {fraktionsLaender.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
              </select>
              {fraktionsLaender.length === 0 && <span class="feld-hilfe">Zu Spielbeginn hat kein anderes Land eine Fraktion.</span>}
            </label>
          )}
        </div>
        {d.fraktion?.art === 'gruenden' && (
          <div class="mitglieder">
            <span class="feld-titel">Mitglieder</span>
            {laender.map(o => (
              <label class="haken" key={o.wert}>
                <input type="checkbox" data-test={`fraktion-mitglied-${o.wert}`} checked={d.fraktion.mitglieder.includes(o.wert)}
                  onChange={(e) => {
                    const an2 = e.currentTarget.checked
                    setze({ fraktion: { ...d.fraktion, mitglieder: an2 ? [...d.fraktion.mitglieder, o.wert] : d.fraktion.mitglieder.filter(t => t !== o.wert) } })
                  }} />
                <span>{o.text}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <Liste titel="Kriegsziele" test="kriegsziel" eintraege={d.kriegsziele}
        erklaerung="Das Land hat schon zu Spielbeginn einen Kriegsgrund gegen ein anderes Land."
        neu={() => setze({ kriegsziele: [...d.kriegsziele, { tag: '', art: 'annex_everything' }] })}
        kinder={d.kriegsziele.map((k, i) => (
          <div class="bonus" key={i}>
            {landWahl(k.tag, `kriegsziel-${i}-land`, (v) => kri.setze(i, { tag: v }))}
            <select value={k.art} data-test={`kriegsziel-${i}-art`} onChange={(e) => kri.setze(i, { art: e.currentTarget.value })}>
              {KRIEGSZIELE.map(o => <option key={o.wert} value={o.wert}>{o.text}</option>)}
            </select>
            <button class="knopf klein leise" data-test={`kriegsziel-${i}-weg`} onClick={() => kri.weg(i)}>Entfernen</button>
          </div>
        ))} />
      {land.art === 'geaendert' && ausSpiel.length > 0 && <p class="leise">Marionetten aus dem Spiel: {ausSpiel.map(m => landName(m.tag, z.projekt, sd)).join(', ')}.</p>}
    </fieldset>
  )
}
