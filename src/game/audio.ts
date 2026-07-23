// WebAudio-синтез для шутера AI PDLC RUSH v2. Перенос из макета (Audio2). Без медиа-ассетов.

export class GameAudio {
  private ctx: AudioContext | null = null
  private muted = true
  private musicTimer: number | null = null
  private step = 0
  private readonly notes = [110, 110, 165, 110, 131, 110, 165, 196]

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC) this.ctx = new AC()
    }
    return this.ctx
  }

  resume(): void {
    const c = this.ensure()
    if (c && c.state === 'suspended') void c.resume()
  }

  setMuted(m: boolean): void {
    this.muted = m
  }

  private beep(freq: number, dur: number, type: OscillatorType, vol?: number, slide?: number): void {
    if (this.muted) return
    const c = this.ensure()
    if (!c) return
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type || 'square'
    o.frequency.setValueAtTime(freq, c.currentTime)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur)
    g.gain.setValueAtTime(vol || 0.05, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
    o.connect(g)
    g.connect(c.destination)
    o.start()
    o.stop(c.currentTime + dur)
  }

  shot(): void {
    this.beep(720, 0.04, 'square', 0.018, -300)
  }
  kill(): void {
    this.beep(300, 0.12, 'sawtooth', 0.04, -140)
  }
  pickup(): void {
    this.beep(520, 0.12, 'square', 0.05, 260)
  }
  upgrade(): void {
    this.beep(660, 0.22, 'square', 0.06, 330)
  }
  hit(): void {
    this.beep(120, 0.28, 'sawtooth', 0.09, -70)
  }
  bossIn(): void {
    this.beep(180, 0.4, 'sawtooth', 0.07, -60)
  }
  bossDie(): void {
    this.beep(90, 0.6, 'sawtooth', 0.09, -50)
  }
  stage(): void {
    this.beep(392, 0.22, 'square', 0.05, 190)
  }
  lowTok(): void {
    this.beep(220, 0.09, 'triangle', 0.05)
  }
  gameOver(): void {
    this.beep(220, 0.5, 'sawtooth', 0.07, -160)
  }
  countdownTick(go: boolean): void {
    this.beep(go ? 880 : 440, go ? 0.25 : 0.1, 'square', 0.06)
  }

  startMusic(): void {
    this.stopMusic()
    this.musicTimer = window.setInterval(() => {
      if (!this.muted) {
        this.beep(this.notes[this.step % 8], 0.1, 'triangle', 0.026)
        this.step++
      }
    }, 230)
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer)
      this.musicTimer = null
    }
  }
}
