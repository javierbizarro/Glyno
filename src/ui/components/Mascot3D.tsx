import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Glyno procedural: sin modelos externos, funciona offline
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
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 12)
    camera.position.set(0, 0.4, 4.05)
    camera.lookAt(0, 0.1, 0)

    scene.add(new THREE.AmbientLight('#fff7ea', 1.05))
    const key = new THREE.DirectionalLight('#fff2dd', 1.9)
    key.position.set(2, 3, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight('#cfe0d0', 0.8)
    rim.position.set(-3, 1, -2)
    scene.add(rim)

    const green = new THREE.MeshStandardMaterial({ color: '#3D6B4F', roughness: 0.55 })
    const greenDark = new THREE.MeshStandardMaterial({ color: '#2F5540', roughness: 0.6 })
    const greenLight = new THREE.MeshStandardMaterial({ color: '#A9C3A0', roughness: 0.7 })
    const ink = new THREE.MeshStandardMaterial({ color: '#23271F', roughness: 0.35 })
    const cream = new THREE.MeshStandardMaterial({ color: '#F7F2E9', roughness: 0.3 })
    const blush = new THREE.MeshStandardMaterial({ color: '#C97B5A', roughness: 1, transparent: true, opacity: 0.55 })

    const glyno = new THREE.Group()
    glyno.scale.setScalar(0.92)
    scene.add(glyno)

    // cuerpo de pera (superficie de revolución)
    const profile = [
      [0, -1.0], [0.5, -0.97], [0.82, -0.72], [0.98, -0.25],
      [0.92, 0.2], [0.72, 0.62], [0.45, 0.88], [0, 1.0],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), green)
    glyno.add(body)

    // barriguita clara
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 32), greenLight)
    belly.scale.set(0.72, 0.85, 0.3)
    belly.position.set(0, -0.38, 0.8)
    glyno.add(belly)

    // ojos con brillo (en grupos para el parpadeo)
    const mkEye = (x: number) => {
      const g = new THREE.Group()
      g.position.set(x, 0.34, 0.84)
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 24), ink)
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), cream)
      shine.position.set(0.035, 0.035, 0.07)
      g.add(ball, shine)
      return g
    }
    const eyeL = mkEye(-0.28)
    const eyeR = mkEye(0.28)
    glyno.add(eyeL, eyeR)

    // sonrisa y mofletes
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.028, 10, 32, Math.PI * 0.8), ink)
    smile.position.set(0, 0.14, 0.94)
    smile.rotation.set(-0.18, 0, Math.PI * 1.1)
    glyno.add(smile)
    const mkCheek = (x: number) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), blush)
      c.scale.set(1, 0.75, 0.4)
      c.position.set(x, 0.16, 0.8)
      c.lookAt(0, 0.16, 3)
      return c
    }
    glyno.add(mkCheek(-0.46), mkCheek(0.46))

    // brazos (el derecho saluda)
    const armGeo = new THREE.CapsuleGeometry(0.09, 0.3, 6, 16)
    const mkArm = (x: number) => {
      const shoulder = new THREE.Group()
      shoulder.position.set(x * 1.12, -0.08, 0.08)
      const arm = new THREE.Mesh(armGeo, green)
      arm.position.set(0, -0.2, 0)
      shoulder.add(arm)
      return shoulder
    }
    const armL = mkArm(-0.88)
    const armR = mkArm(0.88)
    armL.rotation.z = 0.55
    armR.rotation.z = -0.55
    glyno.add(armL, armR)

    // pies
    const footGeo = new THREE.SphereGeometry(0.17, 24, 24)
    const mkFoot = (x: number) => {
      const f = new THREE.Mesh(footGeo, greenDark)
      f.scale.set(1, 0.5, 1.35)
      f.position.set(x, -1.02, 0.18)
      return f
    }
    glyno.add(mkFoot(-0.34), mkFoot(0.34))

    // brote: tallo con dos hojas
    const stemCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.96, 0),
      new THREE.Vector3(0.06, 1.28, 0),
      new THREE.Vector3(0.16, 1.42, 0),
    )
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 16, 0.03, 8), greenDark)
    const leafGeo = new THREE.SphereGeometry(1, 24, 24)
    const mkLeaf = (side: number) => {
      const l = new THREE.Mesh(leafGeo, green)
      l.scale.set(0.24, 0.055, 0.1)
      l.position.set(0.16 + side * 0.2, 1.44 + Math.abs(side) * 0.02, 0)
      l.rotation.z = side * 0.55
      return l
    }
    glyno.add(stem, mkLeaf(-1), mkLeaf(1))

    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      glyno.position.y = Math.sin(t * 1.6) * 0.045 - 0.02
      const breath = 1 + Math.sin(t * 2.2) * 0.01
      body.scale.set(breath, 2 - breath, 1)
      glyno.rotation.y = Math.sin(t * 0.45) * 0.14
      glyno.rotation.z = Math.sin(t * 0.7) * 0.02

      const blink = t % 3.8 > 3.62 ? 0.1 : 1
      eyeL.scale.y = blink
      eyeR.scale.y = blink

      // saludo del brazo derecho: arriba y hacia fuera, cada ~5 s
      const phase = t % 5
      let wave = 0
      if (phase > 0.8 && phase < 2.8) wave = Math.sin(((phase - 0.8) / 2) * Math.PI)
      armR.rotation.z = -0.55 + wave * (2.9 + Math.sin(t * 12) * 0.45)
      armR.rotation.x = wave * -0.35
      armL.rotation.z = 0.55 + Math.sin(t * 2.2) * 0.05

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
