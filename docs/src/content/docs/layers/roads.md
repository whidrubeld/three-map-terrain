---
title: Roads and bridges
description: Roads and railways lying exactly on the terrain, widths by kind, bridges as decks on piers spanning valleys and joined across tiles, tunnels left out.
---

```ts
import { Roads } from 'three-map-terrain'

const roads = map.addLayer(new Roads({ source: { api: 'openfreemap' } }))
```

- **On the surface.** Every terrain tile draws the part of the roads in it as ribbons cut along the terrain's triangles, so they lie exactly on the rendered surface and are lit like it; they are drawn with a polygon offset to stay in front of it. When a neighbouring tile loads and the seams between them are stitched, the roads near the seam follow.
- **Widths.** By kind — `motorway` 11 m (one carriageway), `trunk` 10, `primary` 9, `secondary` 8, `tertiary` 7, `minor` 5.5, `service` 3.5, `track` 3, `path` 2, `rail` 3 (`ROAD_WIDTHS`); links 0.6 of that; OSM `width` or `lanes` where the source has them. `widths` overrides them, `kinds` chooses which are drawn.
- **Bridges** are decks at their own height. Their pieces from different tiles are joined (by `id`, or end to end where nothing else meets: a viaduct mapped as several roads), and the deck is stretched over the ground between its ends — the upper hull of the terrain under it: never below the ground, no dips. Where the elevation has no embankments (an overpass on coarse data) a bridge clearing nothing rises to 5 m from its ends. Piers stand every 40 m where the deck is 3 m or more above the ground. `bridges: false` lays them on the terrain like the other roads.
- **Tunnels** are not drawn.
- **Parts.** `surface` (roads), `rails` (railways), `deck` (the top of bridges), `structure` (their sides, bottom and piers), `lines` (center lines and outlines, shown in wireframe). Roads and decks have UVs across (0 to 1) and along (meters): a texture with markings repeats along them.

## `new Roads({ source, ...options })`

| Option           | Default   | Description                                                                                                                                    |
| ---------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`         | —         | `RoadSource` or its props; [see Sources](/three-map-terrain/sources/#buildings-roads-water-vegetation--a-provider-read-through-a-schema)       |
| `material`       | the map's | The look overriding the map's (roads in a darker shade of its color, bridges in its color), a `Material`, or `(part) => Material \| undefined` |
| `build`          | —         | `(ctx, draw) => void`: [replace or extend the geometry](/three-map-terrain/own-layers/#the-built-in-layers-geometry)                           |
| `kinds`          | all       | The kinds drawn: `ROAD_KINDS` — `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `minor`, `service`, `track`, `path`, `rail`           |
| `widths`         | —         | Meters across by kind, for roads the source gives no width                                                                                     |
| `bridges`        | `true`    | Draw bridges as decks at their own height; `false`: on the terrain                                                                             |
| `highlightColor` | `#ffb020` | The color of `highlight()`                                                                                                                     |
| `minZoom`        | `12`      | Terrain tiles below this zoom get no roads                                                                                                     |
| `maxDistance`    | —         | Meters from the camera beyond which a tile's roads are hidden, or `(part) => meters \| undefined`                                              |

A `RoadFeature` is `{ id?, geometry, kind, width?, link?, bridge?, tunnel?, layer?, properties }` with a GeoJSON `LineString` or `MultiLineString` in `[lon, lat]`. Parts: `surface`, `rails`, `deck`, `structure`, `lines`. `width(feature)` gives a road's meters across. The members every layer has are in the [reference](/three-map-terrain/api/layers/).
