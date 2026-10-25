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
