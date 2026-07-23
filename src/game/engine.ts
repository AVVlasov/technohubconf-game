// Ядро AI PDLC RUSH: game loop, сущности, спавн, коллизии, комбо/мультипликатор,
// near-miss/flow, зоны, скоринг, juice. Рендер на Canvas 2D. Общается с React через колбэки.

import { gameAudio } from './audio'
import { chance, mulberry32, pick, randInt, randRange, RNG } from './rng'
import { getZone, lapLabel, Zone } from './zones'

export type GameState = 'ready' | 'countdown' | 'playing' | 'gameover'

export interface Stats {
  score: number
  best: number
  lives: number
  multiplier: number
  combo: number
  maxCombo: number
  zoneName: string
  zoneShort: string
  zoneEmoji: string
  lap: string
  flow: boolean
  flowMeter: number
  tokens: number
  shieldT: number
  magnetT: number
  boostT: number
  autopilotT: number
  speedKmh: number
  nearMisses: number
}

export interface GameResult {
  score: number
  tokens: number
  maxCombo: number
  nearMisses: number
  zoneName: string
  distance: number
}

type PowerKind = 'shield' | 'magnet' | 'boost' | 'autopilot' | 'fountain'
type ObstacleType = 'low' | 'wall' | 'over'

interface Obstacle {
  lane: number
  y: number
  w: number
  h: number
  type: ObstacleType
  passed: boolean
  blink: boolean
  seed: number
}

interface Token {
  lane: number
  y: number
  golden: boolean
  taken: boolean
  x: number // для магнита
  pulled: boolean
}

interface Power {
  lane: number
  y: number
  kind: PowerKind
  taken: boolean
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  gravity: number
  spark: boolean
}

interface FloatText {
  x: number
  y: number
  text: string
  color: string
  life: number
  maxLife: number
  vy: number
  scale: number
}

const LANES = 3
const MULT_STEPS: Array<{ c: number; m: number }> = [
  { c: 0, m: 1 },
  { c: 5, m: 1.5 },
  { c: 10, m: 2 },
  { c: 20, m: 3 },
  { c: 35, m: 4 },
  { c: 55, m: 5 },
]

const POWER_META: Record<PowerKind, { emoji: string; color: string; label: string }> = {
  shield: { emoji: '🛡', color: '#45c9ff', label: 'QA-ЩИТ' },
  magnet: { emoji: '🧲', color: '#c07bff', label: 'МАГНИТ' },
  boost: { emoji: '🚀', color: '#ff9f45', label: 'СПРИНТ-БУСТ' },
  autopilot: { emoji: '🤖', color: '#21e08a', label: 'AI-АВТОПИЛОТ' },
  fountain: { emoji: '💠', color: '#ffd447', label: 'ТОКЕН-ФОНТАН' },
}

const TOKEN_VALUE = 25
const GOLDEN_VALUE = 150
const NEARMISS_BONUS = 15
const DIST_POINTS = 0.5

export class Engine {
  private ctx: CanvasRenderingContext2D
  private W = 450
  private H = 800
  private unit = 1
  private dpr = 1

  private rng: RNG = mulberry32(1)
  private seed = 1

  state: GameState = 'ready'
  private raf = 0
  private lastTime = 0
  private time = 0

  // Мир
  private speed = 0 // px/сек
  private baseSpeed = 0
  private distance = 0
  private spawnAcc = 0
  private zoneCounter = 0
  private distanceInZone = 0
  private zone: Zone = getZone(0)
  private zoneFlash = 0
  private bannerT = 0

  // Игрок
  private laneIndex = 1
  private prevLane = 1
  private laneChangeT = 0
  private playerX = 0
  private targetX = 0
  private jumpT = 0
  private slideT = 0
  private readonly jumpDur = 0.62
  private readonly slideDur = 0.5
  private bufferedAction: '' | 'jump' | 'slide' = ''
  private bufferT = 0

  // Стейт-эффекты
  private lives = 3
  private invincT = 0
  private shieldT = 0
  private magnetT = 0
  private boostT = 0
  private autopilotT = 0
  private goldenBoostT = 0

  // Комбо / очки / поток
  private combo = 0
  private maxCombo = 0
  private multiplier = 1
  private scoreFloat = 0
  private tokens = 0
  private nearMisses = 0
  private flowMeter = 0
  private lastNearT = -10
  private consecutiveNear = 0

  private best = 0

  // Сущности
  private obstacles: Obstacle[] = []
  private tokenList: Token[] = []
  private powers: Power[] = []
  private particles: Particle[] = []
  private floats: FloatText[] = []
  private trail: Array<{ x: number; y: number; life: number }> = []

  // Juice
  private shake = 0
  private hitstop = 0
  private zoom = 1
  private targetZoom = 1

  private inventory: PowerKind | null = null

  private statsAcc = 0
  private reduceMotion = false

  onStats: (s: Stats) => void = () => undefined
  onGameOver: (r: GameResult) => void = () => undefined

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  setBest(b: number): void {
    this.best = b
  }

  setReduceMotion(v: boolean): void {
    this.reduceMotion = v
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.W = cssW
    this.H = cssH
    this.dpr = dpr
    this.unit = cssH / 800
    const canvas = this.ctx.canvas
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    this.targetX = this.laneX(this.laneIndex)
    if (this.state !== 'playing') this.playerX = this.targetX
  }

  private laneWidth(): number {
    return this.W / LANES
  }

  private laneX(i: number): number {
    return this.laneWidth() * (i + 0.5)
  }

  private get playerY(): number {
    return this.H * 0.78
  }

  private get playerSize(): number {
    return Math.min(this.laneWidth() * 0.5, 54 * this.unit)
  }

