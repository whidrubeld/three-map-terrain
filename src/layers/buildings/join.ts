// Buildings cut at the borders of vector tiles, joined again. Internal: the
// Buildings layer joins the pieces of the source tiles it holds.
//
// Vector tiles clip buildings to the tile (the reader drops their buffer,
// which would be drawn twice): a building across tiles comes in pieces, one
// per tile, that would be grounded each on its own and outlined along the
// cut. The pieces of one building lie against the same stretch of the
// border between their tiles, from both sides, with the same attributes;
// their union is the building. Tiles are simplified each on its own, so the
// stretches may end a little apart: such points are merged.
//
// Coordinates are degrees; rings are flat `[lon0, lat0, lon1, lat1, …]`, not
// closed, outer rings counter-clockwise (lon east, lat north), holes clockwise.

import type { BuildingFeature } from './features'
import { type Position, ringArea } from '../features'
import { Utils } from '../../geo/Utils.class'

/** Points this close to a border, in tile widths, lie on it. */
const ON_BORDER = 1e-6
/**
 * Points along a border this close, in tile widths, are one: a unit of a
 * 4096 extent — about what simplifying each tile on its own moves them.
 */
const MERGE = 2 ** -12
/** Pieces meet where their stretches overlap by this much of the shorter. */
const MIN_OVERLAP = 0.5

/** A stretch `from` < `to` along a border that edges run along, one way (`sign`). */
interface Run {
  from: number
  to: number
  sign: number
}

/** A building cut at the border of its source tile. */
export interface BuildingPiece {
  readonly feature: BuildingFeature
  /** Its source tile's key. */
  readonly tile: string
  /** Outer ring, then holes, on the tile's borders exactly where they touch them. */
  readonly rings: readonly number[][]
  /** The tile: `[west, south, east, north]`. */
  readonly bounds: readonly [number, number, number, number]
  /** Its stretches of the borders it lies against, by line (`lineKey`). */
  readonly runs: ReadonlyMap<string, readonly Run[]>
  /** In square degrees. */
  readonly area: number
}

/** A border: `lon` constant (west, east) or `lat` constant (south, north). */
const lineKey = (axis: 'lon' | 'lat', value: number) => `${axis} ${value}`

function reversed(ring: readonly number[]) {
  const out: number[] = []
  for (let i = ring.length - 2; i >= 0; i -= 2) out.push(ring[i], ring[i + 1])
  return out
}

/**
 * The pieces of buildings a source tile gives: polygons in the tile and
 * along its border. Whole buildings are not: they reach beyond the tile, or
 * not up to its border.
 */
export function cutPieces(
  features: readonly BuildingFeature[],
  { z, x, y, key }: { z: number; x: number; y: number; key: string }
): BuildingPiece[] {
  const bounds = [
    Utils.tile2lon(x, z),
    Utils.tile2lat(y + 1, z),
    Utils.tile2lon(x + 1, z),
    Utils.tile2lat(y, z)
  ] as const
  const [west, south, east, north] = bounds
  const ex = (east - west) * ON_BORDER
  const ey = (north - south) * ON_BORDER
  const lons = new Set([west, east])
  const lats = new Set([south, north])
  const near = (value: number, line: number, e: number) =>
    Math.abs(value - line) <= e
  const snap = (value: number, low: number, high: number, e: number) =>
    near(value, low, e) ? low : near(value, high, e) ? high : value

  const piece = (feature: BuildingFeature): BuildingPiece | undefined => {
    const { geometry } = feature
    const polygon =
      geometry.type === 'Polygon'
        ? geometry.coordinates
        : geometry.coordinates.length === 1
          ? geometry.coordinates[0]
          : undefined
    // most buildings are inside: none of their points is on the border
    const touches = polygon
      ?.at(0)
      ?.some(
        ([lon, lat]) =>
          near(lon, west, ex) ||
          near(lon, east, ex) ||
          near(lat, south, ey) ||
          near(lat, north, ey)
      )
    if (!polygon || !touches) return undefined

    const rings: number[][] = []
    for (const [i, ring] of polygon.entries()) {
      const flat: number[] = []
      for (const [lon, lat] of ring) {
        // reaching beyond the tile: whole, from a source like Overpass
        if (
          lon < west - ex ||
          lon > east + ex ||
          lat < south - ey ||
          lat > north + ey
        ) {
          return undefined
        }
        const px = snap(lon, west, east, ex)
        const py = snap(lat, south, north, ey)
        const n = flat.length
        if (n >= 2 && flat[n - 2] === px && flat[n - 1] === py) continue
        flat.push(px, py)
      }
      const n = flat.length
      if (n >= 4 && flat[0] === flat[n - 2] && flat[1] === flat[n - 1]) {
        flat.length = n - 2
      }
      const area = ringArea(flat)
      if (flat.length < 6 || area === 0) {
        if (i === 0) return undefined
        continue
      }
      rings.push(area > 0 === (i === 0) ? flat : reversed(flat))
    }

    const runs = new globalThis.Map<string, Run[]>()
    for (const [line, { stretches }] of borderStretches(rings, lons, lats)) {
      const net = netRuns(stretches)
      if (net.length > 0) runs.set(line, net)
    }
    if (runs.size === 0) return undefined
    return { feature, tile: key, rings, bounds, runs, area: ringArea(rings[0]) }
  }

  return features.flatMap((feature) => piece(feature) ?? [])
}

