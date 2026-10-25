# Source classes

> Source, ElevationSource, the layers' feature sources, VectorTiles and Overpass — the classes behind the props of every source.

* `new Source(props)` — imagery; `tileUrl(z, x, y)`, `load(tile)`.
* `new ElevationSource(props)` — elevation; `tileUrl(z, x, y)`, `load(tile)`, `decode(r, g, b)`; `decodeTerrarium`, `decodeMapbox`.
* `new BuildingSource(props)`, `new RoadSource(props)`, `new WaterSource(props)`, `new VegetationSource(props)` — features read through `buildingSchema`, `roadSchema`, `waterSchema`, `vegetationSchema`; `load(tile)`, `tiles`. All are `TileFeatureSource`s.
* `new VectorTiles(props)` — a vector tile provider (`api`, `url` or `tilejson`, `schema`); `load(tile)` → `VectorTileData` with `layer(name)`; `VectorTiles.preset(api, token?)` is the instance layers share.
* `new Overpass({ endpoint? })` — `query(ql, signal)`, one request at a time per endpoint.

All take the props shown in [Sources](/three-map-terrain/sources/); `Map`, `Buildings`, `Roads` and the others also take the props directly.

A `FeatureSource` — what [your own layers](/three-map-terrain/own-layers/) take — is any object with `minZoom`, `maxZoom`, `attribution?` and `load(tile)` returning the features of a tile; `tile` is `{ z, x, y, signal }`.