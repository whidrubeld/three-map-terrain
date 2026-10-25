# Export

> The terrain with its imagery and every layer as GLB, glTF, OBJ, STL or USDZ, in meters — a solid block to 3D print with a TerrainBase.

```ts
const blob = await map.export('glb') // 'glb' | 'gltf' | 'obj' | 'stl' | 'usdz'

const link = document.createElement('a')
link.href = URL.createObjectURL(blob)
link.download = 'lausanne.glb'
link.click()
```

`map.export()` waits for everything to be loaded, then writes the terrain with its imagery and every layer in meters — true to scale horizontally, heights with the map’s exaggeration. glTF, OBJ and USDZ are Y-up as their tools expect, STL stays Z-up for slicers; with a [`TerrainBase`](/three-map-terrain/layers/base/) the terrain is a solid block, and the buildings stand in it — what a slicer needs to print a city.

Materials become `MeshStandardMaterial`s with their color, texture and vertex colors; highlights are left out. Instanced copies — trees, bushes, your own — stay instanced in glTF (`EXT_mesh_gpu_instancing`) and become one mesh of every copy in STL, OBJ and USDZ. Roads lie flush on the terrain: in a model without polygon offsets they may flicker, and for printing they add nothing — leave them out with `layers: false` or remove the layer first.

| Option     | Default    | Description                                                                         |
| ---------- | ---------- | ----------------------------------------------------------------------------------- |
| `textures` | `true`     | Embed the imagery (glTF, GLB, USDZ)                                                 |
| `lines`    | `false`    | Also lines — building edges (glTF, GLB, OBJ)                                        |
| `layers`   | `true`     | Also the layers — buildings, roads, the base                                        |
| `units`    | `'meters'` | True to scale horizontally, heights with the map’s exaggeration; or `'scene'` units |

For any other three.js object there is `exportModel(object, format, { textures, lines, scale, filter })`. three.js’ exporters are loaded only when you export.