---
title: Sources
description: Imagery, elevation and the layers' features from presets, URL templates, TileJSON, vector tiles, Overpass or your own load — with fallback to ancestors and retries.
---

Every kind of source takes a preset `api`, a URL template or your own `load` function, and `maxZoom` / `attribution`. A tile that is missing (HTTP 404, or a `load` resolving to `null`) or deeper than `maxZoom` is cut out of its nearest ancestor, so terrain deeper than a source still works.

## Imagery — `source`

| `api`      | Imagery                                                                        | Key |
| ---------- | ------------------------------------------------------------------------------ | --- |
| `eox`      | [Sentinel-2 cloudless](https://s2maps.eu) satellite mosaic                     | —   |
| `osm`      | [OpenStreetMap](https://www.openstreetmap.org) standard map                    | —   |
| `mapbox`   | Mapbox satellite                                                               | yes |
| `maptiler` | MapTiler satellite                                                             | yes |
| `none`     | No imagery: the terrain is drawn in `material.color` (also without a `source`) | —   |

Any other tile server by its URL — `{z}`, `{x}`, `{y}`, `{-y}` (TMS), `{s}` (subdomains), `{quadkey}`:

```ts
// swisstopo aerial imagery, 10 cm in Switzerland
{ url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg', maxZoom: 20, attribution: '© swisstopo' }
// Esri World Imagery: rows before columns
{ url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Esri, Maxar, Earthstar Geographics' }
// your own loader: headers, WMS, a cache, local files — an image, canvas or bitmap
{ load: async ({ z, x, y, signal }) => myImage(z, x, y, signal) }
```

Hundreds of templates with their attributions are listed by [leaflet-providers](https://github.com/leaflet-extras/leaflet-providers) and [xyzservices](https://github.com/geopandas/xyzservices); the [Editor Layer Index](https://github.com/osmlab/editor-layer-index) has aerial imagery by country — mind that much of it is licensed for editing OpenStreetMap only.

## Elevation — `elevation`

| `api`           | Data                                                                                                                                   | Key |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `aws` (default) | [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), terrarium, to zoom 15                                               | —   |
| `mapterhorn`    | [Mapterhorn](https://mapterhorn.com), terrarium, 512 px; 30 m worldwide, much finer where open data exists (e.g. Switzerland, Austria) | —   |
| `mapbox`        | Mapbox Terrain-RGB, to zoom 15                                                                                                         | yes |
| `maptiler`      | MapTiler Terrain RGB, to zoom 14                                                                                                       | yes |

Any other server by its URL with its `encoding` — `'terrarium'`, `'mapbox'` or a function `(r, g, b) => meters` — or a `load` returning RGBA pixels (e.g. decoded from a GeoTIFF).

## Buildings, roads, water, vegetation — a provider read through a schema

A layer's features come from a **provider** — a basemap's vector tiles, Overpass, your `load` — read through the layer's **schema**: which layers of the tiles hold its features and how their fields become attributes. The layers know the schemas of the basemaps:

| `api`         | Vector tiles                                                                                                                                                       | Key | Buildings: zooms, heights       | Roads, water, vegetation: zooms  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------------------------------- | -------------------------------- |
| `openfreemap` | [OpenFreeMap](https://openfreemap.org) (OpenMapTiles)                                                                                                              | —   | 13–14, from OSM tags            | 12, 10, 12 – 14                  |
| `versatiles`  | [VersaTiles](https://versatiles.org) (Shortbread)                                                                                                                  | —   | 14, none: `defaultHeight`       | 12, 10, 12 – 14                  |
| `maptiler`    | MapTiler (OpenMapTiles)                                                                                                                                            | yes | 13–14, from OSM tags            | 12, 10, 12 – 14                  |
| `mapbox`      | Mapbox Streets v8                                                                                                                                                  | yes | 15–16, `height`, `min_height`   | 12, 10, 12 – 16                  |
| `protomaps`   | Protomaps basemap                                                                                                                                                  | yes | 14–15, `height`, `min_height`   | 12, 10, 12 – 15                  |
| `overpass`    | OpenStreetMap through the [Overpass API](https://overpass-api.de) — every tag; slow (tens of seconds a tile), one request at a time; `endpoint` for another server | —   | 14, `height`, `building:levels` | 14 (single trees and bushes too) |

Layers using the same preset share its tiles: a basemap tile is loaded and decoded once, and cancelled only when no layer needs it. To share your own tiles the same way, give the layers one `VectorTiles`:

```ts
const tiles = new VectorTiles({
  url: 'https://my.server/{z}/{x}/{y}.pbf',
  schema: 'openmaptiles'
})
new Buildings({ source: { tiles } })
new Roads({ source: { tiles } })
```

Any vector tile (MVT) server by its `url` or `tilejson`, with the `layers` that hold the features and a `properties` function reading them — the schemas of OpenMapTiles, Mapbox Streets, Protomaps, Shortbread and Overture come with the library:

```ts
new BuildingSource({ tilejson: 'https://my.tileserver/data/v3.json' }) // OpenMapTiles fields by default
new BuildingSource({
  url: 'https://my.server/{z}/{x}/{y}.pbf',
  layers: 'buildings',
  properties: (p) => ({ height: Number(p.h), hidden: p.underground === true })
})
new RoadSource({
  url: 'https://my.server/{z}/{x}/{y}.pbf',
  layers: 'ways',
  properties: (p) => ({ kind: roadKind(p.type), bridge: p.bridge === 1 })
})
```

A preset reads the layer's features by default — the buildings, roads and water, the woods and scrub of the vegetation. Give it `properties` (and `layers`) to read more, starting from the schema's own reader — `openMapTilesVegetationProperties` and the others are exported — and Overpass a `query`, the layer's with `more` selectors:

```ts
new VegetationSource({
  api: 'overpass',
  query: (bbox) =>
    overpassVegetationQuery(bbox, [
      'way["landuse"="orchard"]',
      'relation["landuse"="orchard"]["type"="multipolygon"]'
    ])
}) // kind: 'orchard', from the landuse tag: trees by default
```

Or anything else with `load`: return the features of a tile — buildings as GeoJSON-like polygons, whole (each is drawn by the tile its center is in) or clipped to the tile (pieces of a building are joined); roads as lines, whole or clipped (pieces of a bridge with the same `id` are joined):

```ts
new BuildingSource({
  minZoom: 15,
  maxZoom: 15,
  attribution: '© My city',
  async load({ z, x, y, signal }) {
    const response = await fetch(
      `https://my.server/buildings/${z}/${x}/${y}.geojson`,
      { signal }
    )
    const { features } = await response.json()
    return features.map((f) => ({
      id: f.id,
      geometry: f.geometry,
      height: f.properties.height,
      properties: f.properties
    }))
  }
})
```

The [basic example](https://github.com/whidrubeld/three-map-terrain/blob/master/examples/basic/src/overture.ts) loads the [Overture Maps](https://overturemaps.org) buildings — OpenStreetMap merged with Microsoft, Google and Esri footprints — from their PMTiles archive this way, in a few lines. Your own layers take any `FeatureSource` — an object with `minZoom`, `maxZoom`, `attribution` and `load(tile)` — or a `TileFeatureSource` with a schema of your own.

## Loading

Tiles are fetched with CORS. Network errors, HTTP 408/425/429/5xx and bodies that cannot be decoded (tile servers occasionally send truncated images with status 200) are retried up to three times with backoff, bypassing the HTTP cache. A texture that still cannot be decoded is drawn as far as it arrived; an elevation tile never is, since partial heights would be bogus terrain. A missing tile (404) falls back to its ancestors, up to six levels — the browser still logs the 404. Vector tiles that are missing are empty.

Show the credits of the data you use: `map.attributions` lists them — see [Data and attribution](/three-map-terrain/attribution/).
