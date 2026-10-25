# Lower-level exports

> Tile math, the Tile class, textures, the drawing builders, schema readers of every layer, the MVT decoder and the model exporter.

* `Utils` — Web Mercator tile math: `position2tile`, `position2tileFraction`, `tile2bbox`, `tile2lat`, `tile2lon`, `tile2position`, `tileWidth`, `getTileKey`.
* `Tile` — one terrain tile: elevation decoding, geometry, seams, `heightAt(u, v)`, `updateGeometry(rows?, columns?)` (after changing heights: normals around the vertices changed, bounds), `children()`, `loadImagery()`, `loadTexture()`, `whenTextured()`, `restyle()`, `dispose()`.
* `loadQuadTexture`, `createTerrainMaterial` — the 2 × 2 child-tile texture and the built-in material made from it.
* `TileContext`, `TileSurface` (heights and normals of a tile, as the GPU interpolates them), `SurfaceBuilder`, `LineBuilder`, `InstanceBuilder`, `FEATURE_ATTRIBUTE` — what layers draw with.
* `buildingsFromVectorTile`, `readBuildings`, `openMapTilesProperties`, `mapboxStreetsProperties`, `protomapsProperties`, `shortbreadProperties`, `overtureProperties` — buildings from vector tiles, by schema; `buildingsFromOverpass`, `overpassQuery`, `osmBuildingAttributes`, `LEVEL_HEIGHT` — from OpenStreetMap.
* `roadsFromVectorTile`, `readRoads`, `openMapTilesRoadProperties`, `mapboxStreetsRoadProperties`, `protomapsRoadProperties`, `shortbreadRoadProperties`, `roadKind`, `ROAD_KINDS`, `ROAD_WIDTHS`, `LINK_WIDTH` — roads from vector tiles; `roadsFromOverpass`, `overpassRoadsQuery`, `osmRoadAttributes`, `LANE_WIDTH` — from OpenStreetMap.
* `waterFromVectorTile`, `readWater`, `openMapTilesWaterProperties` (and the Mapbox, Protomaps, Shortbread ones), `WATERWAY_WIDTHS`, `WATER_COLOR`; `waterFromOverpass`, `overpassWaterQuery` — water.
* `vegetationFromVectorTile`, `readVegetation`, `openMapTilesVegetationProperties` (and the others), `BUSH_KINDS`, `isBush`, `CROWN_COLOR`, `BUSH_COLOR`, `TRUNK_COLOR`, `plantShapes`; `vegetationFromOverpass`, `overpassVegetationQuery` — vegetation.
* `parseLength`, `toNumber`, `clipRect`, `isRing`, `Position`, `Ring` — reading features.
* `decodeVectorTile`, `gunzip` — the vector tile (MVT) decoder.
* `exportModel`, `MODEL_TYPES`, `expandTileUrl`.

Every export is documented in the package’s type declarations: [`dist/index.d.ts`](https://unpkg.com/three-map-terrain/dist/index.d.ts).