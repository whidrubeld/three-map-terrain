import { describe, expect, it } from 'vitest'

import {
  type BuildingFeature,
  buildingsFromVectorTile,
  Utils
} from '../../../src'
import { clipRect, isRing, ringArea } from '../../../src/layers/features'
import {
  type BuildingPiece,
  cutPieces,
  groupPieces,
  joinedBuilding
} from '../../../src/layers/buildings/join'
import { encodeVectorTile } from '../../support/mvt-encoder'

const Z = 14
const X = 8492
const Y = 5793

const key = (x: number, y: number) => ({ z: Z, x, y, key: `${Z}/${x}/${y}` })

/** A position given in tile units from tile X, Y (x east, y south). */
const position = (x: number, y: number) => [
  Utils.tile2lon(X + x, Z),
  Utils.tile2lat(Y + y, Z)
]

const rect = (x0: number, y0: number, x1: number, y1: number) => [
  x0,
  y0,
  x1,
  y0,
  x1,
  y1,
  x0,
  y1
]

const feature = (
  rings: number[][],
  attributes: Partial<BuildingFeature> = {}
): BuildingFeature => ({
  geometry: {
    type: 'Polygon',
    coordinates: rings.map((ring) => {
      const positions = []
      for (let i = 0; i < ring.length; i += 2) {
        positions.push(position(ring[i], ring[i + 1]))
      }
      return positions
    })
  },
  properties: {},
  ...attributes
})

/** A building in tile units as a vector tile gives it: cut to tile `x`, `y`. */
const tileOf = (
  rings: number[][],
  x: number,
  y: number,
  attributes: Partial<BuildingFeature> = {}
) => {
  const cut = rings.map((ring) => clipRect(ring, x, y, x + 1, y + 1))
  return isRing(cut[0])
    ? [feature(cut.filter(isRing), attributes)]
    : ([] as BuildingFeature[])
}

/** The pieces the tiles around X, Y give of the buildings. */
const piecesOf = (
  buildings: { rings: number[][]; attributes?: Partial<BuildingFeature> }[],
  tiles = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1]
  ]
) =>
  tiles.flatMap(([x, y]) =>
    cutPieces(
      buildings.flatMap(({ rings, attributes }) =>
        tileOf(rings, x, y, attributes)
      ),
      key(X + x, Y + y)
    )
  )

const join = (pieces: BuildingPiece[]) => {
  const groups = groupPieces(pieces)
  return groups.map((group) =>
    joinedBuilding(
      group,
      group.reduce((a, b) => (b.area > a.area ? b : a))
    )
  )
}

/** Rings of a building: flat, without the closing position, in tile units. */
const ringsOf = (building: BuildingFeature | undefined) => {
  if (building?.geometry.type !== 'Polygon') {
    throw new Error('expected a polygon')
  }
  return building.geometry.coordinates.map((ring) =>
    ring.slice(0, -1).flatMap(([lon, lat]) => {
      const f = Utils.position2tileFraction(lat, lon, Z)
      return [f.x - X, f.y - Y]
    })
  )
}

/** Area in square tile units (rings are y south: clockwise is positive). */
const areaOf = (rings: number[][]) =>
  -rings.reduce((sum, ring) => sum + ringArea(ring), 0)

describe('cutPieces', () => {
  it('takes the buildings a tile cut at its border, not whole ones', () => {
    const cut = feature([rect(0.8, 0.2, 1, 0.4)])
    const inside = feature([rect(0.2, 0.2, 0.4, 0.4)])
    // e.g. from Overpass: in every tile it touches, reaching beyond
    const whole = feature([rect(0.9, 0.5, 1.2, 0.7)])

    const pieces = cutPieces([cut, inside, whole], key(X, Y))

    expect(pieces.map((piece) => piece.feature)).toEqual([cut])
  })

  it('reads the pieces of vector tiles, where the reader cut them', async () => {
    const tile = (x: number) =>
      buildingsFromVectorTile(
        encodeVectorTile([
          {
            name: 'building',
            features: [
              {
                type: 3,
                properties: { render_height: 12 },
                // the same building, in the buffer of the other tile
                geometry: [
                  x === X
                    ? rect(3000, 1000, 4500, 1500)
                    : rect(-1096, 1000, 404, 1500)
                ]
              }
            ]
          }
        ]),
        { z: Z, x, y: Y }
      )
    const pieces = [
      ...cutPieces(await tile(X), key(X, Y)),
      ...cutPieces(await tile(X + 1), key(X + 1, Y))
    ]

    const [building] = join(pieces)
    const [outer] = ringsOf(building)
    expect(outer).toHaveLength(8)
    const xs = outer.filter((_, i) => i % 2 === 0)
    expect(Math.min(...xs)).toBeCloseTo(3000 / 4096, 9)
    expect(Math.max(...xs)).toBeCloseTo(1 + 404 / 4096, 9)
    expect(building?.height).toBe(12)
  })
})

