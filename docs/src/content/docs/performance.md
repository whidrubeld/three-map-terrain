---
title: Performance
description: What a scene costs and the knobs that trade it — terrain triangles, imagery detail, layers hidden by distance, fewer features, lines, lights.
---

The library keeps the main thread free on its own: layers draw a few tiles at a time between frames, the nearest to `map.focus` first; a height change refreshes the normals around it only; `map.pick` and the layers' `pick` test the triangles under the ray, not all of them — cheap enough for every pointer move. What a scene costs is then mostly yours to choose:

| Knob                                                                     | What it trades                                                                                                                                                                            |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nTiles` or `grid`, `tileSegments`                                       | Terrain triangles: the grid's tiles × `tileSegments² × 2`. Layers drape along them too — at city zooms 48–64 segments are plenty (100 by default)                                         |
| `imageryZoomOffset`                                                      | Imagery requests and texture memory per tile: `4^offset` tiles — `0` a quarter of the default's, `2` four times (sharper)                                                                 |
| layers' `maxDistance`                                                    | Hides a layer's objects on tiles farther than this many meters from the camera, every frame — per part too: `(part) => (part === 'trunks' ? 800 : 2500)`. Drawn and exported all the same |
| `map.focus`                                                              | Where the layers draw first: `camera.position` or the controls' `target`                                                                                                                  |
| `removeTileSegment`, `alignTo`                                           | Tiles near the camera only, coarser ones farther away: [Large areas](/three-map-terrain/large-areas/)                                                                                     |
| `Roads` `kinds`, `Vegetation` `spacing`, `maxPerTile`, layers' `minZoom` | Fewer features: e.g. no footpaths, sparser woods on a wide map, no layer below a zoom                                                                                                     |
| `Buildings` `edges`, `wireframe`, `fillOpacity`                          | Lines are extra draw calls and vertices; a transparent fill is drawn after everything else                                                                                                |
| `lights: false`                                                          | Unlit `MeshBasicMaterial`s for the terrain and the layers' look                                                                                                                           |
| `create` (terrain material)                                              | The texture is yours there: e.g. `texture.anisotropy = renderer.capabilities.getMaxAnisotropy()` for sharp slopes at grazing angles, at some GPU cost                                     |

And three.js' own: a pixel ratio of at most 2 (`renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`) is often the largest saving on phones.
