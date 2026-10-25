# Water

> Lakes, the sea, rivers and ponds lying on the terrain with their islands left land, and waterways as ribbons as wide as their kind.

```ts
import { Water } from 'three-map-terrain'

const water = map.addLayer(new Water({ source: { api: 'openfreemap' } }))
```

* **On the surface**, like roads: areas — lakes, the sea, rivers, ponds, pools — are cut along the terrain’s triangles; their holes, islands, stay land. Waterways (rivers, canals, streams, ditches) are ribbons as wide as their kind (`WATERWAY_WIDTHS`: river 12 m, canal 8, stream 2.5, ditch 1.5; `widths` overrides them) or the source says. They are drawn in front of the terrain and behind the roads. Waterways in tunnels are not drawn.
* **Parts.** `water` (blue, `WATER_COLOR`, unless the look gives a color), `lines` (shores and center lines, in wireframe).

## `new Water({ source, ...options })`

| Option           | Default   | Description                                                                                                                               |
| ---------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `source`         | —         | `WaterSource` or its props; [see Sources](/three-map-terrain/sources/#buildings-roads-water-vegetation--a-provider-read-through-a-schema) |
| `material`       | the map’s | The look overriding the map’s, a `Material`, or `(part) => Material \| undefined`                                                         |
| `build`          | —         | `(ctx, draw) => void`: [replace or extend the geometry](/three-map-terrain/own-layers/#the-built-in-layers-geometry)                      |
| `widths`         | —         | Meters across waterways by kind                                                                                                           |
| `highlightColor` | `#ffb020` | The color of `highlight()`                                                                                                                |
| `minZoom`        | `10`      | Terrain tiles below this zoom get no water                                                                                                |
| `maxDistance`    | —         | Meters from the camera beyond which a tile’s water is hidden, or `(part) => meters \| undefined`                                          |

A `WaterFeature` is `{ id?, geometry, kind?, width?, properties }` with a GeoJSON `Polygon` / `MultiPolygon` (areas, holes are islands) or `LineString` / `MultiLineString` (waterways). Parts: `water`, `lines`. `width(feature)` gives a waterway’s meters across. The members every layer has are in the [reference](/three-map-terrain/api/layers/).