describe('joining pieces', () => {
  it('joins the halves of a building into the building', () => {
    const pieces = piecesOf([
      { rings: [rect(0.8, 0.2, 1.3, 0.4)], attributes: { height: 20 } }
    ])
    expect(pieces).toHaveLength(2)

    const joined = join(pieces)
    expect(joined).toHaveLength(1)
    const rings = ringsOf(joined[0])
    // its corners: no points left on the border
    expect(rings).toHaveLength(1)
    expect(rings[0]).toHaveLength(8)
    expect(areaOf(rings)).toBeCloseTo(0.5 * 0.2, 9)
    expect(joined[0]?.height).toBe(20)
  })

  it('joins a building across the corner of four tiles', () => {
    const pieces = piecesOf([{ rings: [rect(0.7, 0.8, 1.2, 1.1)] }])
    expect(pieces).toHaveLength(4)

    const rings = ringsOf(join(pieces)[0])
    expect(rings[0]).toHaveLength(8)
    expect(areaOf(rings)).toBeCloseTo(0.5 * 0.3, 9)
  })

  it('keeps a courtyard across the border', () => {
    const rings = ringsOf(
      join(
        piecesOf([
          { rings: [rect(0.6, 0.2, 1.4, 0.8), rect(0.9, 0.4, 1.1, 0.6)] }
        ])
      )[0]
    )

    expect(rings).toHaveLength(2)
    expect(rings.map((ring) => ring.length)).toEqual([8, 8])
    expect(areaOf(rings)).toBeCloseTo(0.8 * 0.6 - 0.2 * 0.2, 9)
  })

  it('joins arms reaching across: a clipped ring bridging them along the border', () => {
    // a U open to the east, its arms in the eastern tile: one ring there
    // that runs back and forth along the border between them
    const u = [
      0.5, 0.2, 1.4, 0.2, 1.4, 0.4, 0.8, 0.4, 0.8, 0.6, 1.4, 0.6, 1.4, 0.8, 0.5,
      0.8
    ]
    const rings = ringsOf(join(piecesOf([{ rings: [u] }]))[0])

    expect(rings).toHaveLength(1)
    expect(rings[0]).toHaveLength(16)
    expect(areaOf(rings)).toBeCloseTo(0.9 * 0.6 - 0.6 * 0.2, 9)
  })

  it('merges ends the tiles disagree on a little: no step along the border', () => {
    // simplified each on its own, the tiles cross the border 1/10 000 apart
    const west = feature([[0.8, 0.2, 1, 0.2, 1, 0.4, 0.8, 0.4]])
    const east = feature([[1, 0.2001, 1.3, 0.2, 1.3, 0.4, 1, 0.4]])
    const pieces = [
      ...cutPieces([west], key(X, Y)),
      ...cutPieces([east], key(X + 1, Y))
    ]

    const [outer] = ringsOf(join(pieces)[0])
    const onBorder = outer.filter(
      (value, i) => i % 2 === 0 && Math.abs(value - 1) < 1e-9
    )
    expect(onBorder.length).toBeLessThanOrEqual(1)
    expect(outer).toHaveLength(onBorder.length === 1 ? 10 : 8)
  })

  it('keeps buildings apart: other heights, neighbours, equal ones drawn twice', () => {
    const pieces = piecesOf([
      // other heights, against each other at the border
      { rings: [rect(0.8, 0.1, 1, 0.2)], attributes: { height: 10 } },
      { rings: [rect(1, 0.1, 1.2, 0.2)], attributes: { height: 20 } },
      // row houses across the border, side by side
      { rings: [rect(0.8, 0.3, 1.2, 0.4)], attributes: { height: 9 } },
      { rings: [rect(0.8, 0.4, 1.2, 0.5)], attributes: { height: 9 } },
      // an outline and a part as tall, one over the other
      { rings: [rect(0.8, 0.6, 1.2, 0.8)], attributes: { height: 15 } },
      { rings: [rect(0.9, 0.7, 1.1, 0.8)], attributes: { height: 15 } }
    ])

    const joined = join(pieces)
    expect(joined).toHaveLength(4)
    expect(joined.map((building) => building?.geometry.type)).toEqual(
      Array(4).fill('Polygon')
    )
  })

  it('takes the id of a piece that has one', () => {
    const pieces = [
      ...cutPieces([feature([rect(0.8, 0.2, 1, 0.4)], { id: 42 })], key(X, Y)),
      ...cutPieces([feature([rect(1, 0.2, 1.3, 0.4)])], key(X + 1, Y)),
      // another id: another building
      ...cutPieces(
        [feature([rect(1, 0.2, 1.3, 0.4)], { id: 43 })],
        key(X + 1, Y)
      )
    ]

    const groups = groupPieces(pieces)
    expect(groups).toHaveLength(1)
    expect(groups[0].map(({ feature }) => feature.id)).toEqual([42, undefined])
    expect(joinedBuilding(groups[0], groups[0][1])?.id).toBe(42)
  })
})
