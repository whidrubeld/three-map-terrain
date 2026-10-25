import {
  Buildings,
  type ImageryProcessor,
  Map,
  Roads,
  TerrainBase,
  type TerrainMaterialOptions,
  Water
} from 'three-map-terrain'

import type { Demo } from './stage'

/** The imagery in grayscale, a little brighter: a `process` of its pixels. */
const gray: ImageryProcessor = (context, { width, height }) => {
  const image = context.getImageData(0, 0, width, height)
  const { data } = image
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    data[i] = data[i + 1] = data[i + 2] = luma * 1.1
  }
  context.putImageData(image, 0, 0)
}

const swisstopo = {
  url: 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg',
  maxZoom: 20,
  attribution: '© swisstopo'
}

const LOOKS = {
  // no imagery: the relief shows in the light
  plain: { wireframe: false, color: '#f2ede5', process: undefined },
  // swisstopo's photo in grayscale
  aerial: { wireframe: false, color: '#ffffff', process: gray },
  // the terrain's triangles, the buildings' edges, the roads' center lines
  wireframe: { wireframe: true, fillOpacity: 0.12, color: '#9fb3c8' }
} satisfies Record<string, Partial<TerrainMaterialOptions>>

// One map in three looks, switched at runtime: the layers take on the
// terrain's, their geometry stays
const looks: Demo = ({ scene, camera, choose }) => {
  const map = new Map({
    location: { lat: 46.5225, lon: 6.635 }, // Lausanne, the old town
    elevation: { api: 'mapterhorn' },
    options: {
      zoom: 15,
      nTiles: 1,
      tileSegments: 64,
      exaggeration: 1,
      baseAltitude: 372
    },
    material: LOOKS.plain
  })
  map.addLayer(new Buildings({ source: { api: 'openfreemap' }, edges: true }))
  map.addLayer(new Roads({ source: { api: 'openfreemap' } }))
  map.addLayer(new Water({ source: { api: 'openfreemap' } }))
  map.addLayer(new TerrainBase())
  scene.add(map.terrain)
  void map.init()
  camera.position.set(-150, -650, 600)

  choose(['plain', 'aerial', 'wireframe'], (look) => {
    map.setSource(look === 'aerial' ? swisstopo : { api: 'none' })
    map.setMaterial(LOOKS[look])
  })
  return map
}

export default looks
