# Diorama base

> TerrainBase closes the terrain into a solid block — side walls and a bottom — for a cut-out of the world and a closed model to print.

```ts
import { TerrainBase } from 'three-map-terrain'

map.addLayer(new TerrainBase()) // a solid block
```

`TerrainBase` closes the terrain into a solid block — side walls from its outer edges down to `depth` meters below its lowest point, and a bottom — for a cut-out of the world, and a closed model to [print](/three-map-terrain/export/). It is rebuilt as tiles load and are removed: walls stand along every side without a neighbour. In wireframe it is drawn as its outline.

## `new TerrainBase({ depth?, material? })`

| Option     | Default | Description                                                     |
| ---------- | ------- | --------------------------------------------------------------- |
| `depth`    | `50`    | Meters below the terrain’s lowest point                         |
| `material` | —       | Its own material; else drawn like the terrain in a darker shade |

With `Buildings` (`clip`, the default) buildings end with the grid too: those crossing its edge are cut along it — a clean section on the base.