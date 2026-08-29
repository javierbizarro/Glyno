import { useEffect, useRef, useState } from 'react'
import type { Profile } from './domain/types'
import { profiles } from './app/container'
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  ),
  trends: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-6 4 3 6-8" />
      <path d="M21 3v18H3" opacity=".35" />
    </svg>
  ),
  meals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 11a8 8 0 0 1 16 0" />
      <path d="M2 11h20M6 15h12a6 6 0 0 1-12 0z" />
    </svg>
  ),
  // the current character's crowned heart, drawn in line stroke like the rest of the bar
  glyno: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20.5 C7.2 16.6 4.5 13.6 4.5 10.6 C4.5 8.4 6.1 6.8 8.2 6.8 C9.8 6.8 11.3 7.8 12 9.2 C12.7 7.8 14.2 6.8 15.8 6.8 C17.9 6.8 19.5 8.4 19.5 10.6 C19.5 13.6 16.8 16.6 12 20.5 Z" />
      <path d="M9 6.5 L9 3 L10.5 4.5 L12 2.5 L13.5 4.5 L15 3 L15 6.5" />
      <circle cx="9.9" cy="11.2" r=".6" fill="currentColor" stroke="none" />
      <circle cx="14.1" cy="11.2" r=".6" fill="currentColor" stroke="none" />
      <path d="M10.4 13.6q1.6 1.3 3.2 0" strokeWidth="1.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
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
            <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t === 'glyno' && tab === 'glyno' ? <Mascot size={22} /> : ICONS[t]}
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
