// AI PDLC RUSH v2 — вертикальный скролл-шутер. Перенос из интерактивного макета (rush-shooter.js) в TypeScript.
// Игрок ведёт агента пальцем, агент стреляет сам. Контекст-токены = топливо/HP.
// Боссы-«болезни агента», сбор харнеса → Dark Factory ×2, апгрейды AGENT.MD/SKILL.MD/SUBAGENT, перки.

import { GameAudio } from './audio'
import { mulberry32, RNG } from './rng'
import { C, CAP_STEPS, capLabel, drawMap, ENEMY_DEF, fmtInt, HARNESS, MAPS, STAGES, Stage } from './sprites'

export type GameState = 'ready' | 'playing' | 'gameover'
type Phase = 'intro' | 'wave' | 'boss' | 'clear'
type Emo = 'ok' | 'worry' | 'hurt' | 'happy'

export interface IntroCard {
  kind: 'stage' | 'boss' | 'clear' | 'dark'
  title: string
  sub: string
  legend: string
  sprite: string
}

export interface Stats {
  score: number
  best: number
  tokens: number
  cap: number
  capLabel: string
  tokenPct: number
  stageName: string
  stageAccent: string
  lap: string
  agentLvl: number
  skillLvl: number
  subs: number
  harness: string[]
  darkFactory: boolean
  compress: boolean
  combo: number
  boss: { name: string; pct: number } | null
  intro: IntroCard | null
  kills: number
}

export interface GameResult {
  score: number
  base: number
  tokenBonus: number
  harnessBonus: number
  victoryBonus: number
  won: boolean
  kills: number
  barrels: number
  stageName: string
  harness: number
  darkFactory: boolean
  capLabel: string
  agentLvl: number
  subs: number
}

interface Enemy {
  kind: string
  x: number
  y: number
  hp: number
  maxHp: number
  vy: number
  phase: number
  baseX: number
  flash: number
  small: boolean
}
interface Bullet {
  x: number
  y: number
  vy: number
  dmg: number
  vx?: number
  sub?: boolean
  dead?: boolean
}
interface Orb {
  x: number
  y: number
  vx: number
  vy: number
}
interface Pickup {
  kind: string
  x: number
  y: number
  vy: number
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
interface Boss {
  x: number
  y: number
  ty: number
  hp: number
  maxHp: number
  phase: number
  shootAcc: number
  minionAcc: number
  flash: number
}
interface DropItem {
  t: number
  kind: string
  done?: boolean
}

export class Engine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  audio = new GameAudio()

  private W = 450
  private H = 800
  private unit = 1
  private dpr = 1

  state: GameState = 'ready'
  private raf = 0
  private lastTime = 0
  private time = 0
  private best = 0
  private reduceMotion = false
  private startIdx = 0

  onStats: (s: Stats) => void = () => undefined
  onGameOver: (r: GameResult) => void = () => undefined

