---
name: three-map-terrain
description: Build real-world 3D terrain in three.js or React Three Fiber with the three-map-terrain library — elevation and imagery from map tiles, OpenStreetMap buildings, roads and bridges, water and vegetation, layers of your own (FeatureLayer), materials, picking and geolocation, GLB / STL / USDZ export, streaming and levels of detail. Use when code imports three-map-terrain, or when asked to show a real place, a GPS track or map data on 3D terrain, or to make a terrain model to print.
---

# three-map-terrain

A three.js library: a `Map` loads elevation and imagery tiles around a place
and builds a grid of terrain meshes; layers (buildings, roads, water,
vegetation, a base, yours) are drawn on it from vector tiles, OpenStreetMap
or any data. `three` is a peer dependency (≥ 0.152); TypeScript types ship
with the package.

## Where the truth is

- **The installed version's API**: `node_modules/three-map-terrain/dist/index.d.ts`
  — every export with its TSDoc. Read it for exact signatures and options
  before guessing; check `node_modules/three-map-terrain/package.json` for
  the version.
- **The documentation**, every page also as Markdown (add `.md`):
  <https://whidrubeld.github.io/three-map-terrain/llms.txt> lists them,
  <https://whidrubeld.github.io/three-map-terrain/llms-full.txt> is all of
  them. Pages: `getting-started.md`, `layers.md`, `layers/buildings.md`,
  `layers/roads.md`, `layers/water.md`, `layers/vegetation.md`,
  `layers/base.md`, `own-layers.md`, `materials.md`, `sources.md`,
  `export.md`, `large-areas.md`, `performance.md`, `api/map.md`,
  `api/layers.md`, `api/sources.md`, `api/exports.md` — under
  `https://whidrubeld.github.io/three-map-terrain/`. They describe the latest
  release; the types describe the installed one.

## The model

- `new Map({ location, source?, elevation?, options?, material? })`: a grid
  of tiles at `options.zoom` (default 11) — `nTiles × nTiles` (default 3)
  around `location`, or any rectangle `options.grid`
  (`{ minX, minY, maxX, maxY }` in tiles). `location` is the origin of the
  coordinates either way.
- `map.terrain` is a `Group` — add it to the scene. One mesh per tile, and
  the layers' objects.
- **Z is up**: the terrain lies in the XY plane, X east, Y north. Set
  `camera.up.set(0, 0, 1)` and a far plane of about `1e6`.
- **Units**: a tile is `tileSize` (600) scene units wide; heights are
  `zScale` units per meter. The default `zScale` is true scale only at zoom
  11 around 46°: set `exaggeration: 1` for true scale anywhere (and `> 1` to
  exaggerate). `baseAltitude` (meters) is drawn at z = 0 — keeps a city at
  300 m near the origin.
- **Positions** are in `map.terrain`'s local coordinates; convert with
  `worldToLocal` / `localToWorld` if `map.terrain` or its parents move.
- **Lifecycle**: `await map.init()` resolves when every tile has its heights
  (textures and layers keep streaming in); `map.whenReady()` waits for
  everything; `map.clean()` aborts requests and frees GPU memory — call it on
  unmount (safe with React StrictMode: `init()` again works). Layers survive
  `clean()`.
- Built-in materials are lit (`MeshLambertMaterial`): add an `AmbientLight`
  and a `DirectionalLight`, or pass `material: { lights: false }`.

## Recipes

### A map in three.js

```ts
import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer
} from 'three'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { Map } from 'three-map-terrain'

const scene = new Scene()
scene.add(new AmbientLight(0xffffff, 1.3))
const sun = new DirectionalLight(0xffffff, 2.6)
sun.position.set(-1e4, -4e3, 7e3)
scene.add(sun)

const camera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 1e6)
camera.up.set(0, 0, 1)
camera.position.set(0, -1200, 900) // a 3 × 3 grid is 1800 units wide

const renderer = new WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
document.body.append(renderer.domElement)
const controls = new MapControls(camera, renderer.domElement)

const map = new Map({
  source: { api: 'eox' }, // Sentinel-2 imagery
  location: { lat: 46.57634, lon: 7.9904 }
})
scene.add(map.terrain)
await map.init()

renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})
```

