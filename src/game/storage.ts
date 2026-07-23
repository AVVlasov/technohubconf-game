// localStorage-обёртка: рекорд, лидерборд, настройки. Работает офлайн, легко заменить на backend.

export interface ScoreEntry {
  name: string
  score: number
  zone: string
  tokens?: number
  maxCombo?: number
  date: number
}

export interface Settings {
  muted: boolean
  reduceMotion: boolean
  name: string
  tutorialSeen: boolean
}

const LB_KEY = 'aipdlc.leaderboard.v1'
const BEST_KEY = 'aipdlc.best.v1'
const SETTINGS_KEY = 'aipdlc.settings.v1'
const MAX_ENTRIES = 50

const safeGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* приватный режим — молча игнорируем */
  }
}

export const getBest = (): number => {
  const raw = safeGet(BEST_KEY)
  return raw ? parseInt(raw, 10) || 0 : 0
}

export const setBest = (score: number): number => {
  const best = getBest()
  if (score > best) {
    safeSet(BEST_KEY, String(score))
    return score
  }
  return best
}

export const getLeaderboard = (): ScoreEntry[] => {
  const raw = safeGet(LB_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ScoreEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Добавляет результат, возвращает индекс места (0-based) или -1 если не попал в топ.
export const addScore = (entry: ScoreEntry): number => {
  const list = getLeaderboard()
  list.push(entry)
  list.sort((a, b) => b.score - a.score)
  const trimmed = list.slice(0, MAX_ENTRIES)
  safeSet(LB_KEY, JSON.stringify(trimmed))
  return trimmed.findIndex((e) => e === entry)
}

// Ранг результата среди всех (для "ты в N очках от топ-3").
export const rankOf = (score: number): number => {
  const list = getLeaderboard()
  return list.filter((e) => e.score > score).length
}

const DEFAULT_SETTINGS: Settings = {
  muted: false,
  reduceMotion: false,
  name: '',
  tutorialSeen: false,
}

export const getSettings = (): Settings => {
  const raw = safeGet(SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export const saveSettings = (patch: Partial<Settings>): Settings => {
  const next = { ...getSettings(), ...patch }
  safeSet(SETTINGS_KEY, JSON.stringify(next))
  return next
}
