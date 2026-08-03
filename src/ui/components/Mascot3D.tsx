import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Glyno procedural, sin modelos externos: funciona offline.
// Diseño original en papel: corazón por capas con corona, bracitos que sujetan dos
// globos-corazón con cuerdas, y una cuerda colgando por abajo.

function heartShape(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0, 0.5)
  s.bezierCurveTo(0, 0.86, -0.42, 1.12, -0.78, 0.82)
  s.bezierCurveTo(-1.22, 0.44, -0.98, -0.18, 0, -1)
  s.bezierCurveTo(0.98, -0.18, 1.22, 0.44, 0.78, 0.82)
  s.bezierCurveTo(0.42, 1.12, 0, 0.86, 0, 0.5)
  return s
}

/** el corazón centrado mide ~2.27 de alto; su punta queda a -1.135 * escala del centro */
const HEART_HALF = 1.135

function heartMesh(scale: number, depth: number, material: THREE.Material): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(heartShape(), {
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
    const gold = new THREE.MeshStandardMaterial({ color: '#D99A3C', roughness: 0.4, metalness: 0.3 })
    const goldLight = new THREE.MeshStandardMaterial({ color: '#F5D77E', roughness: 0.35, metalness: 0.3 })

    const glyno = new THREE.Group()
    glyno.scale.setScalar(0.82)
    scene.add(glyno)

    // cuerpo: tres capas concéntricas, como en el dibujo
    const body = new THREE.Group()
    body.add(heartMesh(1.2, 0.5, outline))
    const mid = heartMesh(1.08, 0.56, lilac)
    mid.position.z = 0.12
    body.add(mid)
    const front = heartMesh(0.9, 0.6, rose)
    front.position.z = 0.24
    body.add(front)
    glyno.add(body)

    // corona APOYADA sobre los lóbulos (llegan a y≈1.31): por encima no hay nada que la tape,
    // que era el motivo de que antes quedase escondida entre ellos
    const crown = new THREE.Group()
    crown.position.set(0, HEART_HALF * 1.2 - 0.06, 0.28)
    crown.rotation.x = -0.16
    crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.19, 26, 1, true), gold))
    crown.add(new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.032, 8, 26), gold))
    for (let i = 0; i < 5; i++) {
      const a = (-0.5 + i / 4) * Math.PI * 0.78
      const x = Math.sin(a) * 0.42
      const z = Math.cos(a) * 0.42
      const tall = i === 2 ? 0.42 : 0.3
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, tall, 8), gold)
      spike.position.set(x, 0.1 + tall / 2, z)
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), goldLight)
      ball.position.set(x, 0.12 + tall, z)
      crown.add(spike, ball)
    }
    glyno.add(crown)

    // ojos grandes con dos brillos, como los dibujó
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

    // bracitos con su mano, y de cada mano sale la cuerda de un globo.
    // El hombro va bajo y el brazo muy abierto para que la mano caiga FUERA de la
    // silueta del corazón (media anchura máx. ≈ 1.36): dentro no se vería.
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

      // posición de la mano calculada a mano: localToWorld necesitaría matrices ya
      // actualizadas y aquí todavía no lo están (por eso antes las cuerdas no encajaban)
      const handAt = new THREE.Vector3(
        arm.position.x - Math.sin(angle) * HAND_LEN,
        arm.position.y + Math.cos(angle) * HAND_LEN,
        arm.position.z,
      )

      // el grupo del globo se ancla EN la mano: así la cuerda nunca se despega al balancearse
      const balloon = new THREE.Group()
      balloon.position.copy(handAt)

      // la cuerda sube casi vertical: si el globo se aleja hacia fuera, al oscilar
      // se sale del lienzo cuadrado (el ancho visible es lo que limita, no el alto)
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
      // el corazón se cuelga por su punta, que es donde se ata la cuerda
      const heart = heartMesh(0.3, 0.16, rose)
      heart.position.set(end.x, end.y + HEART_HALF * 0.3, end.z)
      balloon.add(knot, heart)

      balloons.push(balloon)
      glyno.add(balloon)
    }

    // cuerda colgando por abajo
    const tailCurve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0.03, -HEART_HALF * 1.2 + 0.05, 0),
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

      // latido de corazón: lub-dub, no una respiración cualquiera
      const p = (t % 1.7) / 1.7
      const lub = Math.exp(-Math.pow((p - 0.06) / 0.05, 2))
      const dub = Math.exp(-Math.pow((p - 0.23) / 0.07, 2)) * 0.55
      body.scale.setScalar(1 + (lub + dub) * 0.055)

      glyno.position.y = Math.sin(t * 1.5) * 0.04
      glyno.rotation.y = Math.sin(t * 0.45) * 0.12
      glyno.rotation.z = Math.sin(t * 0.7) * 0.022

      // los globos se balancean desde la mano, con desfase entre ellos
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
