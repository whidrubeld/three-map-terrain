# three-map-terrain · basic example

Plain [three.js](https://threejs.org), bundled with webpack: downtown
**San Francisco** at zoom 15, true to scale —
[live on GitHub Pages](https://whidrubeld.github.io/three-map-terrain/examples/basic/).

What it shows ([src/index.ts](src/index.ts)):

- **A custom building source** ([src/overture.ts](src/overture.ts)): the
  [Overture Maps](https://overturemaps.org) buildings — OpenStreetMap merged
  with Microsoft, Google and Esri footprints — read from their PMTiles
  archive with the [`pmtiles`](https://www.npmjs.com/package/pmtiles)
  package and turned into buildings by `buildingsFromVectorTile` with the
  built-in `overtureProperties`. Any data the library has no preset for
  plugs in the same way.
- The OpenStreetMap map toned down to the buildings by a few lines of
  `material.process` — gray, softer, brighter, drawn on its pixels —
  buildings with their `edges`, OpenFreeMap roads (`Roads`: the freeways'
  bridges rise from their ends over the flat downtown), and a
  `TerrainBase`.
- A click: the building under the pointer (`buildings.pick`), highlighted
  with its Overture name and height — or the geolocation of the terrain
  (`map.pick`).
- **Download GLB / STL** with `map.export()`.

`three-map-terrain` is the repository root, a package of the same pnpm
workspace (`workspace:*`), so build the library first:

```bash
# repository root
pnpm install && pnpm build

# this folder
pnpm start    # webpack-dev-server, http://localhost:8080
pnpm build    # production build into dist/
```
