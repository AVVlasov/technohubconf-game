import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import keyArt from '../../assets/ai-pdlc-rush-key-art.png'
import { gameAudio } from '../../game/audio'
import { GameCanvas, GameControls } from '../../game/GameCanvas'
import { GameResult, Stats } from '../../game/engine'
import { dailySeed } from '../../game/rng'
import {
  addScore,
  getBest,
  getLeaderboard,
  getSettings,
  rankOf,
  saveSettings,
  ScoreEntry,
  setBest,
} from '../../game/storage'

type Screen = 'menu' | 'tutorial' | 'countdown' | 'playing' | 'gameover'

const GREEN = '#21A038'
const NEON = '#21e08a'
const CYAN = '#45c9ff'

const EMPTY_STATS: Stats = {
  score: 0,
  best: 0,
  lives: 3,
  multiplier: 1,
  combo: 0,
  maxCombo: 0,
  zoneName: 'Идея',
  zoneShort: 'IDEA',
  zoneEmoji: '💡',
  lap: '',
  flow: false,
  flowMeter: 0,
  tokens: 0,
  shieldT: 0,
  magnetT: 0,
  boostT: 0,
  autopilotT: 0,
  speedKmh: 0,
  nearMisses: 0,
}

const STYLES = `
@keyframes aip-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
@keyframes aip-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes aip-pop { 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.12);opacity:1} 100%{transform:scale(1)} }
@keyframes aip-count { 0%{transform:scale(2);opacity:0} 30%{opacity:1} 100%{transform:scale(0.6);opacity:0} }
@keyframes aip-shine { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
@keyframes aip-spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
@keyframes aip-swipe { 0%{transform:translateX(-30px);opacity:0} 30%{opacity:1} 100%{transform:translateX(30px);opacity:0} }
.aip-btn { transition: transform .08s ease, box-shadow .15s ease; user-select:none; -webkit-tap-highlight-color: transparent; image-rendering:pixelated; }
.aip-btn:active { transform: scale(0.95); }
.aip-pixel-title { font-family: "Courier New", ui-monospace, monospace; letter-spacing:-3px; filter:drop-shadow(4px 4px 0 #07152b); }
.aip-key-art { image-rendering:pixelated; animation:aip-key-drift 10s ease-in-out infinite alternate; }
@keyframes aip-key-drift { from{transform:scale(1.02) translateY(0)} to{transform:scale(1.08) translateY(-1.5%)} }
.aip-scroll::-webkit-scrollbar { width: 4px; }
.aip-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
* { -webkit-tap-highlight-color: transparent; }
`

const fmt = (n: number): string => n.toLocaleString('ru-RU')

