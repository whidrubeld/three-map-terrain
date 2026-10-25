import {
  Buildings,
  Map,
  Roads,
  TerrainBase,
  Vegetation,
  Water
} from 'three-map-terrain'

import type { Demo } from './stage'

// Lausanne with every layer, from OpenFreeMap; a click highlights the
// building or road under the pointer
const lausanne: Demo = ({ scene, camera, controls, onClick, status }) => {
  const map = new Map({
    location: { lat: 46.515, lon: 6.632 },
    elevation: { api: 'mapterhorn' },
    options: {
      zoom: 15,
      tileSegments: 64, // plenty at city zooms
      exaggeration: 1, // true to scale
      baseAltitude: 372 // Lake Geneva at z = 0
    },
    material: { color: '#f2ede5' } // no imagery: a plain model
  })
  // all read the OpenFreeMap tiles, loaded once
  const buildings = map.addLayer(
    new Buildings({ source: { api: 'openfreemap' }, edges: true })
  )
  const roads = map.addLayer(new Roads({ source: { api: 'openfreemap' } }))
  const water = map.addLayer(new Water({ source: { api: 'openfreemap' } }))
  map.addLayer(
    new Vegetation({
      source: { api: 'openfreemap' },
      avoid: [water, roads, buildings] // not in the lake, on roads, in houses
    })
  )
  map.addLayer(new TerrainBase())
  scene.add(map.terrain)
  void map.init()

  map.focus = controls.target // layers draw what the camera looks at first
  camera.position.set(0, -1600, 1250)

  status('Click a building or a road')
  onClick((raycaster) => {
    const building = buildings.pick(raycaster)
    const road = building ? undefined : roads.pick(raycaster)
    buildings.highlight(building?.feature)
    roads.highlight(road?.feature)
    if (building) {
      const { height } = building.feature
      status(height ? `A building, ${Math.round(height)} m high` : 'A building')
    } else if (road) {
      const { kind, bridge } = road.feature
      status(bridge ? `A ${kind} bridge` : `A ${kind} road`)
    } else status('Click a building or a road')
  })
  return map
}

export default lausanne
