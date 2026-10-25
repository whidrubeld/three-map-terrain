# Getting started

> Install three-map-terrain, put real-world terrain in a three.js scene, find positions on it and use it with React Three Fiber.

## Install

```bash
npm install three three-map-terrain
# or: yarn add three three-map-terrain · pnpm add three three-map-terrain
```

Requires `three` ≥ 0.152.

## Quick start

```ts
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { Map } from 'three-map-terrain'

const scene = new Scene()
const camera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 1e6)
camera.up.set(0, 0, 1) // the terrain lies in the XY plane, Z is up
camera.position.set(0, -1200, 900)

const renderer = new WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
document.body.append(renderer.domElement)
const controls = new MapControls(camera, renderer.domElement)

const map = new Map({
  source: { api: 'eox' }, // Sentinel-2 imagery
  location: { lat: 46.57634, lon: 7.9904 } // Bernese Alps
})
scene.add(map.terrain)
await map.init() // geometry is ready; textures keep streaming in

renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})
```

Built-in materials react to lights: add an `AmbientLight` and a `DirectionalLight`, or pass `material: { lights: false }`.

A `Map` is a grid of tiles — `nTiles × nTiles` (3 by default) at `zoom` (11) around `location`, or any rectangle of tiles as `grid` — and `map.terrain` is a `Group` with a mesh per tile. Its [options](/three-map-terrain/api/map/) set the size, detail and vertical scale.

## Put things on the map

```ts
// on the rendered surface, wherever the terrain is
const { x, y, z } = await map.getTerrainPosition({ lat: 46.6242, lon: 8.0414 })
marker.position.set(x, y, z)

// every frame, for moving objects (undefined until that tile has loaded)
const p = map.getTerrainPositionSync({ lat, lon })
if (p) vehicle.position.set(p.x, p.y, p.z)

// at an altitude in meters, e.g. an aircraft
const { x, y, z } = map.getPosition({ lat, lon, alt: 3000 })

// the geolocation under the pointer
raycaster.setFromCamera(pointer, camera)
const hit = map.pick(raycaster) // { lat, lon, alt, point } | undefined
```

Positions are in `map.terrain` coordinates: X east, Y north, Z up. The quick start’s map with a marker on the Eiger and the geolocation of a click — the demos on these pages leave out the scene, the camera and the renderer, as above:

**alps.ts**

```ts
import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three'
import { Map } from 'three-map-terrain'

import type { Demo } from './stage'

// The Bernese Alps on Sentinel-2 imagery, a marker on the Eiger, and the
// geolocation under the pointer
const alps: Demo = ({ scene, camera, onClick, status }) => {
  const map = new Map({
    source: { api: 'eox' },
    location: { lat: 46.57634, lon: 7.9904 }
  })
  scene.add(map.terrain)
  void map.init() // geometry first; textures keep streaming in
  camera.position.set(0, -1200, 900)

  // on the rendered surface: the tile is loaded first
  const marker = new Mesh(
    new SphereGeometry(12),
    new MeshBasicMaterial({ color: '#ff5a36' })
  )
  map.terrain.add(marker) // in map.terrain's coordinates
  void map.getTerrainPosition({ lat: 46.5776, lon: 8.0053 }).then((p) => {
    marker.position.set(p.x, p.y, p.z)
  })

  status('Click the terrain')
  onClick((raycaster) => {
    const hit = map.pick(raycaster)
    if (hit) {
      const { lat, lon, alt } = hit
      status(`${lat.toFixed(5)}, ${lon.toFixed(5)} · ${Math.round(alt)} m`)
    }
  })
  return map
}

export default alps
```

## React Three Fiber

```tsx
import { MapControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Map } from 'three-map-terrain'

export function Terrain() {
  const map = useMemo(
    () =>
      new Map({
        source: { api: 'eox' },
        location: { lat: 46.57634, lon: 7.9904 }
      }),
    []
  )

  useEffect(() => {
    void map.init()
    return () => map.clean() // aborts requests, frees GPU memory
  }, [map])

  return <primitive object={map.terrain} />
}

export default function App() {
  return (
    <Canvas camera={{ up: [0, 0, 1], position: [0, -1200, 900], far: 1e6 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[-1e4, 1e4, 1e4]} intensity={2.5} />
      <Terrain />
      <MapControls />
    </Canvas>
  )
}
```

`clean()` in the effect’s cleanup makes it safe in `StrictMode`, which mounts twice in development. Pointer events already carry the hit: `map.getLocation(map.terrain.worldToLocal(event.point.clone()))`.

## Next

* [Layers](/three-map-terrain/layers/) — buildings, roads and bridges, water, vegetation and a base.
* [Materials](/three-map-terrain/materials/) — the look, the imagery’s pixels, your own materials.
* [Sources](/three-map-terrain/sources/) — imagery, elevation and features from any server.
* [Examples](/three-map-terrain/examples/) — the live example, plain three.js, and a full app.