  // --- Управление (вызывается из React) ---
  moveLeft(): void {
    if (this.state !== 'playing' || this.autopilotT > 0) return
    if (this.laneIndex > 0) {
      this.prevLane = this.laneIndex
      this.laneIndex--
      this.laneChangeT = 0.3
      this.targetX = this.laneX(this.laneIndex)
      gameAudio.swipe()
    }
  }

  moveRight(): void {
    if (this.state !== 'playing' || this.autopilotT > 0) return
    if (this.laneIndex < LANES - 1) {
      this.prevLane = this.laneIndex
      this.laneIndex++
      this.laneChangeT = 0.3
      this.targetX = this.laneX(this.laneIndex)
      gameAudio.swipe()
    }
  }

  jump(): void {
    if (this.state !== 'playing' || this.autopilotT > 0) return
    if (this.jumpT <= 0 && this.slideT <= 0) {
      this.jumpT = this.jumpDur
      gameAudio.jump()
    } else {
      this.bufferedAction = 'jump'
      this.bufferT = 0.14
    }
  }

  slide(): void {
    if (this.state !== 'playing' || this.autopilotT > 0) return
    if (this.slideT <= 0 && this.jumpT <= 0) {
      this.slideT = this.slideDur
      gameAudio.swipe()
    } else {
      this.bufferedAction = 'slide'
      this.bufferT = 0.14
    }
  }

  usePowerup(): void {
    if (this.state !== 'playing' || !this.inventory) return
    this.activatePower(this.inventory)
    this.inventory = null
  }

  // --- Жизненный цикл ---
  reset(seed: number): void {
    this.seed = seed >>> 0
    this.rng = mulberry32(this.seed)
    this.speed = 6 * 60 * this.unit // px/сек
    this.baseSpeed = this.speed
    this.distance = 0
    this.spawnAcc = 0
    this.zoneCounter = 0
    this.distanceInZone = 0
    this.zone = getZone(0)
    this.zoneFlash = 0
    this.bannerT = 1.6
    this.laneIndex = 1
    this.prevLane = 1
    this.laneChangeT = 0
    this.playerX = this.laneX(1)
    this.targetX = this.playerX
    this.jumpT = 0
    this.slideT = 0
    this.bufferedAction = ''
    this.lives = 3
    this.invincT = 0
    this.shieldT = 0
    this.magnetT = 0
    this.boostT = 0
    this.autopilotT = 0
    this.goldenBoostT = 0
    this.combo = 0
    this.maxCombo = 0
    this.multiplier = 1
    this.scoreFloat = 0
    this.tokens = 0
    this.nearMisses = 0
    this.flowMeter = 0
    this.lastNearT = -10
    this.consecutiveNear = 0
    this.obstacles = []
    this.tokenList = []
    this.powers = []
    this.particles = []
    this.floats = []
    this.trail = []
    this.shake = 0
    this.hitstop = 0
    this.zoom = 1
    this.targetZoom = 1
    this.inventory = null
    this.time = 0
    this.statsAcc = 0
  }

  start(seed: number): void {
    this.reset(seed)
    this.state = 'playing'
    gameAudio.resume()
    gameAudio.startMusic()
    this.emitStats()
    this.loop(performance.now())
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    gameAudio.stopMusic()
  }

  pause(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.lastTime = 0
  }

  resumeLoop(): void {
    if (this.state === 'playing' && !this.raf) {
      this.loop(performance.now())
    }
  }

  private loop = (now: number): void => {
    if (!this.lastTime) this.lastTime = now
    let dt = (now - this.lastTime) / 1000
    this.lastTime = now
    if (dt > 0.05) dt = 0.05 // защита от скачков (вкладка в фоне)

    if (this.hitstop > 0) {
      this.hitstop -= dt
    } else if (this.state === 'playing') {
      this.update(dt)
    }
    this.render()

    if (this.state === 'playing') {
      this.raf = requestAnimationFrame(this.loop)
    } else {
      this.raf = 0
    }
  }