/** The edges of rings along the given borders: stretches `[from, to]` along each. */
function borderStretches(
  rings: readonly (readonly number[])[],
  lons: ReadonlySet<number>,
  lats: ReadonlySet<number>
) {
  const lines = new globalThis.Map<
    string,
    { vertical: boolean; value: number; stretches: [number, number][] }
  >()
  const add = (vertical: boolean, value: number, from: number, to: number) => {
    const key = lineKey(vertical ? 'lon' : 'lat', value)
    let line = lines.get(key)
    if (!line) {
      line = { vertical, value, stretches: [] }
      lines.set(key, line)
    }
    line.stretches.push([from, to])
  }
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const [ax, ay, bx, by] = [ring[j], ring[j + 1], ring[i], ring[i + 1]]
      if (ax === bx && ay !== by && lons.has(ax)) add(true, ax, ay, by)
      else if (ay === by && ax !== bx && lats.has(ay)) add(false, ay, ax, bx)
    }
  }
  return lines
}

const onBorder = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  lons: ReadonlySet<number>,
  lats: ReadonlySet<number>
) => (ax === bx && lons.has(ax)) || (ay === by && lats.has(ay))

/**
 * Where stretches of a line, each running one way, add up to one way or
 * the other: opposite stretches (two pieces against each other, or a
 * clipped ring's bridge along the border) cancel.
 */
function netRuns(stretches: readonly (readonly [number, number])[]): Run[] {
  const points = [...new Set(stretches.flat())].sort((a, b) => a - b)
  const index = new globalThis.Map(points.map((point, i) => [point, i]))
  const change = new Array<number>(points.length).fill(0)
  for (const [from, to] of stretches) {
    const sign = Math.sign(to - from)
    change[index.get(Math.min(from, to)) ?? 0] += sign
    change[index.get(Math.max(from, to)) ?? 0] -= sign
  }
  const runs: Run[] = []
  let net = 0
  for (let i = 0; i < points.length - 1; i++) {
    net += change[i]
    if (net !== 0) {
      runs.push({ from: points[i], to: points[i + 1], sign: Math.sign(net) })
    }
  }
  return runs
}

const runsLength = (runs: readonly Run[]) =>
  runs.reduce((sum, { from, to }) => sum + to - from, 0)

/** How much of a border two pieces lie against each other along, from both sides. */
function overlap(a: readonly Run[], b: readonly Run[]) {
  let length = 0
  for (const p of a) {
    for (const q of b) {
      if (p.sign === q.sign) continue
      length += Math.max(0, Math.min(p.to, q.to) - Math.max(p.from, q.from))
    }
  }
  return length
}

/** Pieces of one building: the same attributes, and ids if both have one. */
const sameBuilding = (a: BuildingFeature, b: BuildingFeature) =>
  a.height === b.height &&
  a.minHeight === b.minHeight &&
  a.color === b.color &&
  (a.id === undefined || b.id === undefined || a.id === b.id)

/**
 * The pieces of each building in more than one. On every border, a piece
 * joins the piece on the other side that matches its stretches best — not
 * every one it touches: buildings drawn twice (equal outlines and parts)
 * stay apart.
 */
