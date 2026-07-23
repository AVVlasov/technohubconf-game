// Детерминированный ГПСЧ (mulberry32) — для честного "Забега дня" и воспроизводимости.

export type RNG = () => number

export const mulberry32 = (seed: number): RNG => {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Строку -> число (для сидов из даты/ника).
export const hashSeed = (str: string): number => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Сид "Забега дня" — стабилен в течение суток.
export const dailySeed = (): number => {
  const d = new Date()
  return hashSeed(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)
}

export const randRange = (rng: RNG, min: number, max: number): number => min + rng() * (max - min)

export const randInt = (rng: RNG, min: number, maxInclusive: number): number =>
  Math.floor(min + rng() * (maxInclusive - min + 1))

export const pick = <T>(rng: RNG, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]

export const chance = (rng: RNG, p: number): boolean => rng() < p
