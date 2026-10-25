---
title: Large areas
description: Any rectangle of tiles, streaming tiles around the camera with removeTileSegment, and levels of detail with alignTo and skirts — the policy yours.
---

A `Map` is a grid of tiles at one zoom — a city, a valley, a mountain range, everything on it in full detail: `nTiles × nTiles` around `location`, or any rectangle given as `grid`, e.g. the tiles under a GPS track:

```ts
import { Map, Utils } from 'three-map-terrain'

const nw = Utils.position2tile(north, west, zoom)
const se = Utils.position2tile(south, east, zoom)
const grid = { minX: nw.x, minY: nw.y, maxX: se.x, maxY: se.y }
const map = new Map({ location, source, options: { zoom, grid } })
```

`location` still sets the coordinates — e.g. the start of the track — and need not lie in the grid; the buildings end with it, and so does the `TerrainBase`. A map is not a globe and does not stream on its own: which tiles to show, and how detailed, is your call, and three pieces make the usual policies a few lines — `removeTileSegment`, `alignTo` and `skirt`.

## Streaming

`addTileSegment(x, y)` loads a tile, `removeTileSegment(x, y)` drops it: the layers let go of what they drew there, a load still running is aborted, the GPU memory is freed. The tiles around the point the camera looks at:

```ts
import { Utils } from 'three-map-terrain'

const radius = 2 // tiles each way
controls.addEventListener('change', () => {
  const local = map.terrain.worldToLocal(controls.target.clone())
  const { lat, lon } = map.getLocation(local)
  const { x, y } = Utils.position2tile(lat, lon, map.options.zoom)
  for (const tile of Object.values(map.tileCache)) {
    if (Math.max(Math.abs(tile.x - x), Math.abs(tile.y - y)) > radius) {
      map.removeTileSegment(tile.x, tile.y)
    }
  }
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      void map.addTileSegment(x + i, y + j)
    }
  }
})
```

Buildings are cut at the edge of `map.grid`, the grid of `init()`: give them `clip: false` on a map that streams. An area that is fixed, whatever its shape, is a `grid` instead.

## Levels of detail

Maps of different zooms line up with `alignTo()`: every place, at every altitude, lands on the same point of the scene. A detailed middle in a coarser ring — the ring without its middle tile, the middle made of that tile's descendants:

```ts
// no grid of their own: the tiles are added one by one
const options = { nTiles: 0, exaggeration: 1, skirt: 300 }
const detail = new Map({ location, source, options: { ...options, zoom: 13 } })
const ring = new Map({ location, source, options: { ...options, zoom: 11 } })
scene.add(detail.terrain, ring.terrain)
ring.alignTo(detail)

const { x, y } = ring.center
for (let i = -1; i <= 1; i++) {
  for (let j = -1; j <= 1; j++) {
    if (i !== 0 || j !== 0) void ring.addTileSegment(x + i, y + j)
  }
}
// the ring's middle tile: 4 × 4 tiles two zooms deeper
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    void detail.addTileSegment(4 * x + i, 4 * y + j)
  }
}
```

Where the two meet, their edges lie at different heights — each zoom samples the elevation on its own grid: in the Alps, zoom 11 meets zoom 10 up to 170 m apart, zoom 9 up to 330 m. `skirt` hangs a strip of that many meters straight down from every tile's edge, in the tile's material, and the steps close; it is never picked or exported (`TerrainBase` walls stay in front of it). Put the layers on the detailed map, and ask each map about its own area: `getTerrainPosition` loads the tile it needs.