  // --- Обновление ---
  private update(dt: number): void {
    this.time += dt

    // Таймеры эффектов
    this.laneChangeT = Math.max(0, this.laneChangeT - dt)
    this.invincT = Math.max(0, this.invincT - dt)
    this.shieldT = Math.max(0, this.shieldT - dt)
    this.magnetT = Math.max(0, this.magnetT - dt)
    this.goldenBoostT = Math.max(0, this.goldenBoostT - dt)
    if (this.bufferT > 0) this.bufferT = Math.max(0, this.bufferT - dt)

    const wasBoost = this.boostT > 0
    this.boostT = Math.max(0, this.boostT - dt)
    if (wasBoost && this.boostT <= 0) this.targetZoom = 1
    const wasAuto = this.autopilotT > 0
    this.autopilotT = Math.max(0, this.autopilotT - dt)
    if (wasAuto && this.autopilotT <= 0) {
      this.spawnBurst(this.playerX, this.playerY, this.zone.accent, 16)
    }

    // Скорость (плавный рост) + микро-крещендо
    const growth = 7 * this.unit // px/сек за секунду
    this.baseSpeed = Math.min(this.baseSpeed + growth * dt, 18 * 60 * this.unit)
    let effSpeed = this.baseSpeed
    if (this.boostT > 0) effSpeed *= 1.6
    this.speed = effSpeed
    gameAudio.setTempo(0.85 + (this.baseSpeed / (18 * 60 * this.unit)) * 1.1)

    // Прыжок / подкат
    if (this.jumpT > 0) {
      this.jumpT = Math.max(0, this.jumpT - dt)
      if (this.jumpT <= 0 && this.bufferedAction === 'jump' && this.bufferT > 0) {
        this.jumpT = this.jumpDur
        this.bufferedAction = ''
      }
    }
    if (this.slideT > 0) {
      this.slideT = Math.max(0, this.slideT - dt)
      if (this.slideT <= 0 && this.bufferedAction === 'slide' && this.bufferT > 0) {
        this.slideT = this.slideDur
        this.bufferedAction = ''
      }
    }

    // Автопилот: сам рулит и собирает
    if (this.autopilotT > 0) this.autopilot()

    // Плавное перемещение игрока к целевой полосе
    const lerp = 1 - Math.pow(0.0009, dt)
    this.playerX += (this.targetX - this.playerX) * lerp

    // Трейл
    this.trail.push({ x: this.playerX, y: this.playerY, life: 0.3 })
    for (const t of this.trail) t.life -= dt
    this.trail = this.trail.filter((t) => t.life > 0)

    // Спавн рядов (интервал в пикселях = скорость * желаемое-время -> постоянное телеграфирование)
    const difficulty = this.difficulty()
    const rowInterval = this.speed * (0.95 - difficulty * 0.45)
    this.spawnAcc += this.speed * dt
    if (this.spawnAcc >= rowInterval) {
      this.spawnAcc -= rowInterval
      this.spawnRow(difficulty)
    }

    // Движение мира
    const dy = this.speed * dt
    this.distance += dy
    this.distanceInZone += dy

    for (const o of this.obstacles) o.y += dy
    for (const t of this.tokenList) t.y += dy
    for (const p of this.powers) p.y += dy

    // Смена зоны
    const zoneLen = 4200 * this.unit
    if (this.distanceInZone >= zoneLen) {
      this.distanceInZone -= zoneLen
      this.zoneCounter++
      this.zone = getZone(this.zoneCounter)
      this.zoneFlash = 0.5
      this.bannerT = 1.6
      this.baseSpeed += 0.6 * 60 * this.unit
      this.addScore(200 + this.zoneCounter * 50, this.playerX, this.playerY - 40 * this.unit, `ЗОНА +${200 + this.zoneCounter * 50}`, this.zone.accent)
      gameAudio.zoneChange()
      this.shake = Math.min(this.shake + 4 * this.unit, 10 * this.unit)
    }
    if (this.zoneFlash > 0) this.zoneFlash = Math.max(0, this.zoneFlash - dt)
    if (this.bannerT > 0) this.bannerT = Math.max(0, this.bannerT - dt)

    // Коллизии/сбор
    this.handleTokens(dt)
    this.handlePowers()
    this.handleObstacles()

    // Поток
    if (this.time - this.lastNearT > 2) this.consecutiveNear = 0
    this.flowMeter = Math.max(0, this.flowMeter - dt * 0.35)

    // Очки за дистанцию
    const boostFactor = this.boostT > 0 ? 2 : 1
    this.scoreFloat += (this.speed / (60 * this.unit)) * dt * DIST_POINTS * boostFactor

    // Частицы / тексты
    this.updateParticles(dt)

    // Тряска / зум
    this.shake *= Math.pow(0.001, dt)
    if (this.shake < 0.05) this.shake = 0
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.pow(0.001, dt))

    // Очистка
    const margin = 120 * this.unit
    this.obstacles = this.obstacles.filter((o) => o.y < this.H + margin)
    this.tokenList = this.tokenList.filter((t) => !t.taken && t.y < this.H + margin)
    this.powers = this.powers.filter((p) => !p.taken && p.y < this.H + margin)