### React Three Fiber

```tsx
function Terrain() {
  const map = useMemo(
    () =>
      new Map({
        source: { api: 'eox' },
        location: { lat: 46.57634, lon: 7.9904 }
      }),
    []
  )
  useEffect(() => {
    void map.init()
    return () => map.clean()
  }, [map])
  return <primitive object={map.terrain} />
}
// <Canvas camera={{ up: [0, 0, 1], position: [0, -1200, 900], far: 1e6 }}>
```

A pointer event already carries the hit:
`map.getLocation(map.terrain.worldToLocal(event.point.clone()))`.

### Positions and picking

```ts
const p = await map.getTerrainPosition({ lat, lon }) // on the rendered surface
const q = map.getTerrainPositionSync({ lat, lon }) // per frame; undefined until loaded
const r = map.getPosition({ lat, lon, alt: 3000 }) // at an altitude in meters
const { lat, lon, alt } = map.getLocation({ x, y, z }) // the inverse
const hit = map.pick(raycaster) // { lat, lon, alt, point } | undefined
```

### A city with layers

Layers need a city zoom (14–16) and true scale:

```ts
import {
  Buildings,
  Map,
  Roads,
  TerrainBase,
  Vegetation,
  Water
} from 'three-map-terrain'

const map = new Map({
  location: { lat: 46.515, lon: 6.632 },
  elevation: { api: 'mapterhorn' }, // finer than the default AWS tiles
  options: { zoom: 15, tileSegments: 64, exaggeration: 1, baseAltitude: 372 },
  material: { color: '#f2ede5' } // no imagery: a plain model
})
const buildings = map.addLayer(
  new Buildings({ source: { api: 'openfreemap' }, edges: true })
)
const roads = map.addLayer(new Roads({ source: { api: 'openfreemap' } }))
const water = map.addLayer(new Water({ source: { api: 'openfreemap' } }))
map.addLayer(
  new Vegetation({
    source: { api: 'openfreemap' },
    avoid: [water, roads, buildings]
  })
)
map.addLayer(new TerrainBase())
scene.add(map.terrain)
await map.init()
map.focus = controls.target // layers draw what the camera looks at first

const hit = buildings.pick(raycaster) ?? roads.pick(raycaster) // { feature, lat, lon, alt, point }
buildings.highlight(hit?.feature)
```

Layers using the same preset share its tiles. Below a layer's `minZoom`
(Buildings 13, Roads 12, Water 10, Vegetation 14) it draws nothing.

### Sources

- Imagery `source`: `{ api: 'eox' | 'osm' | 'none' }`,
  `{ api: 'mapbox' | 'maptiler', token }`, any `{ url: '…/{z}/{x}/{y}.jpg',
maxZoom, attribution }` (`{-y}`, `{s}`, `{quadkey}` too), or
  `{ load: ({ z, x, y, signal }) => image | canvas | bitmap }`.
- `elevation`: `{ api: 'aws' }` (default), `'mapterhorn'`,
  `{ api: 'mapbox' | 'maptiler', token }`, `{ url, encoding: 'terrarium' |
'mapbox' | (r, g, b) => meters }`, or a `load` returning RGBA pixels.
- A layer's `source`: `{ api: 'openfreemap' | 'versatiles' }`,
  `{ api: 'maptiler' | 'mapbox' | 'protomaps', token }`, `{ api: 'overpass' }`
  (every OSM tag, slow — tens of seconds a tile), `{ url | tilejson, layers,
properties }` for any MVT server, `{ tiles: new VectorTiles(…) }` to share
  your own, or `{ minZoom, maxZoom, load: async ({ z, x, y, signal }) =>
features }`. `properties` (and `query` for Overpass) read more than the
  defaults.
- Missing tiles (404, `load` → `null`) and zooms beyond `maxZoom` are cut out
  of an ancestor.

### Materials

- The look, shared by the terrain and its layers: `material: { color,
lights, wireframe, fillOpacity, fog }` on the map; a layer's `material`
  overrides it.