export function groupPieces(
  pieces: readonly BuildingPiece[]
): BuildingPiece[][] {
  const parent = pieces.map((_, i) => i)
  const find = (i: number) => {
    let root = i
    while (parent[root] !== root) root = parent[root]
    for (let next = i; parent[next] !== root;) {
      const up = parent[next]
      parent[next] = root
      next = up
    }
    return root
  }
  const byLine = new globalThis.Map<
    string,
    {
      i: number
      runs: readonly Run[]
      from: number
      to: number
      length: number
    }[]
  >()
  for (const [i, piece] of pieces.entries()) {
    for (const [line, runs] of piece.runs) {
      const item = {
        i,
        runs,
        from: runs[0].from,
        to: runs[runs.length - 1].to,
        length: runsLength(runs)
      }
      const list = byLine.get(line)
      if (list) list.push(item)
      else byLine.set(line, [item])
    }
  }
  for (const items of byLine.values()) {
    // by where they start: each is compared with those it reaches into
    items.sort((a, b) => a.from - b.from)
    const best = new globalThis.Map<number, { j: number; score: number }>()
    const offer = (i: number, j: number, score: number) => {
      const current = best.get(i)
      if (!current || score > current.score) best.set(i, { j, score })
    }
    for (let m = 0; m < items.length; m++) {
      const a = items[m]
      for (let n = m + 1; n < items.length && items[n].from < a.to; n++) {
        const b = items[n]
        const [p, q] = [pieces[a.i], pieces[b.i]]
        if (p.tile === q.tile || !sameBuilding(p.feature, q.feature)) continue
        const shared = overlap(a.runs, b.runs)
        if (shared <= 0 || shared < MIN_OVERLAP * Math.min(a.length, b.length))
          continue
        // the less either covers alone, the better
        const score = 2 * shared - a.length - b.length
        offer(a.i, b.i, score)
        offer(b.i, a.i, score)
      }
    }
    for (const [i, { j }] of best) parent[find(i)] = find(j)
  }
  const groups = new globalThis.Map<number, BuildingPiece[]>()
  for (const [i, piece] of pieces.entries()) {
    const root = find(i)
    const group = groups.get(root)
    if (group) group.push(piece)
    else groups.set(root, [piece])
  }
  return [...groups.values()].filter((group) => group.length > 1)
}

/**
 * Points along a line closer than `tolerance` as one: a corner of the
 * tiles if one is among them, else their middle.
 */
function mergePoints(
  values: readonly number[],
  corners: ReadonlySet<number>,
  tolerance: number
) {
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  const merged = new globalThis.Map<number, number>()
  for (let i = 0; i < sorted.length;) {
    let j = i + 1
    while (j < sorted.length && sorted[j] - sorted[j - 1] <= tolerance) j++
    const cluster = sorted.slice(i, j)
    const to =
      cluster.find((value) => corners.has(value)) ??
      (cluster[0] + cluster[cluster.length - 1]) / 2
    for (const value of cluster) merged.set(value, to)
    i = j
  }
  return merged
}

type Edge = readonly [ax: number, ay: number, bx: number, by: number]

/**
 * Edges joined end to start into rings; where several go on from a point,
 * the one turning most to the left, which keeps to one polygon.
 */
function linkRings(edges: readonly Edge[]): number[][] {
  const key = (x: number, y: number) => `${x} ${y}`
  const starting = new globalThis.Map<string, number[]>()
  for (const [i, [ax, ay]] of edges.entries()) {
    const list = starting.get(key(ax, ay))
    if (list) list.push(i)
    else starting.set(key(ax, ay), [i])
  }
  const used = new Uint8Array(edges.length)
  const rings: number[][] = []
  for (const [first, start] of edges.entries()) {
    if (used[first]) continue
    used[first] = 1
    const ring = [start[0], start[1]]
    for (let edge = start; ;) {
      const [ax, ay, x, y] = edge
      if (x === ring[0] && y === ring[1]) break
      const [dx, dy] = [x - ax, y - ay]
      let next = -1
      let best = -Infinity
      for (const i of starting.get(key(x, y)) ?? []) {
        if (used[i]) continue
        const [ex, ey] = [edges[i][2] - x, edges[i][3] - y]
        let turn = Math.atan2(dx * ey - dy * ex, dx * ex + dy * ey)
        // straight back last
        if (turn >= Math.PI) turn = -Math.PI
        if (turn > best) [next, best] = [i, turn]
      }
      // data that does not close: what there is
      if (next < 0) break
      used[next] = 1
      ring.push(x, y)
      edge = edges[next]
    }
    rings.push(ring)
  }
  return rings
}

/** A ring without the points where it goes straight on. */
function withoutStraightPoints(ring: readonly number[]) {
  const points = [...ring]
  for (let removed = true; removed;) {
    removed = false
    for (let i = 0; i < points.length / 2 && points.length >= 6;) {
      const n = points.length / 2
      const h = (i + n - 1) % n
      const j = (i + 1) % n
      const [ux, uy] = [
        points[2 * i] - points[2 * h],
        points[2 * i + 1] - points[2 * h + 1]
      ]
      const [vx, vy] = [
        points[2 * j] - points[2 * i],
        points[2 * j + 1] - points[2 * i + 1]
      ]
      if (ux * vy - uy * vx === 0 && ux * vx + uy * vy > 0) {
        points.splice(2 * i, 2)
        removed = true
      } else {
        i++
      }
    }
  }
  return points
}

