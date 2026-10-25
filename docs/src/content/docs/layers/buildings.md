---
title: Buildings
description: OpenStreetMap buildings standing on the terrain — grounded on slopes, drawn once and whole, joined across vector tiles, cut at the grid's edge.
---

```ts
import { Buildings } from 'three-map-terrain'

const buildings = map.addLayer(
  new Buildings({ source: { api: 'openfreemap' }, edges: true })
)
```

- **On the surface.** Walls start just below the lowest ground under them; the roof is `height` meters above it — and at least 3 m above the highest ground on a slope. Heights are scaled like the terrain. Parts with a `minHeight` (overhangs, towers on podiums) float with a floor; courtyards stay open. Roofs are flat.
- **Once, whole.** A building is drawn by the terrain tile its center lies in, so one crossing a tile border is drawn once and never cut. Vector tiles cut buildings at their borders: the pieces of one (the same stretch of the border from both sides, the same height) are joined again as their tiles load. Sources whose tiles are coarser than the terrain (most stop at zoom 14) are loaded once for the terrain tiles they cover.
- **Cut at the edge.** With `clip` (default) buildings end with the grid: those crossing its edge are cut along it, and the parts of buildings outside that reach in are drawn — a clean section on a `TerrainBase`.
- **Data.** Heights, minimum heights and colors come from the source: OSM `height`, `building:levels` (3 m each; of several sections — `9;10`, `9,10` — the highest), `min_height`, `building:colour`; vector tiles with these precomputed. Outlines that have `building:part`s are left to the parts. Buildings without a height get `defaultHeight` — so do those above 1000 m, which no building reaches: a data error.
- **Parts.** Every tile has a mesh of `walls` (UVs in meters along and up), `roofs`, `floors` and the `edges` (lines, with `edges` or in wireframe) — each can have [its own material](/three-map-terrain/materials/).

## `new Buildings({ source, ...options })`

| Option           | Default   | Description                                                                                                                                               |
| ---------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`         | —         | `BuildingSource` or its props; [see Sources](/three-map-terrain/sources/#buildings-roads-water-vegetation--a-provider-read-through-a-schema)              |
| `material`       | the map's | `Partial<MaterialOptions>` overriding the map's look, a `Material` for the faces, or `(part) => Material \| undefined` per part                           |
| `build`          | —         | `(ctx, draw) => void`: [replace or extend the geometry](/three-map-terrain/own-layers/#the-built-in-layers-geometry)                                      |
| `edges`          | `false`   | Outline solid buildings with their edges, in a darker shade                                                                                               |
| `clip`           | `true`    | Cut buildings at the edge of the grid, and draw the parts of those outside that reach in                                                                  |
| `featureColors`  | `false`   | Draw buildings in the color the source gives them (OSM `building:colour`)                                                                                 |
| `highlightColor` | `#ffb020` | The color of `highlight()`                                                                                                                                |
| `defaultHeight`  | `6`       | Meters, for buildings without a height, or with one above 1000 m (a data error)                                                                           |
| `minZoom`        | `13`      | Terrain tiles below this zoom get no buildings                                                                                                            |
| `maxDistance`    | —         | Meters from the camera beyond which a tile's buildings are hidden, or `(part) => meters \| undefined`; see [Performance](/three-map-terrain/performance/) |

A `BuildingFeature` is `{ id?, geometry, height?, minHeight?, color?, properties }` with a GeoJSON `Polygon` or `MultiPolygon` in `[lon, lat]`. Parts: `walls`, `roofs`, `floors`, `edges`. The members every layer has are in the [reference](/three-map-terrain/api/layers/).
