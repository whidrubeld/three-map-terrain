# Your own layers

> FeatureLayer loads the tiles of any source and keeps your geometry in step with the terrain; TileContext drapes, extrudes and places models on it.

`FeatureLayer` is what `Buildings` and `Roads` are made of: give it a source of features and a `build` that draws a terrain tile; it loads the source’s tiles (shared, cancelled when unused), draws every tile when its features arrive, and again when the heights it read change. What you draw goes into named parts — one object per part and tile, each with [its material](/three-map-terrain/materials/) — and what you wrap in `ctx.feature()` can be picked and highlighted.

```ts
import { Color, Group } from 'three'
import { FeatureLayer } from 'three-map-terrain'

interface Tree {
  id: number
  position: [lon: number, lat: number]
  height: number
}

const trees = map.addLayer(
  new FeatureLayer<Tree>({
    name: 'trees',
    source: {
      minZoom: 15,
      maxZoom: 15,
      attribution: '© My city',
      load: async ({ z, x, y, signal }) =>
        (await fetch(`/trees/${z}/${x}/${y}.json`, { signal })).json()
    },
    build(ctx) {
      const [minX, minY, maxX, maxY] = ctx.rect
      for (const tree of ctx.allFeatures) {
        const [x, y] = ctx.toLocal(tree.position)
        if (x < minX || x >= maxX || y < minY || y >= maxY) continue // another tile's
        ctx.feature(tree, () => {
          const model = treeModel.clone() // any Object3D, in the tile's coordinates
          model.position.set(x, y, ctx.groundAt(x, y))
          model.scale.setScalar(tree.height * ctx.zScale)
          ctx.add(model)
        })
      }
    }
  })
)

trees.pick(raycaster)?.feature // the Tree under the pointer
```

The summits of the Bernese Alps as a layer: pins, copies of one geometry (`ctx.instances`), standing on the rendered surface, picked and highlighted:

**summits.ts**

```ts
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
```

## `TileContext`

The `ctx` has the tile’s features and the primitives that put geometry on the terrain, in the tile’s local coordinates (scene units, x east, y north):

| Primitive                                       | Draws                                                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `drapePolygon(part, rings, { color, clip })`    | A polygon with holes lying on the terrain: water, parks, fields — cut along the terrain’s triangles, lit like it                           |
| `drapeLine(part, line, width, { color })`       | A ribbon lying on the terrain, with round caps; UVs across and along in meters                                                             |
| `drapePath(part, line, { color })`              | A line lying on the terrain (lines are built only if their part’s material is visible)                                                     |
| `extrude(polygons, bottom, top, style)`         | Walls, a roof and a floor (`floor`), and their edges — into the parts `walls`, `roofs`, `floors`, `edges` or the `parts` you name          |
| `face(part, points, { color, normal, uv })`     | Any planar convex polygon `[x, y, z, …]`, turned to face `normal`                                                                          |
| `segment(part, a, b, color)`                    | A line from `[x, y, z]` to `[x, y, z]`                                                                                                     |
| `instances(part, geometry).add(matrix, color?)` | Copies of a shared geometry — trees, lamps — one `InstancedMesh` per part and tile, each copy picked as its feature, outlined in wireframe |
| `add(object)`                                   | Any object — a model, an `InstancedMesh`; picked as the feature being drawn                                                                |

And what they are made of: `toLocal([lon, lat])`, `groundAt(x, y)` (the rendered surface, also in loaded neighbours), `surfaceAt(x, y)` (height and normal, `undefined` where not loaded), `unitsPerMeter`, `zScale`, `rect` (the tile), `sources` (the features by source tile, with its `rect`), `planarUv(x, y)`, `visible(part, kind?)` (whether a part’s material shows: skip drawing what it hides — the tile is drawn again once it shows), and the raw `surface(part)` / `lines(part)` builders. Heights read through `ctx` are tracked: the tile is drawn again when they change.

## The built-in layers’ geometry

The built-in layers take a `build` too, which receives their own drawing as `draw(features?)` — replace the geometry of some features, keep it for the others:

```ts
new Buildings({
  source: { api: 'openfreemap' },
  build(ctx, draw) {
    // your models for some buildings, the extrusion for the rest
    draw(ctx.allFeatures.filter((building) => !models.has(building.id)))
    for (const building of ctx.allFeatures) {
      const model = models.get(building.id)
      if (!model) continue
      ctx.feature(building, () => {
        const [x, y] = ctx.toLocal(anchorOf(building))
        model.position.set(x, y, ctx.groundAt(x, y))
        ctx.add(model)
      })
    }
  }
})
```

## A layer class

Subclass `FeatureLayer` for a reusable layer: override `draw(ctx, features)` (and `select()` to decide which tile draws a feature crossing tiles, `partColor()` / `createMaterial()` for its look — colors in the materials, so that a new look only changes them — `sourceLoaded()` / `prepare()` for what spans tiles — `Roads` joins its bridges there — and `canDraw(tile)` to wait for other layers, as `Vegetation` waits for `avoid`). `FeatureLayer` is new in 3.0: its API may still grow.

## `MapLayer`

Underneath is `MapLayer`, the interface the map talks to; implement it for anything that is not tile features — every method is optional:

```ts
map.addLayer({
  attribution: '© My data', // listed in map.attributions
  attach(map) {}, // added: map.terrain is there to add objects to
  tileLoaded(tile) {}, // a tile is in the scene: tile.heightAt(u, v), tile.mesh.position
  tileChanged(tile) {}, // its heights changed: a neighbour loaded and the seams were stitched
  tileRemoved(tile) {}, // free what you made for it
  materialChanged(map) {}, // map.setMaterial(): follow map.materialOptions
  whenReady: async () => {}, // map.whenReady() and map.export() wait for it
  detach(map) {} // map.removeLayer()
})
```