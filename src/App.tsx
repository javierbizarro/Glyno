import { useEffect, useRef, useState } from 'react'
import type { Profile } from './domain/types'
import { health, profiles } from './app/container'
import { syncHealth } from './app/healthSync'
import { Onboarding } from './ui/components/Onboarding'
import { Today } from './ui/components/Today'
import { Trends } from './ui/components/Trends'
import { Meals } from './ui/components/Meals'
import { Coach } from './ui/components/Coach'
import { Settings } from './ui/components/Settings'
import { Mascot } from './ui/components/Mascot'
import { Tour } from './ui/components/Tour'
import { markTourSeen, shouldAutoStartTour } from './ui/tour'

export type Tab = 'today' | 'trends' | 'meals' | 'glyno' | 'settings'

const ICONS: Record<Tab, JSX.Element> = {
  today: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  ),
  trends: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-6 4 3 6-8" />
      <path d="M21 3v18H3" opacity=".35" />
    </svg>
  ),
  meals: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 11a8 8 0 0 1 16 0" />
      <path d="M2 11h20M6 15h12a6 6 0 0 1-12 0z" />
    </svg>
  ),
  // the same Glyno as everywhere else — rounded body and sprout — drawn in line stroke
  // like the rest of the bar. It was still a crowned heart, a body she lost two versions ago
  glyno: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7.4c3.3 0 5.6 2.4 5.6 5.4 0 3.5-2.6 6.7-5.6 6.7s-5.6-3.2-5.6-6.7c0-3 2.3-5.4 5.6-5.4Z" />
      <path d="M12 7.4V3.2" />
      <path d="M12 5.1c1.3-2.2 4.1-1.8 4.1-1.8s-.8 2.9-3.5 2.7" />
      <path d="M12 6.6C10.7 4.4 8.1 4.9 8.1 4.9s.8 2.5 3 2.1" />
      <circle cx="10.2" cy="12.4" r=".75" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="12.4" r=".75" fill="currentColor" stroke="none" />
      <path d="M10.4 15.1q1.6 1.4 3.2 0" strokeWidth="1.5" />
    </svg>
  ),
  settings: (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </svg>
  ),
}

const TAB_LABEL: Record<Tab, string> = {
  today: 'Hoy',
  trends: 'Tendencias',
  meals: 'Comida',
  glyno: 'Glyno',
  settings: 'Ajustes',
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(() => profiles.load())
  const [tab, setTab] = useState<Tab>('today')
  // "activar la IA" from Glyno or Comida: lands on Ajustes with the wizard already open
  const [aiSetup, setAiSetup] = useState(false)
  const [touring, setTouring] = useState(false)
  const tabbar = useRef<HTMLElement>(null)

  // the tour welcomes each user exactly once, right after onboarding;
  // afterwards it only opens manually from Ajustes
  useEffect(() => {
    if (shouldAutoStartTour(profile)) setTouring(true)
  }, [profile?.onboarded])

  // Salud syncs by itself on every open and every return to the app: the point of the native
  // app is that the diary fills without anyone remembering to fill it. Silent on purpose —
  // failures are the Ajustes button's business, not an interruption.
  useEffect(() => {
    if (!profile?.onboarded) return
    const pull = () => {
      if (document.visibilityState === 'visible') syncHealth(health).catch(() => {})
    }
    pull()
    document.addEventListener('visibilitychange', pull)
    return () => document.removeEventListener('visibilitychange', pull)
  }, [profile?.onboarded])

  const endTour = () => {
    markTourSeen()
    setTouring(false)
  }

  // the bar's real height changes with the phone's safe area: whatever sits
  // on top of it (the chat box) needs to know it
  useEffect(() => {
    const el = tabbar.current
    if (!el) return
    const publish = () =>
      document.documentElement.style.setProperty('--tabbar', `${Math.round(el.offsetHeight)}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [profile?.onboarded])

  const openAiSetup = () => {
    setAiSetup(true)
    setTab('settings')
  }

  const save = (p: Profile) => {
    profiles.save(p)
    setProfile(p)
  }

  if (!profile?.onboarded) return <Onboarding initial={profile} onDone={save} />

  return (
    <>
      <div className="screen">
        {tab === 'today' && <Today profile={profile} />}
        {tab === 'trends' && <Trends profile={profile} />}
        {tab === 'meals' && <Meals profile={profile} onSetupAi={openAiSetup} />}
        {tab === 'glyno' && <Coach profile={profile} onSetupAi={openAiSetup} />}
        {tab === 'settings' && (
          <Settings
            profile={profile}
            onSave={save}
            onReplayTour={() => setTouring(true)}
            openAi={aiSetup}
            onAiOpened={() => setAiSetup(false)}
          />
        )}
      </div>

      {touring && <Tour go={setTab} onClose={endTour} />}

      <nav className="tabbar" ref={tabbar}>
        <div className="inner">
          {(Object.keys(TAB_LABEL) as Tab[]).map(t => (
            <button
              key={t}
              className={`tab ${tab === t ? 'on' : ''}`}
              aria-current={tab === t ? 'page' : undefined}
              onClick={() => setTab(t)}
            >
              {t === 'glyno' && tab === 'glyno' ? <Mascot size={22} /> : ICONS[t]}
              <span className="tab-label">{TAB_LABEL[t]}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