- `process: (context, { width, height }) => void` draws on a tile's
  imagery (canvas 2D) before it becomes a texture — tones, overlays.
- `create: ({ texture, tile, options }) => Material` makes the terrain's
  material (PBR, shaders, node materials). The tile owns the texture: never
  dispose it through the material.
- A layer's `material`: a `Material` for all faces, or
  `(part) => Material | undefined` per part — Buildings `walls`, `roofs`,
  `floors`, `edges`; Roads `surface`, `rails`, `deck`, `structure`, `lines`;
  Water `water`, `lines`; Vegetation `crowns`, `trunks`, `bushes`. UVs are in
  meters. Materials you pass are never disposed by the layer. A material
  lying on the terrain needs `polygonOffset: true, polygonOffsetFactor: -1,
polygonOffsetUnits: -4`.
- At runtime: `map.setSource(…)`, `map.setMaterial({ … })`,
  `layer.setMaterial(…)` — geometry is kept.

### A layer of your own

```ts
const pins = map.addLayer(
  new FeatureLayer<Pin>({
    name: 'pins',
    source: {
      minZoom: 15,
      maxZoom: 15,
      load: async ({ z, x, y, signal }) => fetchPins(z, x, y, signal)
    },
    material: { color: '#ff5a36' },
    build(ctx) {
      const [minX, minY, maxX, maxY] = ctx.rect
      for (const pin of ctx.allFeatures) {
        const [x, y] = ctx.toLocal(pin.position) // [lon, lat] → tile coordinates
        if (x < minX || x >= maxX || y < minY || y >= maxY) continue // another tile's
        ctx.feature(pin, () => {
          ctx
            .instances('pins', geometry)
            .add(new Matrix4().setPosition(x, y, ctx.groundAt(x, y)))
        })
      }
    }
  })
)
pins.pick(raycaster)?.feature
```

`ctx` also has `drapePolygon`, `drapeLine`, `drapePath`, `extrude`, `face`,
`segment`, `add(object)`, `surfaceAt`, `unitsPerMeter`, `zScale`. Geometry
for `ctx.instances` needs a white `color` attribute to take the part's
color. Built-in layers take `build(ctx, draw)` to replace the geometry of
some features. Anything that is not tile features implements `MapLayer`
(`attach`, `tileLoaded`, `tileChanged`, `tileRemoved`, `detach` — all
optional).

### Export

```ts
const blob = await map.export('glb') // 'glb' | 'gltf' | 'obj' | 'stl' | 'usdz'
```

Waits for everything, in meters; options `textures`, `lines`, `layers`,
`units: 'scene'`. For 3D printing: a `TerrainBase`, STL, and leave the roads
out.

### Large areas

- An area of any shape: `grid` from `Utils.position2tile(lat, lon, zoom)` of
  its corners.
- Streaming: `map.addTileSegment(x, y)` / `map.removeTileSegment(x, y)`
  around the camera's target; give `Buildings` `clip: false`.
- Levels of detail: maps of different zooms, `ring.alignTo(detail)`, and
  `skirt` (meters) to close the steps; `nTiles: 0` when adding tiles one by
  one.

### Performance

`tileSegments` (48–64 at city zooms), `imageryZoomOffset` (0: a quarter of
the imagery), layers' `maxDistance` (meters, or per part), `map.focus`,
Roads `kinds`, Vegetation `spacing` / `maxPerTile`, a pixel ratio of at most 2.

## Pitfalls

- Black or flat-looking terrain: no lights (or `lights: false` wanted).
- Nothing visible: `camera.up` not Z, a far plane under ~1e5, or
  `map.terrain` not added.
- Buildings squashed or tall: `exaggeration` not set at a city zoom.
- Empty layers: a zoom below their `minZoom`, or a slow Overpass still
  loading.
- Credits: show `map.attributions` with the map. `eox` (Sentinel-2 2016) is
  non-commercial (CC BY-NC-SA); OpenStreetMap's tile servers and the public
  Overpass instances are for light use.
- Positions from a moved `map.terrain`: convert with `worldToLocal` first.
- Works with `WebGPURenderer` too: the library uses only built-in materials.