  private rng: RNG = mulberry32(1)
  private stageIdx = 0
  private lap = 0
  private stage: Stage = STAGES[0]
  private phase: Phase = 'intro'
  private phaseT = 0
  private waveT = 0
  private spawnAcc = 0
  private dropQueue: DropItem[] = []
  private px2 = 0
  private py2 = 0
  private tx = 0
  private ty = 0
  private capLevel = 0
  private tokens = CAP_STEPS[0]
  private agentLvl = 1
  private skillLvl = 0
  private subs = 0
  private harness: string[] = []
  private darkFactory = false
  private compressT = 0
  private invincT = 0
  private fireAcc = 0
  private subFireAcc = 0
  private emo: Emo = 'ok'
  private emoT = 0
  private score = 0
  private kills = 0
  private barrels = 0
  private combo = 0
  private comboT = 0
  private enemies: Enemy[] = []
  private bullets: Bullet[] = []
  private orbs: Orb[] = []
  private pickups: Pickup[] = []
  private particles: Particle[] = []
  private floats: FloatText[] = []
  private boss: Boss | null = null
  private shake = 0
  private statsAcc = 0
  private lowTokT = 0
  private intro: IntroCard | null = null
  private distance = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    this.resetVars()
  }

  private resetVars(): void {
    this.rng = mulberry32(1)
    this.stageIdx = 0
    this.lap = 0
    this.stage = STAGES[0]
    this.phase = 'intro'
    this.phaseT = 0
    this.waveT = 0
    this.spawnAcc = 0
    this.dropQueue = []
    this.px2 = 0
    this.py2 = 0
    this.tx = 0
    this.ty = 0
    this.capLevel = 0
    this.tokens = CAP_STEPS[0]
    this.agentLvl = 1
    this.skillLvl = 0
    this.subs = 0
    this.harness = []
    this.darkFactory = false
    this.compressT = 0
    this.invincT = 0
    this.fireAcc = 0
    this.subFireAcc = 0
    this.emo = 'ok'
    this.emoT = 0
    this.score = 0
    this.kills = 0
    this.barrels = 0
    this.combo = 0
    this.comboT = 0
    this.enemies = []
    this.bullets = []
    this.orbs = []
    this.pickups = []
    this.particles = []
    this.floats = []
    this.boss = null
    this.shake = 0
    this.statsAcc = 0
    this.lowTokT = 0
    this.intro = null
    this.distance = 0
  }

  setBest(b: number): void {
    this.best = b
  }
  setReduceMotion(v: boolean): void {
    this.reduceMotion = v
  }
  setMuted(m: boolean): void {
    this.audio.setMuted(m)
  }
  setStartStage(i: number): void {
    this.startIdx = Math.max(0, Math.min(5, i | 0))
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.W = cssW
    this.H = cssH
    this.dpr = dpr
    this.unit = cssH / 800
    this.canvas.width = Math.round(cssW * dpr)
    this.canvas.height = Math.round(cssH * dpr)
    if (this.state !== 'playing') {
      this.px2 = cssW / 2
      this.py2 = cssH * 0.8
      this.tx = this.px2
      this.ty = this.py2
      this.renderStatic()
    }
  }

  private pu(): number {
    return Math.max(2, Math.round(4 * this.unit))
  }

  // --- управление: палец задаёт цель ---
  setTarget(x: number, y: number): void {
    this.tx = Math.max(20, Math.min(this.W - 20, x))
    this.ty = Math.max(this.H * 0.42, Math.min(this.H - 40, y))
  }
  nudge(dx: number, dy: number): void {
    this.setTarget(this.tx + dx, this.ty + dy)
  }

  start(seed: number): void {
    this.resetVars()
    this.rng = mulberry32(seed >>> 0)
    this.px2 = this.W / 2
    this.py2 = this.H * 0.8
    this.tx = this.px2
    this.ty = this.py2
    this.state = 'playing'
    this.startStage(this.startIdx, 0)
    this.audio.resume()
    this.audio.startMusic()
    this.emitStats()
    this.lastTime = 0
    this.loop(performance.now())
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.audio.stopMusic()
  }
  pause(): void {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    this.lastTime = 0
  }
  resumeLoop(): void {
    if (this.state === 'playing' && !this.raf) this.loop(performance.now())
  }

  private startStage(idx: number, lap: number): void {
    this.stageIdx = idx
    this.lap = lap
    this.stage = STAGES[idx]
    this.phase = 'intro'
    this.phaseT = 2.6
    this.waveT = 0
    this.intro = {
      kind: 'stage',
      title: this.stage.enemyName,
      sub: this.stage.name.toUpperCase() + (lap > 0 ? ' · ПРОД В ОГНЕ' : ''),
      legend: this.stage.legend,
      sprite: this.stage.enemy,
    }
    this.dropQueue = [
      { t: 4, kind: 'doc_agent' },
      { t: 8, kind: 'barrel' },
      { t: 12, kind: 'doc_skill' },
      { t: 16, kind: 'barrel' },
      { t: 20, kind: this.rng() < 0.5 ? 'perk_zip' : 'perk_win' },
    ]
    if (idx === 1 || idx === 3 || lap > 0) this.dropQueue.push({ t: 14, kind: 'mini' })
    this.audio.stage()
    this.emitStats()
  }

  private loop = (now: number): void => {
    if (!this.lastTime) this.lastTime = now
    let dt = (now - this.lastTime) / 1000
    this.lastTime = now
    if (dt > 0.05) dt = 0.05
    if (this.state === 'playing') this.update(dt)
    this.render()
    if (this.state === 'playing') this.raf = requestAnimationFrame(this.loop)
    else this.raf = 0
  }

  private diff(): number {
    return Math.min(1, this.stageIdx / 5 + this.time / 240)
  }
  private cap(): number {
    return CAP_STEPS[this.capLevel]
  }

  private update(dt: number): void {
    this.time += dt
    this.distance += 120 * this.unit * dt
    this.invincT = Math.max(0, this.invincT - dt)
    this.compressT = Math.max(0, this.compressT - dt)
    if (this.emoT > 0) {
      this.emoT -= dt
      if (this.emoT <= 0) this.emo = 'ok'
    }
    if (this.comboT > 0) {
      this.comboT -= dt
      if (this.comboT <= 0) this.combo = 0
    }

    // движение игрока
    const lerp = 1 - Math.pow(0.0004, dt)
    this.px2 += (this.tx - this.px2) * lerp
    this.py2 += (this.ty - this.py2) * lerp

    // расход токенов
    let burn = 130 * (1 + this.stageIdx * 0.09 + this.lap * 0.4) * Math.pow(0.85, this.skillLvl)
    if (this.compressT > 0) burn *= 0.55
    let aura = false
    if (this.stage.enemy === 'rot') {
      for (const e of this.enemies) {
        if (e.kind === 'rot' && Math.hypot(e.x - this.px2, e.y - this.py2) < 110 * this.unit) {
          aura = true
          break
        }
      }
    }
    if (aura) burn *= 2
    this.tokens -= burn * dt
    if (this.tokens / this.cap() < 0.2) {
      if (this.emo === 'ok') this.emo = 'worry'
      this.lowTokT -= dt
      if (this.lowTokT <= 0) {
        this.lowTokT = 0.9
        this.audio.lowTok()
      }
    } else if (this.emo === 'worry' && this.emoT <= 0 && !aura) {
      this.emo = 'ok'
    }
    if (aura && this.emo === 'ok') this.emo = 'worry'
    if (this.tokens <= 0) {
      this.tokens = 0
      this.gameOver()
      return
    }

    // стрельба
    const fireRate = this.agentLvl >= 3 ? 5 : 4
    this.fireAcc += dt
    const shotCost = 10 * Math.pow(0.88, this.skillLvl)
    if (this.fireAcc >= 1 / fireRate) {
      this.fireAcc = 0
      this.fire(this.px2, this.py2 - 26 * this.unit, this.agentLvl)
      this.tokens = Math.max(1, this.tokens - shotCost)
    }
    if (this.subs > 0 || this.darkFactory) {
      this.subFireAcc += dt
      if (this.subFireAcc >= 0.5) {
        this.subFireAcc = 0
        const offs: number[] = []
        if (this.subs >= 1) offs.push(-38)
        if (this.subs >= 2) offs.push(38)
        if (this.darkFactory) {
          offs.push(-64)
          offs.push(64)
        }
        for (const o of offs)
          this.bullets.push({ x: this.px2 + o * this.unit, y: this.py2 - 8 * this.unit, vy: -460 * this.unit, dmg: 1, sub: true })
        this.audio.shot()
      }
    }

    // фазы этапа
    this.phaseT = Math.max(0, this.phaseT - dt)
    if (this.phase === 'intro' && this.phaseT <= 0) {
      this.phase = 'wave'
      this.waveT = 0
      this.intro = null
    } else if (this.phase === 'wave') {
      this.waveT += dt
      this.spawnAcc += dt
      const interval = Math.max(0.35, 1.3 - this.diff() * 0.6 - this.stageIdx * 0.09)
      if (this.spawnAcc >= interval) {
        this.spawnAcc -= interval
        this.spawnEnemy()
      }
      for (const d of this.dropQueue) {
        if (!d.done && this.waveT >= d.t) {
          d.done = true
          this.spawnPickup(d.kind)
        }
      }
      if (this.waveT >= 24) this.startBoss()
    } else if (this.phase === 'clear' && this.phaseT <= 0) {
      this.startStage(this.stageIdx + 1, 0)
    }

    this.updateEntities(dt)
    this.collide()
    this.updateParticles(dt)
    this.shake *= Math.pow(0.001, dt)
    if (this.shake < 0.05) this.shake = 0

    this.statsAcc += dt
    if (this.statsAcc >= 0.066) {
      this.statsAcc = 0
      this.emitStats()
    }
  }

  private fire(x: number, y: number, lvl: number): void {
    const v = -560 * this.unit
    if (lvl <= 1) this.bullets.push({ x, y, vy: v, dmg: 1 })
    else if (lvl === 2) {
      this.bullets.push({ x: x - 8 * this.unit, y, vy: v, dmg: 1 })
      this.bullets.push({ x: x + 8 * this.unit, y, vy: v, dmg: 1 })
    } else {
      this.bullets.push({ x: x - 10 * this.unit, y, vy: v, dmg: 1, vx: -60 * this.unit })
      this.bullets.push({ x, y, vy: v, dmg: 2 })
      this.bullets.push({ x: x + 10 * this.unit, y, vy: v, dmg: 1, vx: 60 * this.unit })
    }
    this.audio.shot()
  }

  private spawnEnemy(): void {
    const kind = this.stage.enemy
    const def = ENEMY_DEF[kind]
    const x = 30 + this.rng() * (this.W - 60)
    const hp = def.hp + Math.floor(this.stageIdx / 2)
    this.enemies.push({
      kind,
      x,
      y: -40 * this.unit,
      hp,
      maxHp: hp,
      vy: def.vy * this.unit * (0.9 + this.rng() * 0.3) * (1 + this.stageIdx * 0.12 + this.diff() * 0.4),
      phase: this.rng() * Math.PI * 2,
      baseX: x,
      flash: 0,
      small: false,
    })
  }

  private spawnPickup(kind: string, x?: number, y?: number): void {
    this.pickups.push({
      kind,
      x: x != null ? x : 30 + this.rng() * (this.W - 60),
      y: y != null ? y : -30 * this.unit,
      vy: 95 * this.unit,
    })
  }

  private startBoss(): void {
    this.phase = 'boss'
    this.enemies = this.enemies.filter((e) => e.y < this.H * 0.5)
    const hp = 30 + this.stageIdx * 14 + (this.stageIdx === 5 ? 22 : 0)
    this.boss = { x: this.W / 2, y: -80 * this.unit, ty: this.H * 0.2, hp, maxHp: hp, phase: 0, shootAcc: 0, minionAcc: 0, flash: 0 }
    this.intro = {
      kind: 'boss',
      title: this.stage.boss,
      sub: 'БОСС ЭТАПА · БОЛЕЗНЬ АГЕНТА',
      legend: this.stage.bossLegend,
      sprite: this.stage.enemy,
    }
    this.phaseT = 2.2
    this.audio.bossIn()
    this.emitStats()
  }

  private updateEntities(dt: number): void {
    for (const b of this.bullets) {
      b.y += b.vy * dt
      if (b.vx) b.x += b.vx * dt
    }
    this.bullets = this.bullets.filter((b) => b.y > -30)
    for (const o of this.orbs) {
      o.x += o.vx * dt
      o.y += o.vy * dt
    }
    this.orbs = this.orbs.filter((o) => o.y < this.H + 30 && o.x > -30 && o.x < this.W + 30)
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt)
      e.phase += dt * 3
      e.y += e.vy * dt
      if (e.kind === 'slop') e.x = e.baseX + Math.sin(e.phase) * 26 * this.unit
      else if (e.kind === 'hallu') e.x = e.baseX + Math.sin(e.phase * 1.6) * 48 * this.unit
      else if (e.kind === 'loop') e.x = e.baseX + Math.cos(e.phase * 2) * 40 * this.unit
    }
    this.enemies = this.enemies.filter((e) => e.y < this.H + 60 && e.hp > 0)
    for (const p of this.pickups) p.y += p.vy * dt
    this.pickups = this.pickups.filter((p) => p.y < this.H + 40)
    if (this.boss) {
      const b = this.boss
      b.flash = Math.max(0, b.flash - dt)
      b.phase += dt
      if (b.y < b.ty) b.y += 70 * this.unit * dt
      else {
        b.x = this.W / 2 + Math.sin(b.phase * 0.8) * this.W * 0.28
        if (this.phaseT <= 0) {
          b.shootAcc += dt
          if (b.shootAcc > Math.max(0.75, 1.7 - this.diff() * 0.4 - this.stageIdx * 0.14)) {
            b.shootAcc = 0
            const ang = Math.atan2(this.py2 - b.y, this.px2 - b.x)
            const n = this.stageIdx >= 3 ? 2 : 1
            for (let i = -n; i <= n; i++) {
              const a = ang + i * (n === 2 ? 0.17 : 0.22)
              this.orbs.push({
                x: b.x,
                y: b.y + 20 * this.unit,
                vx: Math.cos(a) * (170 + this.stageIdx * 14) * this.unit,
                vy: Math.sin(a) * (170 + this.stageIdx * 14) * this.unit,
              })
            }
          }
          b.minionAcc += dt
          if (b.minionAcc > Math.max(2.4, 4.5 - this.stageIdx * 0.4)) {
            b.minionAcc = 0
            this.spawnEnemy()
            this.spawnEnemy()
          }
        }
      }
    }
  }

  private collide(): void {
    const u = this.unit
    for (const b of this.bullets) {
      if (b.dead) continue
      for (const e of this.enemies) {
        if (e.hp <= 0) continue
        if (e.kind === 'hallu' && Math.floor(e.phase * 2) % 2 === 1) continue
        const r = (ENEMY_DEF[e.kind].r * 40 + 8) * u * (e.small ? 0.6 : 1)
        if (Math.abs(b.x - e.x) < r && Math.abs(b.y - e.y) < r) {
          b.dead = true
          this.damageEnemy(e, b.dmg)
          break
        }
      }
      if (!b.dead && this.boss && this.boss.y > 0) {
        const bs = this.boss
        if (Math.abs(b.x - bs.x) < 52 * u && Math.abs(b.y - bs.y) < 40 * u) {
          b.dead = true
          this.damageBoss(b.dmg)
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead)
    if (this.invincT <= 0) {
      for (const e of this.enemies) {
        if (e.hp <= 0) continue
        if (Math.hypot(e.x - this.px2, e.y - this.py2) < 34 * u) {
          e.hp = 0
          this.burst(e.x, e.y, C.danger, 14)
          this.hurt()
          break
        }
      }
      if (this.invincT <= 0) {
        for (const o of this.orbs) {
          if (Math.hypot(o.x - this.px2, o.y - this.py2) < 26 * u) {
            o.y = this.H + 99
            this.hurt()
            break
          }
        }
      }
    }
    for (const p of this.pickups) {
      if (Math.hypot(p.x - this.px2, p.y - this.py2) < 42 * u) {
        p.y = this.H + 99
        this.takePickup(p.kind)
      }
    }
  }

  private damageEnemy(e: Enemy, dmg: number): void {
    e.hp -= dmg
    e.flash = 0.08
    if (e.hp <= 0) {
      this.kills++
      this.combo++
      this.comboT = 3
      const mult = Math.min(5, 1 + Math.floor(this.combo / 5)) * (this.darkFactory ? 2 : 1)
      const sc = ENEMY_DEF[e.kind].score * mult
      this.score += sc
      this.addFloat(e.x, e.y, `+${sc}`, C.bright, 0.8, 1)
      this.burst(e.x, e.y, C.danger, 10)
      this.audio.kill()
      if (e.kind === 'slop' && !e.small) {
        for (let i = -1; i <= 1; i += 2)
          this.enemies.push({
            kind: 'slop',
            x: e.x + i * 16 * this.unit,
            y: e.y,
            hp: 1,
            maxHp: 1,
            vy: e.vy * 1.25,
            phase: this.rng() * 6,
            baseX: e.x + i * 16 * this.unit,
            flash: 0,
            small: true,
          })
      }
      if (this.rng() < 0.14) this.spawnPickup('barrel', e.x, e.y)
    }
  }

  private damageBoss(dmg: number): void {
    const b = this.boss
    if (!b) return
    b.hp -= dmg
    b.flash = 0.08
    if (b.hp <= 0) {
      this.audio.bossDie()
      this.burst(b.x, b.y, C.gold, 34)
      this.shake = 10 * this.unit
      const sc = 1000 * (this.darkFactory ? 2 : 1)
      this.score += sc
      this.boss = null
      this.orbs = []
      if (this.stageIdx === 5) {
        this.finish(true)
        return
      }
      this.addFloat(b.x, b.y, `БОСС ПОВЕРЖЕН +${sc}`, C.gold, 1.4, 1.2)
      if (this.harness.length < 5) this.spawnPickup('harness', b.x, b.y)
      this.spawnPickup('barrel', b.x - 30 * this.unit, b.y)
      this.spawnPickup('barrel', b.x + 30 * this.unit, b.y)
      if (this.stageIdx % 2 === 1) this.spawnPickup('perk_win', b.x, b.y - 20 * this.unit)
      this.phase = 'clear'
      this.phaseT = 2.4
      const refill = Math.round(this.cap() * 0.4)
      this.tokens = Math.min(this.cap(), this.tokens + refill)
      this.intro = {
        kind: 'clear',
        title: 'ЭТАП ПРОЙДЕН',
        sub: 'RALPH LOOP · СВЕЖИЙ КОНТЕКСТ',
        legend: `+${fmtInt(refill)} токенов — контекст перезапущен`,
        sprite: 'ship',
      }
      this.setEmo('happy', 2)
      this.emitStats()
    }
  }

  private hurt(): void {
    const loss = Math.round(this.cap() * 0.13)
    this.tokens = Math.max(0, this.tokens - loss)
    this.invincT = 1.2
    this.combo = 0
    this.shake = 9 * this.unit
    this.setEmo('hurt', 1)
    this.audio.hit()
    if (navigator.vibrate) {
      try {
        navigator.vibrate(100)
      } catch {
        /* ignore */
      }
    }
    this.addFloat(this.px2, this.py2 - 44 * this.unit, `−${fmtInt(loss)} токенов`, C.danger, 1, 1.1)
    if (this.tokens <= 0) this.gameOver()
  }

  private setEmo(e: Emo, t: number): void {
    this.emo = e
    this.emoT = t
  }

  private takePickup(kind: string): void {
    const u = this.unit
    if (kind === 'barrel') {
      const add = Math.round(this.cap() * 0.16)
      this.tokens = Math.min(this.cap(), this.tokens + add)
      this.barrels++
      this.addFloat(this.px2, this.py2 - 40 * u, `+${fmtInt(add)} токенов`, C.bright, 0.9, 1)
      this.audio.pickup()
    } else if (kind === 'doc_agent') {
      if (this.agentLvl < 3) this.agentLvl++
      this.addFloat(this.px2, this.py2 - 46 * u, `AGENT.MD · огонь ур.${this.agentLvl}`, C.bright, 1.2, 1.1)
      this.audio.upgrade()
    } else if (kind === 'doc_skill') {
      if (this.skillLvl < 3) this.skillLvl++
      this.addFloat(this.px2, this.py2 - 46 * u, `SKILL.MD · расход −${100 - Math.round(Math.pow(0.85, this.skillLvl) * 100)}%`, C.blue, 1.2, 1.1)
      this.audio.upgrade()
    } else if (kind === 'mini') {
      if (this.subs < 2) this.subs++
      this.addFloat(this.px2, this.py2 - 46 * u, `SUBAGENT ×${this.subs}`, C.bright, 1.2, 1.1)
      this.audio.upgrade()
    } else if (kind === 'perk_zip') {
      this.compressT = 18
      this.addFloat(this.px2, this.py2 - 46 * u, 'СЖАТИЕ КОНТЕКСТА −45%', C.blue, 1.2, 1.1)
      this.audio.upgrade()
    } else if (kind === 'perk_win') {
      if (this.capLevel < 4) {
        this.capLevel++
        this.tokens = Math.min(this.cap(), this.tokens + this.cap() * 0.35)
        this.addFloat(this.px2, this.py2 - 46 * u, `ОКНО → ${capLabel(this.capLevel)} ТОКЕНОВ`, C.gold, 1.3, 1.2)
      } else {
        this.tokens = this.cap()
        this.addFloat(this.px2, this.py2 - 46 * u, 'ОКНО ПОЛНОЕ · РЕФИЛЛ', C.gold, 1, 1)
      }
      this.audio.upgrade()
    } else if (kind === 'harness') {
      const part = HARNESS[Math.min(this.harness.length, 4)]
      this.harness.push(part)
      this.addFloat(this.px2, this.py2 - 52 * u, `ХАРНЕС: ${part}`, C.gold, 1.5, 1.25)
      this.audio.upgrade()
      if (this.harness.length >= 5 && !this.darkFactory) {
        this.darkFactory = true
        this.intro = {
          kind: 'dark',
          title: 'DARK FACTORY',
          sub: 'ХАРНЕС СОБРАН · СУДЬИ В ДЕЛЕ',
          legend: 'Судьи стреляют сами. Все очки ×2',
          sprite: 'ship',
        }
        this.phaseT = Math.max(this.phaseT, 2.2)
        this.shake = 6 * this.unit
      }
    }
    this.setEmo('happy', 0.8)
    this.emitStats()
  }

  private addFloat(x: number, y: number, text: string, color: string, life: number, scale: number): void {
    this.floats.push({ x, y, text, color, life, maxLife: life, vy: -46 * this.unit, scale })
  }

  private burst(x: number, y: number, color: string, n: number): void {
    if (this.reduceMotion) n = Math.ceil(n / 3)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = (40 + Math.random() * 170) * this.unit
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.25 + Math.random() * 0.35,
        maxLife: 0.6,
        color,
        size: (2 + Math.random() * 2) * this.unit,
      })
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
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
    this.finish(false)
  }

  private finish(won: boolean): void {
    if (this.state !== 'playing') return
    this.state = 'gameover'
    if (won) this.audio.upgrade()
    else this.audio.gameOver()
    this.audio.stopMusic()
    this.shake = 10 * this.unit
    const base = Math.floor(this.score)
    const tokenBonus = Math.round((Math.max(0, this.tokens) / this.cap()) * 2000)
    const harnessBonus = this.harness.length * 600
    const victoryBonus = won ? 5000 : 0
    const total = base + tokenBonus + harnessBonus + victoryBonus
    this.score = total
    this.emitStats()
    this.onGameOver({
      score: total,
      base,
      tokenBonus,
      harnessBonus,
      victoryBonus,
      won,
      kills: this.kills,
      barrels: this.barrels,
      stageName: this.stage.name,
      harness: this.harness.length,
      darkFactory: this.darkFactory,
      capLabel: capLabel(this.capLevel),
      agentLvl: this.agentLvl,
      subs: this.subs,
    })
  }

  private emitStats(): void {
    this.onStats({
      score: Math.floor(this.score),
      best: this.best,
      tokens: Math.max(0, Math.floor(this.tokens)),
      cap: this.cap(),
      capLabel: capLabel(this.capLevel),
      tokenPct: Math.max(0, Math.min(1, this.tokens / this.cap())),
      stageName: this.stage.name,
      stageAccent: this.stage.accent,
      lap: this.lap > 0 ? 'ПРОД В ОГНЕ' : '',
      agentLvl: this.agentLvl,
      skillLvl: this.skillLvl,
      subs: this.subs,
      harness: this.harness.slice(),
      darkFactory: this.darkFactory,
      compress: this.compressT > 0,
      combo: this.combo,
      boss: this.boss ? { name: this.stage.boss, pct: Math.max(0, this.boss.hp / this.boss.maxHp) } : null,
      intro: this.intro && this.phaseT > 0 ? this.intro : null,
      kills: this.kills,
    })
  }

  // ---------- render ----------
  render(): void {
    const ctx = this.ctx
    const { W, H, dpr } = this
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, W, H)
    let sx = 0
    let sy = 0
    if (this.shake > 0 && !this.reduceMotion) {
      sx = (Math.random() - 0.5) * this.shake
      sy = (Math.random() - 0.5) * this.shake
    }
    ctx.save()
    ctx.translate(Math.round(sx), Math.round(sy))
    this.drawBg()
    this.drawPickups()
    this.drawEnemies()
    this.drawBoss()
    this.drawBullets()
    this.drawPlayer()
    this.drawParticles()
    this.drawFloats()
    if (this.darkFactory) {
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.fillStyle = C.gold
      ctx.fillRect(2, 0, 2, H)
      ctx.fillRect(W - 4, 0, 2, H)
      ctx.restore()
    }
    ctx.restore()
  }

  private drawBg(): void {
    const ctx = this.ctx
    const { W, H } = this
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, this.stage.tint)
    g.addColorStop(0.6, C.bg0)
    g.addColorStop(1, C.bg0)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.fillStyle = C.steel
    const scroll = (this.distance * 0.6) % 48
    for (let i = -1; i < H / 48 + 1; i++) {
      for (let j = 0; j < 4; j++) {
        const px3 = ((j * 113 + i * 59) % (W - 12)) + 6
        ctx.fillRect(Math.round(px3), Math.round(i * 48 + scroll), 2, 2)
      }
    }
    ctx.globalAlpha = 0.1
    ctx.fillStyle = this.stage.accent
    const s2 = (this.distance * 1.4) % 160
    for (let y = -160 + s2; y < H; y += 160) ctx.fillRect(0, Math.round(y), W, 2)
    ctx.restore()
  }

  private drawBullets(): void {
    const ctx = this.ctx
    for (const b of this.bullets) {
      ctx.fillStyle = b.sub ? C.cyan : C.bright
      const w = b.dmg > 1 ? 6 : 4
      ctx.fillRect(Math.round(b.x - w / 2), Math.round(b.y - 8), w, 12)
    }
    for (const o of this.orbs) {
      ctx.fillStyle = C.danger
      ctx.fillRect(Math.round(o.x - 5), Math.round(o.y - 5), 10, 10)
      ctx.fillStyle = C.white
      ctx.fillRect(Math.round(o.x - 2), Math.round(o.y - 2), 4, 4)
    }
  }

  private enemyMap(e: { kind: string; phase: number }): string[] {
    const fr = Math.floor(e.phase * 4) % 2
    if (e.kind === 'slop') return fr ? MAPS.slop2 : MAPS.slop1
    if (e.kind === 'loop') return fr ? MAPS.loop2 : MAPS.loop1
    if (e.kind === 'olddev') return MAPS.olddev
    if (e.kind === 'legacy') return MAPS.legacy
    if (e.kind === 'hallu') return MAPS.hallu
    return MAPS.rot
  }

  private drawEnemies(): void {
    const ctx = this.ctx
    for (const e of this.enemies) {
      if (e.hp <= 0) continue
      const map = this.enemyMap(e)
      let p = Math.max(2, Math.round(this.pu() * (e.small ? 0.7 : 1.05)))
      if (e.kind === 'legacy') p = Math.max(2, Math.round(this.pu() * 1.15))
      const mw = map[0].length * p
      const mh = map.length * p
      ctx.save()
      if (e.kind === 'hallu') {
        const vis = Math.floor(e.phase * 2) % 2 === 0
        ctx.globalAlpha = vis ? 1 : 0.22
      }
      const bob = e.kind === 'olddev' ? Math.round(Math.sin(e.phase * 3) * 1.5) * 2 : 0
      drawMap(ctx, map, Math.round(e.x - mw / 2), Math.round(e.y - mh / 2 + bob), p)
      if (e.flash > 0) {
        ctx.globalAlpha = 0.75
        ctx.fillStyle = C.white
        ctx.fillRect(Math.round(e.x - mw / 2), Math.round(e.y - mh / 2), mw, mh)
      }
      if (e.maxHp > 1) {
        ctx.globalAlpha = 1
        for (let i = 0; i < e.maxHp; i++) {
          ctx.fillStyle = i < e.hp ? C.danger : 'rgba(230,242,238,0.25)'
          ctx.fillRect(Math.round(e.x - mw / 2 + i * 8), Math.round(e.y - mh / 2 - 7), 6, 3)
        }
      }
      ctx.restore()
    }
  }

  private drawBoss(): void {
    if (!this.boss) return
    const ctx = this.ctx
    const b = this.boss
    const map = this.enemyMap({ kind: this.stage.enemy, phase: b.phase * 2 })
    const p = Math.max(3, Math.round(this.pu() * 2.1))
    const mw = map[0].length * p
    const mh = map.length * p
    ctx.save()
    drawMap(ctx, map, Math.round(b.x - mw / 2), Math.round(b.y - mh / 2), p)
    ctx.fillStyle = C.gold
    for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(b.x - 12 + i * 10), Math.round(b.y - mh / 2 - 10), 5, 8)
    if (b.flash > 0) {
      ctx.globalAlpha = 0.7
      ctx.fillStyle = C.white
      ctx.fillRect(Math.round(b.x - mw / 2), Math.round(b.y - mh / 2), mw, mh)
    }
    ctx.restore()
  }

  private drawPickups(): void {
    const ctx = this.ctx
    for (const pk of this.pickups) {
      const map = MAPS[pk.kind] || MAPS.barrel
      const p = Math.max(2, Math.round(this.pu() * 0.9))
      const mw = map[0].length * p
      const mh = map.length * p
      const bob = Math.round(Math.sin(this.time * 4 + pk.x) * 1.5) * 2
      drawMap(ctx, map, Math.round(pk.x - mw / 2), Math.round(pk.y - mh / 2 + bob), p)
    }
  }

  private drawPlayer(): void {
    const ctx = this.ctx
    if (this.invincT > 0 && Math.floor(this.time * 12) % 2 === 0 && this.state === 'playing') return
    const p = this.pu()
    const map = MAPS.ship
    const mw = map[0].length * p
    const mh = map.length * p
    const tilt = Math.max(-0.16, Math.min(0.16, (this.tx - this.px2) * 0.004))
    ctx.save()
    ctx.translate(Math.round(this.px2), Math.round(this.py2))
    ctx.rotate(tilt)
    const fr = Math.floor(this.time * 14) % 2
    ctx.fillStyle = C.cyan
    ctx.fillRect(-p * 2.5, mh / 2 - p, p * 2, fr ? p * 3 : p * 2)
    ctx.fillRect(p * 0.5, mh / 2 - p, p * 2, fr ? p * 2 : p * 3)
    ctx.fillStyle = C.white
    ctx.fillRect(-p * 2, mh / 2 - p, p, p)
    ctx.fillRect(p, mh / 2 - p, p, p)
    drawMap(ctx, map, -mw / 2, -mh / 2, p)
    this.drawFace(ctx, -mw / 2, -mh / 2, p)
    if (this.compressT > 0) {
      ctx.globalAlpha = 0.4 + Math.sin(this.time * 6) * 0.12
      ctx.strokeStyle = C.blue
      ctx.lineWidth = 2
      ctx.strokeRect(-mw / 2 - 2 * p, -mh / 2 - 2 * p, mw + 4 * p, mh + 4 * p)
      ctx.globalAlpha = 1
    }
    ctx.restore()
    for (let i = 0; i < this.subs; i++) {
      const off = (i === 0 ? -38 : 38) * this.unit
      const sp = Math.max(2, Math.round(p * 0.7))
      const sm = MAPS.mini
      const bob = Math.round(Math.sin(this.time * 5 + i * 2) * 1.5) * 2
      drawMap(ctx, sm, Math.round(this.px2 + off - (sm[0].length * sp) / 2), Math.round(this.py2 - (sm.length * sp) / 2 + bob), sp)
    }
    if (this.darkFactory) {
      for (let i = 0; i < 2; i++) {
        const off = (i === 0 ? -64 : 64) * this.unit
        const sp = Math.max(2, Math.round(p * 0.6))
        const sm = MAPS.mini
        ctx.save()
        drawMap(ctx, sm, Math.round(this.px2 + off - (sm[0].length * sp) / 2), Math.round(this.py2 - 14 * this.unit), sp)
        ctx.fillStyle = C.gold
        ctx.fillRect(Math.round(this.px2 + off - sp), Math.round(this.py2 - 14 * this.unit - sp * 2), sp * 2, sp)
        ctx.restore()
      }
    }
  }

  private drawFace(ctx: CanvasRenderingContext2D, dx: number, dy: number, p: number): void {
    const ex = (c2: number) => dx + c2 * p
    const ey = (r: number) => dy + r * p
    const glow = C.bright
    ctx.fillStyle = glow
    if (this.emo === 'happy') {
      ctx.fillRect(ex(4), ey(4), p, p)
      ctx.fillRect(ex(7), ey(4), p, p)
      ctx.fillRect(ex(4), ey(6), p, p)
      ctx.fillRect(ex(7), ey(6), p, p)
      ctx.fillRect(ex(5), ey(6) + p * 0.5, p * 2, p * 0.6)
    } else if (this.emo === 'worry') {
      ctx.fillRect(ex(4), ey(5), p * 1.4, p * 0.7)
      ctx.fillRect(ex(7), ey(5), p * 1.4, p * 0.7)
      ctx.fillStyle = C.gold
      ctx.fillRect(ex(5), ey(6) + p * 0.4, p * 2, p * 0.6)
    } else if (this.emo === 'hurt') {
      ctx.fillStyle = C.danger
      ctx.fillRect(ex(4), ey(4), p, p)
      ctx.fillRect(ex(5), ey(5), p, p)
      ctx.fillRect(ex(4), ey(6) - p * 0.4, p, p)
      ctx.fillRect(ex(7), ey(4), p, p)
      ctx.fillRect(ex(8) - p, ey(5), p, p)
      ctx.fillRect(ex(7), ey(6) - p * 0.4, p, p)
    } else {
      const blink = Math.floor(this.time * 1.3) % 5 === 0 ? 0.35 : 1
      ctx.fillRect(ex(4), ey(4) + (p * (1 - blink)) / 2, p, Math.max(p * 0.3, p * 1.6 * blink))
      ctx.fillRect(ex(7), ey(4) + (p * (1 - blink)) / 2, p, Math.max(p * 0.3, p * 1.6 * blink))
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color
      const s = Math.max(2, Math.round(p.size))
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s)
    }
    ctx.globalAlpha = 1
  }

  private drawFloats(): void {
    const ctx = this.ctx
    for (const f of this.floats) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, f.life / f.maxLife)
      const fs = Math.round(15 * this.unit * f.scale)
      ctx.font = `800 ${fs}px Manrope, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.lineWidth = 4
      ctx.strokeStyle = C.outline
      ctx.strokeText(f.text, f.x, f.y)
      ctx.fillStyle = f.color
      ctx.fillText(f.text, f.x, f.y)
      ctx.restore()
    }
  }

  renderStatic(): void {
    this.render()
  }
}
