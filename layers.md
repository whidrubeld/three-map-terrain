# Layers

> Buildings, roads and bridges, water, vegetation and a diorama base on the terrain — added to a map, picked and highlighted, drawn a few tiles at a time.

Buildings, roads, water, vegetation and the base are layers of the map: they follow its tiles as they load, take on its look and go into its exports. They need a city-scale zoom — 14 to 16; at 15 a 3 × 3 grid is about 2.5 km wide — and true scale, so that they are not flattened. Lausanne with every layer; a click highlights the building or road under the pointer:

**lausanne.ts**

```ts
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
```

`map.addLayer()` returns the layer; layers using the same preset — here OpenFreeMap — share its tiles, loaded and decoded once. `pick(raycaster)` returns `{ feature, lat, lon, alt, point }` of the feature under the ray, never one the terrain hides, and `highlight(feature)` draws it over any material.

With React Three Fiber, a pointer event is already an intersection: `buildings.pickIntersection(event)`; roads, which lie on the terrain, are picked with the event’s ray: `roads.pick(new Raycaster(event.ray.origin, event.ray.direction))`.

Layers draw their tiles a few at a time between frames, across every layer — so that the data arriving at once never holds up a frame — the nearest to `map.focus` first: by default the location, or a point you keep, in world coordinates:

```ts
map.focus = camera.position // or controls.target: followed as it moves
```

## The layers

| Layer                                                 | Draws                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`Buildings`](/three-map-terrain/layers/buildings/)   | Footprints extruded on the terrain: walls, roofs, floors, edges                 |
| [`Roads`](/three-map-terrain/layers/roads/)           | Roads and railways lying on the terrain; bridges as decks on piers              |
| [`Water`](/three-map-terrain/layers/water/)           | Lakes, the sea and rivers lying on the terrain; waterways as ribbons            |
| [`Vegetation`](/three-map-terrain/layers/vegetation/) | Woods of trees and scrub of bushes, single trees and bushes — or what you plant |
| [`TerrainBase`](/three-map-terrain/layers/base/)      | Side walls and a bottom: the terrain as a solid block                           |
| [`FeatureLayer`](/three-map-terrain/own-layers/)      | Your own: any source, your geometry, kept in step with the terrain              |

Each takes a `source` — a preset, vector tiles of yours, Overpass or a `load` of your own ([Sources](/three-map-terrain/sources/#buildings-roads-water-vegetation--a-provider-read-through-a-schema)) — a `material` ([Materials](/three-map-terrain/materials/)), a `build` to replace or extend its geometry ([Your own layers](/three-map-terrain/own-layers/)), and `maxDistance` to hide it far from the camera ([Performance](/three-map-terrain/performance/)). Their shared members are in the [reference](/three-map-terrain/api/layers/).