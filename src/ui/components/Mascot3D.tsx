import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Procedural Glyno, no external models: works offline.
// The face is the one drawn on paper: big eyes with two highlights and a wide smile.
// The body is rounded on purpose — a heart in a health app reads as blood pressure, and
// the app already uses one for that — and what grows on its head is a sprout, not a crown:
// a crown is the universal badge for "premium", which is the opposite of what Glyno is.

function bodyShape(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 1.135)
  s.bezierCurveTo(0.62, 1.135, 1.02, 0.72, 1.02, 0.18)
  s.bezierCurveTo(1.02, -0.62, 0.58, -1.135, 0, -1.135)
  s.bezierCurveTo(-0.58, -1.135, -1.02, -0.62, -1.02, 0.18)
  s.bezierCurveTo(-1.02, 0.72, -0.62, 1.135, 0, 1.135)
  return s
}

function heartShape(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 0.5)
  s.bezierCurveTo(0, 0.86, -0.42, 1.12, -0.78, 0.82)
  s.bezierCurveTo(-1.22, 0.44, -0.98, -0.18, 0, -1)
  s.bezierCurveTo(0.98, -0.18, 1.22, 0.44, 0.78, 0.82)
  s.bezierCurveTo(0.42, 1.12, 0, 0.86, 0, 0.5)
  return s
}

/** a leaf pointing up and outwards; mirrored for the other side */
function leafShape(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.16, 0.26, 0.46, 0.44, 0.68, 0.36)
  s.bezierCurveTo(0.6, 0.08, 0.3, -0.1, 0, 0)
  return s
}

/** every extruded shape here is 2.27 tall once centered: half of that is 1.135 */
const HALF = 1.135

function extrude(shape: THREE.Shape, scale: number, depth: number, material: THREE.Material): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.14,
    bevelSegments: 5,
    curveSegments: 32,
  })
  geo.center()
  const mesh = new THREE.Mesh(geo, material)
  mesh.scale.setScalar(scale)
  return mesh
}

const bodyMesh = (scale: number, depth: number, m: THREE.Material) => extrude(bodyShape(), scale, depth, m)
const heartMesh = (scale: number, depth: number, m: THREE.Material) => extrude(heartShape(), scale, depth, m)

export function Mascot3D({ size = 96 }: { size?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(size, size)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 14)
    camera.position.set(0, 0.05, 5.75)
    camera.lookAt(0, 0.05, 0)

    scene.add(new THREE.AmbientLight('#fff7ea', 1.1))
    const key = new THREE.DirectionalLight('#fff4e2', 1.8)
    key.position.set(2, 3, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight('#d8c6e2', 0.75)
    rim.position.set(-3, 1, -2)
    scene.add(rim)

    const outline = new THREE.MeshStandardMaterial({ color: '#2F3757', roughness: 0.5 })
    const lilac = new THREE.MeshStandardMaterial({ color: '#B792C0', roughness: 0.55 })
    const lilacDeep = new THREE.MeshStandardMaterial({ color: '#9B76A8', roughness: 0.55 })
    const rose = new THREE.MeshStandardMaterial({ color: '#DE7A90', roughness: 0.5 })
    const ink = new THREE.MeshStandardMaterial({ color: '#232743', roughness: 0.35 })
    const white = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.25 })
    const leaf = new THREE.MeshStandardMaterial({ color: '#3D8A5C', roughness: 0.5 })
    const stem = new THREE.MeshStandardMaterial({ color: '#2F7A50', roughness: 0.5 })

    const glyno = new THREE.Group()
    glyno.scale.setScalar(0.82)
    scene.add(glyno)

    // body: three concentric layers, in the SAME proportions as the flat icon — ink rim ~12 %
    // of the width, a thin lilac band and a wide rose core. With a thinner rim it stopped
    // looking like the icon and started looking like a plain circle.
    const body = new THREE.Group()
    body.add(bodyMesh(1.2, 0.5, outline))
    const mid = bodyMesh(0.912, 0.62, lilac)
    mid.position.z = 0.1
    body.add(mid)
    const front = bodyMesh(0.78, 0.68, rose)
    front.position.z = 0.2
    body.add(front)
    glyno.add(body)

    // the sprout grows from the top of the head, tilted forward so it reads from the front
    const sprout = new THREE.Group()
    sprout.position.set(0, HALF * 1.2 - 0.08, 0.22)
    sprout.rotation.x = -0.18
    sprout.scale.setScalar(1.5)
    const stalk = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.46, 6, 12), stem)
    stalk.position.y = 0.28
    sprout.add(stalk)
    for (const side of [1, -1]) {
      const l = extrude(leafShape(), side === 1 ? 0.62 : 0.5, 0.09, leaf)
      l.position.set(side * 0.26, side === 1 ? 0.56 : 0.42, 0)
      l.rotation.set(0, 0, side === 1 ? 0.2 : Math.PI - 0.2)
      sprout.add(l)
    }
    glyno.add(sprout)

    // big eyes with two highlights, as originally drawn
    const eyes: THREE.Group[] = []
    for (const x of [-0.34, 0.34]) {
      const eye = new THREE.Group()
      eye.position.set(x, 0.1, 0.62)
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.165, 24, 24), ink)
      ball.scale.set(0.85, 1, 0.6)
      const big = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), white)
      big.position.set(0.05, 0.06, 0.09)
      const small = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), white)
      small.position.set(-0.055, -0.05, 0.09)
      eye.add(ball, big, small)
      eyes.push(eye)
      glyno.add(eye)
    }

    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.026, 8, 24, Math.PI * 0.85), ink)
    smile.position.set(0, -0.28, 0.66)
    smile.rotation.set(-0.1, 0, Math.PI * 1.08)
    glyno.add(smile)

    // little arms with a hand each, poking out at the sides. The balloons of the original
    // drawing are gone: they never survived a small size, and with them the character in the
    // app looked nothing like the one in the icon.
    for (const side of [-1, 1]) {
      const arm = new THREE.Group()
      // the hand has to land OUTSIDE the body (half-width ≈ 1.22) or it is simply not there
      arm.position.set(side * 1.08, -0.42, 0.18)
      arm.rotation.z = side * -1.32
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.4, 6, 12), lilacDeep)
      upper.position.y = 0.3
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), lilacDeep)
      hand.position.y = 0.62
      arm.add(upper, hand)
      glyno.add(arm)
    }

    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      const t = (performance.now() - t0) / 1000

      // heartbeat: lub-dub, not just any breathing motion
      const p = (t % 1.7) / 1.7
      const lub = Math.exp(-Math.pow((p - 0.06) / 0.05, 2))
      const dub = Math.exp(-Math.pow((p - 0.23) / 0.07, 2)) * 0.55
      body.scale.setScalar(1 + (lub + dub) * 0.055)

      glyno.position.y = Math.sin(t * 1.5) * 0.04
      glyno.rotation.y = Math.sin(t * 0.45) * 0.12
      glyno.rotation.z = Math.sin(t * 0.7) * 0.022

      const blink = t % 4.2 > 4.02 ? 0.12 : 1
      eyes.forEach(e => (e.scale.y = blink))

      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      scene.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          ;(o.material as THREE.Material).dispose()
        }
      })
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [size])

  return <div ref={ref} style={{ width: size, height: size, flex: 'none' }} aria-label="Glyno" role="img" />
}
