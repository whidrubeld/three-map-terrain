// The stage of a demo — what every page's code leaves out: a renderer in the
// demo's frame (transparent: the frame's dot matrix shows behind), a camera
// with map controls, a sun, a click turned into a ray, a line of text,
// buttons and the credits.

import {
  AmbientLight,
  DirectionalLight,
  MathUtils,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer
} from 'three'
import { MapControls } from 'three/addons/controls/MapControls.js'
import type { Map } from 'three-map-terrain'

export interface Stage {
  scene: Scene
  /** Z up, as the terrain. */
  camera: PerspectiveCamera
  controls: MapControls
  renderer: WebGLRenderer
  /** Calls `listener` with the ray under the pointer on a click (not a drag). */
  onClick: (listener: (raycaster: Raycaster) => void) => void
  /** Shows a line of text over the scene; none without `text`. */
  status: (text?: string) => void
  /** Buttons over the scene, one pressed: `select` is called with it now and on every press. */
  choose: <T extends string>(
    options: readonly T[],
    select: (option: T) => void
  ) => void
}

/**
 * A demo: puts its maps on the stage and returns them — the page shows
 * their credits and cleans them up.
 */
export type Demo = (stage: Stage) => Map | Map[]

/** The camera's field of view in a frame of `ASPECT`, and its width in narrower ones. */
const FOV = 50
const ASPECT = 16 / 10

/** A stage in `frame`, rendering until `dispose()`; `pause()` stops drawing. */
export function createStage(frame: HTMLElement) {
  const scene = new Scene()
  scene.add(new AmbientLight(0xffffff, 1.3))
  const sun = new DirectionalLight(0xffffff, 2.6)
  sun.position.set(-1e4, -4e3, 7e3)
  scene.add(sun)

  const camera = new PerspectiveCamera(FOV, ASPECT, 1, 1e6)
  camera.up.set(0, 0, 1)
  camera.position.set(0, -1100, 900)

  const renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  frame.append(renderer.domElement)

  const controls = new MapControls(camera, renderer.domElement)
  controls.maxPolarAngle = Math.PI * 0.42
  controls.enableDamping = true

  const overlay = document.createElement('div')
  overlay.className = 'demo-overlay'
  const line = document.createElement('p')
  line.className = 'demo-status'
  const buttons = document.createElement('div')
  buttons.className = 'demo-choices'
  const credits = document.createElement('p')
  credits.className = 'demo-credits'
  overlay.append(buttons, line, credits)
  frame.append(overlay)

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = frame
    camera.aspect = width / height
    // a narrower frame (a phone's) sees as wide as a 16:10 one, and higher
    const half = Math.tan(MathUtils.degToRad(FOV / 2))
    camera.fov =
      camera.aspect >= ASPECT
        ? FOV
        : 2 * MathUtils.radToDeg(Math.atan((half * ASPECT) / camera.aspect))
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(frame)

  let maps: readonly Map[] = []
  const showCredits = () => {
    credits.textContent = [
      ...new Set(maps.flatMap((map) => map.attributions))
    ].join(' · ')
  }

  const raycaster = new Raycaster()
  const pressed = new Vector2()
  const canvas = renderer.domElement
  canvas.addEventListener('pointerdown', (event) => {
    pressed.set(event.clientX, event.clientY)
  })

  const stage: Stage = {
    scene,
    camera,
    controls,
    renderer,
    onClick: (listener) => {
      canvas.addEventListener('click', (event) => {
        if (pressed.distanceTo(new Vector2(event.clientX, event.clientY)) > 4) {
          return // a drag of the map is not a click
        }
        const rect = canvas.getBoundingClientRect()
        const pointer = new Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        )
        raycaster.setFromCamera(pointer, camera)
        listener(raycaster)
      })
    },
    status: (text) => {
      line.textContent = text ?? ''
      line.hidden = !text
    },
    choose: (options, select) => {
      buttons.replaceChildren()
      const press = (option: (typeof options)[number]) => {
        for (const button of buttons.children) {
          button.setAttribute(
            'aria-pressed',
            String(button.textContent === option)
          )
        }
        select(option)
        showCredits() // another source, maybe
      }
      for (const option of options) {
        const button = document.createElement('button')
        button.type = 'button'
        button.textContent = option
        button.addEventListener('click', () => {
          press(option)
        })
        buttons.append(button)
      }
      if (options[0] !== undefined) press(options[0])
    }
  }
  stage.status()

  const draw = () => {
    controls.update()
    renderer.render(scene, camera)
  }

  return {
    stage,
    /** Shows the credits of the maps' sources and layers. */
    credit(shown: readonly Map[]) {
      maps = shown
      showCredits()
    },
    play() {
      renderer.setAnimationLoop(draw)
    },
    pause() {
      renderer.setAnimationLoop(null)
    },
    dispose() {
      renderer.setAnimationLoop(null)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      // browsers keep a few WebGL contexts per page: give this one back now
      renderer.forceContextLoss()
      canvas.remove()
      overlay.remove()
    }
  }
}
