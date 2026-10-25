import { ConeGeometry, Float32BufferAttribute, Matrix4 } from 'three'
import { FeatureLayer, Map } from 'three-map-terrain'

import type { Demo } from './stage'

interface Summit {
  id: number
  name: string
  position: [lon: number, lat: number]
}

// your data: here a list, in a real app tiles of a server or a database
const SUMMITS: Summit[] = [
  { id: 1, name: 'Eiger, 3967 m', position: [8.0053, 46.5776] },
  { id: 2, name: 'Mönch, 4107 m', position: [7.9973, 46.5585] },
  { id: 3, name: 'Jungfrau, 4158 m', position: [7.9625, 46.5367] },
  { id: 4, name: 'Schreckhorn, 4078 m', position: [8.1181, 46.5897] },
  { id: 5, name: 'Finsteraarhorn, 4274 m', position: [8.1263, 46.5373] },
  { id: 6, name: 'Aletschhorn, 4193 m', position: [7.9932, 46.4652] },
  { id: 7, name: 'Wetterhorn, 3692 m', position: [8.1153, 46.6372] }
]

// a pin standing on its tip, 3 high; white vertex colors: the part's
// material gives the color
const pin = new ConeGeometry(1, 3, 16)
  .rotateX(-Math.PI / 2)
  .translate(0, 0, 1.5)
const vertices = pin.getAttribute('position').count
pin.setAttribute(
  'color',
  new Float32BufferAttribute(new Float32Array(vertices * 3).fill(1), 3)
)

// A layer of your own: its features, drawn on every terrain tile they are
// in, picked and highlighted
const summits: Demo = ({ scene, camera, onClick, status }) => {
  const map = new Map({
    source: { api: 'eox' },
    location: { lat: 46.57634, lon: 7.9904 }
  })
  const layer = map.addLayer(
    new FeatureLayer<Summit>({
      name: 'summits',
      source: { minZoom: 0, maxZoom: 11, load: () => Promise.resolve(SUMMITS) },
      material: { color: '#ff5a36' },
      build(ctx) {
        const [minX, minY, maxX, maxY] = ctx.rect
        const size = 350 * ctx.unitsPerMeter
        for (const summit of ctx.allFeatures) {
          const [x, y] = ctx.toLocal(summit.position)
          if (x < minX || x >= maxX || y < minY || y >= maxY) continue // another tile's
          ctx.feature(summit, () => {
            const matrix = new Matrix4()
              .makeScale(size, size, size)
              .setPosition(x, y, ctx.groundAt(x, y))
            ctx.instances('pins', pin).add(matrix)
          })
        }
      }
    })
  )
  scene.add(map.terrain)
  void map.init()
  camera.position.set(0, -1200, 900)

  status('Click a pin')
  onClick((raycaster) => {
    const hit = layer.pick(raycaster)
    layer.highlight(hit?.feature)
    status(hit ? hit.feature.name : 'Click a pin')
  })
  return map
}

export default summits