function contains(ring: readonly number[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const [ax, ay, bx, by] = [ring[j], ring[j + 1], ring[i], ring[i + 1]]
    if (ay > y !== by > y && x < ax + ((bx - ax) * (y - ay)) / (by - ay)) {
      inside = !inside
    }
  }
  return inside
}

const toRing = (ring: readonly number[]): Position[] => {
  const positions: Position[] = []
  for (let i = 0; i < ring.length; i += 2) {
    positions.push([ring[i], ring[i + 1]])
  }
  positions.push([ring[0], ring[1]])
  return positions
}

/**
 * The building its pieces make — their union — with the attributes and
 * properties of `main`, and the id of the pieces having one; `undefined`
 * if nothing is left of them.
 */
export function joinedBuilding(
  pieces: readonly BuildingPiece[],
  main: BuildingPiece
): BuildingFeature | undefined {
  const lons = new Set<number>()
  const lats = new Set<number>()
  let [width, height] = [Infinity, Infinity]
  for (const { bounds } of pieces) {
    const [west, south, east, north] = bounds
    lons.add(west).add(east)
    lats.add(south).add(north)
    width = Math.min(width, east - west)
    height = Math.min(height, north - south)
  }

  // the points on each border, merged where the tiles disagree a little
  const along = new globalThis.Map<string, number[]>()
  const addAlong = (line: string, value: number) => {
    const list = along.get(line)
    if (list) list.push(value)
    else along.set(line, [value])
  }
  for (const { rings } of pieces) {
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i += 2) {
        if (lons.has(ring[i])) addAlong(lineKey('lon', ring[i]), ring[i + 1])
        if (lats.has(ring[i + 1]))
          addAlong(lineKey('lat', ring[i + 1]), ring[i])
      }
    }
  }
  const merged = new globalThis.Map<string, ReadonlyMap<number, number>>()
  for (const [line, values] of along) {
    const vertical = line.startsWith('lon')
    merged.set(
      line,
      mergePoints(
        values,
        vertical ? lats : lons,
        (vertical ? height : width) * MERGE
      )
    )
  }
  const rings = pieces.flatMap(({ rings }) =>
    rings.map((ring) => {
      const out: number[] = []
      for (let i = 0; i < ring.length; i += 2) {
        const [lon, lat] = [ring[i], ring[i + 1]]
        out.push(
          merged.get(lineKey('lat', lat))?.get(lon) ?? lon,
          merged.get(lineKey('lon', lon))?.get(lat) ?? lat
        )
      }
      return out
    })
  )

  // every edge but those along the borders, which add up to what is left of them
  const edges: Edge[] = []
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const [ax, ay, bx, by] = [ring[j], ring[j + 1], ring[i], ring[i + 1]]
      if (ax === bx && ay === by) continue
      if (!onBorder(ax, ay, bx, by, lons, lats)) edges.push([ax, ay, bx, by])
    }
  }
  for (const { vertical, value, stretches } of borderStretches(
    rings,
    lons,
    lats
  ).values()) {
    for (const { from, to, sign } of netRuns(stretches)) {
      const [a, b] = sign > 0 ? [from, to] : [to, from]
      edges.push(vertical ? [value, a, value, b] : [a, value, b, value])
    }
  }

  const outers: number[][] = []
  const holes: number[][] = []
  for (const ring of linkRings(edges).map(withoutStraightPoints)) {
    if (ring.length < 6) continue
    const area = ringArea(ring)
    if (area > 0) outers.push(ring)
    else if (area < 0) holes.push(ring)
  }
  if (outers.length === 0) return undefined
  outers.sort((a, b) => ringArea(b) - ringArea(a))
  const polygons = outers.map((outer) => [outer])
  for (const hole of holes) {
    const polygon =
      polygons.find(([outer]) => contains(outer, hole[0], hole[1])) ??
      polygons[0]
    polygon.push(hole)
  }

  const { feature } = main
  return {
    id: pieces.find((piece) => piece.feature.id !== undefined)?.feature.id,
    geometry:
      polygons.length === 1
        ? { type: 'Polygon', coordinates: polygons[0].map(toRing) }
        : {
            type: 'MultiPolygon',
            coordinates: polygons.map((polygon) => polygon.map(toRing))
          },
    height: feature.height,
    minHeight: feature.minHeight,
    color: feature.color,
    properties: feature.properties
  }
}
