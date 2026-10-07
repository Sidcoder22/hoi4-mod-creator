// Wiederverwendbare Formularfelder mit Beschriftung und Erklaerung.

export function Feld({ label, hilfe, children, breit }) {
  return (
    <label class={`feld${breit ? ' breit' : ''}`}>
      <span class="feld-titel">
        {label}
        {hilfe && <span class="hilfe" title={hilfe} aria-label={hilfe}>?</span>}
      </span>
      {children}
      {hilfe && <span class="feld-hilfe">{hilfe}</span>}
    </label>
  )
}

export function TextFeld({ label, hilfe, wert, onAendere, test, platzhalter, gesperrt, mehrzeilig, maxLaenge }) {
  const props = {
    value: wert ?? '',
    placeholder: platzhalter,
    disabled: gesperrt,
    maxLength: maxLaenge,
    'data-test': test,
    onInput: (e) => onAendere(e.currentTarget.value),
  }
  return (
    <Feld label={label} hilfe={hilfe} breit={mehrzeilig}>
      {mehrzeilig ? <textarea rows={4} {...props} /> : <input type="text" {...props} />}
    </Feld>
  )
}

export function ZahlFeld({ label, hilfe, wert, onAendere, test, min, max, schritt = 1, gesperrt, einheit }) {
  return (
    <Feld label={label} hilfe={hilfe}>
      <span class="zahl-zeile">
        <input type="number" value={wert} min={min} max={max} step={schritt} disabled={gesperrt} data-test={test}
          onInput={(e) => {
            const v = Number(e.currentTarget.value)
            if (e.currentTarget.value !== '' && !Number.isNaN(v)) onAendere(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)))
          }} />
        {einheit && <span class="einheit">{einheit}</span>}
      </span>
    </Feld>
  )
}

export function Regler({ label, hilfe, wert, onAendere, test, min = 0, max = 100, schritt = 1, gesperrt, einheit = '%' }) {
  return (
    <Feld label={label} hilfe={hilfe}>
      <span class="regler-zeile">
        <input type="range" value={wert} min={min} max={max} step={schritt} disabled={gesperrt} data-test={test}
          onInput={(e) => onAendere(Number(e.currentTarget.value))} />
        <span class="regler-wert">{wert} {einheit}</span>
      </span>
    </Feld>
  )
}

export function Auswahl({ label, hilfe, wert, onAendere, test, optionen, gesperrt }) {
  return (
    <Feld label={label} hilfe={hilfe}>
      <select value={wert ?? ''} disabled={gesperrt} data-test={test} onChange={(e) => onAendere(e.currentTarget.value)}>
        {optionen.map(o => <option value={o.wert} key={o.wert}>{o.text}</option>)}
      </select>
    </Feld>
  )
}

export function Haken({ label, hilfe, wert, onAendere, test, gesperrt }) {
  return (
    <label class="haken">
      <input type="checkbox" checked={!!wert} disabled={gesperrt} data-test={test} onChange={(e) => onAendere(e.currentTarget.checked)} />
      <span>{label}</span>
      {hilfe && <span class="hilfe" title={hilfe}>?</span>}
    </label>
  )
}
