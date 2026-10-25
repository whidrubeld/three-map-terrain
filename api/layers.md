# Layer members

> The members every layer shares — pick, highlight, setMaterial, maxDistance, the ground it covers — and new FeatureLayer(), the frame of them all.

The options of each layer are on its page: [`Buildings`](/three-map-terrain/layers/buildings/#new-buildings-source-options-), [`Roads`](/three-map-terrain/layers/roads/#new-roads-source-options-), [`Water`](/three-map-terrain/layers/water/#new-water-source-options-), [`Vegetation`](/three-map-terrain/layers/vegetation/#new-vegetation-source-options-), [`TerrainBase`](/three-map-terrain/layers/base/#new-terrainbase-depth-material-).

## `new FeatureLayer({ source, build?, material?, highlightColor?, minZoom?, maxDistance?, name? })`

The frame of the layers — [Your own layers](/three-map-terrain/own-layers/). `source` is any `FeatureSource`; `name` names the group and its objects (`'<name> <part> <z/x/y>'`).

## Members

The layers share these members:

| Member                                              | Description                                                                                                                                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pick(raycaster)`, `pickIntersection(intersection)` | `{ feature, lat, lon, alt, point }` of the feature hit — never one behind the terrain                                                                                                                                                      |
| `highlight(feature \| id, color?)`                  | Draws a feature over its material; a feature with an `id` is highlighted in every tile; no argument clears it                                                                                                                              |
| `setMaterial(material)`                             | A look merged into the layer’s, or a material or a function replacing it — changed in place                                                                                                                                                |
| `invalidate(tiles?)`                                | Draws the tiles again                                                                                                                                                                                                                      |
| `whenReady()`                                       | Resolves once the layer’s data is loaded and drawn                                                                                                                                                                                         |
| `maxDistance`                                       | Meters from the camera beyond which a tile’s objects are hidden (`(part) => meters \| undefined` per part), measured to the nearest point of its terrain before every render, changeable any time (objects of `ctx.add()` are left to you) |
| `count`                                             | Features drawn (a feature crossing tiles counts once per tile)                                                                                                                                                                             |
| `group`                                             | The layer’s objects, in `map.terrain`                                                                                                                                                                                                      |
| `source`, `attribution`                             | Where its features come from, and their credit                                                                                                                                                                                             |
| `dispose()`                                         | Frees what the layer made                                                                                                                                                                                                                  |

And the ground they take (`GroundCover`, what `Vegetation`’s `avoid` reads):

| Member                  | Description                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `covers(x, y, margin?)` | Whether their faces, seen from above, cover a point in map units (tiles at the map’s zoom), or come within `margin` of it |
| `onTileDrawn(listener)` | Told about every tile drawn again or removed; returns how to stop                                                         |
| `pending(tile)`         | Whether a tile is still to be drawn — its data loading or its drawing queued (optional for your own)                      |

## `MapLayer`

What the map talks to — every method optional: `attribution`, `attach(map)`, `tileLoaded(tile)`, `tileChanged(tile)`, `tileRemoved(tile)`, `materialChanged(map)`, `whenReady()`, `detach(map)`. [Your own layers](/three-map-terrain/own-layers/#maplayer).