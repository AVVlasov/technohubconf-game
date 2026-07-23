// AI PDLC RUSH v2 — пиксельные спрайты, палитра, этапы. Перенос из интерактивного макета.
// Фиксированная палитра, пиксель-арт, без глоу.

export const C = {
  bg0: '#07171D',
  outline: '#04121A',
  ink: '#F2F8F5',
  green: '#21A038',
  bright: '#3BD269',
  greenDark: '#15702C',
  blue: '#4C8DEB',
  cyan: '#25AEE8',
  gold: '#F2C14E',
  goldDark: '#B0862E',
  danger: '#F4574D',
  dangerDark: '#8F231C',
  white: '#FFFFFF',
  steel: '#D9E6E0',
  slate: '#22343B',
  violet: '#B98BF0',
  pink: '#E87BA8',
  brown: '#8A5A3B',
  brownDark: '#5C3A24',
}

export const CAP_STEPS = [8000, 32000, 128000, 400000, 1000000]
export const capLabel = (i: number): string => ['8K', '32K', '128K', '400K', '1M'][Math.min(i, 4)]

export interface Stage {
  name: string
  enemy: string
  enemyName: string
  legend: string
  boss: string
  bossLegend: string
  accent: string
  tint: string
}

export const STAGES: Stage[] = [
  {
    name: 'Идея',
    enemy: 'olddev',
    enemyName: 'Разрабы-староверы',
    legend: 'Не верят в агентов, глушат прогресс ревью-стеной',
    boss: 'ДРЕЙФ ЦЕЛИ',
    bossLegend: 'Уводит задачу в сторону. Не дай уйти от цели',
    accent: '#E3C24E',
    tint: '#122430',
  },
  {
    name: 'Дизайн',
    enemy: 'slop',
    enemyName: 'AI Slop',
    legend: 'Красиво выглядит, не работает. Убьёшь — разделится',
    boss: 'ПОДХАЛИМАЖ',
    bossLegend: 'Со всем согласен, всё «отлично». Не верь — бей',
    accent: '#B98BF0',
    tint: '#171F31',
  },
  {
    name: 'Код',
    enemy: 'legacy',
    enemyName: 'Legacy-код',
    legend: 'Монолит без тестов. Толстый — бей дольше',
    boss: 'ТУННЕЛЬНОЕ МЫШЛЕНИЕ',
    bossLegend: 'Видит только свой подшаг и прёт напролом',
    accent: '#3BD269',
    tint: '#0C2822',
  },
  {
    name: 'Тест',
    enemy: 'hallu',
    enemyName: 'Галлюцинации',
    legend: 'Мерцают: то есть, то нет. Бей, пока видно',
    boss: 'ОТРАВЛЕНИЕ КОНТЕКСТА',
    bossLegend: 'Внедряет вредные инструкции через данные',
    accent: '#E89B5A',
    tint: '#241E18',
  },
  {
    name: 'Релиз',
    enemy: 'loop',
    enemyName: 'Зацикливание',
    legend: 'Кружат по спирали и жгут твои итерации',
    boss: 'АТРОФИЯ ИНСТРУКЦИЙ',
    bossLegend: 'Пишет «тесты прошли», не запуская их',
    accent: '#5AB8E8',
    tint: '#0E2430',
  },
  {
    name: 'Поддержка',
    enemy: 'rot',
    enemyName: 'Гниение контекста',
    legend: 'Рядом с ними токены горят вдвое быстрее',
    boss: 'КАСКАДНЫЙ СБОЙ',
    bossLegend: 'Одна ошибка заражает всю цепочку. Финал',
    accent: '#E87BA8',
    tint: '#231A24',
  },
]

export const HARNESS = ['GATE', 'JUDGE', 'MEMORY', 'HOOKS', 'RALPH LOOP']

export const ENEMY_DEF: Record<string, { hp: number; r: number; vy: number; score: number; w: number }> = {
  olddev: { hp: 1, r: 0.55, vy: 74, score: 40, w: 11 },
  slop: { hp: 1, r: 0.55, vy: 62, score: 50, w: 11 },
  legacy: { hp: 3, r: 0.62, vy: 46, score: 90, w: 12 },
  hallu: { hp: 1, r: 0.55, vy: 66, score: 70, w: 11 },
  loop: { hp: 2, r: 0.55, vy: 58, score: 80, w: 11 },
  rot: { hp: 2, r: 0.58, vy: 50, score: 90, w: 11 },
}

const PAL: Record<string, string> = {
  o: C.outline,
  w: C.white,
  s: C.steel,
  g: C.bright,
  d: C.greenDark,
  k: '#0A1F28',
  r: C.danger,
  q: C.dangerDark,
  y: C.gold,
  h: C.goldDark,
  b: C.blue,
  c: C.cyan,
  v: C.violet,
  p: C.pink,
  n: C.brown,
  m: C.brownDark,
  t: C.slate,
  i: C.ink,
}

