# Map

> new Map() — its props, MapOptions and material options — and its members, from init() and positions to layers, export, streaming and clean().

## `new Map({ location, source?, elevation?, options?, material? })`

| Prop        | Type                                      | Description                                                                                 |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `location`  | `{ lat: number; lon: number }`            | Its tile is the origin of the coordinates, and the middle of the `nTiles` grid              |
| `source`    | `Source \| SourceProps`                   | Imagery; [see Sources](/three-map-terrain/sources/#imagery--source). Without it, none       |
| `elevation` | `ElevationSource \| ElevationSourceProps` | Elevation; [AWS Terrain Tiles](/three-map-terrain/sources/#elevation--elevation) by default |
| `options`   | `Partial<MapOptions>`                     | See below                                                                                   |
| `material`  | `Partial<TerrainMaterialOptions>`         | [Materials](/three-map-terrain/materials/#options)                                          |

### `MapOptions`

Defaults in `defaultMapOptions`.

| Option              | Default | Description                                                                                                                                                                                      |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nTiles`            | `3`     | The grid is `nTiles × nTiles` tiles                                                                                                                                                              |
| `grid`              | —       | The grid as any rectangle of tiles at `zoom` instead, inclusive: `{ minX, minY, maxX, maxY }` (`nTiles` is ignored). [Large areas](/three-map-terrain/large-areas/)                              |
| `zoom`              | `11`    | Zoom level of the terrain tiles; the imagery’s is `zoom + imageryZoomOffset`                                                                                                                     |
| `tileSize`          | `600`   | Size of a tile in scene units                                                                                                                                                                    |
| `tileSegments`      | `100`   | Segments per tile side (`PlaneGeometry`), 1–256                                                                                                                                                  |
| `zScale`            | `0.045` | Scene units per meter of elevation. True scale is `tileSize / Utils.tileWidth(lat, zoom)`; the default is true scale at zoom 11 around 46°                                                       |
| `exaggeration`      | —       | Vertical exaggeration relative to true scale (`1`: true to scale); when set, it decides `zScale`                                                                                                 |
| `baseAltitude`      | `0`     | Altitude in meters drawn at z = 0                                                                                                                                                                |
| `imageryZoomOffset` | `1`     | A tile is textured with `4^offset` imagery tiles stitched into one: `0` its own (a quarter of the requests and memory), `1` its four children, `2` sixteen (sharper); 0–3                        |
| `skirt`             | `0`     | Meters a strip hangs straight down from every tile’s edge, in its material: it closes the steps to another map ([levels of detail](/three-map-terrain/large-areas/#levels-of-detail)); `0`: none |

## Members

Positions are in `map.terrain` coordinates: X east, Y north, Z up. Transforms of `map.terrain` (or its parents) are taken into account by `pick`.

| Member                                                                    | Returns                                 | Description                                                                                                                                                                               |
| ------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terrain`                                                                 | `Group`                                 | Add it to your scene; one mesh per loaded tile, and the layers’ objects                                                                                                                   |
| `focus`                                                                   | `Vector3 \| undefined`                  | Where the layers draw first, in world coordinates — e.g. `camera.position` or the controls’ `target`, followed as it moves; by default the location                                       |
| `init(callback?)`                                                         | `Promise<void>`                         | Loads the grid. Resolves (and calls `callback`, sets `ready`) once every tile has its elevation and seams are stitched; textures keep streaming in. Calls before `clean()` share one load |
| `whenReady()`                                                             | `Promise<void>`                         | Resolves once everything is loaded: tiles, their textures, the layers’ content                                                                                                            |
| `getPosition({ lat, lon, alt }, { loadTile })`                            | `{ x, y, z }`                           | `x`, `y` of a geolocation, `z = (alt − baseAltitude) × zScale`. Loads the tile if it is not in the grid, unless `loadTile: false`                                                         |
| `getTerrainPosition({ lat, lon })`                                        | `Promise<{ x, y, z }>`                  | A point exactly on the rendered surface, interpolated over the mesh triangles. Waits for (and loads) the tile; rejects if it cannot be loaded                                             |
| `getTerrainPositionSync({ lat, lon }, { loadTile })`                      | `{ x, y, z } \| undefined`              | The same, synchronously: `undefined` while the tile is not loaded (starts loading it unless `loadTile: false`)                                                                            |
| `getLocation({ x, y, z })`                                                | `{ lat, lon, alt }`                     | Inverse of `getPosition`; `alt` in meters                                                                                                                                                 |
| `pick(raycaster)`                                                         | `{ lat, lon, alt, point } \| undefined` | The terrain hit by a ray, e.g. after `raycaster.setFromCamera(pointer, camera)`; `point` in world coordinates                                                                             |
| `setSource(source)`                                                       | `void`                                  | Replaces the imagery (`{ api: 'none' }` turns it off); each tile keeps its texture until the new one arrives                                                                              |
| `setMaterial(options)`                                                    | `void`                                  | Changes the material options of the terrain and the layers that follow it — their materials, in place; a new `process` reloads the imagery                                                |
| `addLayer(layer)`, `removeLayer(layer)`, `layers`                         |                                         | [Layers](/three-map-terrain/layers/): buildings, roads, base, yours. Layers survive `clean()`                                                                                             |
| `export(format?, options?)`                                               | `Promise<Blob>`                         | [A model file](/three-map-terrain/export/) of everything                                                                                                                                  |
| `attributions`                                                            | `string[]`                              | The credits of the sources and layers in use — show them with the map                                                                                                                     |
| `bounds`, `grid`                                                          |                                         | The grid as `[west, south, east, north]` in degrees, and in tiles                                                                                                                         |
| `addTileSegment(x, y)`                                                    | `Promise<void>`                         | Loads one more tile of the grid’s zoom                                                                                                                                                    |
| `removeTileSegment(x, y)`                                                 | `boolean`                               | Removes a tile: the layers let go of it, a pending load is aborted, its resources freed. Whether there was one. [Streaming](/three-map-terrain/large-areas/#streaming)                    |
| `alignTo(map)`                                                            | `void`                                  | Sets the transform of `terrain` so that this map lines up with another — any zoom, tile size, vertical scale. [Levels of detail](/three-map-terrain/large-areas/#levels-of-detail)        |
| `clean()`                                                                 | `void`                                  | Removes the tiles, aborts pending requests, disposes geometries, materials and textures. `init()` can be called again                                                                     |
| `ready`, `options`, `materialOptions`, `tileCache`, `source`, `elevation` |                                         | Whether `init()` finished, the resolved options, the loaded `Tile`s by `z/x/y`, the sources                                                                                               |

With React Three Fiber, pointer events already carry the hit: `map.getLocation(map.terrain.worldToLocal(event.point.clone()))`.