export const MainPage: React.FC = () => {
  const controls = useRef<GameControls>(null)
  const [screen, setScreen] = useState<Screen>('menu')
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [result, setResult] = useState<GameResult | null>(null)
  const [best, setBestState] = useState<number>(getBest())
  const [settings, setSettings] = useState(getSettings())
  const [count, setCount] = useState(3)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [dailyMode, setDailyMode] = useState(false)
  const [lastRank, setLastRank] = useState<number>(-1)
  const [nameInput, setNameInput] = useState(settings.name)
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>(getLeaderboard())
  const [shareBusy, setShareBusy] = useState(false)
  const savedRef = useRef(false)
  const screenRef = useRef<Screen>('menu')
  screenRef.current = screen

  useEffect(() => {
    gameAudio.setMuted(settings.muted)
  }, [settings.muted])

  const handleStats = useCallback((s: Stats) => setStats(s), [])

  const handleGameOver = useCallback(
    (r: GameResult) => {
      if (savedRef.current) return
      savedRef.current = true
      const newBest = setBest(r.score)
      setBestState(newBest)
      const name = (getSettings().name || 'Гость').slice(0, 14)
      const entry: ScoreEntry = {
        name,
        score: r.score,
        zone: r.zoneName,
        tokens: r.tokens,
        maxCombo: r.maxCombo,
        date: Date.now(),
      }
      addScore(entry)
      setLeaderboard(getLeaderboard())
      setLastRank(rankOf(r.score))
      setResult(r)
      setScreen('gameover')
    },
    [],
  )

  const beginCountdown = useCallback((daily: boolean) => {
    gameAudio.resume()
    setDailyMode(daily)
    savedRef.current = false
    setResult(null)
    setCount(3)
    setScreen('countdown')
  }, [])

  // Обратный отсчёт 3-2-1-GO
  useEffect(() => {
    if (screen !== 'countdown') return
    let n = 3
    setCount(3)
    gameAudio.countdownTick(false)
    const id = setInterval(() => {
      n -= 1
      if (n > 0) {
        setCount(n)
        gameAudio.countdownTick(false)
      } else if (n === 0) {
        setCount(0)
        gameAudio.countdownTick(true)
      } else {
        clearInterval(id)
        const seed = dailyMode ? dailySeed() : Math.floor(Math.random() * 1e9)
        setScreen('playing')
        controls.current?.start(seed)
      }
    }, 750)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen])

  const onPlay = useCallback(
    (daily: boolean) => {
      const s = getSettings()
      if (!s.tutorialSeen) {
        setDailyMode(daily)
        setScreen('tutorial')
      } else {
        beginCountdown(daily)
      }
    },
    [beginCountdown],
  )

  const finishTutorial = useCallback(() => {
    const next = saveSettings({ tutorialSeen: true })
    setSettings(next)
    beginCountdown(dailyMode)
  }, [beginCountdown, dailyMode])

  const toggleMute = useCallback(() => {
    const next = saveSettings({ muted: !getSettings().muted })
    setSettings(next)
    gameAudio.setMuted(next.muted)
  }, [])

  const toggleMotion = useCallback(() => {
    const next = saveSettings({ reduceMotion: !getSettings().reduceMotion })
    setSettings(next)
  }, [])

  const commitName = useCallback((v: string) => {
    const clean = v.slice(0, 14)
    setNameInput(clean)
    const next = saveSettings({ name: clean })
    setSettings(next)
  }, [])

  const doShare = useCallback(async () => {
    if (!result) return
    setShareBusy(true)
    try {
      const blob = await buildShareCard(result, settings.name || 'Гость', lastRank)
      const file = new File([blob], 'ai-pdlc-rush.png', { type: 'image/png' })
      const navAny = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> }
      if (navAny.share && navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({
          files: [file],
          title: 'AI PDLC RUSH',
          text: `Мой результат в AI PDLC RUSH: ${fmt(result.score)} очков! #AIPDLCDisrupt`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ai-pdlc-rush.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      }
    } catch {
      /* пользователь отменил шаринг */
    } finally {
      setShareBusy(false)
    }
  }, [result, settings.name, lastRank])

  const active = screen === 'playing'

  const rankToTop3 = useMemo(() => {
    if (!result) return null
    const lb = getLeaderboard()
    if (lb.length < 3) return null
    const third = lb[2]?.score ?? 0
    if (result.score >= third) return null
    return third - result.score + 1
  }, [result])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#04060b',
        display: 'flex',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <style>{STYLES}</style>
      <div
        style={{
          position: 'relative',
          width: 'min(100vw, 480px)',
          height: '100%',
          maxHeight: '100dvh',
          overflow: 'hidden',
          boxShadow: '0 0 80px rgba(33,224,138,0.15)',
        }}
      >
        <GameCanvas
          ref={controls}
          active={active}
          reduceMotion={settings.reduceMotion}
          best={best}
          onStats={handleStats}
          onGameOver={handleGameOver}
        />

        {screen === 'menu' && (
          <img
            className="aip-key-art"
            src={keyArt}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* HUD */}
        {active && <Hud stats={stats} muted={settings.muted} onMute={toggleMute} />}

        {/* Меню */}
        {screen === 'menu' && (
          <Menu
            best={best}
            name={nameInput}
            onName={commitName}
            onPlay={() => onPlay(false)}
            onDaily={() => onPlay(true)}
            onLeaderboard={() => {
              setLeaderboard(getLeaderboard())
              setShowLeaderboard(true)
            }}
            muted={settings.muted}
            onMute={toggleMute}
            reduceMotion={settings.reduceMotion}
            onMotion={toggleMotion}
          />
        )}

        {/* Туториал */}
        {screen === 'tutorial' && <Tutorial onDone={finishTutorial} />}

        {/* Обратный отсчёт */}
        {screen === 'countdown' && <Countdown count={count} />}

        {/* Результат */}
        {screen === 'gameover' && result && (
          <GameOver
            result={result}
            best={best}
            rank={lastRank}
            rankToTop3={rankToTop3}
            onRetry={() => beginCountdown(dailyMode)}
            onMenu={() => setScreen('menu')}
            onShare={doShare}
            shareBusy={shareBusy}
            onLeaderboard={() => {
              setLeaderboard(getLeaderboard())
              setShowLeaderboard(true)
            }}
            daily={dailyMode}
          />
        )}

        {/* Лидерборд */}
        {showLeaderboard && (
          <Leaderboard entries={leaderboard} onClose={() => setShowLeaderboard(false)} />
        )}
      </div>
    </div>
  )
}

// ---------- HUD ----------
const Hud: React.FC<{ stats: Stats; muted: boolean; onMute: () => void }> = ({ stats, muted, onMute }) => {
  const powerChips: Array<{ e: string; t: number; c: string }> = []
  if (stats.shieldT > 0) powerChips.push({ e: '🛡', t: stats.shieldT, c: CYAN })
  if (stats.magnetT > 0) powerChips.push({ e: '🧲', t: stats.magnetT, c: '#c07bff' })
  if (stats.boostT > 0) powerChips.push({ e: '🚀', t: stats.boostT, c: '#ff9f45' })
  if (stats.autopilotT > 0) powerChips.push({ e: '🤖', t: stats.autopilotT, c: NEON })

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: 1 }}>ОЧКИ</div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, textShadow: `0 0 12px ${NEON}` }}>
            {fmt(stats.score)}
          </div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>рекорд {fmt(stats.best)}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.15)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {stats.zoneEmoji} {stats.zoneName}
          </div>
          {stats.lap && (
            <div style={{ fontSize: 10, color: '#ff5555', fontWeight: 800, marginTop: 3 }}>{stats.lap}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18 }}>{'❤️'.repeat(Math.max(0, stats.lives))}</div>
          <button
            onClick={onMute}
            className="aip-btn"
            style={{
              pointerEvents: 'auto',
              marginTop: 4,
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* Мультипликатор + комбо */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        <div
          key={stats.multiplier}
          style={{
            fontSize: 26 + Math.min(stats.multiplier, 6) * 3,
            fontWeight: 900,
            color: stats.flow ? '#7dffd6' : multColor(stats.multiplier),
            textShadow: `0 0 16px ${stats.flow ? '#7dffd6' : multColor(stats.multiplier)}`,
            animation: 'aip-pop .25s ease',
          }}
        >
          ×{stats.multiplier}
        </div>
        {stats.combo > 0 && (
          <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 700 }}>КОМБО {stats.combo}</div>
        )}
        {stats.flow && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: '#04060b',
              background: '#7dffd6',
              padding: '2px 8px',
              borderRadius: 12,
              animation: 'aip-pulse .6s infinite',
            }}
          >
            FLOW
          </div>
        )}
      </div>

      {/* Power-up чипы */}
      {powerChips.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {powerChips.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 12,
                background: 'rgba(0,0,0,0.45)',
                border: `1px solid ${p.c}`,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <span>{p.e}</span>
              <span style={{ color: p.c }}>{p.t.toFixed(1)}s</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const multColor = (m: number): string => {
  if (m >= 5) return '#ff5ea8'
  if (m >= 4) return '#ff9f45'
  if (m >= 3) return '#ffd447'
  if (m >= 2) return NEON
  return '#fff'
}

// ---------- Меню ----------
interface MenuProps {
  best: number
  name: string
  onName: (v: string) => void
  onPlay: () => void
  onDaily: () => void
  onLeaderboard: () => void
  muted: boolean
  onMute: () => void
  reduceMotion: boolean
  onMotion: () => void
}
const Menu: React.FC<MenuProps> = ({
  best,
  name,
  onName,
  onPlay,
  onDaily,
  onLeaderboard,
  muted,
  onMute,
  reduceMotion,
  onMotion,
}) => (
  <Overlay>
    <div
      style={{
        textAlign: 'center',
        padding: 20,
        maxWidth: 380,
        width: '100%',
        textShadow: '2px 2px 0 #04101f, 0 0 10px #04101f',
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: 3, color: NEON, fontWeight: 700, opacity: 0.9 }}>
        AI PDLC DISRUPT · ТЕХНОХАБ
      </div>
      <h1
        className="aip-pixel-title"
        style={{
          margin: '8px 0 0',
          fontSize: 48,
          fontWeight: 900,
          lineHeight: 0.95,
          color: '#eafff5',
          WebkitTextFillColor: '#eafff5',
          textShadow: `3px 0 0 ${NEON}, -3px 0 0 ${CYAN}, 4px 4px 0 #07152b, 0 0 18px ${NEON}`,
          animation: 'aip-pulse 2.4s steps(4) infinite',
        }}
      >
        AI PDLC
        <br />
        RUSH
      </h1>
      <div style={{ fontSize: 14, opacity: 0.7, marginTop: 10 }}>
        Разгони AI-агента по конвейеру разработки. Собирай контекст, держи комбо, лови поток.
      </div>

      <div style={{ margin: '18px 0 6px', textAlign: 'left' }}>
        <label style={{ fontSize: 12, opacity: 0.6 }}>Твой ник для лидерборда</label>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Введи ник…"
          maxLength={14}
          style={{
            width: '100%',
            marginTop: 4,
            padding: '10px 14px',
            borderRadius: 12,
            border: `1px solid rgba(255,255,255,0.2)`,
            background: 'rgba(4,10,24,0.78)',
            color: '#fff',
            fontSize: 16,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <BigButton onClick={onPlay} label="ИГРАТЬ ▶" />

      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <SmallButton onClick={onDaily} label="🗓 Забег дня" />
        <SmallButton onClick={onLeaderboard} label={`🏆 Топ`} />
      </div>

      <div style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
        Рекорд: <b style={{ color: NEON }}>{fmt(best)}</b>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
        <Toggle active={!muted} on="🔊 Звук" off="🔇 Выкл" onClick={onMute} />
        <Toggle active={!reduceMotion} on="✨ Эффекты" off="🚫 Спокойно" onClick={onMotion} />
      </div>
    </div>
  </Overlay>
)

// ---------- Туториал ----------
const Tutorial: React.FC<{ onDone: () => void }> = ({ onDone }) => (
  <Overlay>
    <div style={{ textAlign: 'center', padding: 24, maxWidth: 360 }}>
      <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 20 }}>Как играть</h2>
      <div style={{ display: 'grid', gap: 14, textAlign: 'left', fontSize: 15 }}>
        <Row icon="👈👉" text="Свайп влево/вправо — сменить полосу" />
        <Row icon="👆" text="Свайп вверх — прыжок через баги" />
        <Row icon="👇" text="Свайп вниз — подкат под инцидент" />
        <Row icon="💠" text="Собирай контекст-токены → растёт ×множитель" />
        <Row icon="⚡" text="Пройди впритирку → near-miss и режим FLOW" />
        <Row icon="🤖" text="Лови power-up и активируй двойным тапом" />
      </div>
      <div
        style={{
          margin: '22px auto 6px',
          width: 120,
          height: 44,
          borderRadius: 22,
          border: `2px solid ${NEON}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 40,
            fontSize: 24,
            animation: 'aip-swipe 1.4s ease-in-out infinite',
          }}
        >
          👆
        </div>
      </div>
      <BigButton onClick={onDone} label="ПОНЯТНО, ПОЕХАЛИ!" />
    </div>
  </Overlay>
)

const Row: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <span style={{ fontSize: 22, width: 44, textAlign: 'center' }}>{icon}</span>
    <span style={{ opacity: 0.9 }}>{text}</span>
  </div>
)

// ---------- Countdown ----------
const Countdown: React.FC<{ count: number }> = ({ count }) => (
  <Overlay dim>
    <div
      key={count}
      style={{
        fontSize: 140,
        fontWeight: 900,
        color: count === 0 ? NEON : '#fff',
        textShadow: `0 0 40px ${count === 0 ? NEON : CYAN}`,
        animation: 'aip-count .75s ease forwards',
      }}
    >
      {count === 0 ? 'GO!' : count}
    </div>
  </Overlay>
)

// ---------- Game Over ----------
interface GameOverProps {
  result: GameResult
  best: number
  rank: number
  rankToTop3: number | null
  onRetry: () => void
  onMenu: () => void
  onShare: () => void
  shareBusy: boolean
  onLeaderboard: () => void
  daily: boolean
}
const GameOver: React.FC<GameOverProps> = ({
  result,
  best,
  rank,
  rankToTop3,
  onRetry,
  onMenu,
  onShare,
  shareBusy,
  onLeaderboard,
  daily,
}) => {
  const [display, setDisplay] = useState(0)
  const isRecord = result.score >= best && result.score > 0

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const dur = 900
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.floor(result.score * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [result.score])

  return (
    <Overlay dim>
      <div style={{ textAlign: 'center', padding: 20, maxWidth: 380, width: '100%' }}>
        {isRecord ? (
          <div style={{ fontSize: 16, fontWeight: 900, color: '#ffd447', animation: 'aip-pulse 1s infinite' }}>
            🎉 НОВЫЙ РЕКОРД!
          </div>
        ) : (
          <div style={{ fontSize: 14, opacity: 0.7 }}>{daily ? '🗓 Забег дня' : 'Забег окончен'}</div>
        )}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            lineHeight: 1,
            margin: '4px 0',
            textShadow: `0 0 24px ${NEON}`,
          }}
        >
          {fmt(display)}
        </div>
        {rank >= 0 && rank < 50 && (
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            место в топе: <b style={{ color: NEON }}>#{rank + 1}</b>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            margin: '16px 0',
          }}
        >
          <Stat label="Токены" value={`💠 ${result.tokens}`} />
          <Stat label="Макс. комбо" value={`🔥 ${result.maxCombo}`} />
          <Stat label="Near-miss" value={`⚡ ${result.nearMisses}`} />
          <Stat label="Дошёл до" value={result.zoneName} />
        </div>

        {rankToTop3 != null && (
          <div
            style={{
              fontSize: 13,
              padding: '8px 12px',
              borderRadius: 12,
              background: 'rgba(255,212,71,0.12)',
              border: '1px solid rgba(255,212,71,0.4)',
              marginBottom: 12,
            }}
          >
            До ТОП-3 всего <b style={{ color: '#ffd447' }}>{fmt(rankToTop3)}</b> очков — ещё разок? 🔥
          </div>
        )}

        <BigButton onClick={onRetry} label="ЕЩЁ РАЗОК ↻" />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <SmallButton onClick={onShare} label={shareBusy ? '…' : '📤 Поделиться'} />
          <SmallButton onClick={onLeaderboard} label="🏆 Топ" />
          <SmallButton onClick={onMenu} label="🏠" />
        </div>
      </div>
    </Overlay>
  )
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      padding: '10px 8px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <div style={{ fontSize: 11, opacity: 0.55 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{value}</div>
  </div>
)

// ---------- Leaderboard ----------
const Leaderboard: React.FC<{ entries: ScoreEntry[]; onClose: () => void }> = ({ entries, onClose }) => (
  <Overlay dim>
    <div style={{ padding: 20, maxWidth: 380, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900 }}>🏆 Лидерборд</h2>
        <button
          onClick={onClose}
          className="aip-btn"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      {entries.length === 0 ? (
        <div style={{ opacity: 0.6, textAlign: 'center', padding: 30 }}>Пока пусто. Стань первым! 🚀</div>
      ) : (
        <div className="aip-scroll" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'grid', gap: 6 }}>
          {entries.map((e, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 12,
                background: i < 3 ? 'rgba(33,224,138,0.12)' : 'rgba(255,255,255,0.05)',
                border: i < 3 ? `1px solid ${NEON}` : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ width: 28, fontWeight: 900, fontSize: 16 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.name}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>{e.zone}</div>
              </div>
              <div style={{ fontWeight: 900, color: NEON }}>{fmt(e.score)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  </Overlay>
)

// ---------- Shared UI ----------
const Overlay: React.FC<React.PropsWithChildren<{ dim?: boolean }>> = ({ children, dim }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: dim
        ? 'rgba(4,6,11,0.76)'
        : 'linear-gradient(180deg, rgba(4,6,11,.26), rgba(4,6,11,.24) 45%, rgba(4,6,11,.72))',
      zIndex: 10,
    }}
  >
    {children}
  </div>
)

const BigButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="aip-btn"
    style={{
      width: '100%',
      marginTop: 16,
      padding: '16px',
      borderRadius: 4,
      border: '3px solid #8affc5',
      fontSize: 20,
      fontWeight: 900,
      fontFamily: '"Courier New", ui-monospace, monospace',
      letterSpacing: 1,
      color: '#04140c',
      background: `linear-gradient(135deg, ${NEON}, ${GREEN})`,
      boxShadow: `0 0 0 3px #07152b, 6px 6px 0 #07152b, 0 8px 28px rgba(33,224,138,0.45)`,
      cursor: 'pointer',
      animation: 'aip-float 2.4s ease-in-out infinite',
    }}
  >
    {label}
  </button>
)

const SmallButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    className="aip-btn"
    style={{
      flex: 1,
      padding: '12px 8px',
      borderRadius: 3,
      border: '1px solid rgba(255,255,255,0.18)',
      background: 'rgba(255,255,255,0.07)',
      color: '#fff',
      fontSize: 14,
      fontWeight: 700,
      fontFamily: '"Courier New", ui-monospace, monospace',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
)

const Toggle: React.FC<{ active: boolean; on: string; off: string; onClick: () => void }> = ({
  active,
  on,
  off,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="aip-btn"
    style={{
      padding: '8px 14px',
      borderRadius: 20,
      border: `1px solid ${active ? NEON : 'rgba(255,255,255,0.2)'}`,
      background: active ? 'rgba(33,224,138,0.15)' : 'rgba(255,255,255,0.05)',
      color: active ? NEON : 'rgba(255,255,255,0.6)',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    {active ? on : off}
  </button>
)

// ---------- Share card ----------
const buildShareCard = (result: GameResult, name: string, rank: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const W = 600
    const H = 800
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('no ctx'))
      return
    }
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#04101f')
    g.addColorStop(1, '#02120c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // Глоу-круги
    ctx.globalAlpha = 0.25
    ctx.fillStyle = NEON
    ctx.beginPath()
    ctx.arc(W * 0.8, H * 0.15, 160, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = CYAN
    ctx.beginPath()
    ctx.arc(W * 0.15, H * 0.85, 180, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    ctx.textAlign = 'center'
    ctx.fillStyle = NEON
    ctx.font = 'bold 24px "Segoe UI", sans-serif'
    ctx.fillText('AI PDLC DISRUPT · ТЕХНОХАБ', W / 2, 80)

    ctx.fillStyle = '#fff'
    ctx.font = '900 84px "Segoe UI", sans-serif'
    ctx.fillText('AI PDLC RUSH', W / 2, 175)

    ctx.font = 'bold 30px "Segoe UI", sans-serif'
    ctx.fillStyle = '#eafff5'
    ctx.fillText(name, W / 2, 250)

    ctx.fillStyle = NEON
    ctx.font = '900 140px "Segoe UI", sans-serif'
    ctx.shadowBlur = 30
    ctx.shadowColor = NEON
    ctx.fillText(result.score.toLocaleString('ru-RU'), W / 2, 400)
    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '24px "Segoe UI", sans-serif'
    ctx.fillText('ОЧКОВ', W / 2, 440)

    // Статы
    const stats: Array<[string, string]> = [
      ['💠 Токены', String(result.tokens)],
      ['🔥 Комбо', String(result.maxCombo)],
      ['⚡ Near-miss', String(result.nearMisses)],
      ['🏁 Зона', result.zoneName],
    ]
    ctx.font = 'bold 28px "Segoe UI", sans-serif'
    let y = 530
    for (const [k, v] of stats) {
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText(k, 90, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.fillText(v, W - 90, y)
      y += 50
    }

    if (rank >= 0 && rank < 50) {
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffd447'
      ctx.font = '900 34px "Segoe UI", sans-serif'
      ctx.fillText(`🏆 МЕСТО #${rank + 1}`, W / 2, y + 20)
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '22px "Segoe UI", sans-serif'
    ctx.fillText('#AIPDLCDisrupt · обгони меня 👆', W / 2, H - 40)

    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('toBlob failed'))
    }, 'image/png')
  })
}

export default MainPage
