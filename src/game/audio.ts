// WebAudio-синтез SFX и музыки. Ноль медиа-ассетов, мгновенно, офлайн.
// Все звуки генерируются на лету осцилляторами.

export class GameAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private muted = false
  private musicTimer: number | null = null
  private musicStep = 0
  private tempo = 1

  // Мажорная пентатоника — приятно на слух при быстрых сборах.
  private readonly scale = [0, 2, 4, 7, 9, 12, 14, 16]

  init(): void {
    if (this.ctx) return
    try {
      const AC: typeof AudioContext =
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
        window.AudioContext
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.9
      this.master.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.16
      this.musicGain.connect(this.master)
    } catch {
      this.ctx = null
    }
  }

  resume(): void {
    this.init()
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02)
    }
  }

  private freqFromSemitone(semi: number, base = 220): number {
    return base * Math.pow(2, semi / 12)
  }

  private beep(freq: number, dur: number, type: OscillatorType, gain: number, when = 0): void {
    if (!this.ctx || !this.master || this.muted) return
    const t = this.ctx.currentTime + when
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  // Сбор токена: тон растёт со звеном комбо -> "набегающая" мелодия.
  token(comboStep: number): void {
    const semi = this.scale[Math.min(comboStep, this.scale.length - 1)]
    this.beep(this.freqFromSemitone(semi + 12, 330), 0.16, 'triangle', 0.22)
  }

  golden(): void {
    this.beep(880, 0.1, 'square', 0.18)
    this.beep(1320, 0.22, 'triangle', 0.2, 0.06)
  }

  multiplierUp(): void {
    this.beep(660, 0.09, 'square', 0.2)
    this.beep(990, 0.14, 'square', 0.2, 0.07)
    this.beep(1320, 0.2, 'triangle', 0.18, 0.14)
  }

  nearMiss(): void {
    this.beep(1400, 0.06, 'sine', 0.12)
  }

  swipe(): void {
    this.beep(320, 0.06, 'sine', 0.1)
  }

  jump(): void {
    if (!this.ctx || !this.master || this.muted) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, t)
    osc.frequency.exponentialRampToValueAtTime(720, t + 0.14)
    g.gain.setValueAtTime(0.14, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.18)
  }

  powerup(): void {
    this.beep(520, 0.1, 'square', 0.2)
    this.beep(780, 0.1, 'square', 0.2, 0.08)
    this.beep(1040, 0.18, 'triangle', 0.2, 0.16)
  }

  crash(): void {
    if (!this.ctx || !this.master || this.muted) return
    const t = this.ctx.currentTime
    // Шумовой удар.
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    src.connect(filter)
    filter.connect(g)
    g.connect(this.master)
    src.start(t)
    // Низкий "бум".
    this.beep(90, 0.25, 'sawtooth', 0.3)
  }

  gameOver(): void {
    this.beep(440, 0.16, 'triangle', 0.2)
    this.beep(330, 0.16, 'triangle', 0.2, 0.14)
    this.beep(220, 0.4, 'triangle', 0.2, 0.28)
  }

  countdownTick(final: boolean): void {
    this.beep(final ? 880 : 520, final ? 0.3 : 0.12, 'square', 0.2)
  }

  zoneChange(): void {
    this.beep(660, 0.1, 'triangle', 0.18)
    this.beep(880, 0.16, 'triangle', 0.18, 0.08)
  }

  // Фоновая музыка: простой арпеджио-луп, темп растёт со скоростью.
  startMusic(): void {
    if (this.musicTimer !== null) return
    this.musicStep = 0
    const tick = () => {
      if (!this.ctx || !this.musicGain || this.muted) {
        this.musicTimer = window.setTimeout(tick, 220 / this.tempo)
        return
      }
      const pattern = [0, 7, 12, 7, 4, 7, 12, 16]
      const semi = pattern[this.musicStep % pattern.length]
      const t = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = this.freqFromSemitone(semi, 110)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
      osc.connect(g)
      g.connect(this.musicGain)
      osc.start(t)
      osc.stop(t + 0.24)
      // Бас на сильную долю.
      if (this.musicStep % 4 === 0) {
        const bass = this.ctx.createOscillator()
        const bg = this.ctx.createGain()
        bass.type = 'sine'
        bass.frequency.value = this.freqFromSemitone(0, 55)
        bg.gain.setValueAtTime(0.6, t)
        bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
        bass.connect(bg)
        bg.connect(this.musicGain)
        bass.start(t)
        bass.stop(t + 0.32)
      }
      this.musicStep++
      this.musicTimer = window.setTimeout(tick, 220 / this.tempo)
    }
    tick()
  }

  setTempo(t: number): void {
    this.tempo = Math.max(0.8, Math.min(2.2, t))
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer)
      this.musicTimer = null
    }
  }
}

export const gameAudio = new GameAudio()
