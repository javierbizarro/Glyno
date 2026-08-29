import { useEffect, useRef, useState } from 'react'
import type { Tab } from '../../App'
import { Mascot } from './Mascot'

interface Step {
  tab: Tab
  /** CSS selector of the element to spotlight; omitted → centered welcome bubble */
  target?: string
  title: string
  text: string
}

const STEPS: Step[] = [
  {
    tab: 'today',
    title: '¡Hola! Soy Glyno',
    text: 'Vivo aquí para echarte una mano con tus números. Te enseño la casa en un minuto — o sáltatelo, sin dramas.',
  },
  {
    tab: 'today',
    target: '[data-tour="quick"]',
    title: 'Apunta tu día',
    text: 'Glucemia, tensión, comida, ejercicio, contexto… Un toque, un dato. Cuanto más me cuentes, mejor te leo.',
  },
  {
    tab: 'trends',
    target: '[data-tour="trends"]',
    title: 'Tus tendencias',
    text: 'Con unas pocas mediciones ya dibujo tu curva, tu tiempo en rango y los patrones que asoman. De aquí salen el historial y el informe para tu endocrino.',
  },
  {
    tab: 'meals',
    target: '[data-tour="meals"]',
    title: 'La comida',
    text: 'Hazle una foto al plato y te digo hidratos y semáforo. O pídeme ideas de qué comer según la hora y lo que sueles tener en casa.',
  },
  {
    tab: 'glyno',
    target: '[data-tour="coach"]',
    title: 'Pregúntame',
    text: 'Chateamos sobre tus datos y cada dos semanas te doy una valoración. Para hablar necesito activar la IA: es gratis, se hace una vez y en Ajustes te llevo paso a paso.',
  },
  {
    tab: 'settings',
    target: '[data-tour="guide"]',
    title: 'Y esto es todo',
    text: 'En Ajustes viven tu clave, tus copias de seguridad y esta guía, por si algún día quieres repasarla. ¡A por ello!',
  },
]

const PAD = 6

export function Tour({ go, onClose }: { go: (t: Tab) => void; onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const el = useRef<Element | null>(null)
  const step = STEPS[i]

  // switch to the step's tab, then wait for its target to exist before spotlighting:
  // screens render async (Dexie), so retry briefly and fall back to a centered bubble
  useEffect(() => {
    go(step.tab)
    el.current = null
    setRect(null)
    let tries = 0
    let timer = 0
    const find = () => {
      const found = step.target ? document.querySelector(step.target) : null
      if (found) {
        el.current = found
        // instant scroll + synchronous measure: no rAF — it never fires while the
        // page is hidden, and the layout is already settled after scrollIntoView
        found.scrollIntoView({ block: 'center' })
        setRect(found.getBoundingClientRect())
      } else if (step.target && ++tries < 15) {
        timer = window.setTimeout(find, 80)
      }
    }
    find()
    return () => window.clearTimeout(timer)
  }, [i, go, step.tab, step.target])

  // the spotlight follows the element through scrolls and resizes
  useEffect(() => {
    const update = () => {
      if (el.current) setRect(el.current.getBoundingClientRect())
    }
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // no target → zero-size hole in the center: the shadow dims the whole screen evenly
  const hole = rect
    ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 }

  const W = Math.min(340, window.innerWidth - 32)
  const below = rect ? rect.bottom < window.innerHeight * 0.52 : false
  const pos = rect
    ? {
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 16)),
        ...(below
          ? { top: hole.top + hole.height + 14 }
          : { bottom: window.innerHeight - hole.top + 14 }),
      }
    : ({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' } as const)

  const last = i === STEPS.length - 1
  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Guía de Glyno">
      <div className="tour-hole" style={hole} />
      <div className="tour-bubble" style={{ width: W, ...pos }}>
        <div className="row" style={{ gap: 9 }}>
          <Mascot size={36} />
          <h3>{step.title}</h3>
        </div>
        <p>{step.text}</p>
        <div className="row between">
          <div className="tour-dots">
            {STEPS.map((_, d) => (
              <span key={d} className={d === i ? 'on' : ''} />
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            {!last && (
              <button className="btn ghost small" onClick={onClose}>
                Saltar
              </button>
            )}
            <button className="btn small" onClick={() => (last ? onClose() : setI(i + 1))} autoFocus>
              {last ? '¡A por ello!' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
