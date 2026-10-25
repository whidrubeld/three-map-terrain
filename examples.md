# Examples

> The live example in React Three Fiber, the basic example in plain three.js with Overture buildings, and GPX Terrain, a full app built with the library.

## Live example

[A small tool in React Three Fiber](https://github.com/whidrubeld/three-map-terrain/tree/master/examples/react): any area of the world, picked on an OpenStreetMap map, its layers switched on and off, one map in four looks — plain ([colored](https://github.com/whidrubeld/three-map-terrain/blob/master/examples/react/src/colored.ts) by part), [textured](https://github.com/whidrubeld/three-map-terrain/blob/master/examples/react/src/textured.ts) (a few canvas textures on the layers’ parts), aerial in grayscale (a `process` of the imagery), wireframe over a light fill — exported as GLB, STL, OBJ or USDZ. **[Open it](/three-map-terrain/examples/react/)**, or one of its views:

|                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [![Lausanne as a colored model: beige terrain without imagery, white OpenStreetMap buildings with their edges, gray roads and bridges over the Flon valley, the blue lake, woods of trees, on a solid base cut along the lake](/three-map-terrain/images/lausanne-plain.webp)](/three-map-terrain/examples/react/?place=lausanne\&look=plain) | [![The Bernese Alps from Lake Brienz to the Aletsch Glacier as 3D terrain with satellite imagery; the panel shows the geolocation of a click on the terrain](/three-map-terrain/images/hero.webp)](/three-map-terrain/examples/react/?place=alps) |

Every view is a link — the page keeps it in the query: `place` (`lausanne`, `alps`), or any other area by its middle `lat`, `lon`, its zoom `z` (8–16) and its tiles `w` × `h` (1–5); `ex` (vertical exaggeration), `look` (`plain`, `aerial`, `textured`, `wireframe`), `imagery` (`sentinel`, `swisstopo`), `layers` (e.g. `buildings,roads`), `pick` (opens the area picker). Mount Everest, textured: [`?lat=27.98808&lon=86.92529&z=12&w=5&h=3&look=textured&layers=water,base`](/three-map-terrain/examples/react/?lat=27.98808\&lon=86.92529\&z=12\&w=5\&h=3\&look=textured\&layers=water,base).

## Basic

[![The basic example: downtown San Francisco, Overture buildings and OpenFreeMap roads on a toned-down OpenStreetMap map, a tower highlighted](/three-map-terrain/images/basic.webp)](/three-map-terrain/examples/basic/)

[Plain three.js, bundled with webpack](https://github.com/whidrubeld/three-map-terrain/tree/master/examples/basic): downtown San Francisco at zoom 15, true to scale. **[Open it](/three-map-terrain/examples/basic/)**.

* **A custom building source** ([overture.ts](https://github.com/whidrubeld/three-map-terrain/blob/master/examples/basic/src/overture.ts)): the [Overture Maps](https://overturemaps.org) buildings — OpenStreetMap merged with Microsoft, Google and Esri footprints — read from their PMTiles archive with the [`pmtiles`](https://www.npmjs.com/package/pmtiles) package and turned into buildings by `buildingsFromVectorTile` with the built-in `overtureProperties`. Any data the library has no preset for plugs in the same way.
* The OpenStreetMap map toned down to the buildings by a few lines of `material.process`, buildings with their `edges`, OpenFreeMap roads (the freeways’ bridges rise from their ends over the flat downtown), and a `TerrainBase`.
* A click: the building under the pointer (`buildings.pick`), highlighted with its Overture name and height — or the geolocation of the terrain (`map.pick`).
* **Download GLB / STL** with `map.export()`.

## GPX Terrain

[![GPX Terrain: the Stelvio Pass road draped on wireframe terrain, with track details, a legend, an elevation profile and the card of the point under the cursor](https://raw.githubusercontent.com/whidrubeld/gpx-terrain/master/docs/hero.webp)](https://whidrubeld.github.io/gpx-terrain/)

[A full app](https://whidrubeld.github.io/gpx-terrain/) on the library, in React, React Three Fiber and TanStack Store: GPX tracks draped on terrain, an elevation profile, playback, picking, imagery and wireframe at runtime. Its code is [on GitHub](https://github.com/whidrubeld/gpx-terrain).