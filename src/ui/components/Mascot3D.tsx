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

    // body: three concentric layers, as in the drawing
    const body = new THREE.Group()
    body.add(bodyMesh(1.2, 0.5, outline))
    const mid = bodyMesh(1.08, 0.56, lilac)
    mid.position.z = 0.12
    body.add(mid)
    const front = bodyMesh(0.9, 0.6, rose)
    front.position.z = 0.24
    body.add(front)
    glyno.add(body)

    // the sprout grows from the top of the head, tilted forward so it reads from the front
    const sprout = new THREE.Group()
    sprout.position.set(0, HALF * 1.2 - 0.08, 0.22)
    sprout.rotation.x = -0.18
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
    for (const x of [-0.3, 0.3]) {
      const eye = new THREE.Group()
      eye.position.set(x, 0.06, 0.62)
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 24), ink)
      ball.scale.set(0.85, 1, 0.6)
      const big = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), white)
      big.position.set(0.04, 0.05, 0.08)
      const small = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), white)
      small.position.set(-0.045, -0.045, 0.08)
      eye.add(ball, big, small)
      eyes.push(eye)
      glyno.add(eye)
    }

    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 24, Math.PI * 0.85), ink)
    smile.position.set(0, -0.26, 0.66)
    smile.rotation.set(-0.1, 0, Math.PI * 1.08)
    glyno.add(smile)

    // little arms with a hand each, and a balloon string comes out of each hand.
    // The shoulder sits low and the arm opens wide so the hand lands OUTSIDE the
    // body's silhouette (max half-width ≈ 1.22): inside it wouldn't be visible.
    const HAND_LEN = 0.62
    const balloons: THREE.Group[] = []
    for (const side of [-1, 1]) {
      const angle = side * -1.05
      const arm = new THREE.Group()
      arm.position.set(side * 0.95, -0.45, 0.2)
      arm.rotation.z = angle
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.42, 6, 12), lilacDeep)
      upper.position.y = 0.3
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), lilacDeep)
      hand.position.y = HAND_LEN
      arm.add(upper, hand)
      glyno.add(arm)

      // hand position computed by hand: localToWorld would need matrices already
      // updated and at this point they aren't yet (which is why the strings didn't line up before)
      const handAt = new THREE.Vector3(
        arm.position.x - Math.sin(angle) * HAND_LEN,
        arm.position.y + Math.cos(angle) * HAND_LEN,
        arm.position.z,
      )

      // the balloon group is anchored AT the hand: that way the string never detaches while swinging
      const balloon = new THREE.Group()
      balloon.position.copy(handAt)

      // the string rises almost vertically: if the balloon drifts outward, it leaves
      // the square canvas while swinging (visible width is the limit, not height)
      const string = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(side * 0.16, 0.5, 0.05),
        new THREE.Vector3(side * -0.04, 1.02, -0.05),
        new THREE.Vector3(side * 0.1, 1.5, 0),
      )
      balloon.add(new THREE.Mesh(new THREE.TubeGeometry(string, 26, 0.017, 6), outline))

      const end = string.getPoint(1)
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), outline)
      knot.position.copy(end)
      // the heart hangs by its tip, which is where the string is tied
      const heart = heartMesh(0.3, 0.16, rose)
      heart.position.set(end.x, end.y + HALF * 0.3, end.z)
      balloon.add(knot, heart)

      balloons.push(balloon)
      glyno.add(balloon)
    }

    // string hanging from below
    const tailCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0.03, -HALF * 1.2 + 0.05, 0),
      new THREE.Vector3(0.3, -1.62, 0),
      new THREE.Vector3(-0.22, -1.78, 0),
      new THREE.Vector3(0.14, -2.02, 0),
    )
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 26, 0.018, 6), outline)
    glyno.add(tail)

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

      // the balloons swing from the hand, out of phase with each other
      balloons.forEach((b, i) => {
        b.rotation.z = Math.sin(t * 1.25 + i * 2.1) * 0.11
      })
      tail.rotation.z = Math.sin(t * 1.3) * 0.1

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
