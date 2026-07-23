// 6 зон жизненного цикла PDLC: палитры и вайб. Циклически повторяются, второй круг — "прод в огне".

export interface Zone {
  id: number
  name: string
  short: string
  // Палитра
  bgTop: string
  bgBottom: string
  grid: string // цвет линий полос/сетки
  accent: string // основной неон зоны
  token: string // цвет токена
  obstacle: string // базовый цвет препятствий
  glow: string
  emoji: string
  tip: string
}

export const ZONES: Zone[] = [
  {
    id: 0,
    name: 'Идея',
    short: 'IDEA',
    bgTop: '#0a1a2f',
    bgBottom: '#04101f',
    grid: 'rgba(120,180,255,0.18)',
    accent: '#7db8ff',
    token: '#ffd447',
    obstacle: '#ff6b8b',
    glow: '#7db8ff',
    emoji: '💡',
    tip: 'Собери контекст',
  },
  {
    id: 1,
    name: 'Дизайн',
    short: 'DESIGN',
    bgTop: '#241033',
    bgBottom: '#12061f',
    grid: 'rgba(210,150,255,0.18)',
    accent: '#c07bff',
    token: '#7dffd6',
    obstacle: '#ff7bd1',
    glow: '#c07bff',
    emoji: '🎨',
    tip: 'Магнит близко',
  },
  {
    id: 2,
    name: 'Код',
    short: 'CODE',
    bgTop: '#031f16',
    bgBottom: '#01120c',
    grid: 'rgba(120,255,180,0.18)',
    accent: '#21e08a',
    token: '#eaff7d',
    obstacle: '#ff9f45',
    glow: '#21e08a',
    emoji: '⌨️',
    tip: 'Прыгай спагетти',
  },
  {
    id: 3,
    name: 'Тест',
    short: 'TEST',
    bgTop: '#2a1206',
    bgBottom: '#160803',
    grid: 'rgba(255,180,120,0.18)',
    accent: '#ff9f45',
    token: '#7dff9f',
    obstacle: '#ff5555',
    glow: '#ff9f45',
    emoji: '🐞',
    tip: 'Дебажь баги',
  },
  {
    id: 4,
    name: 'Релиз',
    short: 'RELEASE',
    bgTop: '#061a2a',
    bgBottom: '#03101c',
    grid: 'rgba(120,220,255,0.2)',
    accent: '#45c9ff',
    token: '#ffe07d',
    obstacle: '#ff6b6b',
    glow: '#45c9ff',
    emoji: '🚀',
    tip: 'Держи темп',
  },
  {
    id: 5,
    name: 'Поддержка',
    short: 'SUPPORT',
    bgTop: '#1f0a1a',
    bgBottom: '#120610',
    grid: 'rgba(255,140,200,0.2)',
    accent: '#ff5ea8',
    token: '#7de0ff',
    obstacle: '#ff4d4d',
    glow: '#ff5ea8',
    emoji: '🛟',
    tip: 'Тикет-шторм!',
  },
]

export const getZone = (index: number): Zone => ZONES[((index % ZONES.length) + ZONES.length) % ZONES.length]

// Название круга: со второго круга — "прод в огне".
export const lapLabel = (zoneCounter: number): string => {
  const lap = Math.floor(zoneCounter / ZONES.length)
  if (lap <= 0) return ''
  if (lap === 1) return 'PROD ON FIRE'
  return `LAP ${lap + 1}`
}
