// <demo-player data-name="alps">: runs src/demos/alps.ts in its frame when
// its button is pressed. One demo runs at a time — a page keeps a few WebGL
// contexts only, and the tile servers are spared — drawn only while it is on
// the screen.

import { createStage, type Demo } from '../demos/stage'

const demos = import.meta.glob<{ default: Demo }>([
  '../demos/*.ts',
  '!../demos/stage.ts'
])

let running: DemoPlayer | undefined

class DemoPlayer extends HTMLElement {
  private stop: (() => void) | undefined

  connectedCallback() {
    this.querySelector('.demo-run')?.addEventListener('click', () => {
      void this.start()
    })
  }

  disconnectedCallback() {
    this.end()
  }

  private async start() {
    const load = demos[`../demos/${this.dataset.name ?? ''}.ts`]
    const frame = this.querySelector<HTMLElement>('.demo-frame')
    if (!load || !frame) return
    running?.end()
    running = this
    this.dataset.state = 'loading'
    const { default: demo } = await load()
    if (running !== this) return // another one started meanwhile

    const stage = createStage(frame)
    const maps = [demo(stage.stage)].flat()
    stage.credit(maps)
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) stage.play()
      else stage.pause()
    })
    observer.observe(this)
    this.dataset.state = 'running'

    this.stop = () => {
      observer.disconnect()
      for (const map of maps) {
        for (const layer of [...map.layers]) map.removeLayer(layer)
        map.clean() // aborts the requests still pending
      }
      stage.dispose()
      delete this.dataset.state
    }
  }

  private end() {
    this.stop?.()
    this.stop = undefined
    if (running === this) running = undefined
  }
}

customElements.define('demo-player', DemoPlayer)