    // Стата в React (~15 fps) + сразу при важных событиях (в самих методах)
    this.statsAcc += dt
    if (this.statsAcc >= 0.066) {
      this.statsAcc = 0
      this.emitStats()
    }
  }

  private difficulty(): number {
    // 0..1: растёт с временем и номером зоны
    const byTime = Math.min(1, this.time / 90)
    const byZone = Math.min(1, this.zoneCounter / 8)
    return Math.min(1, byTime * 0.6 + byZone * 0.6)
  }

  private flowActive(): boolean {
    return this.consecutiveNear >= 3 && this.time - this.lastNearT < 2
  }

  private flowBonus(): number {
    return this.flowActive() ? 1.25 : 1
  }

  private effectiveMultiplier(): number {
    let m = this.multiplier
    if (this.goldenBoostT > 0) m += 1
    return Math.min(m, 6)
  }

  // --- Спавн ---
  private spawnRow(difficulty: number): void {
    const rng = this.rng
    const y = -60 * this.unit
    const lw = this.laneWidth()

    // Иногда — "выдох": ряд только с токенами (награда после напряжения)
    if (chance(rng, 0.12)) {
      const n = randInt(rng, 1, LANES)
      const lanes = this.shuffleLanes(rng).slice(0, n)
      for (const lane of lanes) this.pushToken(lane, y, chance(rng, 0.06))
      return
    }

    // Сколько полос блокировать (никогда не все 3 -> всегда есть проход)
    let blocked = 0
    const roll = rng()
    if (roll < 0.28 - difficulty * 0.15) blocked = 0
    else if (roll < 0.85) blocked = 1
    else blocked = 2

    const laneOrder = this.shuffleLanes(rng)
    const blockedLanes = laneOrder.slice(0, blocked)
    const freeLanes = laneOrder.slice(blocked)

    for (const lane of blockedLanes) {
      const type = this.pickObstacleType(rng, difficulty)
      this.pushObstacle(lane, y, type, chance(rng, 0.15 + difficulty * 0.2))
    }

    // Токены в свободных полосах
    for (const lane of freeLanes) {
      if (chance(rng, 0.72)) {
        const golden = chance(rng, 0.015 + difficulty * 0.015)
        this.pushToken(lane, y, golden)
      }
    }

    // Power-up (редко, только в свободной полосе)
    if (freeLanes.length > 0 && chance(rng, 0.04 + difficulty * 0.04)) {
      const lane = pick(rng, freeLanes)
      const kind = this.pickPower(rng)
      this.powers.push({ lane, y: y - 40 * this.unit, kind, taken: false })
    }

    // Иногда "жадный" токен прямо перед препятствием (риск-ревард)
    if (blocked > 0 && chance(rng, 0.25)) {
      const lane = pick(rng, blockedLanes)
      this.pushToken(lane, y + 90 * this.unit, false)
    }

    void lw
  }

  private pickObstacleType(rng: RNG, difficulty: number): ObstacleType {
    const z = this.zone.id
    // 'over' (подкат) появляется в поздних зонах/сложности
    const allowOver = z >= 4 || difficulty > 0.5
    const r = rng()
    if (allowOver && r < 0.25) return 'over'
    if (r < 0.6) return 'wall'
    return 'low'
  }

  private pickPower(rng: RNG): PowerKind {
    const pool: PowerKind[] = ['shield', 'magnet', 'boost', 'autopilot', 'fountain']
    return pick(rng, pool)
  }

  private shuffleLanes(rng: RNG): number[] {
    const arr = [0, 1, 2]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  private pushObstacle(lane: number, y: number, type: ObstacleType, blink: boolean): void {
    const lw = this.laneWidth()
    let h = 46 * this.unit
    if (type === 'wall') h = 70 * this.unit
    if (type === 'over') h = 40 * this.unit
    this.obstacles.push({
      lane,
      y,
      w: lw * 0.66,
      h,
      type,
      passed: false,
      blink,
      seed: Math.floor(this.rng() * 1000),
    })
  }

  private pushToken(lane: number, y: number, golden: boolean): void {
    this.tokenList.push({ lane, y, golden, taken: false, x: this.laneX(lane), pulled: false })
  }

  // --- Обработка сущностей ---
  private handleTokens(dt: number): void {
    const collectR = this.playerSize * 0.7
    for (const t of this.tokenList) {
      if (t.taken) continue
      const magnet = this.magnetT > 0
      const tx = this.laneX(t.lane)
      if (magnet && Math.abs(t.y - this.playerY) < this.H * 0.5) {
        // Притягивание
        t.pulled = true
        const pull = 1 - Math.pow(0.0005, dt)
        t.x += (this.playerX - t.x) * pull
      } else {
        t.x = tx
      }
      const dx = Math.abs(t.x - this.playerX)
      const dyToken = Math.abs(t.y - this.playerY)
      const laneHit = t.lane === this.laneIndex || (magnet && dx < collectR) || t.pulled
      if (laneHit && dyToken < collectR && dx < this.laneWidth() * 0.6) {
        this.collectToken(t)
      }
    }
  }

  private collectToken(t: Token): void {
    t.taken = true
    this.combo++
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.updateMultiplier()
    this.tokens++
    const boostFactor = this.boostT > 0 ? 2 : 1
    const val = (t.golden ? GOLDEN_VALUE : TOKEN_VALUE) * this.effectiveMultiplier() * this.flowBonus() * boostFactor
    this.addScore(Math.round(val), this.laneX(t.lane), t.y, `+${Math.round(val)}`, t.golden ? '#ffd447' : this.zone.token)
    if (t.golden) {
      this.goldenBoostT = 5
      gameAudio.golden()
      this.spawnBurst(this.laneX(t.lane), t.y, '#ffd447', 20)
      this.shake = Math.min(this.shake + 2.5 * this.unit, 8 * this.unit)
    } else {
      gameAudio.token(Math.min(this.combo, 7))
      this.spawnBurst(t.x, t.y, this.zone.token, 7)
    }
  }

  private handlePowers(): void {
    const r = this.playerSize * 0.8
    for (const p of this.powers) {
      if (p.taken) continue
      if (p.lane === this.laneIndex && Math.abs(p.y - this.playerY) < r) {
        p.taken = true
        this.activatePower(p.kind)
      }
    }
  }

  private activatePower(kind: PowerKind): void {
    const meta = POWER_META[kind]
    gameAudio.powerup()
    this.addFloat(this.playerX, this.playerY - 50 * this.unit, `${meta.emoji} ${meta.label}`, meta.color, 1.2, 1.3)
    this.spawnBurst(this.playerX, this.playerY, meta.color, 18)
    this.shake = Math.min(this.shake + 3 * this.unit, 9 * this.unit)
    switch (kind) {
      case 'shield':
        this.shieldT = 4
        this.invincT = Math.max(this.invincT, 4)
        break
      case 'magnet':
        this.magnetT = 5
        break
      case 'boost':
        this.boostT = 3
        this.targetZoom = this.reduceMotion ? 1 : 0.9
        break
      case 'autopilot':
        this.autopilotT = 4
        this.invincT = Math.max(this.invincT, 4)
        break
      case 'fountain': {
        for (let i = 0; i < 25; i++) {
          this.combo++
          this.tokens++
        }
        this.maxCombo = Math.max(this.maxCombo, this.combo)
        this.updateMultiplier()
        const val = 25 * TOKEN_VALUE * this.effectiveMultiplier()
        this.addScore(Math.round(val), this.playerX, this.playerY - 30 * this.unit, `+${Math.round(val)}`, '#ffd447')
        this.spawnBurst(this.playerX, this.playerY, '#ffd447', 40)
        break
      }
    }
    this.emitStats()
  }

  private handleObstacles(): void {
    const collH = this.playerSize * 0.7
    const jumping = this.jumpT > 0.08 && this.jumpT < this.jumpDur - 0.02
    const sliding = this.slideT > 0
    const invincible = this.invincT > 0 || this.shieldT > 0 || this.autopilotT > 0

    for (const o of this.obstacles) {
      if (o.passed) continue
      const band = o.h / 2 + collH / 2
      const sameLane = o.lane === this.laneIndex
      const overlap = Math.abs(o.y - this.playerY) < band

      if (sameLane && overlap) {
        const avoided = (o.type === 'low' && jumping) || (o.type === 'over' && sliding)
        if (!avoided) {
          if (invincible) {
            // Проходим сквозь: "дебажим" препятствие
            o.passed = true
            this.spawnBurst(this.laneX(o.lane), o.y, this.shieldT > 0 ? '#45c9ff' : this.zone.accent, 14)
            if (this.shieldT > 0)
              this.addScore(10, this.laneX(o.lane), o.y, '+10', '#45c9ff')
          } else {
            this.hit(o)
            o.passed = true
          }
          continue
        }
      }

      // Прошёл мимо -> near-miss?
      if (o.y > this.playerY + band + 4 * this.unit) {
        o.passed = true
        const dodgedSameLane = sameLane && ((o.type === 'low' && jumping) || (o.type === 'over' && sliding))
        const dodgedSwitch =
          o.lane === this.prevLane && o.lane !== this.laneIndex && this.laneChangeT > 0
        if (!invincible && (dodgedSameLane || dodgedSwitch)) {
          this.nearMiss(o)
        }
      }
    }
  }

  private nearMiss(o: Obstacle): void {
    this.nearMisses++
    this.consecutiveNear++
    this.lastNearT = this.time
    this.flowMeter = Math.min(1, this.flowMeter + 0.34)
    this.combo++
    this.maxCombo = Math.max(this.maxCombo, this.combo)
    this.updateMultiplier()
    const boostFactor = this.boostT > 0 ? 2 : 1
    const val = Math.round(NEARMISS_BONUS * this.effectiveMultiplier() * this.flowBonus() * boostFactor)
    const label = this.flowActive() ? 'FLOW!' : 'CLOSE!'
    this.addScore(val, this.laneX(o.lane), this.playerY, `${label} +${val}`, '#7dffd6')
    gameAudio.nearMiss()
    if (!this.reduceMotion) this.spawnStreak(this.laneX(o.lane), this.playerY)
  }

  private hit(o: Obstacle): void {
    this.lives--
    this.combo = 0
    this.multiplier = 1
    this.consecutiveNear = 0
    this.flowMeter = 0
    this.invincT = 1.2
    this.hitstop = this.reduceMotion ? 0 : 0.07
    this.shake = 12 * this.unit
    gameAudio.crash()
    if (navigator.vibrate) {
      try {
        navigator.vibrate(120)
      } catch {
        /* ignore */
      }
    }
    this.spawnBurst(this.laneX(o.lane), o.y, '#ff5555', 26)
    this.addFloat(this.playerX, this.playerY - 40 * this.unit, '-1 ЖИЗНЬ', '#ff5555', 1, 1.2)
    this.emitStats()
    if (this.lives <= 0) this.gameOver()
  }

  private updateMultiplier(): void {
    let m = 1
    for (const step of MULT_STEPS) if (this.combo >= step.c) m = step.m
    if (m > this.multiplier) {
      this.multiplier = m
      gameAudio.multiplierUp()
      this.addFloat(this.playerX, this.playerY - 70 * this.unit, `×${m}!`, this.zone.accent, 1, 1.5)
      this.shake = Math.min(this.shake + 2 * this.unit, 7 * this.unit)
    } else {
      this.multiplier = m
    }
  }

  // --- Автопилот (AI-агент сам проходит участок) ---
  private autopilot(): void {
    // Ищем безопасную полосу с ближайшим препятствием; предпочитаем токены
    const look = this.H * 0.6
    const laneDanger = [0, 0, 0]
    const laneToken = [0, 0, 0]
    for (const o of this.obstacles) {
      if (o.passed) continue
      if (o.y < this.playerY && o.y > this.playerY - look) {
        const dist = this.playerY - o.y
        if (o.type === 'wall') laneDanger[o.lane] += (look - dist) / look
      }
    }
    for (const t of this.tokenList) {
      if (t.taken) continue
      if (t.y < this.playerY && t.y > this.playerY - look) laneToken[t.lane] += 1
    }
    let bestLane = this.laneIndex
    let bestScore = -Infinity
    for (let i = 0; i < LANES; i++) {
      const sc = laneToken[i] * 2 - laneDanger[i] * 5 - Math.abs(i - this.laneIndex) * 0.4
      if (sc > bestScore) {
        bestScore = sc
        bestLane = i
      }
    }
    if (bestLane !== this.laneIndex) {
      this.prevLane = this.laneIndex
      this.laneIndex = bestLane
      this.laneChangeT = 0.3
      this.targetX = this.laneX(bestLane)
    }
    // Авто-прыжок/подкат
    for (const o of this.obstacles) {
      if (o.passed || o.lane !== this.laneIndex) continue
      const dist = this.playerY - o.y
      if (dist > 0 && dist < 60 * this.unit) {
        if (o.type === 'low' && this.jumpT <= 0) this.jumpT = this.jumpDur
        if (o.type === 'over' && this.slideT <= 0) this.slideT = this.slideDur
      }
    }
  }

  // --- Очки / частицы / тексты ---
  private addScore(amount: number, x: number, y: number, text: string, color: string): void {
    this.scoreFloat += amount
    if (text) this.addFloat(x, y, text, color, 0.9, 1)
  }

  private addFloat(x: number, y: number, text: string, color: string, life: number, scale: number): void {
    this.floats.push({ x, y, text, color, life, maxLife: life, vy: -50 * this.unit, scale })
  }

  private spawnBurst(x: number, y: number, color: string, n: number): void {
    if (this.reduceMotion) n = Math.ceil(n / 3)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = randRange(this.rng, 40, 220) * this.unit
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: randRange(this.rng, 0.3, 0.7),
        maxLife: 0.7,
        color,
        size: randRange(this.rng, 2, 5) * this.unit,
        gravity: 300 * this.unit,
        spark: true,
      })
    }
  }

  private spawnStreak(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + randRange(this.rng, -20, 20) * this.unit,
        y,
        vx: randRange(this.rng, -20, 20) * this.unit,
        vy: randRange(this.rng, 200, 400) * this.unit,
        life: 0.35,
        maxLife: 0.35,
        color: '#7dffd6',
        size: 2 * this.unit,
        gravity: 0,
        spark: false,
      })
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += p.gravity * dt
      p.life -= dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const f of this.floats) {
      f.y += f.vy * dt
      f.vy *= 0.92
      f.life -= dt
    }
    this.floats = this.floats.filter((f) => f.life > 0)
  }

  private gameOver(): void {
    this.state = 'gameover'
    gameAudio.gameOver()
    gameAudio.stopMusic()
    this.shake = 14 * this.unit
    const result: GameResult = {
      score: Math.floor(this.scoreFloat),
      tokens: this.tokens,
      maxCombo: this.maxCombo,
      nearMisses: this.nearMisses,
      zoneName: `${this.zone.emoji} ${this.zone.name}`,
      distance: Math.floor(this.distance / this.unit),
    }
    this.emitStats()
    this.onGameOver(result)
  }

  private emitStats(): void {
    this.onStats({
      score: Math.floor(this.scoreFloat),
      best: this.best,
      lives: this.lives,
      multiplier: this.effectiveMultiplier(),
      combo: this.combo,
      maxCombo: this.maxCombo,
      zoneName: this.zone.name,
      zoneShort: this.zone.short,
      zoneEmoji: this.zone.emoji,
      lap: lapLabel(this.zoneCounter),
      flow: this.flowActive(),
      flowMeter: this.flowMeter,
      tokens: this.tokens,
      shieldT: this.shieldT,
      magnetT: this.magnetT,
      boostT: this.boostT,
      autopilotT: this.autopilotT,
      speedKmh: Math.round((this.baseSpeed / this.unit / 60) * 12),
      nearMisses: this.nearMisses,
    })
  }

  // --- Рендер ---
  render(): void {
    const ctx = this.ctx
    const { W, H, dpr } = this
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, W, H)

    // Тряска + зум (от центра)
    let sx = 0
    let sy = 0
    if (this.shake > 0 && !this.reduceMotion) {
      sx = (Math.random() - 0.5) * this.shake
      sy = (Math.random() - 0.5) * this.shake
    }
    ctx.save()
    ctx.translate(W / 2 + sx, H / 2 + sy)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-W / 2, -H / 2)

    this.drawBackground()
    this.drawLanes()
    this.drawTokens()
    this.drawPowers()
    this.drawObstacles()
    this.drawTrail()
    this.drawPlayer()
    this.drawParticles()
    this.drawFloats()
    this.drawFlowOverlay()
    this.drawBanner()

    ctx.restore()

    if (this.zoneFlash > 0) {
      ctx.save()
      ctx.globalAlpha = this.zoneFlash
      ctx.fillStyle = this.zone.accent
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx
    const { W, H } = this
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, this.zone.bgTop)
    g.addColorStop(1, this.zone.bgBottom)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // Крупные пиксельные силуэты серверного города.
    const skylineScroll = (this.distance * 0.08) % 32
    ctx.save()
    ctx.globalAlpha = 0.34
    for (let i = 0; i < 11; i++) {
      const bw = 24 + ((i * 17) % 32)
      const bh = 60 + ((i * 43) % 150)
      const bx = (i * 71 - skylineScroll * (i % 2 ? 0.35 : 0.2)) % (W + 80) - 40
      const by = H * 0.42 - bh
      ctx.fillStyle = i % 2 ? '#07152b' : this.zone.bgTop
      ctx.fillRect(Math.floor(bx / 4) * 4, Math.floor(by / 4) * 4, bw, bh)
      ctx.fillStyle = this.zone.grid
      for (let wy = by + 12; wy < by + bh - 8; wy += 16) {
        ctx.fillRect(Math.floor((bx + 7) / 4) * 4, Math.floor(wy / 4) * 4, 4, 5)
      }
    }
    ctx.restore()

    // Параллакс "звёзды/биты".
    ctx.save()
    ctx.globalAlpha = 0.65
    const scroll = (this.distance * 0.3) % 40
    ctx.fillStyle = this.zone.grid
    for (let i = -1; i < H / 40 + 1; i++) {
      for (let j = 0; j < 5; j++) {
        const px = ((j * 97 + i * 53) % (W - 10)) + 5
        const py = i * 40 + scroll
        const bit = (i + j) % 4 === 0 ? 4 : 2
        ctx.fillRect(Math.floor(px / 2) * 2, Math.floor(py / 2) * 2, bit, bit)
      }
    }
    ctx.restore()
  }

  private drawLanes(): void {
    const ctx = this.ctx
    const { W, H } = this
    ctx.save()
    ctx.strokeStyle = this.zone.grid
    ctx.lineWidth = 3
    ctx.setLineDash([12, 8])
    ctx.lineDashOffset = this.distance % 20
    for (let i = 1; i < LANES; i++) {
      const x = this.laneWidth() * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    // Горизонтальные "шпалы" конвейера, скроллятся
    ctx.setLineDash([])
    const scroll = this.distance % 56
    ctx.globalAlpha = 0.42
    for (let y = -56 + scroll; y < H; y += 56) {
      for (let x = 0; x < W; x += 16) {
        ctx.fillStyle = (x / 16) % 2 === 0 ? this.zone.grid : 'rgba(255,255,255,0.025)'
        ctx.fillRect(x, Math.floor(y / 4) * 4, 10, 4)
      }
    }
    ctx.restore()
    void W
  }

  private drawTokens(): void {
    const ctx = this.ctx
    for (const t of this.tokenList) {
      if (t.taken) continue
      const x = t.x
      const size = this.playerSize * (t.golden ? 0.42 : 0.32)
      const pulse = 1 + Math.sin(this.time * 6 + t.y * 0.05) * 0.12
      ctx.save()
      ctx.translate(x, t.y)
      ctx.rotate(Math.round(this.time * 8) * Math.PI / 8)
      ctx.shadowBlur = 12
      ctx.shadowColor = t.golden ? '#ffd447' : this.zone.token
      ctx.fillStyle = t.golden ? '#ffd447' : this.zone.token
      const s = size * pulse
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.lineTo(s, 0)
      ctx.lineTo(0, s)
      ctx.lineTo(-s, 0)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillRect(-s * 0.34, -s * 0.42, Math.max(3, s * 0.18), Math.max(3, s * 0.18))
      ctx.restore()
    }
  }

  private drawPowers(): void {
    const ctx = this.ctx
    for (const p of this.powers) {
      if (p.taken) continue
      const x = this.laneX(p.lane)
      const meta = POWER_META[p.kind]
      const r = this.playerSize * 0.5
      const pulse = 1 + Math.sin(this.time * 5) * 0.1
      ctx.save()
      ctx.translate(x, p.y)
      ctx.shadowBlur = 22
      ctx.shadowColor = meta.color
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.beginPath()
      ctx.arc(0, 0, r * pulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = meta.color
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.font = `${Math.round(r * 1.1)}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(meta.emoji, 0, r * 0.05)
      ctx.restore()
    }
  }

  private drawObstacles(): void {
    const ctx = this.ctx
    for (const o of this.obstacles) {
      if (o.passed && o.y > this.playerY) continue
      const x = this.laneX(o.lane)
      if (o.blink && Math.floor(this.time * 6) % 2 === 0) continue // мигающие
      ctx.save()
      ctx.translate(x, o.y)
      ctx.shadowBlur = 14
      const color = o.type === 'wall' ? this.zone.obstacle : o.type === 'over' ? '#ff77aa' : '#ff9f45'
      ctx.shadowColor = color
      ctx.fillStyle = color
      const w = o.w
      const h = o.h
      if (o.type === 'wall') {
        ctx.fillRect(-w / 2, -h / 2, w, h)
        ctx.fillStyle = 'rgba(3,8,20,.55)'
        for (let yy = -h / 2 + 7; yy < h / 2; yy += 12) {
          for (let xx = -w / 2 + 6 + ((yy / 12) % 2) * 7; xx < w / 2 - 4; xx += 15) {
            ctx.fillRect(xx, yy, 8, 4)
          }
        }
      } else if (o.type === 'low') {
        // низкое препятствие (прыжок): пилообразное
        ctx.beginPath()
        ctx.moveTo(-w / 2, h / 2)
        const teeth = 4
        for (let i = 0; i <= teeth; i++) {
          const tx = -w / 2 + (w / teeth) * i
          ctx.lineTo(tx, i % 2 === 0 ? -h / 2 : h / 4)
        }
        ctx.lineTo(w / 2, h / 2)
        ctx.closePath()
        ctx.fill()
      } else {
        // overhead (подкат): висит сверху
        ctx.fillRect(-w / 2, -h / 2 - this.playerSize * 0.5, w, h)
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        for (let i = 0; i < 3; i++) ctx.fillRect(-w / 2 + 6 + i * (w / 3), -h / 2 - this.playerSize * 0.5 + 4, w / 4, 4)
      }
      ctx.restore()
    }
  }

  private drawTrail(): void {
    if (this.reduceMotion) return
    const ctx = this.ctx
    ctx.save()
    for (const t of this.trail) {
      const a = t.life / 0.3
      ctx.globalAlpha = a * 0.4 * (this.flowActive() ? 1.4 : 1)
      ctx.fillStyle = this.flowActive() ? '#7dffd6' : this.zone.accent
      ctx.beginPath()
      ctx.arc(t.x, t.y + this.jumpOffset(), this.playerSize * 0.4 * a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private jumpOffset(): number {
    if (this.jumpT <= 0) return 0
    const p = 1 - this.jumpT / this.jumpDur // 0..1
    const arc = Math.sin(p * Math.PI)
    return -arc * this.playerSize * 1.4
  }

  private drawPlayer(): void {
    const ctx = this.ctx
    const x = this.playerX
    const baseY = this.playerY
    const jo = this.jumpOffset()
    const sliding = this.slideT > 0
    const size = this.playerSize
    const invBlink = this.invincT > 0 && this.shieldT <= 0 && this.autopilotT <= 0 && Math.floor(this.time * 12) % 2 === 0

    // Тень (уменьшается в прыжке)
    ctx.save()
    const shadowScale = 1 - Math.abs(jo) / (size * 1.4) * 0.6
    ctx.globalAlpha = 0.35 * shadowScale
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(x, baseY + size * 0.55, size * 0.4 * shadowScale, size * 0.14 * shadowScale, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    if (invBlink) return

    ctx.save()
    ctx.translate(x, baseY + jo)
    const tilt = (this.targetX - this.playerX) * 0.006
    ctx.rotate(tilt)
    if (sliding) ctx.scale(1.15, 0.6)

    // Щит
    if (this.shieldT > 0) {
      ctx.save()
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 8) * 0.1
      ctx.shadowBlur = 20
      ctx.shadowColor = '#45c9ff'
      ctx.strokeStyle = '#45c9ff'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    const glow = this.flowActive() ? '#7dffd6' : this.autopilotT > 0 ? '#21e08a' : this.zone.accent
    ctx.shadowBlur = 18
    ctx.shadowColor = glow

    // Тело робота (Гена), собранное из крупных 8-bit кластеров.
    const px = Math.max(3, Math.round(size / 14))
    ctx.fillStyle = '#dfffee'
    ctx.fillRect(-size * 0.36, -size * 0.5, size * 0.72, size)
    ctx.fillRect(-size * 0.46, -size * 0.36, size * 0.92, size * 0.62)
    ctx.fillStyle = this.zone.accent
    ctx.fillRect(-size * 0.36, size * 0.34, size * 0.72, size * 0.16)
    ctx.fillRect(-size * 0.46, size * 0.12, px * 2, size * 0.18)
    ctx.fillRect(size * 0.46 - px * 2, size * 0.12, px * 2, size * 0.18)
    ctx.fillStyle = '#fff'
    ctx.fillRect(-size * 0.28, -size * 0.47, size * 0.38, px * 2)

    // Экран-лицо.
    ctx.shadowBlur = 0
    ctx.fillStyle = '#04121f'
    ctx.fillRect(-size * 0.31, -size * 0.31, size * 0.62, size * 0.47)
    ctx.fillStyle = '#0b2b3d'
    ctx.fillRect(-size * 0.25, -size * 0.25, size * 0.5, px)

    // Глаза
    ctx.fillStyle = glow
    const eyeY = -size * 0.08
    const blinkEye = Math.floor(this.time * 1.2) % 5 === 0 ? 0.3 : 1
    const eyeH = Math.max(px, size * 0.12 * blinkEye)
    ctx.fillRect(-size * 0.19, eyeY - eyeH / 2, px * 2, eyeH)
    ctx.fillRect(size * 0.19 - px * 2, eyeY - eyeH / 2, px * 2, eyeH)
    if (this.flowActive() || this.autopilotT > 0) {
      // улыбка в потоке
      ctx.fillRect(-px * 2, size * 0.03, px, px)
      ctx.fillRect(-px, size * 0.03 + px, px * 2, px)
      ctx.fillRect(px, size * 0.03, px, px)
    }

    // Антенна
    ctx.fillStyle = this.zone.accent
    ctx.fillRect(-px / 2, -size * 0.72, px, size * 0.24)
    ctx.fillStyle = glow
    ctx.shadowBlur = 12
    ctx.shadowColor = glow
    ctx.fillRect(-px * 1.2, -size * 0.79, px * 2.4, px * 2.4)

    ctx.restore()
  }

  private drawParticles(): void {
    const ctx = this.ctx
    for (const p of this.particles) {
      const a = p.life / p.maxLife
      ctx.save()
      ctx.globalAlpha = Math.max(0, a)
      ctx.fillStyle = p.color
      if (p.spark) {
        ctx.shadowBlur = 8
        ctx.shadowColor = p.color
      }
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawFloats(): void {
    const ctx = this.ctx
    for (const f of this.floats) {
      const a = Math.min(1, f.life / f.maxLife)
      ctx.save()
      ctx.globalAlpha = a
      ctx.font = `bold ${Math.round(18 * this.unit * f.scale)}px 'Courier New', ui-monospace, monospace`
      ctx.fillStyle = f.color
      ctx.textAlign = 'center'
      ctx.shadowBlur = 8
      ctx.shadowColor = f.color
      ctx.fillText(f.text, f.x, f.y)
      ctx.restore()
    }
  }

  private drawFlowOverlay(): void {
    if (!this.flowActive() || this.reduceMotion) return
    const ctx = this.ctx
    const { W, H } = this
    ctx.save()
    const pulse = 0.3 + Math.sin(this.time * 8) * 0.15
    ctx.globalAlpha = pulse
    ctx.strokeStyle = '#7dffd6'
    ctx.lineWidth = 8
    ctx.shadowBlur = 30
    ctx.shadowColor = '#7dffd6'
    ctx.strokeRect(6, 6, W - 12, H - 12)
    ctx.restore()
  }

  private drawBanner(): void {
    if (this.bannerT <= 0) return
    const ctx = this.ctx
    const { W, H } = this
    const a = Math.min(1, this.bannerT / 0.4)
    ctx.save()
    ctx.globalAlpha = a
    ctx.textAlign = 'center'
    const lap = lapLabel(this.zoneCounter)
    ctx.font = `bold ${Math.round(34 * this.unit)}px 'Courier New', ui-monospace, monospace`
    ctx.fillStyle = this.zone.accent
    ctx.shadowBlur = 20
    ctx.shadowColor = this.zone.accent
    ctx.fillText(`${this.zone.emoji} ${this.zone.name.toUpperCase()}`, W / 2, H * 0.32)
    if (lap) {
      ctx.font = `bold ${Math.round(16 * this.unit)}px 'Courier New', ui-monospace, monospace`
      ctx.fillStyle = '#ff5555'
      ctx.fillText(lap, W / 2, H * 0.32 + 30 * this.unit)
    }
    ctx.restore()
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // Публично для превью в меню
  renderStatic(): void {
    this.zone = getZone(0)
    this.playerX = this.laneX(1)
    this.targetX = this.playerX
    this.render()
  }

  getInventory(): PowerKind | null {
    return this.inventory
  }
}
