# Vegetation

> Woods filled with trees and scrub with bushes (instanced), single trees and bushes, kept clear of water, roads and houses — or what you plant.

```ts
import { Vegetation } from 'three-map-terrain'

// trees and bushes — not in the river, on the roads or in the houses a wood
// of the data takes in
map.addLayer(
  new Vegetation({
    source: { api: 'openfreemap' },
    avoid: [water, roads, buildings]
  })
)
```

* **Woods and scrub** — the basemaps’ woods and scrub; `natural=wood`, `landuse=forest`, `natural=scrub` and `natural=shrubbery` from Overpass — are filled on a grid of `spacing` meters (default 9 in woods, 5 in scrub), jittered: anchored to the map, so that they never move when a tile is drawn again and never double at tile edges. Woods grow trees, scrub bushes: a feature whose `kind` is one of `BUSH_KINDS` (`scrub`, `shrubbery`, `shrub`; `isBush(feature)`). **Single trees and bushes** (points: `natural=tree`, `natural=shrub`, or yours) stand where they are.
* **Clear ground.** Woods in the data are coarse areas: they take in the rivers, roads and houses crossing them. `avoid` lists the layers whose ground stays clear of plants — water, roads, buildings, yours: a plant stands only where none of them drew, at least `clearance` meters (default 2) from it. A tile’s plants are planted once those layers have drawn it and its neighbours; when one of them draws a tile again later, the plants there are planted again.
* **A tree** is a trunk and a crown — a prism and an ellipsoid, 8 and 20 triangles, the crown shaded round —, **a bush** a crown on the ground, wider than high; they stand on the rendered surface, `height` meters high (from the source, or between `treeHeights`, default 8–16 m, and `bushHeights`, 2–4 m). They are copies of one geometry each, an `InstancedMesh` per part and tile (at most `maxPerTile` plants, default 12 000; a tile with more spots is thinned evenly — every area keeps the same share, spread over all of it — so a thinned tile is sparser than its unthinned neighbours, never cut off): picking returns the plant or its area, `highlight()` draws its copies over them; in wireframe they are outlined. Models without instancing (STL, OBJ, USDZ) get every copy.
* **Fewer on a wide map.** `spacing` can be a function of the terrain’s zoom — and of the area: `spacing: (zoom, feature) => (zoom < 15 ? 2 : 1) * (isBush(feature) ? 5 : 9)`. Where areas overlap, a spot of the grid is planted once, by the first.
* **Parts.** `crowns` (green, `CROWN_COLOR`) and `bushes` (olive, `BUSH_COLOR`) — both in the look’s color if it gives one — and `trunks` (brown), in their materials’ colors: `vegetation.setMaterial({ color: '#8a8a8a' })` or materials of yours recolor them in place. The layer needs a zoom of 14 or more (`minZoom`).

## What grows is yours

The layer plants — where, how dense, clear of `avoid`, never twice; `plant(ctx, spot, feature, plants)` decides what grows at each spot, by the feature’s `kind` or `properties`: `plants.tree(height?)`, `plants.bush(height?)`, copies of your own in parts you name, or nothing. Woods and scrub are all the layer reads by default; read more with the source’s `properties` (or Overpass `query`, [see Sources](/three-map-terrain/sources/#buildings-roads-water-vegetation--a-provider-read-through-a-schema)) — orchards of low trees, heaths of dwarf shrubs:

```ts
import {
  isBush,
  openMapTilesVegetationProperties,
  Vegetation
} from 'three-map-terrain'

new Vegetation({
  source: {
    api: 'openfreemap',
    // woods and scrub, and orchards and heaths: OpenMapTiles has them
    // under farmland and grass
    properties: (p, layer) =>
      p.subclass === 'orchard' || p.subclass === 'heath'
        ? { kind: p.subclass }
        : openMapTilesVegetationProperties(p, layer)
  },
  plant(ctx, spot, feature, { tree, bush }) {
    if (feature.kind === 'orchard') tree(4 + 2 * spot.random)
    else if (feature.kind === 'heath') bush(0.6)
    else if (isBush(feature)) bush()
    else tree()
  }
})
```

A spot is `{ x, y, z, random }`: where, in the tile’s coordinates, on the rendered ground, and a number in \[0, 1) that stays the same — for heights, sizes, species. Copies of your own (`ctx.instances(part, geometry).add(matrix)`, e.g. of `plantShapes().crown`) take the crowns’ color unless you give their part a material; they are picked as their area, highlighted and exported like the plants. Grass, fields and other land cover are areas, not plants: drape them in a `build` of yours around `draw`, or in a [layer of your own](/three-map-terrain/own-layers/).

## `new Vegetation({ source, ...options })`

| Option           | Default   | Description                                                                                                                                    |
| ---------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`         | —         | `VegetationSource` or its props; [see Sources](/three-map-terrain/sources/#buildings-roads-water-vegetation--a-provider-read-through-a-schema) |
| `material`       | the map’s | The look overriding the map’s, a `Material`, or `(part) => Material \| undefined`                                                              |
| `build`          | —         | `(ctx, draw) => void`: [replace or extend the geometry](/three-map-terrain/own-layers/#the-built-in-layers-geometry)                           |
| `plant`          | —         | `(ctx, spot, feature, { tree, bush }) => void`: [what grows at a spot](#what-grows-is-yours)                                                   |
| `avoid`          | `[]`      | Layers whose ground stays clear of plants                                                                                                      |
| `clearance`      | `2`       | Meters a plant keeps from what `avoid` drew                                                                                                    |
| `spacing`        | `9`, `5`  | Meters between the plants of an area — 5 in scrub; or `(zoom, feature) => meters`                                                              |
| `treeHeights`    | `[8, 16]` | Meters, for trees the source gives no height                                                                                                   |
| `bushHeights`    | `[2, 4]`  | Meters, for bushes the source gives no height                                                                                                  |
| `maxPerTile`     | `12000`   | Plants per tile; over it a tile is thinned evenly                                                                                              |
| `highlightColor` | `#ffb020` | The color of `highlight()`                                                                                                                     |
| `minZoom`        | `14`      | Terrain tiles below this zoom get no plants                                                                                                    |
| `maxDistance`    | —         | Meters from the camera beyond which a tile’s plants are hidden, e.g. `(part) => (part === 'trunks' ? 800 : 2500)`                              |

A `VegetationFeature` is `{ id?, geometry, height?, kind?, properties }` with a GeoJSON `Point` / `MultiPoint` (single plants) or `Polygon` / `MultiPolygon` (woods, scrub); bushes grow where `isBush(feature)` — its `kind` one of `BUSH_KINDS` — trees elsewhere. Parts: `crowns`, `trunks`, `bushes` (instanced), and yours. `plantShapes()` gives the shared `trunk` and `crown` geometries (a bush is a crown) — never dispose them. The members every layer has are in the [reference](/three-map-terrain/api/layers/).