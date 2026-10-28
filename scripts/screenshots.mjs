#!/usr/bin/env node
// Renders the images in docs/public/images with real tiles — the README's
// from the built examples, the posters of the docs' demos from the built
// docs: `pnpm build`, build both examples and docs/, then
// `node scripts/screenshots.mjs [name ...]` (every image, or those named).
// Uses the installed Google Chrome (it renders on the GPU even headless) and
// `cwebp` (libwebp) on PATH.

import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'

import { chromium } from '@playwright/test'

const ROOT = new URL('..', import.meta.url).pathname
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
}

/** A static server for a built folder, served under `base`. */
function serve(folder, base = '/') {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost').pathname
    const path = url.startsWith(base) ? `/${url.slice(base.length)}` : url
    const file = join(
      folder,
      normalize(path.endsWith('/') ? `${path}index.html` : path)
    )
    try {
      const body = await readFile(file)
      response.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream'
      })
      response.end(body)
    } catch {
      response.writeHead(404).end()
    }
  })
  return new Promise((resolve) =>
    server.listen(0, () => resolve({ server, port: server.address().port }))
  )
}

/**
 * Waits, from now, for the network to be quiet a while — or, with a slow
 * tile server retrying, at most 90 s.
 */
function settling(page, quiet = 2500, timeout = 90000) {
  let pending = 0
  let last = Date.now()
  const start = () => {
    pending++
  }
  const end = () => {
    pending--
    last = Date.now()
  }
  page.on('request', start)
  page.on('requestfinished', end)
  page.on('requestfailed', end)
  return async () => {
    const until = Date.now() + timeout
    while (Date.now() < until && (pending > 0 || Date.now() - last < quiet)) {
      await page.waitForTimeout(250)
    }
    page.off('request', start)
    page.off('requestfinished', end)
    page.off('requestfailed', end)
  }
}

/** Turns the camera to show the terrain's south-west corner, its section. */
const turn = async (page) => {
  await page.mouse.move(640, 600)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(760, 560, { steps: 10 })
  await page.mouse.up({ button: 'right' })
  await page.mouse.move(640, 450)
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(120)
  }
}

/** Lowers the camera over the city and comes close: facades and markings. */
const closeUp = async (page) => {
  await page.mouse.move(700, 500)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(700, 380, { steps: 12 })
  await page.mouse.up({ button: 'right' })
  await page.mouse.move(760, 560)
  for (let i = 0; i < 11; i++) {
    await page.mouse.wheel(0, -350)
    await page.waitForTimeout(120)
  }
}

const SCENES = [
  // the README's hero: the live example's Alps
  { name: 'hero', example: 'react', query: '?place=alps', click: [770, 520] },
  // its Lausanne, one map in four looks; the textured one up close
  ...['plain', 'aerial', 'wireframe'].map((look) => ({
    name: `lausanne-${look}`,
    example: 'react',
    query: `?place=lausanne&look=${look}`,
    prepare: turn
  })),
  {
    name: 'lausanne-textured',
    example: 'react',
    query: '?place=lausanne&look=textured',
    prepare: closeUp
  },
  // San Francisco, Overture buildings; a click stops the rotation
  { name: 'basic', example: 'basic', click: [860, 320] },
  // the docs' demos run on their pages: the posters shown until they run,
  // transparent (the page's dot matrix shows through)
  ...Object.entries({
    alps: 'getting-started',
    lausanne: 'layers',
    looks: 'materials',
    summits: 'own-layers'
  }).map(([demo, page]) => ({ name: `demo-${demo}`, demo, page }))
]

const only = process.argv.slice(2)

const work = await mkdtemp(join(tmpdir(), 'three-map-terrain-screenshots-'))
const browser = await chromium.launch({ channel: 'chrome' })

for (const scene of SCENES) {
  if (only.length > 0 && !only.includes(scene.name)) continue
  const png = join(work, `${scene.name}.png`)
  const webp = join(ROOT, 'docs', 'public', 'images', `${scene.name}.webp`)

  if (scene.demo) {
    const base = '/three-map-terrain/'
    const { server, port } = await serve(join(ROOT, 'docs', 'dist'), base)
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
      colorScheme: 'dark'
    })
    await page.goto(`http://localhost:${port}${base}${scene.page}/`)
    const player = page.locator(`demo-player[data-name="${scene.demo}"]`)
    await player.scrollIntoViewIfNeeded()
    const settled = settling(page)
    await player.locator('.demo-run').click()
    await settled()
    await page.waitForTimeout(1500)
    // the scene alone: no overlay, no page behind it
    await page.addStyleTag({
      content:
        '* { background: transparent !important } .demo-overlay, .ticks::after { display: none !important } .demo-frame { border-color: transparent !important }'
    })
    await player.locator('.demo-frame').screenshot({
      path: png,
      omitBackground: true
    })
    execFileSync('cwebp', ['-quiet', '-q', '82', '-m', '6', png, '-o', webp])
    console.log(webp)
    await page.close()
    server.close()
    continue
  }

  const { server, port } = await serve(
    join(ROOT, 'examples', scene.example, 'dist')
  )
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  })
  await page.goto(`http://localhost:${port}/${scene.query ?? ''}`)
  // tiles and their textures: wait until the network is quiet — or, with a
  // slow tile server retrying, a while
  await page
    .waitForLoadState('networkidle', { timeout: 90000 })
    .catch(() => console.warn(`${scene.name}: the network never went quiet`))
  await page.waitForTimeout(2000)
  if (scene.prepare) await scene.prepare(page)
  if (scene.click) await page.mouse.click(...scene.click)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: png })
  execFileSync('cwebp', ['-quiet', '-q', '82', '-m', '6', png, '-o', webp])
  console.log(webp)
  await page.close()
  server.close()
}

await browser.close()
await rm(work, { recursive: true })
