import { landName } from '../../projekt/abgeleitet.js'

export function LandEditor({ z }) {
  const land = z.projekt.laender.find(l => l.id === z.ansicht.id)
  if (!land) return <div class="ansicht"><p>Dieses Land gibt es nicht mehr.</p></div>
  return (
    <div class="ansicht" data-test="land-editor">
      <div class="land-kopf"><h1>{landName(land.tag, z.projekt, z.spieldaten)}</h1></div>
    </div>
  )
}