export const MAPS: Record<string, string[]> = {
  ship: [
    '.....gg.....',
    '.....oo.....',
    '..oooooooo..',
    '.owwwwwwwwo.',
    '.owkkkkkkwo.',
    '.owkkkkkkwo.',
    '.owkkkkkkwo.',
    '.owwwwwwwwo.',
    'oowwwwwwwwoo',
    'obwwwwwwwwbo',
    '.owwggggwwo.',
    '..oooooooo..',
    '..oo....oo..',
  ],
  mini: ['..oooo..', '.owwwwo.', '.owkkwo.', '.owkkwo.', '.owwwwo.', 'obwwwwbo', '..oooo..', '..o..o..'],
  olddev: [
    '...oooo....',
    '..onnnno...',
    '.onwwwwno..',
    '.onwkwkwo..',
    '.onwwwwno..',
    '..osssso...',
    '.osssssso..',
    'o.osssso.o.',
    '..otttto...',
    '..oo..oo...',
  ],
  slop1: ['...pp.pp...', '..pppppp...', '.pppppppp..', 'ppwpppppwp.', 'pppppppppp.', '.ppppppppp.', '..pp.ppp...'],
  slop2: ['..pp..pp...', '.ppppppp...', 'pppppppppp.', 'pwpppppwpp.', '.ppppppppp.', 'pppp.ppppp.', '.pp...pp...'],
  legacy: [
    'oooooooooooo',
    'oqqqoqqqoqqo',
    'oooooooooooo',
    'oqoqqqoqqqoo',
    'oqoqwqoqqqoo',
    'oooooooooooo',
    'oqqqoqqoqqqo',
    'oooooooooooo',
  ],
  hallu: ['...vvvv....', '..vvvvvv...', '.vvwvvwvv..', '.vvvvvvvv..', '.vvvvvvvv..', '.vv.vv.vv..', '.v...v...v.'],
  loop1: ['...cccc....', '..cc..cc...', '.cc....cc..', '.c...c..c..', '.cc.cc..c..', '..cc...cc..', '...ccccc...'],
  loop2: ['...ccccc...', '..cc...cc..', '.c..cc.cc..', '.c..c...c..', '.cc....cc..', '..cc..cc...', '....cccc...'],
  rot: ['..dd..gg...', '.dnnddng...', 'dnnnnnnnd..', 'dnwnnnwnd..', '.dnnnnnd...', '..dnnd.g...', '.g..dd.....'],
  barrel: [
    '.oooooooo.',
    'oggggggggo',
    'oyyyyyyyyo',
    'ogggwwgggo',
    'oggwggwggo',
    'oggwggwggo',
    'ogggwwgggo',
    'oyyyyyyyyo',
    'oddddddddo',
    '.oooooooo.',
  ],
  doc_agent: [
    '.ooooooo..',
    '.owwwwwoo.',
    '.owwwwwwo.',
    '.owgggwwo.',
    '.owgwgwwo.',
    '.owgggwwo.',
    '.owgwgwwo.',
    '.owgwgwwo.',
    '.owwwwwwo.',
    '.oooooooo.',
  ],
  doc_skill: [
    '.ooooooo..',
    '.owwwwwoo.',
    '.owwwwwwo.',
    '.owbbbwwo.',
    '.owbwwwwo.',
    '.owbbbwwo.',
    '.owwwbwwo.',
    '.owbbbwwo.',
    '.owwwwwwo.',
    '.oooooooo.',
  ],
  perk_zip: [
    '.oooooooo.',
    'obbbbbbbbo',
    'obwbbbbwbo',
    'obbwbbwbbo',
    'obbbwwbbbo',
    'obbbwwbbbo',
    'obbwbbwbbo',
    'obwbbbbwbo',
    'obbbbbbbbo',
    '.oooooooo.',
  ],
  perk_win: [
    '.oooooooo.',
    'oyyyyyyyyo',
    'oywwyywwyo',
    'oywyyyywyo',
    'oyyyyyyyyo',
    'oyyyyyyyyo',
    'oywyyyywyo',
    'oywwyywwyo',
    'oyyyyyyyyo',
    '.oooooooo.',
  ],
  harness: [
    '.oooooooo.',
    'otttttttto',
    'otyyttyyto',
    'otyttttyto',
    'otttttttto',
    'otttyyttto',
    'otyttttyto',
    'otyyttyyto',
    'otttttttto',
    '.oooooooo.',
  ],
  heart: ['.xx..xx.', 'xxxxxxxx', 'xxxxxxxx', 'xxxxxxxx', '.xxxxxx.', '..xxxx..', '...xx...'],
  bolt: ['...xx.', '..xx..', '.xxxx.', '..xx..', '.xx...', 'xx....'],
  flag: ['xxxxxxx.', 'xwwxxxx.', 'xxxxxxx.', 'x.......', 'x.......', 'x.......', 'x.......', 'x.......'],
}

export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: string[],
  x: number,
  y: number,
  p: number,
  colorX?: string,
): void {
  for (let r = 0; r < map.length; r++) {
    const row = map[r]
    for (let c2 = 0; c2 < row.length; c2++) {
      const ch = row[c2]
      if (ch === '.') continue
      ctx.fillStyle = ch === 'x' ? colorX || C.ink : PAL[ch]
      ctx.fillRect(x + c2 * p, y + r * p, p, p)
    }
  }
}

export function spriteURL(name: string, scale?: number): string {
  const cv = document.createElement('canvas')
  const p = Math.max(1, Math.round(scale || 3))
  const map = MAPS[name] || MAPS.ship
  cv.width = map[0].length * p
  cv.height = map.length * p
  const ctx = cv.getContext('2d')
  if (!ctx) return ''
  if (name === 'heart') drawMap(ctx, map, 0, 0, p, C.bright)
  else if (name === 'heart_empty') drawMap(ctx, MAPS.heart, 0, 0, p, '#22343B')
  else if (name === 'bolt') drawMap(ctx, map, 0, 0, p, C.gold)
  else if (name === 'flag') drawMap(ctx, map, 0, 0, p, C.steel)
  else drawMap(ctx, map, 0, 0, p)
  return cv.toDataURL()
}

export const fmtInt = (n: number): string => Math.round(n).toLocaleString('ru-RU')
