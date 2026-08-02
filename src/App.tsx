import { useState } from 'react'
import type { Profile } from './domain/types'
import { profiles } from './app/container'
import { Onboarding } from './ui/components/Onboarding'
import { Today } from './ui/components/Today'
import { Trends } from './ui/components/Trends'
import { Meals } from './ui/components/Meals'
import { Coach } from './ui/components/Coach'
import { Settings } from './ui/components/Settings'
import { Mascot } from './ui/components/Mascot'

type Tab = 'hoy' | 'tendencias' | 'comida' | 'glyno' | 'ajustes'

const ICONS: Record<Tab, JSX.Element> = {
  hoy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  ),
  tendencias: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-6 4 3 6-8" />
      <path d="M21 3v18H3" opacity=".35" />
    </svg>
  ),
  comida: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 11a8 8 0 0 1 16 0" />
      <path d="M2 11h20M6 15h12a6 6 0 0 1-12 0z" />
    </svg>
  ),
  glyno: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="13" r="7" />
      <path d="M13 6q0-3 3-3.5" />
      <circle cx="9.5" cy="12" r=".6" fill="currentColor" />
      <circle cx="14.5" cy="12" r=".6" fill="currentColor" />
      <path d="M10 15.5q2 1.6 4 0" />
    </svg>
  ),
  ajustes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </svg>
  ),
}

const TAB_LABEL: Record<Tab, string> = {
  hoy: 'Hoy',
  tendencias: 'Tendencias',
  comida: 'Comida',
  glyno: 'Glyno',
  ajustes: 'Ajustes',
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(() => profiles.load())
  const [tab, setTab] = useState<Tab>('hoy')

  const save = (p: Profile) => {
    profiles.save(p)
    setProfile(p)
  }

  if (!profile?.onboarded) return <Onboarding initial={profile} onDone={save} />

  return (
    <>
      <div className="screen">
        {tab === 'hoy' && <Today profile={profile} />}
        {tab === 'tendencias' && <Trends profile={profile} />}
        {tab === 'comida' && <Meals profile={profile} />}
        {tab === 'glyno' && <Coach profile={profile} />}
        {tab === 'ajustes' && <Settings profile={profile} onSave={save} />}
      </div>

      <nav className="tabbar">
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
