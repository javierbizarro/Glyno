import { defaultProfile, type Profile } from '../domain/types'
import type { ProfileRepository } from '../ports/repositories'

const KEY = 'glyno.profile'

export class LocalStorageProfileRepository implements ProfileRepository {
  load(): Profile | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...defaultProfile, ...JSON.parse(raw) } : null
    } catch {
      return null
    }
  }

  save(profile: Profile) {
    localStorage.setItem(KEY, JSON.stringify(profile))
  }

  clear() {
    localStorage.removeItem(KEY)
  }
}
