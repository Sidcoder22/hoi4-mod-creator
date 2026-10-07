import { render } from 'preact'
import { App } from './ui/app.jsx'
import { aktionen, speicher } from './ui/zustand.js'
import { loescheDb } from './speicher/indexeddb.js'
import { starteSelbsttest } from './selbsttest/selbsttest.js'
import './ui/stil.css'

async function los() {
  const selbsttest = new URLSearchParams(location.search).has('selbsttest')
  const dbName = selbsttest ? 'hoi4-mod-creator-selbsttest' : 'hoi4-mod-creator'
  if (selbsttest) {
    await loescheDb(dbName)
    window.__hmc = { aktionen, speicher }
  }
  render(<App />, document.getElementById('app'))
  await aktionen.start({ dbName })
  if (selbsttest) await starteSelbsttest()
}

los()
